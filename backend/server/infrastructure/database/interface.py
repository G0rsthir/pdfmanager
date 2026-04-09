from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy import make_url
from sqlalchemy.engine import Dialect
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from . import alembic_commands
from .base import Base
from .configurations import DatabaseConfigurationBase, get_database_config, get_dialect


class DBInterface:
    def __init__(self, config: DatabaseConfigurationBase) -> None:
        self.config = config
        self.sa_metadata = Base.metadata

    def engine(self) -> AsyncEngine:
        return self.config.engine()

    def session(self) -> AsyncSession:
        engine = self.engine()
        return self.config.session(engine=engine)

    def run_migrations_downgrade(self, revision: str):
        alembic_commands.downgrade(revision=revision)

    def run_migrations_upgrade(self, revision: str = "head", dry_run: bool = False):
        alembic_commands.upgrade(revision=revision, dry_run=dry_run)

    def run_migrations_revision(self, message: str | None = None, autogenerate: bool = True):
        alembic_commands.revision(message=message, autogenerate=autogenerate)

    @property
    def dialect(self) -> type[Dialect]:
        return get_dialect(self.config.connection_url)

    @property
    def url(self):
        return make_url(self.config.connection_url)

    async def get_session(self) -> AsyncGenerator[AsyncSession]:
        """
        Provides an asynchronous session generator for database operations.

        Note: This method does not automatically commit, because commit inside an generator is not compatible with Fastapi dependencies.
        """
        session = self.session()
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    @asynccontextmanager
    async def get_session_context(self) -> AsyncGenerator[AsyncSession]:
        """
        Provides an asynchronous context manager for database operations.
        """
        session = self.session()
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_database_interface(connection_url: str) -> DBInterface:
    db_interface = DBInterface(config=get_database_config(connection_url))
    return db_interface
