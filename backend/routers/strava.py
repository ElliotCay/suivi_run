"""
Strava integration router for OAuth and activity sync.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from database import get_db
from models import StravaToken
from services import strava_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/strava/auth")
async def initiate_strava_auth(user_id: int = 1):
    """
    Initiate Strava OAuth flow.

    Redirects user to Strava authorization page.
    """
    try:
        auth_url = strava_service.get_authorization_url(user_id)
        return {"auth_url": auth_url}
    except Exception as e:
        logger.error(f"Error initiating Strava auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/strava/callback")
async def strava_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Handle Strava OAuth callback.

    Exchanges authorization code for access token and stores it.
    """
    try:
        user_id = int(state)

        result = strava_service.exchange_code_for_token(code, db, user_id)

        # Redirect to frontend settings page with success message
        return RedirectResponse(
            url=f"http://localhost:3000/settings?strava=connected&athlete={result['athlete_name']}"
        )

    except Exception as e:
        logger.error(f"Error in Strava callback: {e}")
        return RedirectResponse(
            url=f"http://localhost:3000/settings?strava=error&message={str(e)}"
        )


@router.get("/strava/status")
async def get_strava_status(
    db: Session = Depends(get_db),
    user_id: int = 1,
):
    """
    Check if user has connected Strava account.

    Returns connection status and athlete info.
    """
    token = db.query(StravaToken).filter(StravaToken.user_id == user_id).first()

    if not token:
        return {
            "connected": False,
            "athlete_id": None,
            "last_sync": None,
        }

    return {
        "connected": True,
        "athlete_id": token.athlete_id,
        "last_sync": token.last_sync.isoformat() if token.last_sync else None,
    }


@router.delete("/strava/disconnect")
async def disconnect_strava(
    db: Session = Depends(get_db),
    user_id: int = 1,
):
    """
    Disconnect Strava account.

    Removes stored OAuth tokens.
    """
    token = db.query(StravaToken).filter(StravaToken.user_id == user_id).first()

    if token:
        db.delete(token)
        db.commit()

    return {"message": "Strava account disconnected"}


@router.post("/strava/sync")
async def sync_strava_activities(
    db: Session = Depends(get_db),
    user_id: int = 1,
    limit: int = Query(50, ge=1, le=200),
):
    """
    Sync activities and best efforts from Strava.

    Fetches recent activities and extracts personal record best efforts.
    """
    try:
        # Check if Strava is connected
        token = db.query(StravaToken).filter(StravaToken.user_id == user_id).first()
        if not token:
            raise HTTPException(status_code=400, detail="Strava not connected")

        # Fetch activities
        logger.info(f"Fetching {limit} activities from Strava...")
        activities = strava_service.fetch_strava_activities(db, user_id, limit=limit)

        logger.info(f"Found {len(activities)} activities, fetching details...")

        # Fetch detailed data for running activities only
        all_best_efforts = []
        processed_count = 0

        for activity in activities:
            # Only process running activities
            if activity.get("type") not in ["Run", "VirtualRun"]:
                continue

            activity_id = activity.get("id")

            try:
                # Fetch detailed activity with best_efforts
                detailed = strava_service.fetch_detailed_activity(db, user_id, activity_id)

                # Extract personal records (pr_rank = 1)
                best_efforts = strava_service.extract_best_efforts_from_activity(detailed)

                if best_efforts:
                    all_best_efforts.extend(best_efforts)
                    logger.info(f"Activity {activity_id}: Found {len(best_efforts)} PRs")

                processed_count += 1

            except Exception as e:
                logger.warning(f"Error processing activity {activity_id}: {e}")
                continue

        # Sync best efforts to PersonalRecord table
        logger.info(f"Syncing {len(all_best_efforts)} best efforts to database...")
        updated_count = strava_service.sync_best_efforts_to_records(
            db, user_id, all_best_efforts
        )

        # Update last_sync timestamp
        token.last_sync = strava_service.datetime.utcnow()
        db.commit()

        return {
            "message": "Sync completed",
            "activities_processed": processed_count,
            "best_efforts_found": len(all_best_efforts),
            "records_updated": updated_count,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing Strava activities: {e}")
        raise HTTPException(status_code=500, detail=str(e))
