from uuid import UUID

from fastapi import FastAPI

from server.dependencies import get_file_repository, get_search_engine
from server.infrastructure.database.interface import SessionFactory
from server.infrastructure.storage import StorageBackend
from server.infrastructure.tasks import TaskContext
from server.infrastructure.tasks.in_process import InProcessTaskScheduler
from server.infrastructure.tasks.stores import SqlTaskHistoryStore, SqlTaskStatusStore
from server.runtime import RuntimeContainer
from server.services.indexing import IndexingService


def _index_pdf_handler(session_factory: SessionFactory, storage_backend: StorageBackend):
    async def handler(ctx: TaskContext) -> None:
        file_id = UUID(ctx.payload["file_id"])

        await ctx.report_progress(0.0, "extracting text")

        async with session_factory() as session:
            search_engine = get_search_engine(session)
            file_repo = get_file_repository(session)

            service = IndexingService(
                storage_backend=storage_backend,
                search_engine=search_engine,
                file_repo=file_repo,
            )
            await service.index_pdf_file(file_id)

        await ctx.report_progress(1.0, "indexed")

    return handler


def _purge_history_handler(
    history_store: SqlTaskHistoryStore, status_store: SqlTaskStatusStore, *, keep_last: int = 50
):
    async def handler(ctx: TaskContext) -> None:
        tasks_removed = await status_store.trim(keep_last)
        runs_removed = await history_store.trim(keep_last)
        await ctx.report_progress(1.0, f"trimmed {tasks_removed} tasks + {runs_removed} runs")

    return handler


def build_scheduler(app: FastAPI) -> InProcessTaskScheduler:

    app_context: RuntimeContainer = app.state.app_context
    storage_backend: StorageBackend = app.state.storage_backend
    session_factory = app_context.db.get_session_context

    status_store = SqlTaskStatusStore(session_factory)
    history_store = SqlTaskHistoryStore(session_factory)

    scheduler = InProcessTaskScheduler(status_store, history_store, concurrency=2)

    scheduler.register(
        "index_pdf",
        _index_pdf_handler(
            session_factory=session_factory,
            storage_backend=storage_backend,
        ),
    )
    scheduler.register(
        "purge_task_history", _purge_history_handler(history_store=history_store, status_store=status_store)
    )

    return scheduler
