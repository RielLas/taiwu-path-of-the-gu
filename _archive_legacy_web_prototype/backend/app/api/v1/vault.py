from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.engine.cultivator import player_cultivator

router = APIRouter()

@router.get("")
async def get_vault():
    """
    Returns the cultivator's equipped Gu in the Aperture and inactive Gu in the Vault storage.
    """
    return player_cultivator.get_vault_data()

@router.post("/equip")
async def equip_gu(payload: Dict[str, Any]):
    """
    Equips a Gu worm from the Vault storage into the active Aperture.
    Enforces maximum 3 Active Gu worms equipped for combat.
    """
    gu_id = payload.get("gu_id")
    if not gu_id:
        raise HTTPException(status_code=400, detail="Must provide 'gu_id' to equip.")
        
    result = player_cultivator.equip_gu(gu_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to equip Gu."))
        
    return result

@router.post("/unequip")
async def unequip_gu(payload: Dict[str, Any]):
    """
    Unequips a Gu worm from active Aperture into Vault storage.
    Enforces vault storage capacity limit based on cultivator Rank.
    """
    gu_id = payload.get("gu_id")
    if not gu_id:
        raise HTTPException(status_code=400, detail="Must provide 'gu_id' to unequip.")
        
    result = player_cultivator.unequip_gu(gu_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to unequip Gu."))
        
    return result

@router.post("/feed")
async def feed_gu(payload: Dict[str, Any]):
    """
    Feeds a Gu worm in the Aperture or Vault, restoring Satiety to 100%.
    Consumes fixed Primeval Stones based on Rank/Tier (Rank 1 = 10, Rank 2 = 50, etc.).
    """
    gu_id = payload.get("gu_id")
    if not gu_id:
        raise HTTPException(status_code=400, detail="Must provide 'gu_id' to feed.")
        
    result = player_cultivator.feed_gu(gu_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to feed Gu."))
        
    return result
