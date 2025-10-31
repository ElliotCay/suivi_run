"""Auto-import service for monitoring iCloud Drive folder."""

import asyncio
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from database import SessionLocal
from models import Workout
from services.health_parser import (
    check_duplicate,
    extract_zip,
    merge_gpx_raw_data,
    parse_workouts_xml,
)

logger = logging.getLogger(__name__)


class AutoImportService:
    """Service to monitor iCloud Drive folder for new Apple Health exports."""

    def __init__(self, watch_folder: str, check_interval: int = 60):
        """
        Initialize the auto-import service.

        Args:
            watch_folder: Path to the iCloud Drive folder to monitor
            check_interval: Seconds between checks (default: 60)
        """
        self.watch_folder = Path(watch_folder).expanduser()
        self.check_interval = check_interval
        self.last_modified_time: Optional[float] = None
        self.is_running = False
        self.task: Optional[asyncio.Task] = None
        self.user_id = 1  # TODO: Support multiple users

        logger.info(f"AutoImportService initialized. Watching: {self.watch_folder}")

    def get_export_file_path(self) -> Optional[Path]:
        """Get the path to export.zip if it exists."""
        export_path = self.watch_folder / "export.zip"
        if export_path.exists():
            return export_path
        return None

    def has_file_changed(self, file_path: Path) -> bool:
        """
        Check if the file has been modified since last import.

        Args:
            file_path: Path to the export.zip file

        Returns:
            True if file is new or has been modified
        """
        try:
            current_mtime = file_path.stat().st_mtime

            if self.last_modified_time is None:
                # First time seeing this file
                logger.info(f"First time detecting file: {file_path}")
                return True

            if current_mtime > self.last_modified_time:
                logger.info(f"File has been modified. Old: {self.last_modified_time}, New: {current_mtime}")
                return True

            return False

        except Exception as e:
            logger.error(f"Error checking file modification time: {e}")
            return False

    async def import_file(self, file_path: Path) -> dict:
        """
        Import the Apple Health export file.

        Args:
            file_path: Path to the export.zip file

        Returns:
            Import result dictionary
        """
        logger.info(f"Starting import of {file_path}")

        try:
            # Extract ZIP and get export.xml path
            with extract_zip(str(file_path)) as xml_path:
                # Parse workouts from XML
                parsed_workouts = parse_workouts_xml(str(xml_path))

                if not parsed_workouts:
                    logger.info("No running workouts found in export")
                    return {
                        "success": True,
                        "workouts_imported": 0,
                        "duplicates_skipped": 0,
                        "message": "No running workouts found"
                    }

                # Get database session
                db: Session = SessionLocal()

                try:
                    # Determine relevant date range
                    workout_dates = [
                        workout['start_time']
                        for workout in parsed_workouts
                        if workout.get('start_time')
                    ]

                    query = db.query(Workout).filter(Workout.user_id == self.user_id)
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

                        existing_index[date_key].append(existing)

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
                        duplicate_entry = check_duplicate(workout_data, candidates)
                        if duplicate_entry:
                            duplicates_count += 1

                            if (
                                'gpx_data' in workout_data
                                and hasattr(duplicate_entry, 'raw_data')
                            ):
                                gpx_data = workout_data['gpx_data']
                                duplicate_entry.raw_data = merge_gpx_raw_data(
                                    duplicate_entry.raw_data,
                                    gpx_data,
                                )
                            continue

                        raw_data = {
                            'avg_speed_kmh': workout_data.get('avg_speed'),
                            'source_name': workout_data.get('source')
                        }

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

                        new_workout = Workout(
                            user_id=self.user_id,
                            date=workout_data['start_time'],
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

                        existing_index[date_key].append(new_workout)

                    db.commit()

                    date_range = None
                    if dates:
                        dates.sort()
                        date_range = {
                            "start": dates[0].isoformat(),
                            "end": dates[-1].isoformat()
                        }

                    logger.info(
                        "Auto-import complete: %s imported, %s duplicates",
                        imported_count,
                        duplicates_count,
                    )

                    self.last_modified_time = file_path.stat().st_mtime

                    return {
                        "success": True,
                        "workouts_imported": imported_count,
                        "duplicates_skipped": duplicates_count,
                        "date_range": date_range,
                        "timestamp": datetime.now().isoformat()
                    }

                finally:
                    db.close()

        except Exception as e:
            logger.error(f"Auto-import error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    async def watch_loop(self):
        """Main loop that watches for file changes."""
        logger.info(f"Starting watch loop. Checking every {self.check_interval} seconds")

        while self.is_running:
            try:
                # Check if export.zip exists
                export_file = self.get_export_file_path()

                if export_file:
                    # Check if file has changed
                    if self.has_file_changed(export_file):
                        logger.info("Detected new or modified export file, starting import...")
                        result = await self.import_file(export_file)

                        if result["success"]:
                            logger.info(f"Auto-import successful: {result}")
                        else:
                            logger.error(f"Auto-import failed: {result}")
                else:
                    # File doesn't exist yet, just wait
                    if self.last_modified_time is not None:
                        logger.info("Export file no longer exists")
                        self.last_modified_time = None

            except Exception as e:
                logger.error(f"Error in watch loop: {e}", exc_info=True)

            # Wait before next check
            await asyncio.sleep(self.check_interval)

        logger.info("Watch loop stopped")

    async def start(self):
        """Start monitoring the iCloud Drive folder."""
        if self.is_running:
            logger.warning("Auto-import service is already running")
            return

        # Create watch folder if it doesn't exist
        try:
            self.watch_folder.mkdir(parents=True, exist_ok=True)
            logger.info(f"Watch folder ready: {self.watch_folder}")
        except Exception as e:
            logger.error(f"Failed to create watch folder: {e}")
            raise

        self.is_running = True
        self.task = asyncio.create_task(self.watch_loop())
        logger.info("Auto-import service started")

    async def stop(self):
        """Stop monitoring the iCloud Drive folder."""
        if not self.is_running:
            logger.warning("Auto-import service is not running")
            return

        self.is_running = False

        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass

        logger.info("Auto-import service stopped")

    def get_status(self) -> dict:
        """Get current status of the auto-import service."""
        export_file = self.get_export_file_path()

        status = {
            "is_running": self.is_running,
            "watch_folder": str(self.watch_folder),
            "check_interval": self.check_interval,
            "export_file_exists": export_file is not None,
        }

        if export_file:
            status["export_file_path"] = str(export_file)
            status["export_file_modified"] = datetime.fromtimestamp(
                export_file.stat().st_mtime
            ).isoformat()

        if self.last_modified_time:
            status["last_import_time"] = datetime.fromtimestamp(
                self.last_modified_time
            ).isoformat()

        return status


# Global instance
_auto_import_service: Optional[AutoImportService] = None


def get_auto_import_service() -> AutoImportService:
    """Get or create the global auto-import service instance."""
    global _auto_import_service

    if _auto_import_service is None:
        # Default to iCloud Drive folder
        icloud_path = "~/Library/Mobile Documents/com~apple~CloudDocs/AppleHealthExport"
        _auto_import_service = AutoImportService(watch_folder=icloud_path, check_interval=60)

    return _auto_import_service
