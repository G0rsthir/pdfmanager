from logging import getLogger
from typing import Annotated, Optional

import uvicorn
from typer import Option, Typer

from server.const import EnvironmentsEnum
from server.dependencies import get_auth_provider_repository
from server.infrastructure.utils import async_to_sync
from server.runtime import bootstrap_runtime, maybe_run_migrations, validate_server_startup

# Main CLI app
cli = Typer()

# Database CLI
database_cli = Typer(help="Commands for interacting with the database.")

# Run CLI
run_cli = Typer(help="Commands for running the application.")


cli.add_typer(database_cli, name="database")
cli.add_typer(run_cli, name="run")


@run_cli.command(name="dev")
def dev_server():
    """
    Run the server in development mode.
    """
    container = bootstrap_runtime(EnvironmentsEnum.DEVELOPMENT)

    logger = getLogger(__name__)
    logger.info("Running in development mode")
    logger.info(
        "In development mode, only the backend server starts automatically. "
        "The frontend must be started manually using a node.js environment. For more details, please refer to the developer guide."
    )

    validate_server_startup(env=container.env)

    maybe_run_migrations(migrations=container.migrations)

    uvicorn.run(app="server.main:run_http_server_dev", reload=True, factory=True, port=8000, host="0.0.0.0")


@run_cli.command(name="prod")
def prod_server():
    """
    Run the server in production mode.
    """
    container = bootstrap_runtime(EnvironmentsEnum.PRODUCTION)

    logger = getLogger(__name__)
    logger.info("Running in production mode")

    validate_server_startup(env=container.env)

    maybe_run_migrations(migrations=container.migrations)

    uvicorn.run(app="server.main:run_http_server_prod", factory=True, port=8000, host="0.0.0.0")


@database_cli.command()
def revision(
    message: Annotated[Optional[str], Option("--message", "-m", help="Migration comment")] = None,  # noqa: UP045
    autogenerate: Annotated[bool, Option(help="Use alembic autogenerate script")] = True,
):
    """
    Create a new migration.
    """
    container = bootstrap_runtime(enviroment=EnvironmentsEnum.DEVELOPMENT)
    container.migrations.revision(message=message, autogenerate=autogenerate)


@cli.command(name="disable-sso")
def disable_sso():
    """
    Boy, if you messed up while configuring SSO, run this command
    """
    container = bootstrap_runtime(EnvironmentsEnum.PRODUCTION)

    async def disable_all_auto_login():
        async with container.db.get_session_context() as session:
            provider_repo = get_auth_provider_repository(session)
            await provider_repo.disable_auto_login_for_all_providers()

    async_to_sync(disable_all_auto_login)
