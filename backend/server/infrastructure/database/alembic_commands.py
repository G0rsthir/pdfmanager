from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

from alembic import command as alembic_commands
from alembic import script as alembic_script
from alembic.config import Config as AlembicConfig
from alembic.runtime import migration as alembic_migration
from sqlalchemy import Connection

from server.exceptions import ConfigurationError

if TYPE_CHECKING:
    from .configurations import DatabaseConfigurationBase


@dataclass
class MigrationsState:
    current: str | None
    head: str | None

    def is_up_to_date(self) -> bool:
        return self.head == self.current


def get_alembic_config() -> AlembicConfig:
    """
    Get the Alembic configuration.
    """
    alembic_dir = Path(__file__).parent
    if not alembic_dir.joinpath("alembic.ini").exists():
        raise ConfigurationError(f"Could not find alembic.ini at {alembic_dir}/alembic.ini")

    return AlembicConfig(alembic_dir / "alembic.ini")


def check_pending_migrations(conn: Connection, config: DatabaseConfigurationBase) -> MigrationsState:
    """
    Check if there are any pending migrations by comparing the current
    database revision with the latest available migration (head).
    """
    script_ = alembic_script.ScriptDirectory.from_config(get_alembic_config())
    script_.version_locations = [config.versions_folder]
    context_ = alembic_migration.MigrationContext.configure(connection=conn)
    return MigrationsState(current=context_.get_current_revision(), head=script_.get_current_head())


def downgrade(revision: str = "-1"):
    """
    Downgrade the database to the specified revision.
    """
    alembic_commands.downgrade(config=get_alembic_config(), revision=revision)


def upgrade(revision: str = "head", dry_run: bool = False):
    """
    Upgrade the database to the specified revision.
    """
    alembic_commands.upgrade(get_alembic_config(), revision, sql=dry_run)


def revision(message: str | None = None, autogenerate: bool = True):
    """
    Create a new migration.
    """
    alembic_commands.revision(get_alembic_config(), message=message, autogenerate=autogenerate)
