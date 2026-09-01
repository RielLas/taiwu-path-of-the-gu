"""
Primeval Aperture, Gu Ecology, & Refinement API Endpoints
Direct database access per request.
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from app.engine.cultivator import get_cultivator
from app.engine.refinement import execute_gu_refinement, RECIPES, calculate_refinement_rate

router = APIRouter()

@router.get("/aperture")
async def get_aperture():
    """
    Returns the player's Primeval Aperture inventory and dynamic stats directly from DB.
    """
    cultivator = get_cultivator(1)
    return {
        "status": "success",
        "cultivator": cultivator.get_stats(),
        "gu_worms": cultivator.aperture
    }

@router.get("/vault")
async def get_vault():
    """
    Returns the player's unequipped Vault inventory and materials directly from DB.
    """
    cultivator = get_cultivator(1)
    return {
        "status": "success",
        "cultivator": cultivator.get_stats(),
        "vault": cultivator.vault,
        "vault_capacity": cultivator.get_vault_capacity(),
        "aperture_capacity": cultivator.get_aperture_capacity()
    }

@router.post("/feed")
async def feed_gu(payload: Dict[str, Any]):
    """
    Feeds a Gu worm with Primeval Stones to restore satiety (+20 satiety per stone).
    """
    gu_id = payload.get("gu_id")
    if not gu_id:
        raise HTTPException(status_code=400, detail="Must provide 'gu_id' to feed.")
        
    stone_amount = payload.get("stone_amount", payload.get("amount", 1))
    try:
        stone_amount = int(stone_amount)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="stone_amount must be an integer.")
        
    cultivator = get_cultivator(1)
    result = cultivator.feed_gu_worm(gu_id, stone_amount)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to feed Gu."))
        
    return result

@router.post("/unequip")
async def unequip_gu_endpoint(payload: Dict[str, Any]):
    """
    Moves a Gu worm from active Aperture to storage Vault.
    """
    gu_id = payload.get("gu_id")
    if not gu_id:
        raise HTTPException(status_code=400, detail="Must provide 'gu_id' to unequip.")
        
    cultivator = get_cultivator(1)
    result = cultivator.unequip_gu(gu_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to unequip Gu."))
    return result

@router.post("/equip")
async def equip_gu_endpoint(payload: Dict[str, Any]):
    """
    Moves a Gu worm from storage Vault into active Aperture.
    """
    gu_id = payload.get("gu_id")
    if not gu_id:
        raise HTTPException(status_code=400, detail="Must provide 'gu_id' to equip.")
        
    cultivator = get_cultivator(1)
    result = cultivator.equip_gu(gu_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to equip Gu."))
    return result

@router.post("/refine")
async def refine_gu(payload: Dict[str, Any]):
    """
    Attempts to refine two Gu worms into a higher tier variant via the Dao of Refinement.
    """
    gu_a_id = payload.get("gu_a_id")
    gu_b_id = payload.get("gu_b_id")
    
    if not gu_a_id or not gu_b_id:
        raise HTTPException(status_code=400, detail="Must provide 'gu_a_id' and 'gu_b_id'.")
        
    result = execute_gu_refinement(gu_a_id, gu_b_id)
    if not result.get("success") and not result.get("backlash"):
        raise HTTPException(status_code=400, detail=result.get("message", "Refinement failed to initiate."))
        
    return result

@router.get("/refine/recipes")
async def get_refinement_recipes():
    """
    Returns canonical refinement recipes and cultivator Dao Mark bonuses.
    """
    cultivator = get_cultivator(1)
    dao_marks = getattr(cultivator, "dao_marks", {})
    recipes_with_rates = []
    for r in RECIPES:
        rate = calculate_refinement_rate(r["target_path"], r["base_rate"])
        recipes_with_rates.append({
            **r,
            "calculated_success_rate": round(rate * 100, 1),
            "relevant_marks": dao_marks.get(r["target_path"], 0) + dao_marks.get("Refinement Path", 0)
        })
    return {
        "status": "success",
        "recipes": recipes_with_rates,
        "cultivator_stones": cultivator.spirit_stones,
        "primeval_stones": cultivator.primeval_stones,
        "dao_marks": dao_marks
    }

@router.post("/capture")
async def capture_wild_gu(payload: Dict[str, Any]):
    """
    Subdues and captures a wild Gu into the player's Primeval Aperture or Vault.
    """
    wild_gu = payload.get("wild_gu")
    if not wild_gu:
        raise HTTPException(status_code=400, detail="No wild Gu specified.")
        
    cultivator = get_cultivator(1)
    gu_entry = {
        "id": f"gu_wild_{len(cultivator.aperture) + len(cultivator.vault) + 200}",
        "name": wild_gu.get("name", "Wild Gu"),
        "tier": wild_gu.get("tier", 1),
        "path": wild_gu.get("path", "General"),
        "gu_type": wild_gu.get("gu_type", "active"),
        "satiety": 100,
        "hunger": 100,
        "food": wild_gu.get("food", "Primeval Stones"),
        "effect_desc": wild_gu.get("effect_desc", "A freshly subdued wild Gu."),
        "passive_buff": wild_gu.get("passive_buff", None),
        "active_power": wild_gu.get("active_power", 30),
        "essence_cost": wild_gu.get("essence_cost", 10)
    }
    
    # Store in aperture if space available, otherwise vault
    if len(cultivator.aperture) < cultivator.get_aperture_capacity():
        cultivator.aperture.append(gu_entry)
        destination = "Primeval Aperture"
    else:
        cultivator.vault.append(gu_entry)
        destination = "Storage Vault"
        
    cultivator.save_to_db()
    return {
        "success": True,
        "message": f"Successfully subdued and stored {gu_entry['name']} into your {destination}!",
        "gu": gu_entry,
        "cultivator": cultivator.get_stats()
    }

@router.post("/nourish")
async def nourish_aperture(payload: Dict[str, Any] = {}):
    """
    The Nourishment Loop:
    Washes the aperture crystal walls with Primeval Essence.
    """
    cultivator = get_cultivator(1)
    drain = payload.get("drain_percentage", 30.0)
    result = cultivator.nourish_aperture(drain)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Nourishment failed."))
    return result

@router.post("/ascend")
async def attempt_ascend():
    """
    Mortal Breakthrough attempt.
    """
    cultivator = get_cultivator(1)
    return cultivator.attempt_ascension()

@router.post("/death-penalty")
async def apply_death_penalty():
    """
    Ruthless mortality penalty upon death.
    """
    cultivator = get_cultivator(1)
    return cultivator.apply_death_penalty()
