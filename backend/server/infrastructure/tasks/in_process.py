from __future__ import annotations

import asyncio
import logging
import traceback
from datetime import UTC, datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from server.infrastructure.tasks._domain import (
    Interval,
    RunNow,
    TaskContext,
    TaskHandler,
    TaskInfo,
    TaskRun,
    TaskStatusEnum,
    Trigger,
)
from server.infrastructure.tasks._interface import TaskHistoryStore, TaskScheduler, TaskStatusStore

logger = logging.getLogger(__name__)


class _Stop(Enum):
    TOKEN = 0


_STOP = _Stop.TOKEN

type QueueItem = UUID | _Stop


class InProcessTaskScheduler(TaskScheduler):
    def __init__(
        self,
        status_store: TaskStatusStore,
        history_store: TaskHistoryStore,
        *,
        concurrency: int = 2,
    ) -> None:
        self._status = status_store
        self._history = history_store
        self._concurrency = concurrency
        self._handlers: dict[str, TaskHandler] = {}
        # Per task type recovery policy
        self._recoverable: dict[str, bool] = {}
        self._queue: asyncio.Queue[QueueItem] = asyncio.Queue()
        self._workers: list[asyncio.Task[None]] = []
        self._schedules: dict[str, asyncio.Task[None]] = {}
        self._running: dict[UUID, asyncio.Task[None]] = {}
        self._started = False

    def register(self, name: str, handler: TaskHandler, *, recoverable: bool = True):
        self._handlers[name] = handler
        self._recoverable[name] = recoverable

    async def run(
        self,
        name: str,
        *,
        payload: dict[str, Any] | None = None,
        dedup_key: str | None = None,
    ) -> UUID:
        if dedup_key is not None:
            existing = await self._status.find_active(name, dedup_key)
            if existing is not None:
                return existing.id

        now = datetime.now(UTC)
        task_id = uuid4()
        await self._status.create(
            TaskInfo(
                id=task_id,
                name=name,
                status=TaskStatusEnum.PENDING,
                attempt=0,
                payload=payload or {},
                progress=None,
                detail=None,
                dedup_key=dedup_key,
                created_at=now,
                updated_at=now,
            )
        )
        await self._queue.put(task_id)
        return task_id

    async def schedule(
        self,
        name: str,
        trigger: Trigger,
        *,
        payload: dict[str, Any] | None = None,
        schedule_id: str | None = None,
    ) -> str:
        schedule_id = schedule_id or f"{name}:{uuid4()}"

        if isinstance(trigger, RunNow):
            await self.run(name, payload=payload)
            return schedule_id

        if isinstance(trigger, Interval):
            self._schedules[schedule_id] = asyncio.create_task(
                self._interval_loop(name, trigger.seconds, payload),
                name=f"schedule:{schedule_id}",
            )
            return schedule_id

        raise NotImplementedError(f"{type(trigger).__name__} trigger is not supported yet")

    async def _interval_loop(self, name: str, seconds: float, payload: dict[str, Any] | None):
        while True:
            await asyncio.sleep(seconds)
            await self.run(name, payload=payload)

    async def cancel(self, task_id: UUID) -> None:
        running = self._running.get(task_id)
        if running is not None:
            # worker will record CANCELLED
            running.cancel()
        else:
            # worker will skip this
            await self._status.update(task_id, status=TaskStatusEnum.CANCELLED)

    async def unschedule(self, schedule_id: str):
        task = self._schedules.pop(schedule_id, None)
        if task is not None:
            task.cancel()

    async def start(self):
        if self._started:
            return
        self._started = True

        await self._recover()

        self._workers = [
            asyncio.create_task(self._worker(i), name=f"task-worker-{i}") for i in range(self._concurrency)
        ]

    async def stop(self) -> None:
        # Stop schedules
        for task in self._schedules.values():
            task.cancel()
        await asyncio.gather(*self._schedules.values(), return_exceptions=True)
        self._schedules.clear()

        # Graceful stop
        for _ in self._workers:
            await self._queue.put(_STOP)
        await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers.clear()
        self._started = False

    async def _recover(self):
        # Anything left PENDING / RUNNING means the process died mid-run
        now = datetime.now(UTC)
        for info in await self._status.list_active():
            interrupted_midrun = info.status == TaskStatusEnum.RUNNING
            recoverable = self._recoverable.get(info.name, True)

            if interrupted_midrun and not recoverable:
                # Ran partially and can't be recovered.
                await self._history.append(
                    TaskRun(
                        id=uuid4(),
                        task_id=info.id,
                        name=info.name,
                        status=TaskStatusEnum.FAILED,
                        attempt=info.attempt,
                        started_at=info.updated_at,
                        finished_at=now,
                        duration_ms=None,
                        error="interrupted: process restarted (task is not recoverable)",
                    )
                )
                await self._status.update(info.id, status=TaskStatusEnum.FAILED, detail="interrupted: not recoverable")
                continue

            if interrupted_midrun:
                # Recoverable
                await self._history.append(
                    TaskRun(
                        id=uuid4(),
                        task_id=info.id,
                        name=info.name,
                        status=TaskStatusEnum.INTERRUPTED,
                        attempt=info.attempt,
                        started_at=info.updated_at,
                        finished_at=now,
                        duration_ms=None,
                        error="interrupted: process restarted",
                    )
                )

            await self._status.update(info.id, status=TaskStatusEnum.PENDING, detail="requeued after restart")
            await self._queue.put(info.id)

    async def _worker(self, n: int):
        while True:
            task_id = await self._queue.get()
            try:
                if task_id is _STOP:
                    return
                await self._run(task_id)
            except Exception:
                logger.exception(f"task worker {n} crashed on {task_id}")
            finally:
                self._queue.task_done()

    async def _run(self, task_id: UUID):
        info = await self._status.get(task_id)
        if info is None or info.status == TaskStatusEnum.CANCELLED:
            # cancelled while queued
            return

        handler = self._handlers.get(info.name)
        if handler is None:
            await self._status.update(task_id, status=TaskStatusEnum.FAILED, detail=f"no handler for '{info.name}'")
            return

        async def report(progress: float, note: str | None = None):
            await self._status.update(task_id, progress=progress, detail=note)

        info.attempt = info.attempt + 1

        ctx = TaskContext(
            task_id=task_id,
            name=info.name,
            payload=info.payload,
            attempt=info.attempt,
            report_progress=report,
        )

        await self._status.update(task_id, status=TaskStatusEnum.RUNNING, attempt=info.attempt)
        started = datetime.now(UTC)

        # Run the handler as its own task so cancel(task_id) can only this task
        run = asyncio.create_task(handler(ctx), name=f"task:{info.name}:{task_id}")
        self._running[task_id] = run
        try:
            await run
        except asyncio.CancelledError:
            # user cancel
            await self._finish(info, started, TaskStatusEnum.CANCELLED, error=None)
        except Exception:
            await self._finish(info, started, TaskStatusEnum.FAILED, error=traceback.format_exc())
        else:
            await self._finish(info, started, TaskStatusEnum.SUCCEEDED, error=None)
        finally:
            self._running.pop(task_id, None)

    async def _finish(self, info: TaskInfo, started: datetime, status: TaskStatusEnum, *, error: str | None):
        finished = datetime.now(UTC)
        await self._status.update(info.id, status=status, detail=error)
        await self._history.append(
            TaskRun(
                id=uuid4(),
                task_id=info.id,
                name=info.name,
                status=status,
                attempt=info.attempt,
                started_at=started,
                finished_at=finished,
                duration_ms=int((finished - started).total_seconds() * 1000),
                error=error,
            )
        )
