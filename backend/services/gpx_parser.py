"""
GPX file parser for extracting detailed workout metrics.
Parses second-by-second GPS data to calculate splits, pace variability, and lap times.
"""

import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import math
import logging

logger = logging.getLogger(__name__)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two GPS coordinates in meters using Haversine formula.

    Args:
        lat1, lon1: First coordinate
        lat2, lon2: Second coordinate

    Returns:
        Distance in meters
    """
    R = 6371000  # Earth's radius in meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def parse_gpx_file(file_path: str) -> Optional[Dict]:
    """
    Parse a GPX file and extract detailed workout metrics.

    Args:
        file_path: Path to GPX file

    Returns:
        Dictionary with splits, variability metrics, and lap data
    """
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()

        # Handle GPX namespace
        ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}

        # Extract all trackpoints
        trackpoints = []
        for trkpt in root.findall('.//gpx:trkpt', ns):
            lat = float(trkpt.get('lat'))
            lon = float(trkpt.get('lon'))

            ele_elem = trkpt.find('gpx:ele', ns)
            time_elem = trkpt.find('gpx:time', ns)

            elevation = float(ele_elem.text) if ele_elem is not None else None
            timestamp = datetime.fromisoformat(time_elem.text.replace('Z', '+00:00')) if time_elem is not None else None

            # Extract speed from extensions
            speed = None
            extensions = trkpt.find('gpx:extensions', ns)
            if extensions is not None:
                speed_elem = extensions.find('speed')
                if speed_elem is not None:
                    speed = float(speed_elem.text)

            trackpoints.append({
                'lat': lat,
                'lon': lon,
                'elevation': elevation,
                'timestamp': timestamp,
                'speed': speed
            })

        if not trackpoints:
            logger.warning(f"No trackpoints found in {file_path}")
            return None

        # Calculate distances and cumulative metrics
        total_distance = 0
        cumulative_data = []

        distance_time_series = []
        elapsed_time = 0.0

        if trackpoints[0]['timestamp']:
            distance_time_series.append({
                'distance': 0.0,
                'time': 0.0,
                'timestamp': trackpoints[0]['timestamp'],
            })
        else:
            distance_time_series.append({
                'distance': 0.0,
                'time': 0.0,
                'timestamp': None,
            })

        for i in range(1, len(trackpoints)):
            dist = haversine_distance(
                trackpoints[i-1]['lat'], trackpoints[i-1]['lon'],
                trackpoints[i]['lat'], trackpoints[i]['lon']
            )
            total_distance += dist

            # Calculate time difference
            time_diff = 0.0
            if trackpoints[i]['timestamp'] and trackpoints[i-1]['timestamp']:
                time_diff = (trackpoints[i]['timestamp'] - trackpoints[i-1]['timestamp']).total_seconds()

            elapsed_time += time_diff

            cumulative_data.append({
                'distance': total_distance,
                'timestamp': trackpoints[i]['timestamp'],
                'elevation': trackpoints[i]['elevation'],
                'speed': trackpoints[i]['speed'],
                'time_diff': time_diff,
                'segment_distance': dist
            })

            distance_time_series.append({
                'distance': total_distance,
                'time': elapsed_time,
                'timestamp': trackpoints[i]['timestamp'],
            })

        # Calculate km splits
        splits = calculate_km_splits(cumulative_data, total_distance / 1000)

        # Calculate pace variability
        variability = calculate_pace_variability(splits)

        # Calculate Strava-like best efforts for standard distances
        best_efforts = calculate_best_efforts(distance_time_series)

        # Detect laps (400m for track workouts)
        laps = detect_laps(cumulative_data, total_distance)

        # Calculate elevation metrics
        elevation_gain = calculate_elevation_gain(trackpoints)

        return {
            'splits': splits,
            'total_distance_km': round(total_distance / 1000, 2),
            'pace_variability': variability,
            'laps': laps,
            'elevation_gain': elevation_gain,
            'trackpoint_count': len(trackpoints),
            'best_efforts': best_efforts,
        }

    except Exception as e:
        logger.error(f"Error parsing GPX file {file_path}: {e}")
        return None


def calculate_km_splits(cumulative_data: List[Dict], total_km: float) -> List[Dict]:
    """
    Calculate 1km split times from cumulative data.

    Returns:
        List of splits with km number, time, and pace
    """
    splits = []
    km_markers = [i * 1000 for i in range(1, int(total_km) + 1)]

    if not cumulative_data:
        return splits

    start_time = cumulative_data[0]['timestamp']
    last_split_time = 0
    last_km_index = 0

    for km_target in km_markers:
        # Find the point closest to this km marker
        for i in range(last_km_index, len(cumulative_data)):
            if cumulative_data[i]['distance'] >= km_target:
                elapsed = (cumulative_data[i]['timestamp'] - start_time).total_seconds()
                split_time = elapsed - last_split_time
                pace = split_time  # seconds per km

                splits.append({
                    'km': len(splits) + 1,
                    'time': round(split_time, 1),
                    'pace': round(pace, 1),
                    'elevation': cumulative_data[i]['elevation']
                })

                last_split_time = elapsed
                last_km_index = i
                break

    return splits


def calculate_best_efforts(distance_time_series: List[Dict],
                           targets: Optional[List[Tuple[str, float]]] = None) -> Dict[str, Dict]:
    """Compute best efforts for given target distances using a sliding window.

    Args:
        distance_time_series: List of dicts with cumulative ``distance`` in meters,
            cumulative ``time`` in seconds, and optional ``timestamp``.
        targets: Optional list of tuples ``(label, distance_km)``. If ``None``,
            standard race distances are used (0.5 km, 1 km, 2 km, 5 km, 10 km,
            15 km, 21.1 km, 42.2 km).

    Returns:
        Dict mapping distance labels to effort metadata. The dictionary includes
        ``time_seconds`` and ``pace_seconds_per_km`` among other fields. Distances
        that cannot be computed (workout too short) are omitted.
    """

    if not distance_time_series or len(distance_time_series) < 2:
        return {}

    if targets is None:
        targets = [
            ("500m", 0.5),
            ("1km", 1.0),
            ("2km", 2.0),
            ("5km", 5.0),
            ("10km", 10.0),
            ("15km", 15.0),
            ("semi", 21.1),
            ("marathon", 42.2),
        ]

    efforts: Dict[str, Dict] = {}

    for label, distance_km in targets:
        target_m = distance_km * 1000
        best_effort: Optional[Dict] = None

        end_idx = 0
        for start_idx in range(len(distance_time_series)):
            # Ensure the end index is always ahead of the start index
            if end_idx < start_idx:
                end_idx = start_idx

            start_point = distance_time_series[start_idx]
            start_distance = start_point['distance']
            start_time = start_point['time']

            # Advance end index until we cover the target distance
            while end_idx < len(distance_time_series) and (
                distance_time_series[end_idx]['distance'] - start_distance < target_m
            ):
                end_idx += 1

            if end_idx == len(distance_time_series):
                break

            end_point = distance_time_series[end_idx]
            distance_delta = end_point['distance'] - start_distance
            time_delta = end_point['time'] - start_time

            interpolated_time = time_delta
            interpolated_timestamp = end_point['timestamp']

            if distance_delta > target_m and end_idx > start_idx:
                prev_point = distance_time_series[end_idx - 1]
                before_distance = prev_point['distance'] - start_distance
                before_time = prev_point['time'] - start_time
                segment_distance = distance_delta - before_distance
                segment_time = time_delta - before_time

                if segment_distance > 0:
                    ratio = (target_m - before_distance) / segment_distance
                    ratio = max(0.0, min(1.0, ratio))
                    interpolated_time = before_time + ratio * segment_time

                    if prev_point['timestamp'] and end_point['timestamp']:
                        span_seconds = (
                            end_point['timestamp'] - prev_point['timestamp']
                        ).total_seconds()
                        if span_seconds > 0:
                            interpolated_timestamp = prev_point['timestamp'] + timedelta(
                                seconds=span_seconds * ratio
                            )
                else:
                    # No distance difference between points, skip this start index
                    continue

            if interpolated_time <= 0:
                continue

            pace_seconds_per_km = interpolated_time / distance_km if distance_km > 0 else None

            if best_effort is None or interpolated_time < best_effort['time_seconds']:
                best_effort = {
                    'label': label,
                    'distance_m': target_m,
                    'time_seconds': interpolated_time,
                    'pace_seconds_per_km': pace_seconds_per_km,
                    'start_timestamp': start_point['timestamp'],
                    'end_timestamp': interpolated_timestamp,
                }

        if best_effort:
            efforts[label] = best_effort

    return efforts


def calculate_pace_variability(splits: List[Dict]) -> float:
    """
    Calculate coefficient of variation for pace (standard deviation / mean).
    Higher values indicate more variable pacing (likely interval training).

    Returns:
        Coefficient of variation (0-1 scale, typically 0.05-0.30)
    """
    if len(splits) < 2:
        return 0.0

    paces = [s['pace'] for s in splits]
    mean_pace = sum(paces) / len(paces)

    variance = sum((p - mean_pace) ** 2 for p in paces) / len(paces)
    std_dev = math.sqrt(variance)

    coefficient_of_variation = std_dev / mean_pace if mean_pace > 0 else 0

    return round(coefficient_of_variation, 3)


def detect_laps(cumulative_data: List[Dict], total_distance: float) -> List[Dict]:
    """
    Detect 400m laps for track workouts.

    Returns:
        List of lap times if pattern detected, empty list otherwise
    """
    laps = []
    lap_distance = 400  # meters

    # Only detect laps if workout is likely on track (5-15 laps)
    expected_laps = total_distance / lap_distance
    if expected_laps < 5 or expected_laps > 15:
        return laps

    if not cumulative_data:
        return laps

    start_time = cumulative_data[0]['timestamp']
    lap_targets = [i * lap_distance for i in range(1, int(expected_laps) + 1)]
    last_lap_time = 0
    last_lap_index = 0

    for lap_num, lap_target in enumerate(lap_targets, 1):
        for i in range(last_lap_index, len(cumulative_data)):
            if cumulative_data[i]['distance'] >= lap_target:
                elapsed = (cumulative_data[i]['timestamp'] - start_time).total_seconds()
                lap_time = elapsed - last_lap_time

                laps.append({
                    'lap': lap_num,
                    'time': round(lap_time, 1),
                    'distance': lap_distance
                })

                last_lap_time = elapsed
                last_lap_index = i
                break

    return laps


def calculate_elevation_gain(trackpoints: List[Dict]) -> float:
    """
    Calculate total elevation gain (positive changes only).

    Returns:
        Total elevation gain in meters
    """
    gain = 0

    for i in range(1, len(trackpoints)):
        if trackpoints[i]['elevation'] and trackpoints[i-1]['elevation']:
            diff = trackpoints[i]['elevation'] - trackpoints[i-1]['elevation']
            if diff > 0:
                gain += diff

    return round(gain, 1)


def match_gpx_to_workout(gpx_folder: str, workout_start_time: datetime) -> Optional[str]:
    """
    Find GPX file matching a workout's start time.

    Args:
        gpx_folder: Path to folder containing GPX files
        workout_start_time: Start time of the workout

    Returns:
        Path to matching GPX file, or None
    """
    import os
    from pathlib import Path
    from datetime import timezone

    if not os.path.exists(gpx_folder):
        return None

    # List all GPX files
    gpx_files = list(Path(gpx_folder).glob('*.gpx'))

    # Try to find file with matching date in filename
    workout_date = workout_start_time.strftime('%Y-%m-%d')

    # Make workout_start_time timezone-aware (assume UTC if naive)
    if workout_start_time.tzinfo is None:
        workout_start_time = workout_start_time.replace(tzinfo=timezone.utc)

    for gpx_file in gpx_files:
        if workout_date in gpx_file.name:
            # Parse the file to check timestamps match
            try:
                tree = ET.parse(gpx_file)
                root = tree.getroot()
                ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}

                # Get first trackpoint timestamp
                first_trkpt = root.find('.//gpx:trkpt/gpx:time', ns)
                if first_trkpt is not None:
                    gpx_time = datetime.fromisoformat(first_trkpt.text.replace('Z', '+00:00'))

                    # Check if times match within 5 minutes
                    time_diff = abs((gpx_time - workout_start_time).total_seconds())
                    if time_diff < 300:  # 5 minutes tolerance
                        return str(gpx_file)
            except Exception as e:
                logger.error(f"Error checking GPX file {gpx_file}: {e}")
                continue

    return None
