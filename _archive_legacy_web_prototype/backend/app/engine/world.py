"""
World Engine & Hunter Matrix Coordinator
Unifies Overworld generation, region matrices, and the Righteous Enforcer predator tracking.
"""

from typing import List, Dict, Any, Optional
from app.engine.world_gen import generate_region, generate_tile_encounter, BIOMES, REGION_BIOMES, REGION_FACTIONS
from app.engine.overworld import get_all_regions, get_region_nodes, get_node
from app.engine.npc import RighteousEnforcer, EnforcerManager, enforcer_manager

def step_hunter_matrix(player_cultivator) -> Dict[str, Any]:
    """
    Executes a turn of the Righteous Enforcer predator chase.
    Calculates Manhattan distance, deducts 2 Stamina, and checks interception.
    """
    return enforcer_manager.on_player_action(player_cultivator)

def check_enforcer_status(player_cultivator) -> Optional[Dict[str, Any]]:
    """
    Checks if karmic ledger (< -50) or bounty triggers an enforcer.
    """
    return enforcer_manager.check_and_update(player_cultivator)
