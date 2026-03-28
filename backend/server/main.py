from server.app import create_http_server
from server.const import EnvironmentsEnum
from server.runtime import bootstrap_runtime


def run_http_server_prod():
    container = bootstrap_runtime(EnvironmentsEnum.PRODUCTION)
    return create_http_server(app_context=container)


def run_http_server_dev():
    container = bootstrap_runtime(EnvironmentsEnum.DEVELOPMENT)
    return create_http_server(app_context=container)
