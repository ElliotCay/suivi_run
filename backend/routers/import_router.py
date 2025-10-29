"""
Import router for handling Apple Health data uploads.
"""

import os
import tempfile
import shutil
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from models import Workout
from services.health_parser import extract_zip, parse_workouts_xml, check_duplicate
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


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
    temp_dir = tempfile.mkdtemp()
    temp_zip_path = os.path.join(temp_dir, file.filename)

    try:
        # Save uploaded file
        with open(temp_zip_path, 'wb') as buffer:
            content = await file.read()

            # Check file size
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size is {MAX_FILE_SIZE / 1024 / 1024}MB"
                )

            buffer.write(content)

        logger.info(f"Uploaded file saved to {temp_zip_path}")

        # Extract ZIP and get export.xml path
        xml_path = extract_zip(temp_zip_path)

        # Parse workouts from XML
        parsed_workouts = parse_workouts_xml(xml_path)

        if not parsed_workouts:
            return {
                "success": True,
                "workouts_imported": 0,
                "duplicates_skipped": 0,
                "message": "No running workouts found in the export"
            }

        # Get existing workouts for duplicate checking
        existing_workouts = db.query(Workout).filter(Workout.user_id == user_id).all()
        existing_workouts_dict = [
            {
                'date': w.date.date() if isinstance(w.date, datetime) else w.date,
                'distance': w.distance,
                'duration': w.duration
            }
            for w in existing_workouts
        ]

        # Import workouts
        imported_count = 0
        duplicates_count = 0
        dates = []

        for workout_data in parsed_workouts:
            # Check for duplicates
            if check_duplicate(workout_data, existing_workouts_dict):
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
                    'trackpoint_count': gpx_data.get('trackpoint_count', 0)
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
            dates.append(workout_data['start_time'].date())

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

        logger.info(f"Import complete: {imported_count} imported, {duplicates_count} duplicates")

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

    except Exception as e:
        logger.error(f"Import error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to import data: {str(e)}"
        )

    finally:
        # Cleanup temp directory
        try:
            shutil.rmtree(temp_dir)
        except:
            pass
