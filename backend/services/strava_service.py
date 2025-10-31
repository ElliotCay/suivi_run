"""
Strava API integration service.
Handles OAuth authentication and activity data import with best effort splits.
"""

import logging
import os
import time
from datetime import datetime
from typing import Dict, List, Optional
import requests
from sqlalchemy.orm import Session

from models import StravaToken, Workout, PersonalRecord
from services.record_detector import DISTANCE_DEFINITIONS

logger = logging.getLogger(__name__)

# Strava API configuration
STRAVA_CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
STRAVA_CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")
STRAVA_REDIRECT_URI = "http://localhost:8000/api/strava/callback"

# Strava API endpoints
STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize"
STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token"
STRAVA_API_BASE = "https://www.strava.com/api/v3"


def get_authorization_url(user_id: int) -> str:
    """
    Generate Strava OAuth authorization URL.

    Args:
        user_id: User ID for state parameter

    Returns:
        Authorization URL to redirect user to
    """
    params = {
        "client_id": STRAVA_CLIENT_ID,
        "redirect_uri": STRAVA_REDIRECT_URI,
        "response_type": "code",
        "scope": "read,activity:read_all",  # Request permission to read all activities
        "state": str(user_id),  # Pass user_id to identify user after callback
    }

    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    return f"{STRAVA_AUTH_URL}?{query_string}"


def exchange_code_for_token(code: str, db: Session, user_id: int) -> Dict:
    """
    Exchange authorization code for access token.

    Args:
        code: Authorization code from Strava callback
        db: Database session
        user_id: User ID

    Returns:
        Dict with athlete info and token status
    """
    try:
        response = requests.post(
            STRAVA_TOKEN_URL,
            data={
                "client_id": STRAVA_CLIENT_ID,
                "client_secret": STRAVA_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
            },
        )
        response.raise_for_status()
        data = response.json()

        # Extract token data
        access_token = data["access_token"]
        refresh_token = data["refresh_token"]
        expires_at = data["expires_at"]
        athlete = data.get("athlete", {})
        athlete_id = athlete.get("id")

        # Store or update token in database
        existing_token = db.query(StravaToken).filter(
            StravaToken.user_id == user_id
        ).first()

        if existing_token:
            existing_token.access_token = access_token
            existing_token.refresh_token = refresh_token
            existing_token.expires_at = expires_at
            existing_token.athlete_id = athlete_id
            existing_token.updated_at = datetime.utcnow()
        else:
            new_token = StravaToken(
                user_id=user_id,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at,
                athlete_id=athlete_id,
            )
            db.add(new_token)

        db.commit()

        logger.info(f"Successfully authenticated Strava for user {user_id}")

        return {
            "success": True,
            "athlete_name": f"{athlete.get('firstname', '')} {athlete.get('lastname', '')}",
            "athlete_id": athlete_id,
        }

    except Exception as e:
        logger.error(f"Error exchanging code for token: {e}")
        raise


def refresh_access_token(db: Session, user_id: int) -> str:
    """
    Refresh expired access token using refresh token.

    Args:
        db: Database session
        user_id: User ID

    Returns:
        New access token
    """
    token = db.query(StravaToken).filter(StravaToken.user_id == user_id).first()

    if not token:
        raise ValueError("No Strava token found for user")

    # Check if token is still valid
    if token.expires_at > int(time.time()):
        return token.access_token

    # Refresh token
    try:
        response = requests.post(
            STRAVA_TOKEN_URL,
            data={
                "client_id": STRAVA_CLIENT_ID,
                "client_secret": STRAVA_CLIENT_SECRET,
                "grant_type": "refresh_token",
                "refresh_token": token.refresh_token,
            },
        )
        response.raise_for_status()
        data = response.json()

        # Update token
        token.access_token = data["access_token"]
        token.refresh_token = data["refresh_token"]
        token.expires_at = data["expires_at"]
        token.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"Refreshed Strava token for user {user_id}")

        return token.access_token

    except Exception as e:
        logger.error(f"Error refreshing token: {e}")
        raise


def get_valid_access_token(db: Session, user_id: int) -> str:
    """
    Get a valid access token, refreshing if necessary.

    Args:
        db: Database session
        user_id: User ID

    Returns:
        Valid access token
    """
    return refresh_access_token(db, user_id)


def fetch_strava_activities(
    db: Session,
    user_id: int,
    after: Optional[int] = None,
    limit: int = 50
) -> List[Dict]:
    """
    Fetch activities from Strava API.

    Args:
        db: Database session
        user_id: User ID
        after: Unix timestamp to fetch activities after (optional)
        limit: Number of activities to fetch (max 200)

    Returns:
        List of activity summaries
    """
    access_token = get_valid_access_token(db, user_id)

    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"per_page": min(limit, 200)}

    if after:
        params["after"] = after

    try:
        response = requests.get(
            f"{STRAVA_API_BASE}/athlete/activities",
            headers=headers,
            params=params,
        )
        response.raise_for_status()
        return response.json()

    except Exception as e:
        logger.error(f"Error fetching Strava activities: {e}")
        raise


def fetch_detailed_activity(db: Session, user_id: int, activity_id: int) -> Dict:
    """
    Fetch detailed activity with best_efforts data.

    Args:
        db: Database session
        user_id: User ID
        activity_id: Strava activity ID

    Returns:
        Detailed activity data including best_efforts
    """
    access_token = get_valid_access_token(db, user_id)

    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        response = requests.get(
            f"{STRAVA_API_BASE}/activities/{activity_id}",
            headers=headers,
        )
        response.raise_for_status()
        return response.json()

    except Exception as e:
        logger.error(f"Error fetching detailed activity {activity_id}: {e}")
        raise


def extract_best_efforts_from_activity(activity: Dict) -> List[Dict]:
    """
    Extract best effort records from Strava activity.

    Args:
        activity: Detailed activity data from Strava

    Returns:
        List of best efforts with pr_rank = 1 (personal records)
    """
    best_efforts = activity.get("best_efforts", [])

    # Filter only personal records (pr_rank = 1)
    personal_records = []
    for effort in best_efforts:
        if effort.get("pr_rank") == 1:
            personal_records.append({
                "name": effort.get("name"),
                "distance": effort.get("distance"),
                "moving_time": effort.get("moving_time"),
                "elapsed_time": effort.get("elapsed_time"),
                "start_date": effort.get("start_date"),
                "activity_id": activity.get("id"),
            })

    return personal_records


def sync_best_efforts_to_records(
    db: Session,
    user_id: int,
    best_efforts: List[Dict]
) -> int:
    """
    Sync Strava best efforts to PersonalRecord table.

    Args:
        db: Database session
        user_id: User ID
        best_efforts: List of best efforts from Strava

    Returns:
        Number of records created/updated
    """
    # Map Strava distance names to our distance keys
    distance_mapping = {
        "400m": "400m",
        "1/2 mile": "800m",
        "1k": "1km",
        "1 mile": "1_mile",
        "2 mile": "2km",
        "3k": "3km",
        "5k": "5km",
        "10k": "10km",
        "15k": "15km",
        "10 mile": "10_mile",
        "20k": "20km",
        "Half-Marathon": "semi",
        "Marathon": "marathon",
    }

    updated_count = 0

    for effort in best_efforts:
        effort_name = effort.get("name")
        distance_key = distance_mapping.get(effort_name)

        if not distance_key:
            logger.warning(f"Unknown distance: {effort_name}")
            continue

        time_seconds = effort.get("moving_time")
        date_str = effort.get("start_date")

        if not time_seconds or not date_str:
            continue

        date_achieved = datetime.fromisoformat(date_str.replace("Z", "+00:00"))

        # Check existing record
        existing = db.query(PersonalRecord).filter(
            PersonalRecord.user_id == user_id,
            PersonalRecord.distance == distance_key,
            PersonalRecord.is_current == 1
        ).first()

        # Create or update record
        if existing is None or time_seconds < existing.time_seconds:
            if existing:
                # Supersede old record
                existing.is_current = 0
                existing.superseded_at = datetime.utcnow()

            # Create new record
            new_record = PersonalRecord(
                user_id=user_id,
                distance=distance_key,
                time_seconds=time_seconds,
                date_achieved=date_achieved,
                is_current=1,
                notes=f"Importé depuis Strava (activité #{effort.get('activity_id')})"
            )
            db.add(new_record)
            updated_count += 1
            logger.info(f"Created/updated record for {distance_key}: {time_seconds}s")

    db.commit()
    return updated_count
