"""Unit tests for Apple Health parser security and functionality."""

import os
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from services.health_parser import (
    check_duplicate,
    extract_zip,
    merge_gpx_raw_data,
    _locate_export_xml,
    _safe_extract,
)


class TestSecureExtraction:
    """Test security features of ZIP extraction."""

    def test_safe_extract_rejects_path_traversal(self):
        """Test that path traversal attempts are blocked."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a malicious ZIP with path traversal
            zip_path = Path(temp_dir) / "malicious.zip"
            target_dir = Path(temp_dir) / "extract"
            target_dir.mkdir()

            with zipfile.ZipFile(zip_path, 'w') as zf:
                # Try to escape the extraction directory
                zf.writestr("../../etc/passwd", "malicious content")

            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                with pytest.raises(ValueError, match="Unsafe ZIP entry detected"):
                    _safe_extract(zip_ref, target_dir)

    def test_safe_extract_rejects_absolute_paths(self):
        """Test that absolute paths in ZIP are blocked."""
        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = Path(temp_dir) / "malicious.zip"
            target_dir = Path(temp_dir) / "extract"
            target_dir.mkdir()

            with zipfile.ZipFile(zip_path, 'w') as zf:
                # Absolute path attempt
                zf.writestr("/tmp/malicious.txt", "bad content")

            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                with pytest.raises(ValueError, match="Unsafe ZIP entry detected"):
                    _safe_extract(zip_ref, target_dir)

    def test_safe_extract_allows_normal_files(self):
        """Test that normal files are extracted successfully."""
        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = Path(temp_dir) / "normal.zip"
            target_dir = Path(temp_dir) / "extract"
            target_dir.mkdir()

            # Create a normal ZIP
            with zipfile.ZipFile(zip_path, 'w') as zf:
                zf.writestr("apple_health_export/export.xml", "<xml>test</xml>")
                zf.writestr("apple_health_export/data.txt", "data")

            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                _safe_extract(zip_ref, target_dir)

            # Verify files were extracted
            assert (target_dir / "apple_health_export" / "export.xml").exists()
            assert (target_dir / "apple_health_export" / "data.txt").exists()

    def test_safe_extract_validates_size_limit(self):
        """Test that ZIP bomb protection works (excessive uncompressed size)."""
        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = Path(temp_dir) / "bomb.zip"
            target_dir = Path(temp_dir) / "extract"
            target_dir.mkdir()

            # Create a ZIP with large uncompressed size
            with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
                # Create a file that compresses well but is huge when uncompressed
                large_data = b"0" * (600 * 1024 * 1024)  # 600MB of zeros
                zf.writestr("huge_file.txt", large_data)

            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                with pytest.raises(ValueError, match="Uncompressed size .* exceeds limit"):
                    _safe_extract(zip_ref, target_dir, max_size=500 * 1024 * 1024)


class TestExtractZip:
    """Test the extract_zip context manager."""

    def test_extract_zip_cleanup_on_success(self):
        """Test that temporary directory is cleaned up after successful extraction."""
        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = Path(temp_dir) / "test.zip"

            # Create valid Apple Health export ZIP
            with zipfile.ZipFile(zip_path, 'w') as zf:
                zf.writestr("apple_health_export/export.xml", "<xml>test</xml>")

            temp_dirs_before = len(list(Path(tempfile.gettempdir()).glob("apple_health_*")))

            with extract_zip(str(zip_path)) as xml_path:
                assert xml_path.exists()
                assert xml_path.name == "export.xml"
                # Temp dir should exist during context
                assert xml_path.parent.parent.exists()

            # Temp dir should be cleaned up after context
            temp_dirs_after = len(list(Path(tempfile.gettempdir()).glob("apple_health_*")))
            assert temp_dirs_after <= temp_dirs_before

    def test_extract_zip_cleanup_on_error(self):
        """Test that temporary directory is cleaned up even when error occurs."""
        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = Path(temp_dir) / "bad.zip"

            # Create ZIP without export.xml
            with zipfile.ZipFile(zip_path, 'w') as zf:
                zf.writestr("other_file.txt", "data")

            temp_dirs_before = len(list(Path(tempfile.gettempdir()).glob("apple_health_*")))

            with pytest.raises(ValueError, match="export.xml not found"):
                with extract_zip(str(zip_path)) as xml_path:
                    pass

            # Temp dir should still be cleaned up
            temp_dirs_after = len(list(Path(tempfile.gettempdir()).glob("apple_health_*")))
            assert temp_dirs_after <= temp_dirs_before

    def test_extract_zip_finds_export_in_standard_location(self):
        """Test that export.xml is found in standard location."""
        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = Path(temp_dir) / "test.zip"

            with zipfile.ZipFile(zip_path, 'w') as zf:
                zf.writestr("apple_health_export/export.xml", "<workouts></workouts>")

            with extract_zip(str(zip_path)) as xml_path:
                assert xml_path.name == "export.xml"
                assert "apple_health_export" in str(xml_path)
                assert xml_path.read_text() == "<workouts></workouts>"

    def test_extract_zip_finds_export_in_fallback_location(self):
        """Test that export.xml is found in fallback root location."""
        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = Path(temp_dir) / "test.zip"

            with zipfile.ZipFile(zip_path, 'w') as zf:
                # Some exports might have export.xml at root
                zf.writestr("export.xml", "<workouts></workouts>")

            with extract_zip(str(zip_path)) as xml_path:
                assert xml_path.name == "export.xml"
                assert xml_path.read_text() == "<workouts></workouts>"


class TestLocateExportXml:
    """Test the export.xml locator function."""

    def test_locate_export_xml_standard_location(self):
        """Test locating export.xml in standard location."""
        with tempfile.TemporaryDirectory() as temp_dir:
            extracted_dir = Path(temp_dir)
            export_dir = extracted_dir / "apple_health_export"
            export_dir.mkdir()
            export_file = export_dir / "export.xml"
            export_file.write_text("<xml>test</xml>")

            result = _locate_export_xml(extracted_dir)
            assert result == export_file

    def test_locate_export_xml_fallback_location(self):
        """Test locating export.xml in fallback location."""
        with tempfile.TemporaryDirectory() as temp_dir:
            extracted_dir = Path(temp_dir)
            export_file = extracted_dir / "export.xml"
            export_file.write_text("<xml>test</xml>")

            result = _locate_export_xml(extracted_dir)
            assert result == export_file

    def test_locate_export_xml_not_found(self):
        """Test error when export.xml is not found."""
        with tempfile.TemporaryDirectory() as temp_dir:
            extracted_dir = Path(temp_dir)

            with pytest.raises(ValueError, match="export.xml not found"):
                _locate_export_xml(extracted_dir)

    def test_locate_export_xml_prefers_standard_location(self):
        """Test that standard location is preferred over fallback."""
        with tempfile.TemporaryDirectory() as temp_dir:
            extracted_dir = Path(temp_dir)

            # Create both locations
            export_dir = extracted_dir / "apple_health_export"
            export_dir.mkdir()
            standard_file = export_dir / "export.xml"
            standard_file.write_text("<xml>standard</xml>")

            fallback_file = extracted_dir / "export.xml"
            fallback_file.write_text("<xml>fallback</xml>")

            result = _locate_export_xml(extracted_dir)
            # Should prefer standard location
            assert result == standard_file
            assert result.read_text() == "<xml>standard</xml>"


class TestGpxMergeAndDeduplication:
    """Test helpers related to GPX merging and duplicate detection."""

    def test_merge_gpx_raw_data_updates_best_efforts(self):
        existing_raw = {'notes': 'keep me', 'gpx': {'splits': [1, 2, 3]}}
        gpx_data = {
            'splits': [4, 5, 6],
            'pace_variability': 0.12,
            'best_efforts': {'1km': {'time_seconds': 260}},
        }

        merged = merge_gpx_raw_data(existing_raw, gpx_data)

        assert merged['notes'] == 'keep me'
        assert merged['gpx']['splits'] == [4, 5, 6]
        assert merged['gpx']['pace_variability'] == 0.12
        assert merged['gpx']['best_efforts']['1km']['time_seconds'] == 260

    def test_check_duplicate_returns_matching_workout(self):
        start_time = datetime(2024, 1, 1, 7, 0, 0)
        candidate = SimpleNamespace(
            date=start_time,
            distance=5.01,
            duration=1500,
            raw_data=None,
        )

        result = check_duplicate(
            {
                'date': start_time,
                'distance': 5.0,
                'duration': 1500,
            },
            [candidate],
        )

        assert result is candidate

    def test_check_duplicate_returns_none_when_not_found(self):
        start_time = datetime(2024, 1, 1, 7, 0, 0)
        result = check_duplicate(
            {
                'date': start_time,
                'distance': 5.0,
                'duration': 1500,
            },
            [],
        )

        assert result is None


class TestStreamingUpload:
    """Test streaming upload functionality."""

    def test_chunked_upload_respects_size_limit(self):
        """Test that chunked upload properly enforces size limit."""
        # This would require mocking the FastAPI UploadFile
        # and testing the logic in import_router.py
        # This is a placeholder for integration testing
        # TODO: Add integration test with FastAPI TestClient
        pytest.skip("Integration test placeholder - requires FastAPI TestClient setup")


class TestDeduplicationPerformance:
    """Test deduplication performance improvements."""

    def test_date_based_indexing_reduces_comparisons(self):
        """Test that date-based indexing improves performance."""
        # This would require creating mock workouts and measuring
        # the number of comparisons vs the old O(n²) approach
        # Placeholder for performance benchmarking
        pass
