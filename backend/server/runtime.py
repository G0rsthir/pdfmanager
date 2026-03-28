from dataclasses import dataclass
from pathlib import Path

from server.const import EnvironmentsEnum
from server.exceptions import ConfigurationError
from server.infrastructure.database.interface import DBInterface, get_database_interface
from server.infrastructure.database.runner import MigrationRunner
from server.settings import AppEnvSettings


@dataclass(frozen=True, kw_only=True)
class RuntimeContainer:
    env: AppEnvSettings
    db: DBInterface
    migrations: MigrationRunner


def bootstrap_runtime(enviroment: EnvironmentsEnum = EnvironmentsEnum.DEVELOPMENT) -> RuntimeContainer:
    env = AppEnvSettings(ENVIRONMENT=enviroment)

    db_interface = get_database_interface(env.DATABASE_URL)
    migrations = MigrationRunner(db_interface)

    return RuntimeContainer(
        env=env,
        db=db_interface,
        migrations=migrations,
    )


def maybe_run_migrations(migrations: MigrationRunner):
    """
    Run database migrations on server startup.
    """

    state = migrations.check_status()

    if state.is_up_to_date():
        migrations.logger.info("Database up to date")
        return

    migrations.logger.warning("The database is not up-to-date. Running migrations")
    if migrations.db.dialect.name != "sqlite":
        migrations.upgrade(revision="head", skip_backup=True)
    else:
        migrations.upgrade(revision="head")


def validate_server_startup(env: AppEnvSettings):
    if not env.ACCESS_JWT_SECRET:
        raise ConfigurationError("APP_ACCESS_JWT_SECRET is not configured. Set this environment variable.")
    if not env.REFRESH_JWT_SECRET:
        raise ConfigurationError("APP_REFRESH_JWT_SECRET is not configured. Set this environment variable.")

    Path(env.STORAGE_DIR).mkdir(parents=True, exist_ok=True)
