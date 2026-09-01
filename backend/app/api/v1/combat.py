"""
Combat API Endpoints (Plunder Matrix & Battle Actions)
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from app.engine.combat import resolve_combat_plunder, calculate_gu_combat_cost
from app.engine.cultivator import player_cultivator
from app.engine.npc import enforcer_manager

router = APIRouter()

@router.post("/plunder")
async def combat_plunder(payload: Dict[str, Any] = {}):
    """
    The Plunder Matrix:
    Transfers 50-150 Primeval Stones and 30% chance for an equipped Gu worm from the defeated enemy.
    """
    enemy_id = payload.get("enemy_id")
    is_enforcer = payload.get("is_enforcer", False)
    reward_stones = payload.get("reward_stones")
    
    result = resolve_combat_plunder(enemy_id, is_enforcer, reward_stones)
    return result

@router.get("/costs")
async def get_combat_costs():
    """
    Returns current essence multiplier and fractional cost matrix for equipped combat Gu.
    """
    multiplier = player_cultivator.get_essence_multiplier()
    costs = []
    for gu in player_cultivator.aperture:
        if gu.get("gu_type") == "active":
            beu = gu.get("essence_cost", 10)
            actual_pct = calculate_gu_combat_cost(beu)
            costs.append({
                "id": gu["id"],
                "name": gu["name"],
                "beu_cost": beu,
                "multiplier": multiplier,
                "actual_percentage_cost": actual_pct
            })
            
    return {
        "status": "success",
        "multiplier": multiplier,
        "rank": player_cultivator.rank,
        "stage": player_cultivator.stage,
        "gu_costs": costs
    }
