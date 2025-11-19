"""
Strava OAuth and API integration service.
Handles authentication, token management, and activity syncing.
"""

import os
import time
from datetime import datetime
from typing import Dict, List, Optional
import logging

import requests
from sqlalchemy.orm import Session

from models import StravaConnection, Workout
from services.personal_records_service import update_personal_records_from_workout

logger = logging.getLogger(__name__)

# Strava OAuth configuration
STRAVA_CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
STRAVA_CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")
STRAVA_REDIRECT_URI = os.getenv("STRAVA_REDIRECT_URI", "http://localhost:3000/strava/callback")

STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize"
STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token"
STRAVA_API_BASE = "https://www.strava.com/api/v3"


def get_authorization_url(state: Optional[str] = None) -> str:
    """
    Generate Strava OAuth authorization URL.

    Args:
        state: Optional state parameter for CSRF protection

    Returns:
        Authorization URL to redirect user to
    """
    params = {
        "client_id": STRAVA_CLIENT_ID,
        "redirect_uri": STRAVA_REDIRECT_URI,
        "response_type": "code",
        "scope": "read,activity:read_all,activity:read",
        "approval_prompt": "auto",
    }

    if state:
        params["state"] = state

    url = f"{STRAVA_AUTH_URL}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
    return url


def exchange_code_for_token(code: str) -> Dict:
    """
    Exchange authorization code for access token.

    Args:
        code: Authorization code from OAuth callback

    Returns:
        Token response from Strava
    """
    data = {
        "client_id": STRAVA_CLIENT_ID,
        "client_secret": STRAVA_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
    }

    response = requests.post(STRAVA_TOKEN_URL, data=data)
    response.raise_for_status()

    return response.json()


def refresh_access_token(refresh_token: str) -> Dict:
    """
    Refresh an expired access token.

    Args:
        refresh_token: Refresh token from previous auth

    Returns:
        New token response
    """
    data = {
        "client_id": STRAVA_CLIENT_ID,
        "client_secret": STRAVA_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    response = requests.post(STRAVA_TOKEN_URL, data=data)
    response.raise_for_status()

    return response.json()


def ensure_valid_token(db: Session, user_id: int) -> Optional[StravaConnection]:
    """
    Ensure user has a valid Strava access token, refreshing if needed.

    Args:
        db: Database session
        user_id: User ID

    Returns:
        StravaConnection with valid token, or None if not connected
    """
    connection = db.query(StravaConnection).filter(
        StravaConnection.user_id == user_id
    ).first()

    if not connection:
        return None

    # Check if token is expired (with 5 minute buffer)
    now = int(time.time())
    if connection.expires_at <= now + 300:
        logger.info(f"Refreshing expired Strava token for user {user_id}")

        try:
            token_data = refresh_access_token(connection.refresh_token)

            # Update connection with new tokens
            connection.access_token = token_data["access_token"]
            connection.refresh_token = token_data["refresh_token"]
            connection.expires_at = token_data["expires_at"]
            connection.updated_at = datetime.utcnow()

            db.commit()
            db.refresh(connection)

            logger.info(f"Successfully refreshed token for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to refresh token for user {user_id}: {e}")
            return None

    return connection


def fetch_strava_activities(
    access_token: str,
    after: Optional[int] = None,
    per_page: int = 30
) -> List[Dict]:
    """
    Fetch activities from Strava API.

    Args:
        access_token: Valid Strava access token
        after: Unix timestamp to fetch activities after (optional)
        per_page: Number of activities per page

    Returns:
        List of activity dictionaries
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"per_page": per_page}

    if after:
        params["after"] = after

    response = requests.get(
        f"{STRAVA_API_BASE}/athlete/activities",
        headers=headers,
        params=params
    )
    response.raise_for_status()

    return response.json()


def fetch_activity_streams(access_token: str, activity_id: int) -> Dict:
    """
    Fetch detailed streams (GPS, heart rate, etc.) for an activity.

    Args:
        access_token: Valid Strava access token
        activity_id: Strava activity ID

    Returns:
        Activity streams dictionary
    """
    headers = {"Authorization": f"Bearer {access_token}"}

    # Request all available stream types
    stream_types = "time,latlng,distance,altitude,heartrate,cadence,watts,temp"

    response = requests.get(
        f"{STRAVA_API_BASE}/activities/{activity_id}/streams",
        headers=headers,
        params={"keys": stream_types, "key_by_type": True}
    )
    response.raise_for_status()

    return response.json()


def convert_strava_activity_to_workout(activity: Dict, streams: Optional[Dict] = None) -> Dict:
    """
    Convert Strava activity to our Workout format.

    Args:
        activity: Strava activity dictionary
        streams: Optional activity streams

    Returns:
        Workout data dictionary
    """
    # Only import running activities
    if activity.get("type") != "Run":
        return None

    # Extract basic metrics
    workout_data = {
        "start_time": datetime.fromisoformat(activity["start_date"].replace("Z", "+00:00")),
        "end_time": datetime.fromisoformat(activity["start_date"].replace("Z", "+00:00")),
        "distance": float(activity["distance"]) / 1000,  # Convert meters to km
        "duration": int(activity["moving_time"]),  # seconds
        "elevation_gain": float(activity.get("total_elevation_gain", 0)) if activity.get("total_elevation_gain") else None,
        "source": "strava",
    }

    # Calculate end time
    if workout_data["duration"]:
        from datetime import timedelta
        workout_data["end_time"] = workout_data["start_time"] + timedelta(seconds=workout_data["duration"])

    # Calculate average pace (seconds per km)
    if workout_data["distance"] and workout_data["distance"] > 0:
        workout_data["avg_pace"] = workout_data["duration"] / workout_data["distance"]

    # Heart rate metrics
    if activity.get("average_heartrate"):
        workout_data["avg_hr"] = int(activity["average_heartrate"])
    if activity.get("max_heartrate"):
        workout_data["max_hr"] = int(activity["max_heartrate"])

    # Calculate best efforts from streams if available
    best_efforts = {}
    if streams and "time" in streams and "distance" in streams:
        from services.gpx_parser import calculate_best_efforts

        # Build distance-time series from streams
        time_data = streams["time"]["data"]
        distance_data = streams["distance"]["data"]

        distance_time_series = [
            {"distance": d, "time": t, "timestamp": None}
            for d, t in zip(distance_data, time_data)
        ]

        best_efforts = calculate_best_efforts(distance_time_series)

    # Store raw Strava data and best efforts
    workout_data["raw_data"] = {
        "strava_activity_id": activity["id"],
        "strava_name": activity.get("name"),
        "average_speed_mps": activity.get("average_speed"),
        "max_speed_mps": activity.get("max_speed"),
        "suffer_score": activity.get("suffer_score"),
        "best_efforts": best_efforts,
    }

    return workout_data


def sync_strava_activities(db: Session, user_id: int, limit: int = 30) -> Dict:
    """
    Sync Strava activities for a user.

    Args:
        db: Database session
        user_id: User ID
        limit: Maximum number of activities to sync

    Returns:
        Sync summary dictionary
    """
    # Get valid connection
    connection = ensure_valid_token(db, user_id)
    if not connection:
        raise ValueError("No valid Strava connection found")

    # Determine sync start point
    after_timestamp = None
    if connection.last_sync:
        after_timestamp = int(connection.last_sync.timestamp())

        # Detect if last_sync is in the future (system date issue)
        current_timestamp = int(time.time())
        if after_timestamp > current_timestamp:
            logger.warning(
                f"WARNING: last_sync ({connection.last_sync.isoformat()}, timestamp={after_timestamp}) "
                f"is in the future compared to current time (timestamp={current_timestamp}). "
                f"This likely indicates a system date issue. "
                f"Falling back to sync from 90 days ago to recover activities."
            )
            # Fall back to 90 days ago
            after_timestamp = current_timestamp - (90 * 24 * 60 * 60)
        else:
            logger.info(f"Syncing activities after {connection.last_sync.isoformat()} (timestamp: {after_timestamp})")
    else:
        logger.info(f"First sync for user {user_id} - fetching all activities")

    # Fetch activities
    logger.info(f"Fetching Strava activities for user {user_id}, after={after_timestamp}, limit={limit}")
    activities = fetch_strava_activities(
        connection.access_token,
        after=after_timestamp,
        per_page=limit
    )

    logger.info(f"Fetched {len(activities)} activities from Strava API")

    # Log activity types for debugging
    activity_types = {}
    for act in activities:
        act_type = act.get("type", "Unknown")
        activity_types[act_type] = activity_types.get(act_type, 0) + 1
    logger.info(f"Activity types breakdown: {activity_types}")

    imported_count = 0
    skipped_count = 0
    prs_updated = 0
    skip_reasons = {"non_run": 0, "already_exists": 0, "conversion_failed": 0, "error": 0}

    for idx, activity in enumerate(activities, 1):
        activity_id = activity.get('id')
        activity_name = activity.get('name', 'Unnamed')
        activity_type = activity.get('type', 'Unknown')
        activity_date = activity.get('start_date', 'Unknown date')

        logger.info(f"Processing activity {idx}/{len(activities)}: {activity_name} (ID: {activity_id}, Type: {activity_type}, Date: {activity_date})")

        try:
            # Skip non-running activities
            if activity.get("type") != "Run":
                logger.info(f"  -> Skipping activity {activity_id}: Type is '{activity_type}' (not Run)")
                skipped_count += 1
                skip_reasons["non_run"] += 1
                continue

            # Check if already imported
            # SQLAlchemy JSON queries work differently, so we fetch all strava workouts and check in Python
            logger.debug(f"  -> Checking if activity {activity_id} already exists...")
            strava_workouts = db.query(Workout).filter(
                Workout.user_id == user_id,
                Workout.source == "strava"
            ).all()

            existing = any(
                w.raw_data and w.raw_data.get("strava_activity_id") == activity["id"]
                for w in strava_workouts
            )

            if existing:
                logger.info(f"  -> Skipping activity {activity_id}: Already imported")
                skipped_count += 1
                skip_reasons["already_exists"] += 1
                continue

            logger.info(f"  -> Activity {activity_id} is new, fetching detailed streams...")

            # Fetch detailed streams for best efforts
            streams = None
            try:
                streams = fetch_activity_streams(connection.access_token, activity["id"])
                stream_types = list(streams.keys()) if streams else []
                logger.info(f"  -> Successfully fetched streams: {stream_types}")
            except Exception as e:
                logger.warning(f"  -> Failed to fetch streams for activity {activity['id']}: {e}")

            # Convert to workout format
            logger.debug(f"  -> Converting activity {activity_id} to workout format...")
            workout_data = convert_strava_activity_to_workout(activity, streams)
            if not workout_data:
                logger.warning(f"  -> Skipping activity {activity_id}: Conversion to workout failed")
                skipped_count += 1
                skip_reasons["conversion_failed"] += 1
                continue

            # Log workout metrics
            logger.info(f"  -> Workout metrics: distance={workout_data.get('distance')}km, duration={workout_data.get('duration')}s, avg_pace={workout_data.get('avg_pace')}s/km")

            # Check for best efforts
            best_efforts = workout_data["raw_data"].get("best_efforts", {})
            if best_efforts:
                logger.info(f"  -> Best efforts calculated: {list(best_efforts.keys())}")
                for effort_label, effort_data in best_efforts.items():
                    logger.info(f"     - {effort_label}: {effort_data.get('time_seconds')}s")
            else:
                logger.warning(f"  -> No best efforts calculated for activity {activity_id}")

            # Create workout
            logger.debug(f"  -> Creating workout record for activity {activity_id}...")
            new_workout = Workout(
                user_id=user_id,
                date=workout_data["start_time"],
                **{k: v for k, v in workout_data.items() if k != "raw_data"}
            )
            new_workout.raw_data = workout_data["raw_data"]

            db.add(new_workout)
            db.flush()  # Flush to get the workout ID
            imported_count += 1
            logger.info(f"  -> Successfully added workout {activity_id} to database")

            # 🆕 AUTO-CHARACTERIZE workout using best efforts
            try:
                from services.workout_characterization_service import characterize_workout_from_best_efforts, get_user_training_zones

                # Get user's training zones
                zones = get_user_training_zones(db, user_id)

                # Characterize the workout
                workout_type, characterization_analysis = characterize_workout_from_best_efforts(new_workout, zones)

                # Update workout with characterization
                new_workout.workout_type = workout_type

                # Store characterization analysis in raw_data
                if not new_workout.raw_data:
                    new_workout.raw_data = {}
                new_workout.raw_data["characterization_analysis"] = characterization_analysis

                logger.info(f"  -> Auto-characterized as '{workout_type}': {characterization_analysis.get('reasoning')}")

            except Exception as e:
                logger.warning(f"  -> Failed to auto-characterize workout {activity_id}: {e}")
                # Continue without characterization - not a critical error

            # Update personal records from best efforts
            if best_efforts:
                logger.info(f"  -> Updating personal records from best efforts...")
                pr_results = update_personal_records_from_workout(
                    db=db,
                    user_id=user_id,
                    workout_date=workout_data["start_time"],
                    best_efforts=best_efforts
                )
                new_prs = sum(pr_results.values())
                prs_updated += new_prs
                if new_prs > 0:
                    logger.info(f"  -> Set {new_prs} new personal records!")
                    for distance, is_pr in pr_results.items():
                        if is_pr:
                            logger.info(f"     - New PR for {distance}: {best_efforts[distance]['time_seconds']}s")
                else:
                    logger.info(f"  -> No new personal records set")

        except Exception as e:
            logger.error(f"Failed to import Strava activity {activity.get('id')}: {e}", exc_info=True)
            skipped_count += 1
            skip_reasons["error"] += 1
            continue

    # Update last sync time
    connection.last_sync = datetime.utcnow()

    db.commit()

    logger.info("=" * 80)
    logger.info(f"STRAVA SYNC SUMMARY for user {user_id}:")
    logger.info(f"  Total activities fetched: {len(activities)}")
    logger.info(f"  Activities imported: {imported_count}")
    logger.info(f"  Activities skipped: {skipped_count}")
    logger.info(f"  Skip reasons:")
    logger.info(f"    - Non-Run type: {skip_reasons['non_run']}")
    logger.info(f"    - Already exists: {skip_reasons['already_exists']}")
    logger.info(f"    - Conversion failed: {skip_reasons['conversion_failed']}")
    logger.info(f"    - Errors: {skip_reasons['error']}")
    logger.info(f"  Personal records updated: {prs_updated}")
    logger.info(f"  Last sync: {connection.last_sync.isoformat()}")
    logger.info("=" * 80)

    return {
        "imported": imported_count,
        "skipped": skipped_count,
        "personal_records_updated": prs_updated,
        "last_sync": connection.last_sync.isoformat(),
        "skip_reasons": skip_reasons
    }


def get_pending_workouts(db: Session, user_id: int, days_back: int = 30) -> List[Dict]:
    """
    Get Strava activities not yet imported or categorized.

    Returns activities from Strava that either:
    1. Haven't been imported yet
    2. Have been imported but missing feedback/categorization

    Args:
        db: Database session
        user_id: User ID
        days_back: How many days back to check (default 30)

    Returns:
        List of pending workouts with preview data
    """
    # Get valid connection
    connection = ensure_valid_token(db, user_id)
    if not connection:
        return []

    # Fetch recent activities
    from datetime import timedelta
    after_timestamp = int((datetime.utcnow() - timedelta(days=days_back)).timestamp())

    activities = fetch_strava_activities(
        connection.access_token,
        after=after_timestamp,
        per_page=100
    )

    # Filter to only running activities
    running_activities = [a for a in activities if a.get("type") == "Run"]

    # Get existing workouts
    existing_workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.source == "strava"
    ).all()

    # Create map of existing Strava IDs
    existing_strava_ids = set()
    for w in existing_workouts:
        if w.raw_data and "strava_activity_id" in w.raw_data:
            existing_strava_ids.add(w.raw_data["strava_activity_id"])

    # Find unimported activities
    pending = []
    for activity in running_activities:
        strava_id = activity["id"]

        if strava_id not in existing_strava_ids:
            # Activity not imported yet
            start_date = datetime.fromisoformat(activity["start_date"].replace("Z", "+00:00"))
            distance_km = float(activity["distance"]) / 1000
            duration_sec = int(activity["moving_time"])
            avg_pace_sec = int(duration_sec / distance_km) if distance_km > 0 else None

            pending.append({
                "strava_id": strava_id,
                "name": activity.get("name", "Run"),
                "date": start_date.isoformat(),
                "distance_km": round(distance_km, 2),
                "duration_seconds": duration_sec,
                "avg_pace_sec_per_km": avg_pace_sec,
                "elevation_gain": activity.get("total_elevation_gain", 0),
                "avg_hr": activity.get("average_heartrate"),
                "status": "not_imported"
            })

    # Sort by date (most recent first)
    pending.sort(key=lambda x: x["date"], reverse=True)

    return pending
