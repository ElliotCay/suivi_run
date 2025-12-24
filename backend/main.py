"""
FastAPI application entry point for the running tracking application.
"""

from typing import Dict

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import import_router, workouts, profile, suggestions, dashboard, auto_import, records, calendar, training_plans, strava, training_blocks, shoes, badges, weekly_recaps, chat_adjustments, test_data, race_objectives, injury_history, planning, block_generation_chat, natural_queries

# Create FastAPI application instance
app = FastAPI(
    title="Running Tracker API",
    description="API for tracking running workouts, training plans, and AI-powered suggestions",
    version="1.0.0",
)

# Configure CORS middleware to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(import_router.router, prefix="/api", tags=["import"])
app.include_router(auto_import.router, prefix="/api", tags=["auto-import"])
app.include_router(strava.router, prefix="/api", tags=["strava"])
app.include_router(workouts.router, prefix="/api", tags=["workouts"])
app.include_router(profile.router, prefix="/api", tags=["profile"])
app.include_router(suggestions.router, prefix="/api", tags=["suggestions"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(records.router, prefix="/api", tags=["records"])
app.include_router(calendar.router, prefix="/api", tags=["calendar"])
app.include_router(training_plans.router, prefix="/api", tags=["training-plans"])
app.include_router(training_blocks.router, prefix="/api", tags=["training-blocks"])
app.include_router(shoes.router, prefix="/api", tags=["shoes"])
app.include_router(badges.router, prefix="/api", tags=["badges"])
app.include_router(weekly_recaps.router, prefix="/api", tags=["weekly-recaps"])
app.include_router(chat_adjustments.router)  # Prefix already in router definition
app.include_router(test_data.router)  # Prefix already in router definition
app.include_router(race_objectives.router, prefix="/api", tags=["race-objectives"])
app.include_router(injury_history.router, prefix="/api", tags=["injury-history"])
app.include_router(planning.router, prefix="/api", tags=["planning"])
app.include_router(block_generation_chat.router, prefix="/api", tags=["block-generation-chat"])
app.include_router(natural_queries.router)  # Prefix already in router definition


@app.get("/api/health")
async def health_check() -> Dict[str, str]:
    """
    Health check endpoint to verify API is running.

    Returns:
        Dict[str, str]: Status message indicating API health
    """
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
