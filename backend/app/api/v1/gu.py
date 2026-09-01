from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from app.engine.refinement_math import calculate_refinement
from app.engine.cultivator import player_cultivator

router = APIRouter()

@router.get("/aperture")
async def get_aperture():
    """
    Returns the player's Primeval Aperture inventory and dynamic stats.
    """
    cultivator_info = player_cultivator.get_stats()
    return {
        "status": "success",
        "cultivator": cultivator_info,
        "gu_worms": player_cultivator.aperture
    }

@router.post("/feed")
async def feed_gu(payload: Dict[str, Any]):
    """
    Feeds a Gu worm with spirit stones / food to restore its hunger/satiety.
    """
    gu_id = payload.get("gu_id")
    if not gu_id:
        raise HTTPException(status_code=400, detail="Must provide 'gu_id' to feed.")
        
    result = player_cultivator.feed_gu(gu_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to feed Gu."))
        
    return result

@router.post("/refine")
async def refine_gu(payload: Dict[str, Any]):
    """
    Attempts to refine two Gu worms into a higher tier variant via the Dao of Refinement.
    Canonical Gu Lore:
    - Base success rate 40% + 1% per relevant Dao mark.
    - On Success: Reactants consumed, stones deducted, refined Gu added to Vault.
    - On Failure: Reactants destroyed permanently, stones deducted, 20% Max HP backlash damage inflicted.
    """
    from app.engine.refinement import execute_gu_refinement, RECIPES
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
    from app.engine.refinement import RECIPES, calculate_refinement_rate
    dao_marks = getattr(player_cultivator, "dao_marks", {})
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
        "cultivator_stones": player_cultivator.spirit_stones,
        "dao_marks": dao_marks
    }

@router.post("/capture")
async def capture_wild_gu(payload: Dict[str, Any]):
    """
    Subdues and captures a wild Gu into the player's Primeval Aperture.
    """
    wild_gu = payload.get("wild_gu")
    if not wild_gu:
        raise HTTPException(status_code=400, detail="No wild Gu specified.")
        
    gu_entry = {
        "id": f"gu_wild_{len(player_cultivator.aperture) + 200}",
        "name": wild_gu.get("name", "Wild Gu"),
        "tier": wild_gu.get("tier", 1),
        "path": wild_gu.get("path", "General"),
        "gu_type": wild_gu.get("gu_type", "active"),
        "hunger": 80,
        "food": wild_gu.get("food", "Primeval Stones"),
        "effect_desc": wild_gu.get("effect_desc", "A freshly subdued wild Gu."),
        "passive_buff": wild_gu.get("passive_buff", None),
        "active_power": wild_gu.get("active_power", 30),
        "essence_cost": wild_gu.get("essence_cost", 10)
    }
    
    player_cultivator.aperture.append(gu_entry)
    player_cultivator.save_to_db()
    return {
        "success": True,
        "message": f"Successfully subdued and stored {gu_entry['name']} into your Aperture!",
        "gu": gu_entry,
        "cultivator": player_cultivator.get_stats()
    }

@router.post("/nourish")
async def nourish_aperture(payload: Dict[str, Any] = {}):
    """
    The Nourishment Loop (Micro-Progression):
    Washes the aperture crystal walls with Primeval Essence (e.g. 30% sea volume drain).
    Yields Aperture Tempering Progress. Reaching 100% advances to the next micro-stage
    (Initial -> Middle -> Upper -> Peak).
    """
    drain = payload.get("drain_percentage", 30.0)
    result = player_cultivator.nourish_aperture(drain)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Nourishment failed."))
    return result

@router.post("/ascend")
async def attempt_ascend():
    """
    Lore-Accurate Mortal Breakthrough:
    Attempts to shatter the crystal aperture wall at Peak Stage.
    Consumes 90% primeval essence and rolls success strictly bounded by aperture_grade.
    On success: Immediately ranks up and resets to Initial Stage.
    On failure: 15% chance of permanent Aperture Fracture (-5% max essence).
    """
    return player_cultivator.attempt_ascension()

@router.post("/death-penalty")
async def apply_death_penalty():
    """
    Ruthless mortality penalty upon death in overworld/combat.
    Teleports to origin [7,7], drops 50% spirit stones, and destroys 1 equipped Gu.
    """
    return player_cultivator.apply_death_penalty()
