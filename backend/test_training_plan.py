"""
Test script for training plan generation.

Run with: python test_training_plan.py
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api"


def test_create_training_plan():
    """Test creating a training plan."""
    print("\n=== Testing Training Plan Creation ===")

    payload = {
        "goal_type": "semi",
        "target_date": (datetime.now() + timedelta(weeks=12)).isoformat(),
        "current_level": "intermediate",
        "weeks_count": 8,
        "use_sonnet": True
    }

    print(f"Creating plan with: {json.dumps(payload, indent=2)}")

    response = requests.post(f"{BASE_URL}/training-plans", json=payload)

    if response.status_code == 200:
        plan = response.json()
        print(f"\n✓ Plan created successfully!")
        print(f"  - ID: {plan['id']}")
        print(f"  - Name: {plan['name']}")
        print(f"  - Goal: {plan['goal_type']}")
        print(f"  - Weeks: {plan['weeks_count']}")
        print(f"  - Status: {plan['status']}")
        print(f"  - Number of weeks generated: {len(plan['weeks'])}")

        if plan['weeks']:
            first_week = plan['weeks'][0]
            print(f"\n  First week details:")
            print(f"    - Week number: {first_week['week_number']}")
            print(f"    - Phase: {first_week['phase']}")
            print(f"    - Description: {first_week.get('description', 'N/A')}")
            print(f"    - Sessions: {len(first_week.get('sessions', []))}")

            if first_week.get('sessions'):
                first_session = first_week['sessions'][0]
                print(f"\n  First session details:")
                print(f"    - Day: {first_session['day_of_week']}")
                print(f"    - Type: {first_session['workout_type']}")
                print(f"    - Distance: {first_session.get('distance', 'N/A')}km")
                print(f"    - Pace: {first_session.get('pace_target', 'N/A')}")

        return plan['id']
    else:
        print(f"\n✗ Failed to create plan: {response.status_code}")
        print(f"  Error: {response.text}")
        return None


def test_get_training_plans():
    """Test getting all training plans."""
    print("\n=== Testing Get Training Plans ===")

    response = requests.get(f"{BASE_URL}/training-plans")

    if response.status_code == 200:
        plans = response.json()
        print(f"\n✓ Retrieved {len(plans)} training plan(s)")

        for plan in plans:
            print(f"\n  Plan ID {plan['id']}:")
            print(f"    - Name: {plan['name']}")
            print(f"    - Goal: {plan['goal_type']}")
            print(f"    - Progress: {plan['progress_percentage']:.1f}%")
            print(f"    - Status: {plan['status']}")
    else:
        print(f"\n✗ Failed to get plans: {response.status_code}")
        print(f"  Error: {response.text}")


def test_get_training_plan_detail(plan_id):
    """Test getting a specific training plan."""
    print(f"\n=== Testing Get Training Plan Detail (ID: {plan_id}) ===")

    response = requests.get(f"{BASE_URL}/training-plans/{plan_id}")

    if response.status_code == 200:
        plan = response.json()
        print(f"\n✓ Retrieved plan details")
        print(f"  - Name: {plan['name']}")
        print(f"  - Total weeks: {len(plan['weeks'])}")

        # Count sessions by type
        session_types = {}
        for week in plan['weeks']:
            for session in week.get('sessions', []):
                workout_type = session['workout_type']
                session_types[workout_type] = session_types.get(workout_type, 0) + 1

        print(f"\n  Session distribution:")
        for workout_type, count in session_types.items():
            print(f"    - {workout_type}: {count} sessions")

        # Show phase distribution
        phase_weeks = {}
        for week in plan['weeks']:
            phase = week['phase']
            phase_weeks[phase] = phase_weeks.get(phase, 0) + 1

        print(f"\n  Phase distribution:")
        for phase, count in phase_weeks.items():
            print(f"    - {phase}: {count} weeks")

    else:
        print(f"\n✗ Failed to get plan detail: {response.status_code}")
        print(f"  Error: {response.text}")


def test_update_session(plan_id):
    """Test updating a training session."""
    print(f"\n=== Testing Update Training Session ===")

    # First get the plan to find a session
    response = requests.get(f"{BASE_URL}/training-plans/{plan_id}")

    if response.status_code == 200:
        plan = response.json()
        if plan['weeks'] and plan['weeks'][0].get('sessions'):
            session_id = plan['weeks'][0]['sessions'][0]['id']

            # Mark session as completed
            update_payload = {
                "status": "completed"
            }

            response = requests.patch(
                f"{BASE_URL}/training-plans/{plan_id}/sessions/{session_id}",
                json=update_payload
            )

            if response.status_code == 200:
                print(f"✓ Session {session_id} marked as completed")
            else:
                print(f"✗ Failed to update session: {response.status_code}")
        else:
            print("✗ No sessions found in plan")
    else:
        print(f"✗ Failed to get plan: {response.status_code}")


def main():
    """Run all tests."""
    print("=" * 60)
    print("Training Plan API Tests")
    print("=" * 60)
    print("\nMake sure the FastAPI server is running on http://localhost:8000")
    print("Start it with: cd backend && source venv/bin/activate && python main.py")

    input("\nPress Enter to continue...")

    # Test getting existing plans
    test_get_training_plans()

    # Test creating a new plan
    plan_id = test_create_training_plan()

    if plan_id:
        # Test getting plan detail
        test_get_training_plan_detail(plan_id)

        # Test updating a session
        test_update_session(plan_id)

        # Get plans again to see updated data
        test_get_training_plans()

    print("\n" + "=" * 60)
    print("Tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
