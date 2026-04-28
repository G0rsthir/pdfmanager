import asyncio
import contextlib

from alembic import context
from sqlalchemy.engine import Connection

from server.infrastructure.database.interface import get_database_interface
from server.settings import AppEnvSettings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

settings = AppEnvSettings()
db_interface = get_database_interface(settings.DATABASE_URL)
dialect = db_interface.dialect

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = db_interface.sa_metadata

# Load DB schema
import server.models  # noqa: E402, F401


def include_object(object, name, type_, reflected, compare_to):

    # Exclude FTS tables
    if type_ == "table":
        if "_fts" in name:
            return False
    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well. By skipping the Engine creation,
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = db_interface.config.connection_url
    context.script.version_locations = [db_interface.config.versions_folder]

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # use batch mode on sqlite
        # https://alembic.sqlalchemy.org/en/latest/batch.html#batch-migrations
        render_as_batch=dialect.name == "sqlite",
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


@contextlib.contextmanager
def disable_sqlite_foreign_keys(context):
    """
    Disable foreign key constraints on SQLite.
    https://alembic.sqlalchemy.org/en/latest/batch.html#batch-migrations
    """
    if dialect.name == "sqlite":
        context.execute("PRAGMA foreign_keys=OFF")

    yield

    if dialect.name == "sqlite":
        context.execute("PRAGMA foreign_keys=ON")


def do_run_migrations(connection: Connection) -> None:
    context.script.version_locations = [db_interface.config.versions_folder]

    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        # use batch mode on sqlite
        # https://alembic.sqlalchemy.org/en/latest/batch.html#batch-migrations
        render_as_batch=dialect.name == "sqlite",
        compare_type=True,
        include_object=include_object,
    )
    with disable_sqlite_foreign_keys(context):
        with context.begin_transaction():
            context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario, we need to create an Engine
    and associate a connection with the context.

    """
    engine = db_interface.engine()

    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await engine.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    try:
        asyncio.get_running_loop()
        raise AssertionError(
            "You can't run an async function from a sync function. Restructure your code or use threads."
        )
    except RuntimeError:
        asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
