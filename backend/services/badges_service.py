"""
Badge detection and management service.
Automatically detects and unlocks badges based on user achievements.
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from typing import List, Dict, Optional
import logging

from models import User, Workout, UserBadge, PersonalRecord

logger = logging.getLogger(__name__)


class BadgeDefinition:
    """Definition of a badge with its criteria."""

    def __init__(
        self,
        badge_type: str,
        badge_key: str,
        badge_name: str,
        badge_icon: str,
        badge_description: str,
        check_function: callable
    ):
        self.badge_type = badge_type
        self.badge_key = badge_key
        self.badge_name = badge_name
        self.badge_icon = badge_icon
        self.badge_description = badge_description
        self.check_function = check_function


def check_volume_badges(db: Session, user_id: int) -> List[Dict]:
    """Check for volume-based badges (monthly distance)."""
    unlocked = []
    now = datetime.now()

    # Get current month stats
    month_start = datetime(now.year, now.month, 1)
    monthly_volume = db.query(func.sum(Workout.distance)).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= month_start
        )
    ).scalar() or 0.0

    # Check monthly volume badges
    volume_badges = [
        (50, "first_50km", "Premier 50km", "🥉", "50km parcourus en un mois"),
        (100, "100km_month", "100km en un mois", "🥈", "100km parcourus en un mois"),
        (150, "150km_month", "150km en un mois", "🥇", "150km parcourus en un mois"),
    ]

    for threshold, key, name, icon, description in volume_badges:
        if monthly_volume >= threshold:
            unlocked.append({
                "badge_type": "volume",
                "badge_key": key,
                "badge_name": name,
                "badge_icon": icon,
                "badge_description": description,
                "metric_value": monthly_volume
            })

    # Check total distance badge
    total_distance = db.query(func.sum(Workout.distance)).filter(
        Workout.user_id == user_id
    ).scalar() or 0.0

    if total_distance >= 1000:
        unlocked.append({
            "badge_type": "volume",
            "badge_key": "1000km_total",
            "badge_name": "1000km total",
            "badge_icon": "🏆",
            "badge_description": "1000km parcourus au total",
            "metric_value": total_distance
        })

    return unlocked


def check_record_badges(db: Session, user_id: int) -> List[Dict]:
    """Check for new personal record badges."""
    unlocked = []

    # Get all current records
    records = db.query(PersonalRecord).filter(
        and_(
            PersonalRecord.user_id == user_id,
            PersonalRecord.is_current == 1
        )
    ).all()

    # Check if records were set recently (last 7 days) to avoid re-triggering old records
    week_ago = datetime.now() - timedelta(days=7)

    distance_names = {
        "5K": ("record_5k", "Nouveau record 5km", "Record 5km battu"),
        "10K": ("record_10k", "Nouveau record 10km", "Record 10km battu"),
        "21K": ("record_semi", "Nouveau record Semi", "Record semi-marathon battu"),
        "42K": ("record_marathon", "Nouveau record Marathon", "Record marathon battu"),
    }

    for record in records:
        if record.date_achieved >= week_ago and record.distance_category in distance_names:
            key, name, description = distance_names[record.distance_category]
            unlocked.append({
                "badge_type": "record",
                "badge_key": key,
                "badge_name": name,
                "badge_icon": "⚡",
                "badge_description": description,
                "metric_value": record.time_seconds / 60.0  # time in minutes
            })

    return unlocked


def check_regularity_badges(db: Session, user_id: int) -> List[Dict]:
    """Check for regularity badges (sessions per month, consecutive weeks)."""
    unlocked = []
    now = datetime.now()

    # Check monthly session count
    month_start = datetime(now.year, now.month, 1)
    monthly_sessions = db.query(func.count(Workout.id)).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= month_start
        )
    ).scalar() or 0

    if monthly_sessions >= 10:
        unlocked.append({
            "badge_type": "regularity",
            "badge_key": "10_sessions_month",
            "badge_name": "10 séances ce mois-ci",
            "badge_icon": "🔥",
            "badge_description": f"{monthly_sessions} séances ce mois-ci",
            "metric_value": monthly_sessions
        })

    # Check consecutive weeks (3+ workouts/week)
    # Simplified: check last 12 weeks
    twelve_weeks_ago = now - timedelta(weeks=12)
    consecutive_weeks = 0
    current_week_start = now - timedelta(days=now.weekday())

    for i in range(12):
        week_start = current_week_start - timedelta(weeks=i)
        week_end = week_start + timedelta(days=7)

        week_count = db.query(func.count(Workout.id)).filter(
            and_(
                Workout.user_id == user_id,
                Workout.date >= week_start,
                Workout.date < week_end
            )
        ).scalar() or 0

        if week_count >= 3:
            consecutive_weeks += 1
        else:
            break

    if consecutive_weeks >= 12:
        unlocked.append({
            "badge_type": "regularity",
            "badge_key": "12_weeks_consecutive",
            "badge_name": "12 semaines consécutives",
            "badge_icon": "🔥",
            "badge_description": "12 semaines avec 3+ séances/semaine",
            "metric_value": consecutive_weeks
        })

    return unlocked


def check_progression_badges(db: Session, user_id: int) -> List[Dict]:
    """Check for progression badges (volume increase, pace improvement)."""
    unlocked = []
    now = datetime.now()

    # Get current month and previous month volumes
    current_month_start = datetime(now.year, now.month, 1)
    if now.month == 1:
        prev_month_start = datetime(now.year - 1, 12, 1)
        prev_month_end = datetime(now.year, 1, 1)
    else:
        prev_month_start = datetime(now.year, now.month - 1, 1)
        prev_month_end = current_month_start

    current_volume = db.query(func.sum(Workout.distance)).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= current_month_start
        )
    ).scalar() or 0.0

    prev_volume = db.query(func.sum(Workout.distance)).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= prev_month_start,
            Workout.date < prev_month_end
        )
    ).scalar() or 0.0

    if prev_volume > 0:
        increase_pct = ((current_volume - prev_volume) / prev_volume) * 100

        if increase_pct >= 20:
            unlocked.append({
                "badge_type": "progression",
                "badge_key": "volume_increase_20pct",
                "badge_name": "Volume +20%",
                "badge_icon": "📈",
                "badge_description": f"Volume +{increase_pct:.0f}% vs mois dernier",
                "metric_value": increase_pct
            })

    return unlocked


def detect_new_badges(db: Session, user_id: int) -> List[Dict]:
    """
    Detect all new badges for a user.
    Returns list of newly unlocked badges.
    """
    all_potential_badges = []

    # Check all badge categories
    all_potential_badges.extend(check_volume_badges(db, user_id))
    all_potential_badges.extend(check_record_badges(db, user_id))
    all_potential_badges.extend(check_regularity_badges(db, user_id))
    all_potential_badges.extend(check_progression_badges(db, user_id))

    # Filter out already unlocked badges
    existing_badge_keys = set(
        badge.badge_key for badge in db.query(UserBadge.badge_key).filter(
            UserBadge.user_id == user_id
        ).all()
    )

    new_badges = [
        badge for badge in all_potential_badges
        if badge["badge_key"] not in existing_badge_keys
    ]

    # Save new badges to database
    for badge_data in new_badges:
        new_badge = UserBadge(
            user_id=user_id,
            **badge_data
        )
        db.add(new_badge)

    if new_badges:
        db.commit()
        logger.info(f"Unlocked {len(new_badges)} new badges for user {user_id}")

    return new_badges


def get_user_badges(db: Session, user_id: int, include_viewed: bool = True) -> List[UserBadge]:
    """Get all badges for a user, ordered by unlock date (newest first)."""
    query = db.query(UserBadge).filter(UserBadge.user_id == user_id)

    if not include_viewed:
        query = query.filter(UserBadge.is_viewed == False)

    return query.order_by(UserBadge.unlocked_at.desc()).all()


def mark_badges_as_viewed(db: Session, user_id: int, badge_ids: Optional[List[int]] = None):
    """Mark badges as viewed. If badge_ids is None, marks all as viewed."""
    query = db.query(UserBadge).filter(UserBadge.user_id == user_id)

    if badge_ids:
        query = query.filter(UserBadge.id.in_(badge_ids))

    query.update({"is_viewed": True}, synchronize_session=False)
    db.commit()
