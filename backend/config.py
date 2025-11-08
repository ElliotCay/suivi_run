"""
Configuration module for loading environment variables.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from .env file
# Use the actual project root, not the module location
project_root = Path(__file__).parent.resolve()
env_path = project_root / ".env"

# Also try to load from current working directory as fallback
load_dotenv(dotenv_path=env_path)
if not os.getenv("ICLOUD_USERNAME"):
    # Fallback to CWD if the first attempt didn't work
    load_dotenv()

# Environment variables
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./running_tracker.db")
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

# iCloud Calendar (CalDAV)
ICLOUD_USERNAME: str = os.getenv("ICLOUD_USERNAME", "")
ICLOUD_PASSWORD: str = os.getenv("ICLOUD_PASSWORD", "")
