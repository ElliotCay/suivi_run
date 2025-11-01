"""
Strava OAuth and sync router.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from database import get_db
from models import StravaConnection
from services import strava_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/strava/auth-url")
async def get_strava_auth_url(user_id: int = 1):
    """
    Get Strava OAuth authorization URL.

    Returns URL to redirect user to for Strava authorization.
    """
    # Use user_id as state for CSRF protection
    state = str(user_id)
    auth_url = strava_service.get_authorization_url(state=state)

    return {
        "auth_url": auth_url,
        "client_id": strava_service.STRAVA_CLIENT_ID
    }


@router.get("/strava/callback")
async def strava_oauth_callback(
    code: str = Query(...),
    scope: str = Query(...),
    state: str = Query(None),
    db: Session = Depends(get_db),
):
    """
    Handle Strava OAuth callback.

    This endpoint is called by Strava after user authorizes the app.
    """
    try:
        # Exchange code for token
        token_data = strava_service.exchange_code_for_token(code)

        # Extract user_id from state
        user_id = int(state) if state else 1

        # Check if connection already exists
        existing = db.query(StravaConnection).filter(
            StravaConnection.user_id == user_id
        ).first()

        if existing:
            # Update existing connection
            existing.strava_athlete_id = token_data["athlete"]["id"]
            existing.access_token = token_data["access_token"]
            existing.refresh_token = token_data["refresh_token"]
            existing.expires_at = token_data["expires_at"]
            existing.scope = scope
            existing.athlete_data = token_data["athlete"]
            existing.updated_at = datetime.utcnow()

            db.commit()
            db.refresh(existing)

            connection = existing
        else:
            # Create new connection
            connection = StravaConnection(
                user_id=user_id,
                strava_athlete_id=token_data["athlete"]["id"],
                access_token=token_data["access_token"],
                refresh_token=token_data["refresh_token"],
                expires_at=token_data["expires_at"],
                scope=scope,
                athlete_data=token_data["athlete"],
            )

            db.add(connection)
            db.commit()
            db.refresh(connection)

        logger.info(f"Strava connected for user {user_id}, athlete {connection.strava_athlete_id}")

        return {
            "success": True,
            "athlete": token_data["athlete"],
            "message": "Strava account connected successfully"
        }

    except Exception as e:
        logger.error(f"Strava OAuth callback error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/strava/status")
async def get_strava_status(
    db: Session = Depends(get_db),
    user_id: int = 1
):
    """
    Get Strava connection status for a user.
    """
    connection = db.query(StravaConnection).filter(
        StravaConnection.user_id == user_id
    ).first()

    if not connection:
        return {
            "connected": False,
            "athlete": None,
            "last_sync": None,
            "auto_sync_enabled": False
        }

    return {
        "connected": True,
        "athlete": connection.athlete_data,
        "last_sync": connection.last_sync.isoformat() if connection.last_sync else None,
        "auto_sync_enabled": connection.auto_sync_enabled,
        "strava_athlete_id": connection.strava_athlete_id
    }


@router.post("/strava/sync")
async def sync_strava_activities(
    db: Session = Depends(get_db),
    user_id: int = 1,
    limit: int = Query(30, ge=1, le=200)
):
    """
    Manually trigger Strava activity sync.

    Args:
        limit: Maximum number of activities to sync (default 30, max 200)
    """
    try:
        result = strava_service.sync_strava_activities(db, user_id, limit=limit)

        return {
            "success": True,
            **result
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Strava sync error: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.delete("/strava/disconnect")
async def disconnect_strava(
    db: Session = Depends(get_db),
    user_id: int = 1
):
    """
    Disconnect Strava account.
    """
    connection = db.query(StravaConnection).filter(
        StravaConnection.user_id == user_id
    ).first()

    if not connection:
        raise HTTPException(status_code=404, detail="No Strava connection found")

    db.delete(connection)
    db.commit()

    logger.info(f"Strava disconnected for user {user_id}")

    return {
        "success": True,
        "message": "Strava account disconnected"
    }


@router.put("/strava/auto-sync")
async def toggle_auto_sync(
    enabled: bool,
    db: Session = Depends(get_db),
    user_id: int = 1
):
    """
    Enable or disable auto-sync for Strava activities.
    """
    connection = db.query(StravaConnection).filter(
        StravaConnection.user_id == user_id
    ).first()

    if not connection:
        raise HTTPException(status_code=404, detail="No Strava connection found")

    connection.auto_sync_enabled = enabled
    connection.updated_at = datetime.utcnow()

    db.commit()

    return {
        "success": True,
        "auto_sync_enabled": enabled
    }
