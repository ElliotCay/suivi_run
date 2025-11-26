"""
Chat Adjustments Router

API endpoints for AI-powered conversational training block adjustments.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import ChatConversation, ChatMessage
from schemas import (
    CreateConversationRequest,
    SendMessageRequest,
    ChatConversationResponse,
    ChatMessageResponse,
    MessageSendResponse,
    ProposalResponse,
    ValidateResponse
)
from services import chat_adjustment_service
from services.icloud_calendar_sync import iCloudCalendarSync, CalendarSyncError

import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/chat",
    tags=["chat-adjustments"]
)


@router.post("/conversations", response_model=ChatConversationResponse)
def create_conversation(
    request: CreateConversationRequest,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Create a new chat conversation for training block adjustments.

    Args:
        request: Conversation creation request (block_id, scope_mode)
        db: Database session
        user_id: User ID (from auth)

    Returns:
        ChatConversationResponse with initial AI message
    """

    try:
        # Create conversation
        conversation = chat_adjustment_service.create_conversation(
            db=db,
            user_id=user_id,
            block_id=request.block_id,
            scope_mode=request.scope_mode
        )

        # Get initial AI questions
        initial_message = chat_adjustment_service.get_ai_initial_questions(
            db=db,
            conversation_id=conversation.id
        )

        # Reload conversation with messages
        db.refresh(conversation)

        logger.info(f"Created conversation {conversation.id} for user {user_id}")

        return conversation

    except ValueError as e:
        logger.error(f"Validation error creating conversation: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating conversation: {e}")
        logger.exception(e)  # Log full traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create conversation: {str(e)}"
        )


@router.get("/blocks/{block_id}/active-conversation", response_model=ChatConversationResponse)
def get_active_conversation(
    block_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Retrieve the active conversation for a training block.
    Returns the most recent non-validated conversation.

    Args:
        block_id: Training block ID
        db: Database session
        user_id: User ID (from auth)

    Returns:
        ChatConversationResponse with all messages, or 404 if no active conversation
    """

    conversation = db.query(ChatConversation).filter(
        ChatConversation.block_id == block_id,
        ChatConversation.user_id == user_id,
        ChatConversation.state.in_(["active", "proposal_ready"])
    ).order_by(ChatConversation.created_at.desc()).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active conversation found for this block"
        )

    return conversation


@router.get("/conversations/{conversation_id}", response_model=ChatConversationResponse)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Retrieve a conversation with all messages.

    Args:
        conversation_id: Conversation ID
        db: Database session
        user_id: User ID (from auth)

    Returns:
        ChatConversationResponse with all messages
    """

    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    if conversation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this conversation"
        )

    return conversation


@router.post("/conversations/{conversation_id}/messages", response_model=MessageSendResponse)
def send_message(
    conversation_id: int,
    request: SendMessageRequest,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Send a message in the conversation and get AI response.

    Args:
        conversation_id: Conversation ID
        request: Message content
        db: Database session
        user_id: User ID (from auth)

    Returns:
        MessageSendResponse with AI's reply and metadata
    """

    # Verify conversation belongs to user
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    if conversation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this conversation"
        )

    try:
        response = chat_adjustment_service.send_message(
            db=db,
            conversation_id=conversation_id,
            user_message=request.content
        )

        logger.info(
            f"Message sent in conversation {conversation_id}, "
            f"tokens: {response['tokens_used']}, cached: {response['is_cached']}"
        )

        return response

    except ValueError as e:
        logger.error(f"Validation error sending message: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message"
        )


@router.post("/conversations/{conversation_id}/propose", response_model=ProposalResponse)
def propose_adjustments(
    conversation_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Request AI to propose workout adjustments based on the conversation.

    Args:
        conversation_id: Conversation ID
        db: Database session
        user_id: User ID (from auth)

    Returns:
        ProposalResponse with analysis and proposed adjustments
    """

    # Verify conversation belongs to user
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    if conversation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this conversation"
        )

    try:
        proposal = chat_adjustment_service.propose_adjustments(
            db=db,
            conversation_id=conversation_id
        )

        logger.info(
            f"Proposal generated for conversation {conversation_id}, "
            f"{len(proposal['adjustments'])} adjustments proposed"
        )

        return proposal

    except ValueError as e:
        logger.error(f"Validation error proposing adjustments: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error proposing adjustments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate proposal"
        )


@router.post("/conversations/{conversation_id}/validate", response_model=ValidateResponse)
def validate_and_apply(
    conversation_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Validate and apply the proposed adjustments to training block.

    Args:
        conversation_id: Conversation ID
        db: Database session
        user_id: User ID (from auth)

    Returns:
        ValidateResponse with summary of applied changes
    """

    # Verify conversation belongs to user
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    if conversation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this conversation"
        )

    try:
        result = chat_adjustment_service.validate_and_apply(
            db=db,
            conversation_id=conversation_id
        )

        logger.info(
            f"Applied {result['applied_count']} adjustments for conversation {conversation_id}"
        )

        # Synchronize modified workouts with iCloud Calendar
        calendar_sync_stats = None
        if result['modified_workout_ids']:
            try:
                logger.info(f"🔄 Starting iCloud calendar sync for {len(result['modified_workout_ids'])} workouts...")

                # Initialize calendar sync
                calendar_sync = iCloudCalendarSync()
                connected = calendar_sync.connect()

                if connected:
                    # Batch sync modified workouts
                    calendar_sync_stats = calendar_sync.batch_sync_planned_workouts(
                        workout_ids=result['modified_workout_ids'],
                        db=db
                    )

                    logger.info(
                        f"✅ iCloud sync completed: {calendar_sync_stats['created']} created, "
                        f"{calendar_sync_stats['updated']} updated, {calendar_sync_stats['errors']} errors"
                    )
                else:
                    logger.warning("⚠️ iCloud calendar connection failed, skipping sync")

            except CalendarSyncError as e:
                logger.warning(f"⚠️ iCloud calendar sync skipped: {e}")
                # Don't fail the entire request if calendar sync fails
            except Exception as e:
                logger.error(f"❌ Unexpected error during iCloud sync: {e}")
                # Don't fail the entire request if calendar sync fails

        # Add calendar sync stats to result
        result['calendar_sync'] = calendar_sync_stats

        return result

    except ValueError as e:
        logger.error(f"Validation error applying adjustments: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error applying adjustments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to apply adjustments"
        )
