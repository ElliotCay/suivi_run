"""
FastAPI application entry point for the running tracking application.
"""

from typing import Dict

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import import_router, workouts, profile, suggestions, dashboard, auto_import, records, calendar, training_plans, strava

# Create FastAPI application instance
app = FastAPI(
    title="Running Tracker API",
    description="API for tracking running workouts, training plans, and AI-powered suggestions",
    version="1.0.0",
)

# Configure CORS middleware to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
