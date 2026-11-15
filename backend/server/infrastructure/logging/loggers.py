from logging.config import dictConfig
from pathlib import Path

import yaml

LOGGING_SETTINGS = Path(__file__).parent / "logging.yaml"


def load_logging_config(path: Path) -> dict:
    """
    Loads logging configuration from a YAML file
    """
    with open(path) as file:
        config = yaml.safe_load(file)

    return config


def setup_logging() -> None:
    dictConfig(load_logging_config(LOGGING_SETTINGS))

