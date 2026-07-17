from contextlib import asynccontextmanager

from fastapi import FastAPI

from server.infrastructure.tasks import Interval
from server.tasks import build_scheduler


@asynccontextmanager
async def api_server_lifespan(app: FastAPI):

    scheduler, status_store, history_store = build_scheduler(app)
    app.state.scheduler = scheduler
    app.state.task_status_store = status_store
    app.state.task_history_store = history_store

    await scheduler.start()

    await scheduler.schedule("purge_task_history", Interval(seconds=24 * 60 * 60))

    yield

    await scheduler.stop()
