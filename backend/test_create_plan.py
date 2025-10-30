"""
Test script for creating a training plan with Claude AI
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_create_training_plan():
    """Test creating a training plan"""
    print("🧪 Testing Training Plan Creation with Claude AI\n")

    # Test data
    plan_data = {
        "name": "Préparation Semi-Marathon Mars 2026",
        "goal_type": "half_marathon",
        "target_date": "2026-03-15",
        "current_level": "Je cours 3 fois par semaine, sortie longue de 10km, allure facile à 6:00/km",
        "weeks_count": 8
    }

    print(f"📝 Creating plan: {plan_data['name']}")
    print(f"   Goal: {plan_data['goal_type']}")
    print(f"   Target date: {plan_data['target_date']}")
    print(f"   Weeks: {plan_data['weeks_count']}")
    print(f"\n⏳ Generating plan with Claude AI (this may take 10-30 seconds)...\n")

    start_time = time.time()

    try:
        response = requests.post(
            f"{BASE_URL}/api/training-plans",
            json=plan_data,
            timeout=60
        )

        elapsed_time = time.time() - start_time

        if response.status_code == 200:
            plan = response.json()
            print(f"✅ Plan created successfully in {elapsed_time:.1f}s!\n")
            print(f"📋 Plan ID: {plan['id']}")
            print(f"📅 Start date: {plan['start_date']}")
            print(f"🏁 End date: {plan['end_date']}")
            print(f"📊 Status: {plan['status']}")
            print(f"\n📝 Weeks breakdown:")

            for week in plan.get('weeks', []):
                print(f"\n   Week {week['week_number']} - Phase: {week['phase'].upper()}")
                print(f"   Sessions: {len(week.get('sessions', []))}")
                for session in week.get('sessions', []):
                    print(f"      - {session['session_type']}: {session.get('distance', 'N/A')}km")
                    if session.get('description'):
                        print(f"        {session['description'][:60]}...")

            return plan
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return None

    except requests.exceptions.Timeout:
        print("❌ Request timed out (>60s). Claude AI may be slow.")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_get_plan(plan_id):
    """Test retrieving a training plan"""
    print(f"\n\n🔍 Testing Get Training Plan (ID: {plan_id})\n")

    try:
        response = requests.get(f"{BASE_URL}/api/training-plans/{plan_id}")

        if response.status_code == 200:
            plan = response.json()
            print(f"✅ Plan retrieved successfully!")
            print(f"\n📋 {plan['name']}")
            print(f"📊 Progress: {len([s for w in plan['weeks'] for s in w['sessions'] if s['status'] == 'completed'])}/{sum(len(w['sessions']) for w in plan['weeks'])} sessions completed")
            return plan
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_list_plans():
    """Test listing all training plans"""
    print(f"\n\n📋 Testing List Training Plans\n")

    try:
        response = requests.get(f"{BASE_URL}/api/training-plans")

        if response.status_code == 200:
            plans = response.json()
            print(f"✅ Found {len(plans)} plans")
            for plan in plans:
                print(f"\n   • {plan['name']}")
                print(f"     Goal: {plan['goal_type']} | Status: {plan['status']}")
                print(f"     Progress: {plan.get('total_sessions_completed', 0)}/{plan.get('total_sessions', 0)} sessions")
            return plans
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    print("=" * 70)
    print("🏃 TRAINING PLANS API TEST")
    print("=" * 70)
    print()

    # Test 1: Create a plan
    plan = test_create_training_plan()

    if plan:
        # Test 2: Get the plan
        test_get_plan(plan['id'])

        # Test 3: List all plans
        test_list_plans()

        print("\n" + "=" * 70)
        print("✅ ALL TESTS COMPLETED")
        print("=" * 70)
    else:
        print("\n" + "=" * 70)
        print("❌ TESTS FAILED - Could not create plan")
        print("=" * 70)
