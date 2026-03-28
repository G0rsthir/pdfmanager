from logging import getLogger
from pathlib import Path

from server.exceptions import ConfigurationError
from server.infrastructure.utils import async_to_sync, file_backup

from .alembic_commands import MigrationsState, check_pending_migrations
from .interface import DBInterface


class MigrationRunner:
    def __init__(self, db_interface: DBInterface):
        self.db = db_interface
        self.logger = getLogger(__name__)

    def check_status(self) -> MigrationsState:
        async def check_migration_status():
            async with self.db.engine().connect() as conn:
                return await conn.run_sync(check_pending_migrations, self.db.config)

        return async_to_sync(check_migration_status)

    def downgrade(self, revision: str = "-1"):
        self.logger.info("Starting database downgrade")
        self.db.run_migrations_downgrade(revision=revision)
        self.logger.info(f"Database downgrade to revision {revision} succeeded!")

    def revision(self, message: str | None = None, autogenerate: bool = True):
        self.logger.info("Creating migration file")
        self.db.run_migrations_revision(message=message, autogenerate=autogenerate)
        self.logger.info("Creating new migration file succeeded!")

    def run_upgrade(self, revision: str):
        self.logger.info("Running database upgrade")
        self.db.run_migrations_upgrade(revision=revision)
        self.logger.info("Database upgrade succeeded")

    def upgrade(self, revision: str = "head", skip_backup: bool = False):
        dialect = self.db.dialect
        db_name = self.db.url.database
        self.logger.info(f"Initiating {dialect.name} database upgrade")
        match dialect.name:
            case "sqlite":
                if skip_backup or db_name == ":memory:":
                    self.run_upgrade(revision)
                    return

                if not db_name:
                    raise ConfigurationError(
                        f"Database name is missing, but it is required to proceed with the operation. Value: `{db_name}`"
                    )
                db_file_path = Path(db_name).resolve()
                self.logger.info(f"Creating database backup: `{db_file_path}.bak`")
                with file_backup(file_path=db_file_path, delete_on_success=False, suffix=".bak"):
                    try:
                        self.run_upgrade(revision)
                    except Exception:
                        self.logger.error("Upgrade failed, the database has been restored to its previous state.")
                        raise
            case _:
                self.logger.warning(f"Non-SQLite database detected: {dialect.name}")
                self.logger.warning("Proceeding without backup.")
                self.run_upgrade(revision)
