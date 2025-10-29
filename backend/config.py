"""
Configuration module for loading environment variables.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# Environment variables
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./running_tracker.db")
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
