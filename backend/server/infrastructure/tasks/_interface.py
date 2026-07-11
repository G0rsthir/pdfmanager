from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Sequence
from typing import Any
from uuid import UUID

from server.infrastructure.tasks._domain import (
    TaskHandler,
    TaskInfo,
    TaskRun,
    TaskStatusEnum,
    Trigger,
)


class TaskScheduler(ABC):
    @abstractmethod
    def register(self, name: str, handler: TaskHandler, *, recoverable: bool = True):
        """
        Register a task handler.

        Args:
            recoverable: a task interrupted mid-run by a restart is re-queued on the next "TaskScheduler" start
        """
        pass

    @abstractmethod
    async def run(
        self,
        name: str,
        *,
        payload: dict[str, Any] | None = None,
        dedup_key: str | None = None,
    ) -> UUID:
        """
        Run 'name' as soon as possible.

        Args:
            dedup_key: Prevents a second active task for the same target (e.g. the
            same file id) from being enqueued while one is still pending/running

        Returns:
            The Task ID
        """
        pass

    @abstractmethod
    async def schedule(
        self,
        name: str,
        trigger: Trigger,
        *,
        payload: dict[str, Any] | None = None,
        schedule_id: str | None = None,
    ) -> str:
        """
        Register a schedule

        Returns:
            Stable schedule id
        """
        pass

    @abstractmethod
    async def cancel(self, task_id: UUID):
        """
        Cancel a pending or running task
        """
        pass

    @abstractmethod
    async def unschedule(self, schedule_id: str):
        """
        Remove schedule
        """
        pass

    @abstractmethod
    async def start(self):
        """
        Start workers. Bind to the app lifespan
        """
        pass

    @abstractmethod
    async def stop(self):
        """
        Stop workers gracefully. Bind to the app lifespan
        """
        pass


class TaskStatusStore(ABC):
    """
    Current state of tasks - one row per task
    """

    @abstractmethod
    async def create(self, info: TaskInfo):
        pass

    @abstractmethod
    async def update(
        self,
        task_id: UUID,
        *,
        status: TaskStatusEnum | None = None,
        progress: float | None = None,
        detail: str | None = None,
        attempt: int | None = None,
    ):
        pass

    @abstractmethod
    async def get(self, task_id: UUID) -> TaskInfo | None:
        pass

    @abstractmethod
    async def list_active(self) -> Sequence[TaskInfo]:
        """
        Tasks still PENDING / RUNNING.
        """
        pass

    @abstractmethod
    async def find_active(self, name: str, dedup_key: str) -> TaskInfo | None:
        """
        run(dedup_key=<..>): find active task (PENDING / RUNNING) for the same target
        """
        pass

    @abstractmethod
    async def trim(self, keep_last: int) -> int:
        """
        Keep only most recent records
        """
        pass


class TaskHistoryStore(ABC):
    """
    History (append only)
    """

    @abstractmethod
    async def append(self, run: TaskRun):
        pass

    @abstractmethod
    async def list_by_task_id(self, task_id: UUID) -> Sequence[TaskRun]:
        pass

    @abstractmethod
    async def list_recent(self, *, name: str | None = None, limit: int = 50, offset: int = 0) -> Sequence[TaskRun]:
        pass

    @abstractmethod
    async def trim(self, keep_last: int) -> int:
        """
        Keep only most recent records
        """
        pass
