"""
Race Plan Generator

Generates intelligent multi-block (4-12 weeks) race preparation plans.
Features:
- Automatic phase distribution based on timeline
- Progressive periodization: base → development → peak → taper
- Injury-aware strengthening integration
- Race-specific workouts in peak phase
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any
from sqlalchemy.orm import Session
import logging

from models import RaceObjective, TrainingBlock, InjuryHistory
from services.training_block_generator import generate_4_week_block
from services.injury_strengthening import (
    select_strengthening_sessions,
    get_strengthening_priorities
)

logger = logging.getLogger(__name__)


def calculate_phase_distribution(weeks_until_race: int) -> Dict[str, int]:
    """
    Calculate intelligent phase distribution based on weeks until race.

    Rules:
    - 4 weeks: base (3) + taper (1)
    - 8 weeks: base (4) + development (3) + taper (1)
    - 12 weeks: base (4) + development (4) + peak (3) + taper (1)

    Args:
        weeks_until_race: Number of weeks from start to race day

    Returns:
        Dictionary with weeks per phase: {"base": 4, "development": 4, "peak": 3, "taper": 1}
    """
    if weeks_until_race <= 4:
        return {"base": max(3, weeks_until_race - 1), "taper": 1}

    elif weeks_until_race <= 8:
        base_weeks = 4
        taper_weeks = 1
        development_weeks = weeks_until_race - base_weeks - taper_weeks
        return {
            "base": base_weeks,
            "development": development_weeks,
            "taper": taper_weeks
        }

    else:  # 9-12+ weeks
        base_weeks = 4
        taper_weeks = 1

        # For 12 weeks: 4 base + 4 dev + 3 peak + 1 taper
        # For 10 weeks: 4 base + 4 dev + 1 peak + 1 taper
        # For 9 weeks: 4 base + 3 dev + 1 peak + 1 taper

        remaining_weeks = weeks_until_race - base_weeks - taper_weeks

        if remaining_weeks >= 7:
            # Enough for both dev and peak
            development_weeks = 4
            peak_weeks = remaining_weeks - development_weeks
        else:
            # Split remaining between dev and peak
            development_weeks = max(3, remaining_weeks - 3)
            peak_weeks = remaining_weeks - development_weeks

        return {
            "base": base_weeks,
            "development": development_weeks,
            "peak": peak_weeks,
            "taper": taper_weeks
        }


def calculate_weeks_until_race(race_date: datetime, start_date: datetime) -> int:
    """Calculate number of full weeks from start to race day."""
    delta = race_date - start_date
    return max(4, int(delta.days / 7))  # Minimum 4 weeks


def generate_race_preparation_plan(
    db: Session,
    user_id: int,
    race_objective_id: int,
    days_per_week: int,
    start_date: datetime,
    use_ai_descriptions: bool = True,
    use_sonnet: bool = False
) -> Dict[str, Any]:
    """
    Generate complete multi-block race preparation plan.

    Process:
    1. Load race objective
    2. Calculate weeks until race
    3. Distribute phases intelligently
    4. Generate 4-week blocks for each phase
    5. Integrate injury-aware strengthening
    6. Apply race-specific adaptations in peak phase

    Args:
        db: Database session
        user_id: User ID
        race_objective_id: Race objective ID
        days_per_week: Training days per week (3-6)
        start_date: When to start preparation
        use_ai_descriptions: Generate personalized workout descriptions
        use_sonnet: Use Claude Sonnet for AI generation

    Returns:
        Dict with race_objective, blocks[], and periodization_summary
    """
    # Load race objective
    race_objective = db.query(RaceObjective).filter(
        RaceObjective.id == race_objective_id,
        RaceObjective.user_id == user_id
    ).first()

    if not race_objective:
        raise ValueError(f"Race objective {race_objective_id} not found")

    if race_objective.status != "active":
        raise ValueError(f"Race objective is not active (status: {race_objective.status})")

    # Calculate weeks until race
    weeks_until_race = calculate_weeks_until_race(race_objective.race_date, start_date)

    # Distribute phases
    phase_distribution = calculate_phase_distribution(weeks_until_race)

    logger.info(f"Generating race plan for {weeks_until_race} weeks")
    logger.info(f"Phase distribution: {phase_distribution}")

    # Check if weeks_until_race is too short
    if weeks_until_race < 4:
        logger.warning(f"Race is only {weeks_until_race} weeks away - minimum preparation")

    # Get injury history for strengthening prioritization
    active_injuries = db.query(InjuryHistory).filter(
        InjuryHistory.user_id == user_id,
        (InjuryHistory.status.in_(["active", "monitoring"])) | (InjuryHistory.recurrence_count > 0)
    ).all()

    strengthening_priorities = get_strengthening_priorities(active_injuries)

    # Generate blocks for each phase
    blocks = []
    block_sequence = 1
    current_start = start_date

    # Create a more intelligent block distribution
    # Instead of losing partial weeks, we'll create blocks of varying lengths
    phase_blocks = []

    for phase, weeks in phase_distribution.items():
        if weeks == 0:
            continue

        if weeks >= 4:
            # Create full 4-week blocks
            full_blocks = weeks // 4
            for _ in range(full_blocks):
                phase_blocks.append({"phase": phase, "weeks": 4})

            # Handle remaining weeks (1-3 weeks)
            remaining_weeks = weeks % 4
            if remaining_weeks > 0:
                # Add a partial block
                phase_blocks.append({"phase": phase, "weeks": remaining_weeks})
        else:
            # Phase is less than 4 weeks (typically taper or peak)
            # Create a partial block
            phase_blocks.append({"phase": phase, "weeks": weeks})

    total_phase_weeks = sum(phase_distribution.values())
    total_blocks_weeks = sum(b["weeks"] for b in phase_blocks)
    logger.info(f"📅 Planning {len(phase_blocks)} blocks for {total_blocks_weeks} weeks (target: {total_phase_weeks} weeks)")

    # Generate each block (4 weeks or partial)
    for block_info in phase_blocks:
        phase = block_info["phase"]
        num_weeks = block_info["weeks"]

        logger.info(f"Generating block {block_sequence} - Phase: {phase} ({num_weeks} weeks)")

        # Generate block name
        phase_names_fr = {
            "base": "Base (Endurance)",
            "development": "Développement",
            "peak": "Pic (Intensité)",
            "taper": "Affûtage"
        }
        week_label = f"{num_weeks} sem" if num_weeks != 4 else ""
        block_name = f"Bloc {block_sequence}: {phase_names_fr.get(phase, phase)}"
        if week_label:
            block_name += f" ({week_label})"

        # Calculate block volume (progressive increase, then taper)
        # This logic can be refined based on feedback

        try:
            # Calculate end date based on num_weeks
            block_end_date = current_start + timedelta(weeks=num_weeks)

            # Generate the block (4 weeks or partial)
            # Note: generate_4_week_block can handle any number of weeks despite its name
            block = generate_4_week_block(
                db=db,
                user_id=user_id,
                phase=phase,
                days_per_week=days_per_week,
                start_date=current_start,
                use_ai_descriptions=use_ai_descriptions,
                use_sonnet=use_sonnet,
                add_recovery_sunday=True,
                num_weeks=num_weeks  # Pass the number of weeks
            )

            # Link to race objective
            block.race_objective_id = race_objective_id
            block.block_sequence = block_sequence
            block.name = block_name

            # Override strengthening reminders with injury-aware selection
            # Delete auto-generated reminders
            for reminder in block.strengthening_reminders:
                db.delete(reminder)
            db.flush()

            # Create injury-aware reminders
            preferred_days = [2, 5]  # Wednesday and Saturday
            injury_aware_reminders = select_strengthening_sessions(
                db=db,
                user_id=user_id,
                block_id=block.id,
                start_date=block.start_date,
                end_date=block.end_date,
                preferred_days=preferred_days
            )

            # Add to database
            for reminder in injury_aware_reminders:
                db.add(reminder)

            db.commit()
            db.refresh(block)

            blocks.append(block)

            # Move to next block
            current_start = block.end_date + timedelta(days=1)
            block_sequence += 1

        except Exception as e:
            logger.error(f"Error generating block {block_sequence}: {str(e)}")
            db.rollback()
            raise

    # Prepare response
    periodization_summary = {
        "total_weeks": weeks_until_race,
        "base_weeks": phase_distribution.get("base", 0),
        "development_weeks": phase_distribution.get("development", 0),
        "peak_weeks": phase_distribution.get("peak", 0),
        "taper_weeks": phase_distribution.get("taper", 0)
    }

    return {
        "race_objective": race_objective,
        "blocks": blocks,
        "periodization_summary": periodization_summary
    }


def calculate_optimal_start_date(race_date: datetime, target_weeks: int = 12) -> datetime:
    """
    Calculate optimal start date for race preparation.

    Args:
        race_date: Race day
        target_weeks: Target preparation length (default 12)

    Returns:
        Recommended start date (a Monday)
    """
    # Calculate start date
    start_date = race_date - timedelta(weeks=target_weeks)

    # Adjust to Monday
    days_to_monday = (start_date.weekday()) % 7
    if days_to_monday != 0:
        start_date = start_date - timedelta(days=days_to_monday)

    return start_date
