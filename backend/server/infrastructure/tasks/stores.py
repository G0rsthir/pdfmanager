from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import JSON, CursorResult, Result, delete, func, select
from sqlalchemy.orm import Mapped, mapped_column

from server.infrastructure.database.base import AuditMixin, Base, DateTimeUTC
from server.infrastructure.database.interface import SessionFactory
from server.infrastructure.tasks._domain import TaskInfo, TaskRun, TaskStatusEnum
from server.infrastructure.tasks._interface import TaskHistoryStore, TaskStatusStore

_ACTIVE = [TaskStatusEnum.PENDING.value, TaskStatusEnum.RUNNING.value]

_COMPLETE = (
    TaskStatusEnum.SUCCEEDED.value,
    TaskStatusEnum.FAILED.value,
    TaskStatusEnum.CANCELLED.value,
    TaskStatusEnum.INTERRUPTED.value,
)


class ORMTask(Base, AuditMixin):
    __tablename__ = "tasks"

    name: Mapped[str]
    subject: Mapped[str | None] = mapped_column(default=None)
    status: Mapped[str] = mapped_column(index=True)
    attempt: Mapped[int] = mapped_column(default=1)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    progress: Mapped[float | None] = mapped_column(default=None)
    detail: Mapped[str | None] = mapped_column(default=None)
    dedup_key: Mapped[str | None] = mapped_column(default=None, index=True)


class ORMTaskRun(Base, AuditMixin):
    __tablename__ = "task_runs"

    task_id: Mapped[UUID] = mapped_column(index=True)
    name: Mapped[str] = mapped_column(index=True)
    status: Mapped[str]
    attempt: Mapped[int]
    subject: Mapped[str | None] = mapped_column(default=None)
    started_at: Mapped[datetime] = mapped_column(DateTimeUTC(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTimeUTC(timezone=True), default=None)
    duration_ms: Mapped[int | None] = mapped_column(default=None)
    error: Mapped[str | None] = mapped_column(default=None)


def _to_info(row: ORMTask) -> TaskInfo:
    return TaskInfo(
        id=row.id,
        name=row.name,
        subject=row.subject,
        status=TaskStatusEnum(row.status),
        attempt=row.attempt,
        payload=row.payload or {},
        progress=row.progress,
        detail=row.detail,
        dedup_key=row.dedup_key,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _to_run(row: ORMTaskRun) -> TaskRun:
    return TaskRun(
        id=row.id,
        task_id=row.task_id,
        subject=row.subject,
        name=row.name,
        status=TaskStatusEnum(row.status),
        attempt=row.attempt,
        started_at=row.started_at,
        finished_at=row.finished_at,
        duration_ms=row.duration_ms,
        error=row.error,
    )


def _rowcount(result: Result[Any]) -> int:
    if isinstance(result, CursorResult):
        return result.rowcount
    return 0


class SqlTaskStatusStore(TaskStatusStore):
    def __init__(self, session_factory: SessionFactory):
        self._session = session_factory

    async def create(self, info: TaskInfo):
        async with self._session() as session:
            session.add(
                ORMTask(
                    id=info.id,
                    name=info.name,
                    status=info.status.value,
                    attempt=info.attempt,
                    payload=info.payload,
                    progress=info.progress,
                    detail=info.detail,
                    dedup_key=info.dedup_key,
                    subject=info.subject,
                )
            )
            await session.commit()

    async def update(
        self,
        task_id: UUID,
        *,
        status: TaskStatusEnum | None = None,
        progress: float | None = None,
        detail: str | None = None,
        attempt: int | None = None,
    ):
        async with self._session() as session:
            row = await session.get(ORMTask, task_id)
            if row is None:
                return
            if status is not None:
                row.status = status.value
            if progress is not None:
                row.progress = progress
            if detail is not None:
                row.detail = detail
            if attempt is not None:
                row.attempt = attempt
            await session.commit()

    async def get(self, task_id: UUID) -> TaskInfo | None:
        async with self._session() as session:
            row = await session.get(ORMTask, task_id)
            return _to_info(row) if row else None

    async def list_active(self) -> Sequence[TaskInfo]:
        async with self._session() as session:
            stmt = select(ORMTask).where(ORMTask.status.in_(_ACTIVE))
            return [_to_info(r) for r in await session.scalars(stmt)]

    async def find_active(self, name: str, dedup_key: str) -> TaskInfo | None:
        async with self._session() as session:
            stmt = select(ORMTask).where(
                ORMTask.name == name,
                ORMTask.dedup_key == dedup_key,
                ORMTask.status.in_(_ACTIVE),
            )
            row = await session.scalar(stmt)
            return _to_info(row) if row else None

    async def trim(self, keep_last: int) -> int:
        async with self._session() as session:
            rn = (
                func.row_number()
                .over(
                    partition_by=ORMTask.name,
                    order_by=ORMTask.updated_at.desc(),
                )
                .label("rn")
            )
            ranked = select(ORMTask.id, rn).where(ORMTask.status.in_(_COMPLETE)).subquery()
            doomed = select(ranked.c.id).where(ranked.c.rn > keep_last)
            result = await session.execute(delete(ORMTask).where(ORMTask.id.in_(doomed)))
            await session.commit()
            return _rowcount(result)


class SqlTaskHistoryStore(TaskHistoryStore):
    def __init__(self, session_factory: SessionFactory):
        self._session = session_factory

    async def append(self, run: TaskRun):
        async with self._session() as session:
            session.add(
                ORMTaskRun(
                    id=run.id,
                    task_id=run.task_id,
                    name=run.name,
                    status=run.status.value,
                    attempt=run.attempt,
                    started_at=run.started_at,
                    finished_at=run.finished_at,
                    duration_ms=run.duration_ms,
                    error=run.error,
                    subject=run.subject,
                )
            )
            await session.commit()

    async def list_by_task_id(self, task_id: UUID) -> Sequence[TaskRun]:
        async with self._session() as session:
            stmt = select(ORMTaskRun).where(ORMTaskRun.task_id == task_id).order_by(ORMTaskRun.started_at.desc())
            return [_to_run(r) for r in await session.scalars(stmt)]

    async def list_recent(
        self, *, name: str | None = None, limit: int = 50, offset: int = 0
    ) -> tuple[Sequence[TaskRun], int]:
        async with self._session() as session:
            stmt = select(ORMTaskRun).order_by(ORMTaskRun.started_at.desc()).limit(limit).offset(offset)
            count_stmt = select(func.count()).select_from(ORMTaskRun)
            if name is not None:
                stmt = stmt.where(ORMTaskRun.name == name)
                count_stmt = count_stmt.where(ORMTaskRun.name == name)
            items = [_to_run(r) for r in await session.scalars(stmt)]
            total = await session.scalar(count_stmt) or 0
            return items, total

    async def trim(self, keep_last: int) -> int:
        async with self._session() as session:
            rn = (
                func.row_number()
                .over(
                    partition_by=ORMTaskRun.name,
                    order_by=ORMTaskRun.started_at.desc(),
                )
                .label("rn")
            )
            ranked = select(ORMTaskRun.id, rn).subquery()
            doomed = select(ranked.c.id).where(ranked.c.rn > keep_last)
            result = await session.execute(delete(ORMTaskRun).where(ORMTaskRun.id.in_(doomed)))
            await session.commit()
            return _rowcount(result)
