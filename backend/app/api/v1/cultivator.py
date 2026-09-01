"""
Cultivator State & Progression API Endpoints
Direct database access per request.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.engine.cultivator import get_cultivator

router = APIRouter()

@router.get("/stats")
async def get_cultivator_stats():
    """
    Returns real-time cultivator stats fetched directly from SQLite database.
    """
    cultivator = get_cultivator(1)
    return {
        "status": "success",
        "cultivator": cultivator.get_stats()
    }

@router.post("/meditate")
async def meditate(payload: Dict[str, Any] = {}):
    """
    The 'Meditate' (打坐调息) Action:
    Burns 20 Stamina to trigger innate recovery, restoring Primeval Essence and HP.
    """
    cultivator = get_cultivator(1)
    cost = payload.get("stamina_cost", 20.0)
    result = cultivator.meditate(cost)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Meditation failed."))
    return result

@router.post("/consume-stone")
async def consume_primeval_stone(payload: Dict[str, Any] = {}):
    """
    The Thermodynamics of Primeval Stones:
    Deducts specified amount of Primeval Stones to instantly restore 5% Max Essence per stone.
    Completely bypasses Stamina drain of standard meditation.
    """
    amount = payload.get("amount", 1)
    try:
        amount = int(amount)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Stone amount must be an integer.")
        
    cultivator = get_cultivator(1)
    result = cultivator.consume_primeval_stones(amount)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to consume stones."))
    return result
