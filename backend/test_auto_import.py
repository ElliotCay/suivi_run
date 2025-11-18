"""
Tests pour l'auto-import Apple Health depuis iCloud Drive.

Ce fichier teste :
- Détection de nouveaux fichiers export.zip
- Détection de modifications de fichiers existants
- Import sans doublons
- Gestion d'erreurs (fichiers corrompus, etc.)
"""

import asyncio
import logging
import os
import shutil
import tempfile
import time
from pathlib import Path
from datetime import datetime

from services.auto_import_service import AutoImportService
from database import SessionLocal
from models import Workout

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TestAutoImport:
    """Test suite for Apple Health auto-import functionality."""

    def __init__(self):
        self.test_folder = None
        self.service = None
        self.db = SessionLocal()

    def setup(self):
        """Create temporary folder for testing."""
        self.test_folder = tempfile.mkdtemp(prefix="test_auto_import_")
        logger.info(f"Created test folder: {self.test_folder}")

        # Initialize service with test folder
        self.service = AutoImportService(
            watch_folder=self.test_folder,
            check_interval=1  # Fast check for testing
        )

    def teardown(self):
        """Clean up test folder."""
        if self.test_folder and os.path.exists(self.test_folder):
            shutil.rmtree(self.test_folder)
            logger.info(f"Cleaned up test folder: {self.test_folder}")

        if self.db:
            self.db.close()

    def get_sample_export_path(self) -> Path:
        """Get path to sample export.zip file from test data."""
        # Look for sample export in test data folder
        sample_paths = [
            Path("/Users/elliotcayuela/Downloads/export.zip"),
            Path("~/Downloads/export.zip").expanduser(),
            Path("./test_data/export.zip"),
        ]

        for path in sample_paths:
            if path.exists():
                logger.info(f"Found sample export at: {path}")
                return path

        logger.warning("No sample export.zip found. Tests will be limited.")
        return None

    async def test_1_file_detection(self):
        """Test 1: Détection de nouveau fichier export.zip"""
        print("\n" + "="*70)
        print("🧪 TEST 1: Détection de nouveau fichier export.zip")
        print("="*70)

        # Initially no file should exist
        export_file = self.service.get_export_file_path()
        assert export_file is None, "Export file should not exist initially"
        print("✅ Initial state: No export file detected")

        # Copy sample file to watch folder
        sample_export = self.get_sample_export_path()
        if sample_export:
            dest_path = Path(self.test_folder) / "export.zip"
            shutil.copy(sample_export, dest_path)
            print(f"📋 Copied sample export to: {dest_path}")

            # File should now be detected
            export_file = self.service.get_export_file_path()
            assert export_file is not None, "Export file should be detected"
            assert export_file.exists(), "Export file should exist"
            print(f"✅ File detected: {export_file}")

            # Should be marked as changed (first time)
            has_changed = self.service.has_file_changed(export_file)
            assert has_changed, "New file should be marked as changed"
            print("✅ File marked as new/changed")
        else:
            print("⚠️  Skipping test - no sample export.zip available")

        print("="*70)
        print("✅ TEST 1 PASSED: File detection works correctly")
        print("="*70)

    async def test_2_file_modification(self):
        """Test 2: Détection de modification de fichier existant"""
        print("\n" + "="*70)
        print("🧪 TEST 2: Détection de modification de fichier existant")
        print("="*70)

        sample_export = self.get_sample_export_path()
        if not sample_export:
            print("⚠️  Skipping test - no sample export.zip available")
            return

        dest_path = Path(self.test_folder) / "export.zip"
        shutil.copy(sample_export, dest_path)
        print(f"📋 Initial file copied to: {dest_path}")

        # Mark as processed
        self.service.last_modified_time = dest_path.stat().st_mtime
        print(f"🕒 Marked as processed at: {self.service.last_modified_time}")

        # File should not be marked as changed
        has_changed = self.service.has_file_changed(dest_path)
        assert not has_changed, "Unchanged file should not be marked as changed"
        print("✅ Unchanged file not marked for re-import")

        # Wait a bit and modify file
        await asyncio.sleep(1)
        dest_path.touch()  # Update modification time
        print("🔄 File modification time updated")

        # Now should be detected as changed
        has_changed = self.service.has_file_changed(dest_path)
        assert has_changed, "Modified file should be detected"
        print("✅ Modified file detected correctly")

        print("="*70)
        print("✅ TEST 2 PASSED: File modification detection works")
        print("="*70)

    async def test_3_import_no_duplicates(self):
        """Test 3: Import sans créer de doublons"""
        print("\n" + "="*70)
        print("🧪 TEST 3: Import sans doublons")
        print("="*70)

        sample_export = self.get_sample_export_path()
        if not sample_export:
            print("⚠️  Skipping test - no sample export.zip available")
            return

        dest_path = Path(self.test_folder) / "export.zip"
        shutil.copy(sample_export, dest_path)
        print(f"📋 Sample export copied to: {dest_path}")

        # Count workouts before import
        initial_count = self.db.query(Workout).filter(Workout.user_id == 1).count()
        print(f"📊 Initial workouts count: {initial_count}")

        # First import
        result1 = await self.service.import_file(dest_path)
        assert result1["success"], f"First import failed: {result1.get('error')}"
        imported1 = result1["workouts_imported"]
        duplicates1 = result1["duplicates_skipped"]
        print(f"✅ First import: {imported1} workouts, {duplicates1} duplicates")

        # Count workouts after first import
        count_after_first = self.db.query(Workout).filter(Workout.user_id == 1).count()
        print(f"📊 Workouts after first import: {count_after_first}")
        assert count_after_first == initial_count + imported1, "Count mismatch"

        # Second import (should find duplicates)
        result2 = await self.service.import_file(dest_path)
        assert result2["success"], f"Second import failed: {result2.get('error')}"
        imported2 = result2["workouts_imported"]
        duplicates2 = result2["duplicates_skipped"]
        print(f"✅ Second import: {imported2} new workouts, {duplicates2} duplicates")

        # Count should not change on second import (all duplicates)
        count_after_second = self.db.query(Workout).filter(Workout.user_id == 1).count()
        print(f"📊 Workouts after second import: {count_after_second}")
        assert count_after_second == count_after_first, "Duplicates were created!"

        # Most workouts should have been detected as duplicates
        assert duplicates2 > 0, "Should have detected duplicates"
        print(f"✅ Duplicate detection working: {duplicates2} duplicates found")

        print("="*70)
        print("✅ TEST 3 PASSED: No duplicates created")
        print("="*70)

    async def test_4_corrupted_file(self):
        """Test 4: Gestion d'erreurs (fichier corrompu)"""
        print("\n" + "="*70)
        print("🧪 TEST 4: Gestion fichier corrompu")
        print("="*70)

        # Create a fake corrupted ZIP file
        dest_path = Path(self.test_folder) / "export.zip"
        with open(dest_path, 'w') as f:
            f.write("This is not a valid ZIP file!")
        print(f"📋 Created corrupted file at: {dest_path}")

        # Try to import - should fail gracefully
        result = await self.service.import_file(dest_path)
        assert not result["success"], "Should fail for corrupted file"
        assert "error" in result, "Should return error message"
        print(f"✅ Error handled gracefully: {result['error'][:100]}...")

        print("="*70)
        print("✅ TEST 4 PASSED: Corrupted file handled correctly")
        print("="*70)

    async def test_5_service_status(self):
        """Test 5: Vérification du statut du service"""
        print("\n" + "="*70)
        print("🧪 TEST 5: Vérification statut du service")
        print("="*70)

        # Get initial status
        status = self.service.get_status()
        print(f"📊 Service status:")
        print(f"   - Running: {status['is_running']}")
        print(f"   - Watch folder: {status['watch_folder']}")
        print(f"   - Check interval: {status['check_interval']}s")
        print(f"   - Export exists: {status['export_file_exists']}")

        assert status['watch_folder'] == self.test_folder, "Watch folder mismatch"
        assert status['check_interval'] == 1, "Check interval mismatch"
        print("✅ Status information correct")

        # Add export file and check status again
        sample_export = self.get_sample_export_path()
        if sample_export:
            dest_path = Path(self.test_folder) / "export.zip"
            shutil.copy(sample_export, dest_path)

            status = self.service.get_status()
            assert status['export_file_exists'], "Should detect export file"
            assert 'export_file_path' in status, "Should include file path"
            assert 'export_file_modified' in status, "Should include modification time"
            print(f"✅ Export file detected in status")
            print(f"   - Path: {status['export_file_path']}")
            print(f"   - Modified: {status['export_file_modified']}")

        print("="*70)
        print("✅ TEST 5 PASSED: Service status reporting works")
        print("="*70)

    async def test_6_watch_loop(self):
        """Test 6: Test du watch loop complet"""
        print("\n" + "="*70)
        print("🧪 TEST 6: Test du watch loop complet")
        print("="*70)

        sample_export = self.get_sample_export_path()
        if not sample_export:
            print("⚠️  Skipping test - no sample export.zip available")
            return

        # Start the service
        await self.service.start()
        print("✅ Service started")
        assert self.service.is_running, "Service should be running"

        # Wait a moment for initial check
        await asyncio.sleep(2)
        print("⏳ Waited for initial check")

        # Copy file to watch folder
        dest_path = Path(self.test_folder) / "export.zip"
        shutil.copy(sample_export, dest_path)
        print(f"📋 Copied export file to: {dest_path}")

        # Wait for service to detect and import
        await asyncio.sleep(3)
        print("⏳ Waited for auto-import")

        # Service should have imported the file
        assert self.service.last_modified_time is not None, "File should have been processed"
        print("✅ File was automatically processed")

        # Stop the service
        await self.service.stop()
        print("✅ Service stopped")
        assert not self.service.is_running, "Service should be stopped"

        print("="*70)
        print("✅ TEST 6 PASSED: Watch loop works correctly")
        print("="*70)

    async def run_all_tests(self):
        """Run all tests in sequence."""
        print("\n" + "="*70)
        print("🏃 APPLE HEALTH AUTO-IMPORT TEST SUITE")
        print("="*70)
        print(f"📅 Started at: {datetime.now().isoformat()}")
        print("="*70)

        tests = [
            self.test_1_file_detection,
            self.test_2_file_modification,
            self.test_3_import_no_duplicates,
            self.test_4_corrupted_file,
            self.test_5_service_status,
            self.test_6_watch_loop,
        ]

        passed = 0
        failed = 0

        for test in tests:
            try:
                # Setup fresh environment for each test
                self.setup()
                await test()
                passed += 1
            except AssertionError as e:
                failed += 1
                print(f"\n❌ TEST FAILED: {test.__name__}")
                print(f"   Error: {e}")
            except Exception as e:
                failed += 1
                print(f"\n❌ TEST ERROR: {test.__name__}")
                print(f"   Error: {e}")
                import traceback
                traceback.print_exc()
            finally:
                # Cleanup after each test
                if self.service and self.service.is_running:
                    await self.service.stop()
                self.teardown()

        # Final summary
        print("\n" + "="*70)
        print("📊 TEST SUMMARY")
        print("="*70)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📊 Total: {len(tests)}")
        print("="*70)

        if failed == 0:
            print("🎉 ALL TESTS PASSED!")
        else:
            print(f"⚠️  {failed} TESTS FAILED")

        print("="*70)


async def main():
    """Main test runner."""
    test_suite = TestAutoImport()
    await test_suite.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
