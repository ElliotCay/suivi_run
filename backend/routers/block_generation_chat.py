"""
Block Generation Chat Router

Handles AI-powered conversational block generation.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from services.block_generation_chat_service import (
    create_block_generation_conversation,
    get_initial_questions,
    send_message,
    propose_block_parameters,
    validate_and_generate_block
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class SendMessageRequest(BaseModel):
    """Request to send a message in the conversation."""
    message: str


class ValidateBlockRequest(BaseModel):
    """Request to validate and generate the block."""
    start_date: Optional[str] = None  # ISO format YYYY-MM-DD


@router.post("/block-generation/conversations")
async def create_conversation(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Create a new block generation conversation.

    Returns:
        Conversation ID and initial AI questions
    """
    try:
        # Create conversation
        conversation = create_block_generation_conversation(db, user_id)

        # Get initial questions from AI
        initial_response = get_initial_questions(db, conversation.id)

        return {
            "conversation_id": conversation.id,
            "message": initial_response["content"],
            "tokens_used": initial_response["tokens_used"],
            "is_cached": initial_response.get("is_cached", False)
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating block generation conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/block-generation/conversations/{conversation_id}/messages")
async def send_conversation_message(
    conversation_id: int,
    request: SendMessageRequest,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Send a message in the block generation conversation.

    Args:
        conversation_id: Conversation ID
        request: Message content

    Returns:
        AI response
    """
    try:
        response = send_message(db, conversation_id, request.message)

        return {
            "message_id": response["message_id"],
            "content": response["content"],
            "tokens_used": response["tokens_used"],
            "is_cached": response.get("is_cached", False),
            "message_count": response.get("message_count"),
            "approaching_limit": response.get("approaching_limit", False),
            "max_messages": response.get("max_messages")
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/block-generation/conversations/{conversation_id}/propose")
async def request_block_proposal(
    conversation_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Request AI to propose block parameters based on conversation.

    Args:
        conversation_id: Conversation ID

    Returns:
        Proposed block parameters including:
        - analysis: AI's analysis of user needs
        - block_parameters: phase, days_per_week, volume, etc.
        - weekly_structure: proposed workouts per day
        - special_recommendations: personalized advice
    """
    try:
        proposal = propose_block_parameters(db, conversation_id)

        return {
            "analysis": proposal.get("analysis"),
            "block_parameters": proposal.get("block_parameters"),
            "weekly_structure": proposal.get("weekly_structure"),
            "special_recommendations": proposal.get("special_recommendations"),
            "tokens_used": proposal.get("tokens_used"),
            "preferred_days": proposal.get("preferred_days"),
            "preferred_time": proposal.get("preferred_time")
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating proposal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/block-generation/conversations/{conversation_id}/validate")
async def validate_and_create_block(
    conversation_id: int,
    request: ValidateBlockRequest = None,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Validate the proposal and generate the training block.

    Args:
        conversation_id: Conversation ID
        request: Optional start date

    Returns:
        Generated block info
    """
    try:
        start_date = None
        if request and request.start_date:
            start_date = datetime.fromisoformat(request.start_date)

        result = validate_and_generate_block(db, conversation_id, start_date)

        return {
            "success": True,
            "block_id": result["block_id"],
            "block_name": result["block_name"],
            "phase": result["phase"],
            "start_date": result["start_date"],
            "end_date": result["end_date"],
            "days_per_week": result["days_per_week"],
            "target_weekly_volume": result["target_weekly_volume"],
            "total_workouts": result["total_workouts"],
            "conversation_id": result["conversation_id"]
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error validating block: {e}")
        raise HTTPException(status_code=500, detail=str(e))
