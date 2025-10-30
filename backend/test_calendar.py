"""
Quick test script for calendar functionality.
"""

import sys
from datetime import datetime
from services.calendar import (
    generate_ics_file,
    generate_ics_for_suggestion,
    get_next_preferred_day,
    estimate_duration
)

def test_next_preferred_day():
    """Test next preferred day calculation."""
    print("Testing next preferred day calculation...")

    preferred_days = ["tuesday", "thursday", "saturday"]
    start_date = datetime(2025, 10, 27)  # Monday

    next_day = get_next_preferred_day(preferred_days, start_date)
    print(f"  Start: {start_date.strftime('%A, %Y-%m-%d')}")
    print(f"  Next preferred day: {next_day.strftime('%A, %Y-%m-%d')}")

    assert next_day.strftime('%A').lower() == 'tuesday', "Should be Tuesday"
    print("  ✓ Test passed!\n")

def test_duration_estimation():
    """Test workout duration estimation."""
    print("Testing duration estimation...")

    test_cases = [
        {
            "structure": {"type": "VMA", "distance_km": 8},
            "expected_range": (45, 65)
        },
        {
            "structure": {"type": "Facile", "distance_km": 10},
            "expected_range": (50, 60)
        },
        {
            "structure": {"duree_min": 45},
            "expected_range": (45, 45)
        }
    ]

    for case in test_cases:
        duration = estimate_duration(case)
        print(f"  Type: {case['structure'].get('type', 'Custom')}, "
              f"Duration: {duration} min")

        min_dur, max_dur = case['expected_range']
        assert min_dur <= duration <= max_dur, \
            f"Duration {duration} not in range {case['expected_range']}"

    print("  ✓ All tests passed!\n")

def test_ics_generation():
    """Test iCal file generation."""
    print("Testing iCal file generation...")

    # Sample suggestion
    suggestion = {
        'id': 1,
        'workout_type': 'VMA',
        'distance': 8,
        'structure': {
            'type': 'VMA',
            'distance_km': 8,
            'echauffement': '15 min footing',
            'series': '8x400m à 3:20/km R:1:30',
            'retour_calme': '10 min footing'
        },
        'reasoning': 'Développer la VMA'
    }

    suggestions = [suggestion]
    preferred_days = ["tuesday", "thursday", "saturday"]
    preferred_time = "18:00"
    reminder_minutes = [15, 60, 1440]

    try:
        ical_content = generate_ics_file(
            suggestions,
            preferred_days=preferred_days,
            preferred_time=preferred_time,
            reminder_minutes=reminder_minutes
        )

        # Basic validation
        assert b'BEGIN:VCALENDAR' in ical_content, "Missing VCALENDAR"
        assert b'BEGIN:VEVENT' in ical_content, "Missing VEVENT"
        assert b'VMA' in ical_content, "Missing workout type"
        assert b'BEGIN:VALARM' in ical_content, "Missing alarms"

        print(f"  Generated iCal file: {len(ical_content)} bytes")
        print("  ✓ Test passed!\n")

        # Print sample
        print("Sample iCal content (first 500 chars):")
        print(ical_content[:500].decode('utf-8'))
        print("...\n")

        return ical_content

    except Exception as e:
        print(f"  ✗ Error: {e}\n")
        raise

def test_single_suggestion_export():
    """Test single suggestion export."""
    print("Testing single suggestion export...")

    suggestion = {
        'id': 42,
        'workout_type': 'Tempo',
        'distance': 10,
        'structure': {
            'type': 'Tempo',
            'distance_km': 10,
            'echauffement': '2km facile',
            'corps': '6km à 5:30/km',
            'retour_calme': '2km facile'
        },
        'reasoning': 'Travailler le seuil'
    }

    preferred_date = datetime.now().replace(hour=18, minute=0, second=0, microsecond=0)

    try:
        ical_content = generate_ics_for_suggestion(
            suggestion,
            preferred_date=preferred_date,
            reminder_minutes=[15, 60]
        )

        assert b'BEGIN:VCALENDAR' in ical_content
        assert b'Tempo' in ical_content
        assert b'suggestion-42@suivi-course' in ical_content

        print(f"  Generated iCal for single suggestion: {len(ical_content)} bytes")
        print("  ✓ Test passed!\n")

        return ical_content

    except Exception as e:
        print(f"  ✗ Error: {e}\n")
        raise

def main():
    """Run all tests."""
    print("=" * 60)
    print("Calendar Service Tests")
    print("=" * 60 + "\n")

    try:
        test_next_preferred_day()
        test_duration_estimation()
        test_ics_generation()
        test_single_suggestion_export()

        print("=" * 60)
        print("All tests passed! ✓")
        print("=" * 60)

    except Exception as e:
        print("\n" + "=" * 60)
        print(f"Tests failed: {e}")
        print("=" * 60)
        sys.exit(1)

if __name__ == "__main__":
    main()
