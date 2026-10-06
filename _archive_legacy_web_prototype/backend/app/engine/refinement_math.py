import random

def calculate_refinement(gu_a: dict, gu_b: dict, catalyst: str = None) -> dict:
    """
    Simulates a refinement attempt between two Gu worms.
    Canonical Gu Lore: Refinement is harsh. If it fails, the Gu are destroyed.
    """
    # Base success rates by Tier (Rank 1 is easiest, Rank 5 is nearly impossible without fortune)
    tier_success_rates = {
        1: 0.80, # 80% success
        2: 0.50, # 50% success
        3: 0.30, # 30% success
        4: 0.10, # 10% success
        5: 0.02, # 2% success
    }
    
    target_tier = max(gu_a.get("tier", 1), gu_b.get("tier", 1))
    
    # If the user tries to fuse two different tiers, it gets harder
    tier_diff = abs(gu_a.get("tier", 1) - gu_b.get("tier", 1))
    
    base_rate = tier_success_rates.get(target_tier, 0.01)
    
    # Penalty for tier mismatch
    success_chance = base_rate - (0.10 * tier_diff)
    
    # Catalyst bonus
    if catalyst == "Spirit Stone":
        success_chance += 0.15
    elif catalyst == "Heavenly Dew":
        success_chance += 0.40
        
    # Baseline 30% failure rate for all refinement recipes (max success capped at 70%)
    success_chance = max(0.01, min(0.70, success_chance))
    
    # The Roll
    roll = random.random()
    is_success = roll <= success_chance
    
    if is_success:
        # For prototype, we return a stronger variant of Gu A
        return {
            "success": True,
            "message": "✨ Refinement Successful! The heavenly dao marks fused in harmony.",
            "result_gu": {
                "name": f"Refined {gu_a.get('name', 'Gu')}",
                "tier": target_tier + (1 if gu_a.get("tier") == gu_b.get("tier") else 0),
                "path": gu_a.get("path", "Unknown"),
                "hunger": 100
            }
        }
    else:
        return {
            "success": False,
            "backlash": True,
            "message": "💥 REFINEMENT BACKLASH! Dao marks clashed violently! The ingredient Gu worms turned to ash, and conflicting primeval currents tore through your meridians (Took 50% Max HP Damage).",
            "result_gu": None
        }
