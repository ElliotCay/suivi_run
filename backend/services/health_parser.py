"""Apple Health XML parser for extracting running workout data."""

import logging
import os
import shutil
import tempfile
import zipfile
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterator, List, Optional

from lxml import etree

from .gpx_parser import match_gpx_to_workout, parse_gpx_file

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@contextmanager
def extract_zip(zip_path: str) -> Iterator[Path]:
    """Safely extract a ZIP archive and yield the path to ``export.xml``.

    The extraction happens inside an isolated temporary directory that is
    automatically cleaned up when the context manager exits.

    Args:
        zip_path: Path to the Apple Health export ZIP file.

    Yields:
        Path: Path object pointing to the extracted ``export.xml`` file.

    Raises:
        ValueError: If the archive does not contain ``export.xml`` or if a
            member attempts to escape the extraction directory.
        zipfile.BadZipFile: If the file is not a valid ZIP archive.
    """

    temp_dir = Path(tempfile.mkdtemp(prefix="apple_health_"))
    logger.info("Extracting ZIP to temporary directory: %s", temp_dir)

    try:
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            _safe_extract(zip_ref, temp_dir)

        export_xml_path = _locate_export_xml(temp_dir)
        logger.info("Found export.xml at: %s", export_xml_path)
        yield export_xml_path

    except zipfile.BadZipFile:
        logger.exception("Invalid ZIP file")
        raise
    except Exception:
        logger.exception("Error extracting ZIP")
        raise
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def _safe_extract(zip_ref: zipfile.ZipFile, target_dir: Path) -> None:
    """Extract ZIP members while preventing path traversal attacks."""

    target_root = target_dir.resolve()

    for member in zip_ref.infolist():
        member_path = target_dir / member.filename
        resolved_path = member_path.resolve()

        if not str(resolved_path).startswith(str(target_root)):
            raise ValueError(
                f"Unsafe ZIP entry detected: {member.filename}"
            )

    zip_ref.extractall(target_dir)


def _locate_export_xml(extracted_dir: Path) -> Path:
    """Find the export.xml file inside the extracted archive."""

    primary = extracted_dir / "apple_health_export" / "export.xml"
    if primary.exists():
        return primary

    fallback = extracted_dir / "export.xml"
    if fallback.exists():
        return fallback

    raise ValueError("export.xml not found in ZIP archive")


def parse_workouts_xml(xml_path: str) -> List[Dict]:
    """
    Parse export.xml and extract running workout data.
    Also matches and parses GPX files for detailed metrics.

    Args:
        xml_path: Path to the export.xml file

    Returns:
        List[Dict]: List of workout dictionaries with extracted data

    Raises:
        Exception: If XML parsing fails
    """
    try:
        logger.info(f"Parsing XML file: {xml_path}")
        workouts = []

        # Determine GPX folder path
        xml_dir = os.path.dirname(xml_path)
        gpx_folder = os.path.join(xml_dir, "workout-routes")
        has_gpx_folder = os.path.exists(gpx_folder)

        if has_gpx_folder:
            logger.info(f"Found GPX folder at: {gpx_folder}")
        else:
            logger.info("No workout-routes folder found, skipping GPX parsing")

        # Parse XML iteratively to handle large files
        context = etree.iterparse(xml_path, events=("end",), tag="Workout")

        for event, workout_elem in context:
            # Filter only running workouts
            workout_type = workout_elem.get("workoutActivityType")
            if workout_type != "HKWorkoutActivityTypeRunning":
                workout_elem.clear()
                continue

            try:
                workout_data = _extract_workout_data(workout_elem)
                if workout_data:
                    # Try to match and parse GPX file for this workout
                    if has_gpx_folder:
                        gpx_path = match_gpx_to_workout(gpx_folder, workout_data['start_time'])
                        if gpx_path:
                            logger.info(f"Matched GPX file: {os.path.basename(gpx_path)}")
                            gpx_data = parse_gpx_file(gpx_path)
                            if gpx_data:
                                # Add GPX metrics to workout data
                                workout_data['gpx_data'] = gpx_data
                                logger.info(f"Extracted {len(gpx_data.get('splits', []))} km splits, "
                                          f"pace variability: {gpx_data.get('pace_variability', 0)}")

                    workouts.append(workout_data)
            except Exception as e:
                logger.warning(f"Error parsing workout: {e}")

            # Clear element to free memory
            workout_elem.clear()
            while workout_elem.getprevious() is not None:
                del workout_elem.getparent()[0]

        logger.info(f"Parsed {len(workouts)} running workouts")
        return workouts

    except Exception as e:
        logger.error(f"Error parsing XML: {e}")
        raise


def _extract_workout_data(workout_elem) -> Optional[Dict]:
    """
    Extract data from a single Workout XML element.

    Args:
        workout_elem: lxml Element object representing a Workout

    Returns:
        Dict: Extracted workout data or None if required fields are missing
    """
    try:
        # Extract basic attributes
        start_date_str = workout_elem.get("startDate")
        end_date_str = workout_elem.get("endDate")
        duration_str = workout_elem.get("duration")
        duration_unit = workout_elem.get("durationUnit")

        # Skip if required fields are missing
        if not all([start_date_str, end_date_str, duration_str]):
            logger.warning("Skipping workout with missing required date/duration fields")
            return None

        # Parse dates
        start_time = _parse_date(start_date_str)
        end_time = _parse_date(end_date_str)
        date = start_time

        # Convert duration to seconds
        duration = _convert_duration_to_seconds(float(duration_str), duration_unit)

        # Extract distance from WorkoutStatistics (Apple Watch stores it there)
        distance = _extract_distance(workout_elem)

        # If no distance in WorkoutStatistics, try attribute (for other sources)
        if not distance:
            distance_str = workout_elem.get("totalDistance")
            distance_unit = workout_elem.get("totalDistanceUnit")
            if distance_str:
                distance = _convert_distance_to_km(float(distance_str), distance_unit)

        # Skip workouts with invalid distance or duration
        if not distance or distance <= 0 or duration <= 0:
            logger.warning("Skipping workout with invalid distance or duration")
            return None

        # Calculate average pace (seconds per km)
        avg_pace = duration / distance if distance > 0 else 0

        # Extract heart rate data
        avg_hr, max_hr = _extract_heart_rate(workout_elem)

        # Extract elevation gain
        elevation_gain = _extract_elevation(workout_elem)

        workout_data = {
            "date": date,
            "start_time": start_time,
            "end_time": end_time,
            "distance": round(distance, 2),
            "duration": int(duration),
            "avg_pace": round(avg_pace, 2),
            "avg_hr": avg_hr,
            "max_hr": max_hr,
            "elevation_gain": elevation_gain,
            "source": "apple_health",
        }

        return workout_data

    except Exception as e:
        logger.warning(f"Error extracting workout data: {e}")
        return None


def _parse_date(date_str: str) -> datetime:
    """
    Parse date string from Apple Health export.

    Args:
        date_str: Date string in format "YYYY-MM-DD HH:MM:SS +ZZZZ"

    Returns:
        datetime: Parsed datetime object
    """
    # Apple Health format: "2025-10-21 18:00:00 +0200"
    # Remove timezone for simplicity (store as UTC)
    date_str = date_str.rsplit(" ", 1)[0]
    return datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")


def _convert_duration_to_seconds(duration: float, unit: Optional[str]) -> float:
    """
    Convert duration to seconds.

    Args:
        duration: Duration value
        unit: Duration unit (min, h, s)

    Returns:
        float: Duration in seconds
    """
    if unit == "min":
        return duration * 60
    elif unit == "h":
        return duration * 3600
    elif unit == "s":
        return duration
    else:
        # Assume minutes if no unit specified
        return duration * 60


def _convert_distance_to_km(distance: float, unit: Optional[str]) -> float:
    """
    Convert distance to kilometers.

    Args:
        distance: Distance value
        unit: Distance unit (km, mi, m)

    Returns:
        float: Distance in kilometers
    """
    if unit == "km":
        return distance
    elif unit == "mi":
        return distance * 1.60934
    elif unit == "m":
        return distance / 1000
    else:
        # Assume km if no unit specified
        return distance


def _extract_heart_rate(workout_elem) -> tuple[Optional[int], Optional[int]]:
    """
    Extract heart rate data from WorkoutStatistics elements.

    Args:
        workout_elem: lxml Element object representing a Workout

    Returns:
        tuple: (average_hr, max_hr) or (None, None) if not found
    """
    try:
        # Look for WorkoutStatistics with heart rate type
        for stat_elem in workout_elem.findall("WorkoutStatistics"):
            stat_type = stat_elem.get("type")
            if stat_type == "HKQuantityTypeIdentifierHeartRate":
                avg_hr_str = stat_elem.get("average")
                max_hr_str = stat_elem.get("maximum")

                avg_hr = int(float(avg_hr_str)) if avg_hr_str else None
                max_hr = int(float(max_hr_str)) if max_hr_str else None

                return avg_hr, max_hr

        return None, None

    except Exception as e:
        logger.warning(f"Error extracting heart rate: {e}")
        return None, None


def _extract_distance(workout_elem) -> Optional[float]:
    """
    Extract distance from WorkoutStatistics elements.

    Args:
        workout_elem: lxml Element object representing a Workout

    Returns:
        Optional[float]: Distance in kilometers or None if not found
    """
    try:
        # Look for distance in WorkoutStatistics
        for stat_elem in workout_elem.findall("WorkoutStatistics"):
            stat_type = stat_elem.get("type")
            if stat_type == "HKQuantityTypeIdentifierDistanceWalkingRunning":
                sum_str = stat_elem.get("sum")
                unit = stat_elem.get("unit")
                if sum_str:
                    distance = float(sum_str)
                    return _convert_distance_to_km(distance, unit)

        return None

    except Exception as e:
        logger.warning(f"Error extracting distance: {e}")
        return None


def _extract_elevation(workout_elem) -> Optional[float]:
    """
    Extract elevation gain from MetadataEntry elements.

    Args:
        workout_elem: lxml Element object representing a Workout

    Returns:
        Optional[float]: Elevation gain in meters or None if not found
    """
    try:
        # Look for elevation in MetadataEntry (Apple Watch stores it there)
        for metadata_elem in workout_elem.findall("MetadataEntry"):
            key = metadata_elem.get("key")
            if key == "HKElevationAscended":
                value_str = metadata_elem.get("value")
                if value_str:
                    # Format: "824 cm"
                    elevation_cm = float(value_str.split()[0])
                    return round(elevation_cm / 100, 2)  # Convert cm to meters

        # Also check WorkoutStatistics as fallback
        for stat_elem in workout_elem.findall("WorkoutStatistics"):
            stat_type = stat_elem.get("type")
            if "Elevation" in stat_type or "Height" in stat_type:
                sum_str = stat_elem.get("sum")
                if sum_str:
                    return round(float(sum_str), 2)

        return None

    except Exception as e:
        logger.warning(f"Error extracting elevation: {e}")
        return None


def check_duplicate(
    workout_dict: Dict, existing_workouts: List
) -> bool:
    """
    Check if a workout is a duplicate of an existing workout.

    Args:
        workout_dict: Workout data dictionary to check
        existing_workouts: List of existing workout objects from database

    Returns:
        bool: True if duplicate found, False otherwise
    """
    workout_date = workout_dict["date"]
    workout_distance = workout_dict["distance"]
    workout_duration = workout_dict["duration"]

    # Check each existing workout
    for existing in existing_workouts:
        # Match by date
        existing_date = existing['date'] if isinstance(existing, dict) else existing.date.date()
        workout_date_only = workout_date.date() if hasattr(workout_date, 'date') else workout_date

        if existing_date != workout_date_only:
            continue

        # Check distance (±5% tolerance)
        existing_distance = existing['distance'] if isinstance(existing, dict) else existing.distance
        if existing_distance:
            distance_diff = abs(existing_distance - workout_distance) / workout_distance
            if distance_diff > 0.05:
                continue

        # Check duration (±5% tolerance)
        existing_duration = existing['duration'] if isinstance(existing, dict) else existing.duration
        if existing_duration:
            duration_diff = abs(existing_duration - workout_duration) / workout_duration
            if duration_diff > 0.05:
                continue

        # If we get here, it's a duplicate
        logger.info(
            f"Duplicate found: {workout_date.date()} - "
            f"{workout_distance}km - {workout_duration}s"
        )
        return True

    return False
