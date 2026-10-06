"""
Combat Engine & Plunder Matrix (Reverend Insanity Lore Compliant)
Calculates exact BEU essence costs, damages, killer moves, and plunder loot resolution.
"""

import random
from typing import Dict, Any, Optional, List
from app.engine.cultivator import get_cultivator
from app.engine.npc import enforcer_manager

def calculate_gu_combat_cost(beu_cost: float) -> float:
    """
    Computes exact fractional % drain using the cultivator's exponential essence multiplier.
    Actual % Drain = Gu BEU Cost / get_essence_multiplier()
    """
    cultivator = get_cultivator(1)
    multiplier = cultivator.get_essence_multiplier()
    return max(0.01, round(beu_cost / multiplier, 2))

def resolve_combat_plunder(
    enemy_id: Optional[str] = None,
    is_enforcer: bool = False,
    reward_stones: Optional[int] = None
) -> Dict[str, Any]:
    """
    The Plunder Engine:
    - 50-150 Primeval Stones transferred to player.
    - 30% chance to plunder one of the Enforcer's active Gu worms directly into Vault.
    - Persists state to SQLite DB.
    """
    cultivator = get_cultivator(1)
    stones = reward_stones if (reward_stones is not None and reward_stones > 0) else random.randint(50, 150)
    cultivator.spirit_stones += stones
    
    dropped_gu = None
    if is_enforcer:
        enforcer = enforcer_manager.enforcer
        loot = enforcer.generate_loot()
        dropped_gu = loot.get("dropped_gu")
        if dropped_gu:
            if "satiety" not in dropped_gu:
                dropped_gu["satiety"] = 100
            if len(cultivator.vault) < cultivator.get_vault_capacity():
                cultivator.vault.append(dropped_gu)
            else:
                cultivator.aperture.append(dropped_gu)
        enforcer.status = "defeated"
        enforcer.active = False
    elif random.random() <= 0.30:
        # Standard NPC Gu drop
        gu_loot_table = [
            {
                "id": f"gu_loot_{random.randint(100, 999)}",
                "name": "Bone Spear Gu",
                "tier": 1,
                "path": "Bone Path",
                "gu_type": "active",
                "satiety": 100,
                "hunger": 100,
                "food": "Beast Bones",
                "effect_desc": "Hurls piercing bone javelins (Deals 35 DMG). Costs 10 BEU.",
                "active_power": 35,
                "essence_cost": 10
            },
            {
                "id": f"gu_loot_{random.randint(100, 999)}",
                "name": "Steel Tendon Gu",
                "tier": 1,
                "path": "Transformation Path",
                "gu_type": "passive_body",
                "satiety": 100,
                "hunger": 100,
                "food": "Iron Powder",
                "effect_desc": "Hardens tendons like refined steel (+15 Strength).",
                "passive_buff": {"stat": "strength", "value": 15, "label": "Steel Tendon Strength"},
                "active_power": 0,
                "essence_cost": 0
            }
        ]
        chosen = random.choice(gu_loot_table)
        dropped_gu = chosen
        if len(cultivator.vault) < cultivator.get_vault_capacity():
            cultivator.vault.append(dropped_gu)
        else:
            cultivator.aperture.append(dropped_gu)

    # Persist updated state to DB
    cultivator.save_to_db()

    msg = f"🎁 Plundered +{stones} Primeval Stones!"
    if dropped_gu:
        msg += f" Captured Gu Worm [{dropped_gu['name']}] ({dropped_gu['path']}) into your vault!"

    return {
        "success": True,
        "stones": stones,
        "dropped_gu": dropped_gu,
        "message": msg,
        "cultivator": cultivator.get_stats()
    }
