"""
Auto-import router for controlling automatic Apple Health imports.
"""

from fastapi import APIRouter, HTTPException
from services.auto_import_service import get_auto_import_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/auto-import/start")
async def start_auto_import():
    """Start the automatic import service."""
    try:
        service = get_auto_import_service()
        await service.start()
        return {
            "success": True,
            "message": "Auto-import service started",
            "status": service.get_status()
        }
    except Exception as e:
        logger.error(f"Failed to start auto-import: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-import/stop")
async def stop_auto_import():
    """Stop the automatic import service."""
    try:
        service = get_auto_import_service()
        await service.stop()
        return {
            "success": True,
            "message": "Auto-import service stopped",
            "status": service.get_status()
        }
    except Exception as e:
        logger.error(f"Failed to stop auto-import: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auto-import/status")
async def get_auto_import_status():
    """Get the current status of the auto-import service."""
    try:
        service = get_auto_import_service()
        return service.get_status()
    except Exception as e:
        logger.error(f"Failed to get auto-import status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
