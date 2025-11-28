"""
Unified Planning router for both simple blocks and race preparation.
"""

from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_

from database import get_db
from models import TrainingBlock, RaceObjective
from schemas import (
    GeneratePlanningRequest,
    GeneratePlanningResponse,
    TrainingBlockResponse,
    RaceObjectiveResponse,
    PeriodizationSummary
)
from services.training_block_generator import generate_4_week_block
from services.race_plan_generator import generate_race_preparation_plan
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/planning/generate-preparation", response_model=GeneratePlanningResponse)
async def generate_preparation(
    request: GeneratePlanningRequest,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Unified endpoint for generating training preparation.

    Modes:
    - "simple": Generate single 4-week block without race objective
    - "race": Generate multi-block (4-12 weeks) race preparation plan

    Args:
        request: Generation parameters (mode, race_objective_id, start_date, days_per_week, phase)

    Returns:
        Generated blocks with periodization summary and optional race objective
    """
    try:
        if request.mode == "simple":
            # Simple mode: single 4-week block
            logger.info(f"Generating simple 4-week block - Phase: {request.phase}")

            # Check if there's already an active block
            active_block = db.query(TrainingBlock).filter(
                and_(
                    TrainingBlock.user_id == user_id,
                    TrainingBlock.status == "active"
                )
            ).first()

            if active_block:
                raise HTTPException(
                    status_code=400,
                    detail="You already have an active training block. Complete or abandon it before creating a new one."
                )

            # Generate single block
            block = generate_4_week_block(
                db=db,
                user_id=user_id,
                phase=request.phase or "base",
                days_per_week=request.days_per_week,
                start_date=request.start_date,
                use_ai_descriptions=True,
                use_sonnet=False,
                add_recovery_sunday=True
            )

            # Prepare response
            periodization_summary = PeriodizationSummary(
                total_weeks=4,
                base_weeks=4 if request.phase == "base" else 0,
                development_weeks=4 if request.phase == "development" else 0,
                peak_weeks=4 if request.phase == "peak" else 0,
                taper_weeks=0
            )

            return GeneratePlanningResponse(
                race_objective=None,
                blocks=[block],
                periodization_summary=periodization_summary
            )

        elif request.mode == "race":
            # Race mode: multi-block preparation
            if not request.race_objective_id:
                raise HTTPException(
                    status_code=400,
                    detail="race_objective_id is required for race mode"
                )

            logger.info(f"Generating race preparation for objective {request.race_objective_id}")

            # Check if there's already an active block
            active_block = db.query(TrainingBlock).filter(
                and_(
                    TrainingBlock.user_id == user_id,
                    TrainingBlock.status == "active"
                )
            ).first()

            # If there's an active block, complete it automatically
            if active_block:
                logger.info(f"Found active block (ID: {active_block.id}) - completing it to start race preparation")
                active_block.status = "completed"
                db.commit()
                logger.info(f"✅ Block {active_block.id} marked as completed")

            # Generate race preparation plan
            result = generate_race_preparation_plan(
                db=db,
                user_id=user_id,
                race_objective_id=request.race_objective_id,
                days_per_week=request.days_per_week,
                start_date=request.start_date,
                use_ai_descriptions=True,
                use_sonnet=False
            )

            # Convert to response format
            periodization_summary = PeriodizationSummary(
                **result["periodization_summary"]
            )

            return GeneratePlanningResponse(
                race_objective=result["race_objective"],
                blocks=result["blocks"],
                periodization_summary=periodization_summary
            )

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid mode: {request.mode}. Must be 'simple' or 'race'"
            )

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating preparation: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate preparation: {str(e)}")


@router.get("/planning/current", response_model=GeneratePlanningResponse)
async def get_current_plan(
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Get the current active training plan.

    Returns:
    - All active blocks (could be multiple if part of race preparation)
    - Associated race objective (if any)
    - Periodization summary

    Returns 404 if no active plan exists.
    """
    # Get all active blocks
    blocks = db.query(TrainingBlock).filter(
        and_(
            TrainingBlock.user_id == user_id,
            TrainingBlock.status == "active"
        )
    ).order_by(TrainingBlock.block_sequence).all()

    if not blocks:
        raise HTTPException(status_code=404, detail="No active training plan found")

    # Check if linked to race objective
    race_objective = None
    if blocks[0].race_objective_id:
        race_objective = db.query(RaceObjective).filter(
            RaceObjective.id == blocks[0].race_objective_id
        ).first()

    # Calculate periodization summary
    phase_weeks = {"base": 0, "development": 0, "peak": 0, "taper": 0}
    for block in blocks:
        phase = block.phase
        if phase in phase_weeks:
            phase_weeks[phase] += 4  # Each block is 4 weeks

    total_weeks = sum(phase_weeks.values())

    periodization_summary = PeriodizationSummary(
        total_weeks=total_weeks,
        base_weeks=phase_weeks["base"],
        development_weeks=phase_weeks["development"],
        peak_weeks=phase_weeks["peak"],
        taper_weeks=phase_weeks["taper"]
    )

    return GeneratePlanningResponse(
        race_objective=race_objective,
        blocks=blocks,
        periodization_summary=periodization_summary
    )
