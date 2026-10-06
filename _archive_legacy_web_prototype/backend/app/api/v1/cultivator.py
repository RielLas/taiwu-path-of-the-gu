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
    Deducts specified quantity of Primeval Stones from the JSON Vault ledger to instantly restore
    (quantity * max_essence * 0.05) Primeval Essence.
    Completely bypasses Stamina drain of standard meditation.
    """
    quantity = payload.get("quantity", payload.get("amount", 1))
    try:
        quantity = int(quantity)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Stone quantity must be an integer.")
        
    cultivator = get_cultivator(1)
    result = cultivator.consume_primeval_stones(quantity)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to consume stones."))
    return result
