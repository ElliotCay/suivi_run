"""Import router for handling Apple Health data uploads."""

import os
import tempfile
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import Workout
from services.health_parser import check_duplicate, extract_zip, parse_workouts_xml
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
UPLOAD_CHUNK_SIZE = 1024 * 1024  # 1MB


@router.post("/import/apple-health")
async def import_apple_health(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth when implemented
):
    """
    Import running workouts from Apple Health export.zip

    Args:
        file: Uploaded ZIP file
        db: Database session
        user_id: User ID (temporary hardcoded, will come from auth)

    Returns:
        Import summary with statistics
    """
    # Validate file extension
    if not file.filename.endswith('.zip'):
        raise HTTPException(
            status_code=400,
            detail="Only .zip files are accepted"
        )

    # Create temp file for upload
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_zip_path = os.path.join(temp_dir, file.filename)

        try:
            uploaded_size = 0

            with open(temp_zip_path, 'wb') as buffer:
                while True:
                    chunk = await file.read(UPLOAD_CHUNK_SIZE)
                    if not chunk:
                        break

                    uploaded_size += len(chunk)
                    if uploaded_size > MAX_FILE_SIZE:
                        raise HTTPException(
                            status_code=413,
                            detail=(
                                "File too large. Maximum size is "
                                f"{MAX_FILE_SIZE / 1024 / 1024}MB"
                            )
                        )

                    buffer.write(chunk)

            logger.info(f"Uploaded file saved to {temp_zip_path}")

            # Extract ZIP and get export.xml path
            with extract_zip(temp_zip_path) as xml_path:
                # Parse workouts from XML
                parsed_workouts = parse_workouts_xml(str(xml_path))

                if not parsed_workouts:
                    return {
                        "success": True,
                        "workouts_imported": 0,
                        "duplicates_skipped": 0,
                        "message": "No running workouts found in the export"
                    }

                # Determine relevant date range to limit duplicate checks
                workout_dates = [
                    workout['start_time']
                    for workout in parsed_workouts
                    if workout.get('start_time')
                ]

                query = db.query(Workout).filter(Workout.user_id == user_id)
                if workout_dates:
                    start_bound = min(workout_dates).replace(
                        hour=0, minute=0, second=0, microsecond=0
                    )
                    end_bound = (max(workout_dates) + timedelta(days=1)).replace(
                        hour=0, minute=0, second=0, microsecond=0
                    )
                    query = query.filter(Workout.date >= start_bound, Workout.date < end_bound)

                existing_workouts = query.all()
                existing_index = defaultdict(list)
                for existing in existing_workouts:
                    if isinstance(existing.date, datetime):
                        date_key = existing.date.date()
                    else:
                        date_key = existing.date

                    existing_index[date_key].append(
                        {
                            'date': date_key,
                            'distance': existing.distance,
                            'duration': existing.duration
                        }
                    )

                # Import workouts
                imported_count = 0
                duplicates_count = 0
                dates = []

                for workout_data in parsed_workouts:
                    workout_date = workout_data.get('date')
                    date_key = (
                        workout_date.date()
                        if hasattr(workout_date, 'date')
                        else workout_date
                    )

                    if date_key is None:
                        logger.warning("Skipping workout without date metadata")
                        continue

                    candidates = existing_index.get(date_key, [])
                    if check_duplicate(workout_data, candidates):
                        duplicates_count += 1
                        continue

                    # avg_pace is already in seconds/km from the parser
                    # Prepare raw_data including GPX metrics
                    raw_data = {
                        'avg_speed_kmh': workout_data.get('avg_speed'),
                        'source_name': workout_data.get('source')
                    }

                    # Add GPX data if available
                    if 'gpx_data' in workout_data:
                        gpx_data = workout_data['gpx_data']
                        raw_data['gpx'] = {
                            'splits': gpx_data.get('splits', []),
                            'pace_variability': gpx_data.get('pace_variability', 0),
                            'laps': gpx_data.get('laps', []),
                            'elevation_gain': gpx_data.get('elevation_gain', 0),
                            'trackpoint_count': gpx_data.get('trackpoint_count', 0),
                            'best_efforts': gpx_data.get('best_efforts', {}),
                        }

                    # Create new workout
                    new_workout = Workout(
                        user_id=user_id,
                        date=workout_data['start_time'],  # Use start_time as date
                        start_time=workout_data['start_time'],
                        end_time=workout_data['end_time'],
                        distance=workout_data['distance'],
                        duration=workout_data['duration'],
                        avg_pace=workout_data['avg_pace'],
                        avg_hr=workout_data['avg_hr'],
                        max_hr=workout_data['max_hr'],
                        elevation_gain=workout_data['elevation_gain'],
                        source='apple_watch',
                        raw_data=raw_data
                    )

                    db.add(new_workout)
                    imported_count += 1
                    dates.append(date_key)

                    existing_index[date_key].append(
                        {
                            'date': date_key,
                            'distance': workout_data['distance'],
                            'duration': workout_data['duration']
                        }
                    )

                # Commit all workouts
                db.commit()

                # Calculate date range
                date_range = None
                if dates:
                    dates.sort()
                    date_range = {
                        "start": dates[0].isoformat(),
                        "end": dates[-1].isoformat()
                    }

                logger.info(
                    "Import complete: %s imported, %s duplicates",
                    imported_count,
                    duplicates_count,
                )

                return {
                    "success": True,
                    "workouts_imported": imported_count,
                    "duplicates_skipped": duplicates_count,
                    "date_range": date_range,
                    "message": f"Successfully imported {imported_count} workouts"
                }

        except ValueError as e:
            logger.error(f"Validation error: {e}")
            raise HTTPException(status_code=400, detail=str(e))

        except HTTPException:
            # Propagate HTTP exceptions (e.g. file too large)
            raise

        except Exception as e:
            logger.error(f"Import error: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to import data: {str(e)}"
            )
