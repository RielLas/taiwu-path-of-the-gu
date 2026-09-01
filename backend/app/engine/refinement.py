"""
Dao of Refinement & Backlash Matrix
Implements canonical Gu crafting recipes, Dao Mark probability scaling,
ruthless reactant destruction, and meridian backlash damage.
"""

import random
from typing import Dict, Any, Optional, Tuple, List
from app.engine.cultivator import get_cultivator

# Canonical Gu Refinement Recipe Catalog
RECIPES: List[Dict[str, Any]] = [
    {
        "id": "recipe_moonglow",
        "name": "Moonglow Gu Refinement",
        "ingredients": ["Moonlight Gu", "Little Light Gu"],
        "stone_cost": 50,
        "base_rate": 0.40,
        "target_path": "Moon Path",
        "result": {
            "name": "Moonglow Gu",
            "tier": 2,
            "path": "Moon Path",
            "gu_type": "active",
            "hunger": 100,
            "food": "Moon Orchid Petals",
            "effect_desc": "Projects an intensified radiant crescent moonblade that pierces through heavy defenses (Deals 75 Moon DMG). Costs 15 BEU.",
            "passive_buff": None,
            "active_power": 75,
            "essence_cost": 15
        }
    },
    {
        "id": "recipe_two_boars",
        "name": "Two Boars Titanic Strength Gu Refinement",
        "ingredients": ["White Boar Gu", "Black Bear Gu"],
        "stone_cost": 50,
        "base_rate": 0.40,
        "target_path": "Strength Path",
        "result": {
            "name": "Two Boars Gu",
            "tier": 2,
            "path": "Strength Path",
            "gu_type": "passive_body",
            "hunger": 100,
            "food": "Wild Beast Meat",
            "effect_desc": "Permanently tempers the mortal shell with the composite weight of two wild mountain boars (+35 Strength). Passive while fed.",
            "passive_buff": {
                "stat": "strength",
                "value": 35,
                "label": "2 Boars Titanic Strength"
            },
            "active_power": 0,
            "essence_cost": 0
        }
    },
    {
        "id": "recipe_four_flavors",
        "name": "Four Flavors Liquor Worm Refinement",
        "ingredients": ["Liquor Worm", "Spring Water Gu"],
        "stone_cost": 50,
        "base_rate": 0.40,
        "target_path": "Water Path",
        "result": {
            "name": "Four Flavors Liquor Worm",
            "tier": 2,
            "path": "Water Path",
            "gu_type": "passive_body",
            "hunger": 100,
            "food": "Four Seasonal Vintages",
            "effect_desc": "Refines primeval essence with four exquisite vintages, permanently elevating sea purity and recovery (+15 Max Essence).",
            "passive_buff": {
                "stat": "max_essence",
                "value": 15,
                "label": "Four Flavors Purified Essence"
            },
            "active_power": 0,
            "essence_cost": 0
        }
    },
    {
        "id": "recipe_blood_moon",
        "name": "Blood Moon Gu Refinement",
        "ingredients": ["Moonlight Gu", "Blood Frenzy Gu"],
        "stone_cost": 75,
        "base_rate": 0.40,
        "target_path": "Blood Path",
        "result": {
            "name": "Blood Moon Gu",
            "tier": 2,
            "path": "Blood Path",
            "gu_type": "active",
            "hunger": 100,
            "food": "Fresh Warm Blood",
            "effect_desc": "Unleashes a horrifying blood-dripping crimson crescent blade that leeches vitality on impact (Deals 95 Blood DMG). Costs 20 BEU.",
            "passive_buff": None,
            "active_power": 95,
            "essence_cost": 20
        }
    }
]

def find_matching_recipe(gu_a: Dict[str, Any], gu_b: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Dict[str, Any], int, str]:
    """
    Finds a canonical recipe matching Gu A and Gu B, or returns a fallback elemental recipe.
    """
    name_a = gu_a.get("name", "").strip()
    name_b = gu_b.get("name", "").strip()
    
    for r in RECIPES:
        ings = r["ingredients"]
        if (name_a in ings and name_b in ings and name_a != name_b) or \
           (ings[0] in [name_a, name_b] and ings[1] in [name_a, name_b]):
            return r, r["result"], r["stone_cost"], r["target_path"]
            
    # Generic Elemental / Harmonic Fusion Fallback
    target_tier = max(gu_a.get("tier", 1), gu_b.get("tier", 1)) + 1
    target_path = gu_a.get("path", "Refinement Path")
    is_passive = gu_a.get("gu_type") == "passive_body" or gu_b.get("gu_type") == "passive_body"
    
    fallback_result = {
        "name": f"Refined {gu_a.get('name', 'Gu')}",
        "tier": target_tier,
        "path": target_path,
        "gu_type": "passive_body" if is_passive else "active",
        "hunger": 100,
        "food": gu_a.get("food", "Primeval Stones"),
        "effect_desc": f"A refined Rank {target_tier} {target_path} Gu formed from harmonic cauldron fusion.",
        "passive_buff": {
            "stat": "strength" if "Strength" in target_path else "defense",
            "value": 25,
            "label": f"Refined {target_path} Physique"
        } if is_passive else None,
        "active_power": (gu_a.get("active_power", 30) + gu_b.get("active_power", 25)) if not is_passive else 0,
        "essence_cost": gu_a.get("essence_cost", 12) + 4
    }
    
    return None, fallback_result, 50, target_path

def calculate_refinement_rate(target_path: str, base_rate: float = 0.40) -> float:
    """
    Calculates final success rate:
    Base (40%) + 1% per relevant Dao Mark (Target Path + Refinement Path).
    """
    cultivator = get_cultivator(1)
    dao_marks = getattr(cultivator, "dao_marks", {})
    relevant_marks = dao_marks.get(target_path, 0) + dao_marks.get("Refinement Path", 0)
    
    bonus = relevant_marks * 0.01  # +1% per mark
    final_rate = min(0.85, max(0.10, base_rate + bonus))
    return final_rate

def execute_gu_refinement(gu_a_id: str, gu_b_id: str) -> Dict[str, Any]:
    """
    Executes the Dao of Refinement.
    Atomically resolves probability, deducts stones, consumes/destroys reactants,
    and applies physical backlash damage on failure.
    """
    if gu_a_id == gu_b_id:
        return {
            "success": False,
            "message": "❌ The Grand Dao forbids refining a Gu with itself!"
        }
        
    cultivator = get_cultivator(1)
    # Search in player's aperture and vault
    all_gu = cultivator.aperture + cultivator.vault
    gu_a = next((g for g in all_gu if g.get("id") == gu_a_id), None)
    gu_b = next((g for g in all_gu if g.get("id") == gu_b_id), None)
    
    if not gu_a or not gu_b:
        return {
            "success": False,
            "message": "❌ One or both ingredient Gu worms could not be located in your aperture or vault."
        }
        
    recipe, result_template, stone_cost, target_path = find_matching_recipe(gu_a, gu_b)
    
    # Check Primeval Stones
    if cultivator.spirit_stones < stone_cost:
        return {
            "success": False,
            "message": f"❌ Insufficient Primeval Stones! Refinement requires {stone_cost} Stones (You have {cultivator.spirit_stones})."
        }
        
    # Deduct Primeval Stones immediately (cost of cauldron ignition)
    cultivator.spirit_stones -= stone_cost
    
    # Calculate Success Probability
    base_rate = recipe["base_rate"] if recipe else 0.40
    final_rate = calculate_refinement_rate(target_path, base_rate)
    
    # Remove reactants from aperture / vault
    if gu_a in cultivator.aperture:
        cultivator.aperture.remove(gu_a)
    elif gu_a in cultivator.vault:
        cultivator.vault.remove(gu_a)
        
    if gu_b in cultivator.aperture:
        cultivator.aperture.remove(gu_b)
    elif gu_b in cultivator.vault:
        cultivator.vault.remove(gu_b)
        
    # Roll the Dao Dice
    roll = random.random()
    is_success = roll <= final_rate
    
    if is_success:
        new_id = f"gu_{result_template['name'].lower().replace(' ', '_')}_{int(random.random() * 10000)}"
        created_gu = dict(result_template)
        created_gu["id"] = new_id
        if "satiety" not in created_gu:
            created_gu["satiety"] = 100
        
        # Place new Gu in vault (or aperture if room)
        cultivator.vault.append(created_gu)
        cultivator.save_to_db()
        
        return {
            "success": True,
            "backlash": False,
            "message": f"✨ HEAVENLY REFINEMENT SUCCESS! Forged Rank {created_gu['tier']} [{created_gu['name']}]! The new Gu has been safely stored in your Vault.",
            "result_gu": created_gu,
            "consumed_gu": [gu_a["name"], gu_b["name"]],
            "stone_cost": stone_cost,
            "success_rate": round(final_rate * 100, 1),
            "cultivator": cultivator.get_stats()
        }
    else:
        # Ruthless Refinement Backlash: 20% Max HP Damage
        stats = cultivator.get_stats()
        max_hp = stats.get("max_hp", 100)
        damage_taken = max(1, int(max_hp * 0.20))
        cultivator.current_hp = max(1, cultivator.current_hp - damage_taken)
        cultivator.save_to_db()
        
        return {
            "success": False,
            "backlash": True,
            "damage_taken": damage_taken,
            "message": f"💥 REFINEMENT BACKLASH! The cauldron ruptured! [{gu_a['name']}] and [{gu_b['name']}] turned to ash, and conflicting primeval currents tore through your meridians (Suffered {damage_taken} physical damage).",
            "result_gu": None,
            "consumed_gu": [gu_a["name"], gu_b["name"]],
            "stone_cost": stone_cost,
            "success_rate": round(final_rate * 100, 1),
            "cultivator": cultivator.get_stats()
        }
