from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.engine.overworld import get_all_regions, get_region_nodes, get_node, OVERWORLD_REGIONS
from app.engine.world_gen import generate_region
from app.engine.cultivator import player_cultivator

router = APIRouter()

# Track which node the player is currently exploring
# None means the player is on the overworld map
current_node_cache: Dict[str, Any] = {}
region_tile_cache: Dict[int, list] = {}

@router.get("")
@router.get("/")
async def get_overworld():
    """
    Returns overworld state and the 30x30 array of WorldNode objects.
    Actively invokes generate_region if it does not already exist in memory.
    """
    region_id = getattr(player_cultivator, "current_region_id", "southern_border_gu_yue")
    if region_id not in region_tile_cache:
        region_tile_cache[region_id] = generate_region(
            region_id=region_id,
            width=30,
            height=30,
            player_start=player_cultivator.player_pos
        )
    return {
        "status": "success",
        "regions": get_all_regions(),
        "grid": region_tile_cache[region_id],
        "tiles": region_tile_cache[region_id],
        "player_pos": player_cultivator.player_pos,
        "cultivator": player_cultivator.get_stats(),
        "current_node": player_cultivator.current_node if hasattr(player_cultivator, 'current_node') else None
    }

@router.get("/regions")
async def list_regions():
    """
    Returns all 5 overworld regions with their node counts and positions, plus default grid.
    """
    region_id = getattr(player_cultivator, "current_region_id", "southern_border_gu_yue")
    if region_id not in region_tile_cache:
        region_tile_cache[region_id] = generate_region(
            region_id=region_id,
            width=30,
            height=30,
            player_start=player_cultivator.player_pos
        )
    regions = get_all_regions()
    return {
        "status": "success",
        "regions": regions,
        "grid": region_tile_cache[region_id],
        "tiles": region_tile_cache[region_id],
        "player_pos": player_cultivator.player_pos,
        "cultivator": player_cultivator.get_stats(),
        "current_node": player_cultivator.current_node if hasattr(player_cultivator, 'current_node') else None
    }

@router.get("/regions/{region_id}/nodes")
async def list_nodes(region_id: str):
    """
    Returns the explorable nodes within a given region.
    """
    nodes = get_region_nodes(region_id)
    if nodes is None:
        raise HTTPException(status_code=404, detail=f"Region '{region_id}' not found.")
    return {
        "status": "success",
        "region_id": region_id,
        "nodes": nodes
    }

@router.post("/regions/{region_id}/nodes/{node_id}/enter")
async def enter_node(region_id: str, node_id: str):
    """
    Enter an explorable node. Returns the 30x30 local tile grid for the node.
    Unlocked nodes only (starter nodes are always open).
    """
    node = get_node(region_id, node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found in region '{region_id}'.")
    
    if not node.get("unlocked", False):
        raise HTTPException(status_code=403, detail=f"'{node['name']}' is locked. Cultivate stronger to unlock this territory.")

    # Generate or retrieve the local tile grid for this node
    grid_id = node.get("region_id", region_id)
    if grid_id not in region_tile_cache:
        region_tile_cache[grid_id] = generate_region(
            region_id=grid_id,
            width=30,
            height=30,
            player_start=[15, 15]
        )

    # Reset player position to node entry point
    player_cultivator.player_pos = [15, 15]
    
    # Store current node on the cultivator state
    player_cultivator.current_node = {
        "node_id": node_id,
        "node_name": node["name"],
        "region_id": region_id,
        "grid_id": grid_id
    }

    return {
        "status": "success",
        "message": f"Entering {node['name']}...",
        "node": node,
        "grid": region_tile_cache[grid_id],
        "tiles": region_tile_cache[grid_id],
        "player_pos": player_cultivator.player_pos,
        "cultivator": player_cultivator.get_stats()
    }

@router.post("/exit")
async def exit_to_overworld():
    """
    Exit the current node and return to the overworld map.
    """
    if hasattr(player_cultivator, 'current_node'):
        player_cultivator.current_node = None
    
    return {
        "status": "success",
        "message": "Returned to the overworld.",
        "regions": get_all_regions()
    }
