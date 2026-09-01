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
    Attempts to refine two Gu worms into a higher tier variant.
    Harsh failure rate: on failure, the ingredients are permanently destroyed!
    """
    gu_a_id = payload.get("gu_a_id")
    gu_b_id = payload.get("gu_b_id")
    catalyst = payload.get("catalyst")
    
    gu_a = next((g for g in player_cultivator.aperture if g["id"] == gu_a_id), None)
    gu_b = next((g for g in player_cultivator.aperture if g["id"] == gu_b_id), None)
    
    if not gu_a or not gu_b:
        raise HTTPException(status_code=400, detail="Must provide two valid Gu from the aperture.")
        
    if gu_a_id == gu_b_id:
        raise HTTPException(status_code=400, detail="Cannot refine a Gu with itself.")
        
    result = calculate_refinement(gu_a, gu_b, catalyst)
    
    # Remove consumed Gu from aperture
    player_cultivator.aperture.remove(gu_a)
    player_cultivator.aperture.remove(gu_b)
    
    if result["success"]:
        new_gu = result["result_gu"]
        # Determine if it is passive or active based on path
        is_passive = gu_a.get("gu_type") == "passive_body" or gu_b.get("gu_type") == "passive_body"
        
        created_gu = {
            "id": f"gu_refined_{len(player_cultivator.aperture) + 101}",
            "name": new_gu["name"],
            "tier": new_gu["tier"],
            "path": new_gu["path"],
            "gu_type": "passive_body" if is_passive else "active",
            "hunger": 100,
            "food": gu_a.get("food", "Spirit Stones"),
            "effect_desc": f"Potent refined {new_gu['name']} with enhanced heavenly dao marks.",
            "passive_buff": gu_a.get("passive_buff") if is_passive else None,
            "active_power": (gu_a.get("active_power", 0) + gu_b.get("active_power", 0)) if not is_passive else 0,
            "essence_cost": gu_a.get("essence_cost", 10)
        }
        
        # If passive, boost the buff value
        if is_passive and created_gu["passive_buff"]:
            created_gu["passive_buff"] = {
                "stat": created_gu["passive_buff"]["stat"],
                "value": int(created_gu["passive_buff"]["value"] * 1.5),
                "label": f"Refined {created_gu['passive_buff']['label']}"
            }
            
        player_cultivator.aperture.append(created_gu)
        result["result_gu"] = created_gu
    else:
        # Refinement failure backlash: 50% max HP damage
        current_stats = player_cultivator.get_stats()
        damage_taken = max(1, int(current_stats["max_hp"] * 0.5))
        player_cultivator.current_hp = max(1, player_cultivator.current_hp - damage_taken)
        result["damage_taken"] = damage_taken
        
    result["cultivator"] = player_cultivator.get_stats()
    return result

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
