from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.engine.cultivator import player_cultivator

router = APIRouter()

@router.get("/stats")
async def get_cultivator_stats():
    """
    Returns real-time cultivator stats including stamina, essence, and purity multiplier.
    """
    return {
        "status": "success",
        "cultivator": player_cultivator.get_stats()
    }

@router.post("/meditate")
async def meditate(payload: Dict[str, Any] = {}):
    """
    The 'Meditate' (打坐调息) Action:
    Burns 20 Stamina to immediately trigger innate recovery, restoring Primeval Essence and HP.
    Does NOT advance global world time, preserving multiplayer synchronization.
    """
    cost = payload.get("stamina_cost", 20.0)
    result = player_cultivator.meditate(cost)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Meditation failed."))
    return result
