from __future__ import annotations

from collections.abc import Awaitable, Callable, Coroutine
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID


class TaskStatusEnum(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    # Process died mid run
    INTERRUPTED = "interrupted"


@dataclass(frozen=True, kw_only=True)
class RunNow:
    """
    Run as soon as a worker is free
    """

    pass


@dataclass(frozen=True, kw_only=True)
class RunAt:
    """
    Run once at a specific time
    """

    when: datetime


@dataclass(frozen=True, kw_only=True)
class Interval:
    """
    Run repeatedly every X seconds
    """

    seconds: float


@dataclass(frozen=True, kw_only=True)
class Cron:
    """
    Run on a cron expression
    """

    expression: str


Trigger = RunNow | RunAt | Interval | Cron


@dataclass(kw_only=True)
class TaskContext:
    """
    What handler receives when it runs
    """

    task_id: UUID
    name: str
    # Payload must be json serializable
    payload: dict[str, Any]
    attempt: int
    # Report progress between [0, 1] with an optional human readable note
    report_progress: Callable[[float, str | None], Awaitable[None]]


TaskHandler = Callable[[TaskContext], Coroutine[Any, Any, None]]


@dataclass(kw_only=True)
class TaskInfo:
    """
    Current state of task
    """

    id: UUID
    name: str
    subject: str | None
    status: TaskStatusEnum
    attempt: int
    # persisted so worker can rerun it after a restart
    payload: dict[str, Any]
    progress: float | None
    # progress note
    detail: str | None
    dedup_key: str | None
    created_at: datetime
    updated_at: datetime


@dataclass(kw_only=True)
class TaskRun:
    """
    History record of the run
    """

    id: UUID
    task_id: UUID
    name: str
    subject: str | None
    status: TaskStatusEnum
    attempt: int
    started_at: datetime
    finished_at: datetime | None
    duration_ms: int | None
    # traceback
    error: str | None
