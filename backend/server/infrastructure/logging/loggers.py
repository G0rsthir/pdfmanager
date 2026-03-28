from logging.config import dictConfig
from pathlib import Path

import yaml

from server.const import LOGGING_LEVEL_WITH_DEFAULT

LOGGING_SETTINGS = Path(__file__).parent / "logging.yaml"


def load_logging_config(path: Path) -> dict:
    """
    Loads logging configuration from a YAML file.
    """
    with open(path) as file:
        config = yaml.safe_load(file)

    return config


def setup_logging(config_dir: str | Path, logging_level: LOGGING_LEVEL_WITH_DEFAULT):
    """
    Configures the logging system using settings loaded from a YAML file.
    """
    config = load_logging_config(LOGGING_SETTINGS)

    config_dir = Path(config_dir)

    # Rewrite handler logging level
    if logging_level != "DEFAULT":
        for handler in config.get("handlers", {}).values():
            handler["level"] = logging_level

    dictConfig(config)
