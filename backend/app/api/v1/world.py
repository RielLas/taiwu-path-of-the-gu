from fastapi import APIRouter, HTTPException, Query, Request
from typing import List, Dict, Any, Optional
from app.engine.world_gen import generate_region, generate_tile_encounter
from app.engine.cultivator import player_cultivator
from app.engine.overworld import get_all_regions, get_region_nodes, get_node
from app.engine.npc import enforcer_manager

router = APIRouter()

# In-memory region cache
region_cache: Dict[int, List[Dict[str, Any]]] = {}

# ─── Overworld endpoints (live via /api/v1/world/) ───────────────────────────

@router.get("/regions")
async def list_regions():
    """Returns all 5 overworld regions."""
    return {"status": "success", "regions": get_all_regions()}

@router.get("/regions/{region_id}/nodes")
async def list_nodes(region_id: str):
    """Returns explorable nodes within a given region."""
    nodes = get_region_nodes(region_id)
    if nodes is None:
        raise HTTPException(status_code=404, detail=f"Region '{region_id}' not found.")
    return {"status": "success", "region_id": region_id, "nodes": nodes}

@router.post("/regions/{region_id}/nodes/{node_id}/enter")
async def enter_node(region_id: str, node_id: str):
    """Enter an explorable node and load its 15x15 tile grid."""
    node = get_node(region_id, node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found.")
    if not node.get("unlocked", False):
        raise HTTPException(status_code=403, detail=f"'{node['name']}' is sealed. Cultivate stronger to unlock.")
    
    grid_id = node["region_id"]
    tiles = get_or_create_region(grid_id)
    reveal_around(tiles, 7, 7)
    player_cultivator.player_pos = [7, 7]
    player_cultivator.current_node = {"node_id": node_id, "node_name": node["name"], "region_id": region_id, "grid_id": grid_id}

    enforcer_info = enforcer_manager.check_and_update(player_cultivator, auto_spawn=True)

    return {
        "status": "success",
        "message": f"Entering {node['name']}...",
        "node": node,
        "tiles": tiles,
        "grid": tiles,
        "player_pos": player_cultivator.player_pos,
        "cultivator": player_cultivator.get_stats(),
        "enforcer": enforcer_info
    }

@router.post("/exit")
async def exit_to_overworld():
    """Exit the current node and return to the overworld map."""
    player_cultivator.current_node = None
    return {"status": "success", "message": "Returned to overworld.", "regions": get_all_regions()}


def get_or_create_region(region_id: int) -> List[Dict[str, Any]]:
    if region_id not in region_cache:
        region_cache[region_id] = generate_region(
            region_id=region_id, 
            width=15, 
            height=15, 
            player_start=player_cultivator.player_pos
        )
    return region_cache[region_id]

def reveal_around(tiles: List[Dict[str, Any]], px: int, py: int, radius: int = 1):
    """Reveals tiles in radius around (px, py)."""
    for tile in tiles:
        if abs(tile["x"] - px) <= radius and abs(tile["y"] - py) <= radius:
            tile["is_revealed"] = True
            tile["discovered"] = True

@router.get("/region/{region_id}")
async def get_region(region_id: int):
    """
    Fetch the 15x15 region map.
    Returns both 'tiles' and 'grid' for frontend compatibility.
    """
    tiles = get_or_create_region(region_id)
    reveal_around(tiles, player_cultivator.player_pos[0], player_cultivator.player_pos[1])
    enforcer_info = enforcer_manager.check_and_update(player_cultivator, auto_spawn=True)
    
    return {
        "region_id": region_id,
        "width": 15,
        "height": 15,
        "player_pos": player_cultivator.player_pos,
        "tiles": tiles,
        "grid": tiles,  # Alias to prevent frontend undefined errors
        "cultivator": player_cultivator.get_stats(),
        "enforcer": enforcer_info
    }

@router.post("/move")
async def move_player(
    request: Request,
    dx: Optional[int] = Query(None),
    dy: Optional[int] = Query(None)
):
    """
    Moves player across the exploration grid.
    Supports both query parameters (?dx=0&dy=-1) and JSON body.
    """
    region_id = 1
    target_dx = dx
    target_dy = dy
    
    # Try parsing JSON body if query params not provided
    try:
        body = await request.json()
        if target_dx is None and "dx" in body:
            target_dx = body.get("dx")
        if target_dy is None and "dy" in body:
            target_dy = body.get("dy")
        if "to_x" in body and "to_y" in body:
            target_dx = body["to_x"] - player_cultivator.player_pos[0]
            target_dy = body["to_y"] - player_cultivator.player_pos[1]
        if "region_id" in body:
            region_id = body["region_id"]
    except Exception:
        pass
        
    if target_dx is None or target_dy is None:
        raise HTTPException(status_code=400, detail="Must provide movement delta dx and dy.")
        
    # Bound delta to max 1 step
    step_x = 1 if target_dx > 0 else (-1 if target_dx < 0 else 0)
    step_y = 1 if target_dy > 0 else (-1 if target_dy < 0 else 0)
    
    new_x = player_cultivator.player_pos[0] + step_x
    new_y = player_cultivator.player_pos[1] + step_y
    
    # Check Stamina for movement (2 Stamina per step)
    player_cultivator.update_stamina_passive()
    if player_cultivator.stamina < 2.0:
        raise HTTPException(
            status_code=400, 
            detail=f"Exhausted! Insufficient Stamina to traverse the terrain (Requires 2 Stamina, Current: {player_cultivator.stamina:.1f}). Meditate or wait to recover."
        )
        
    player_cultivator.stamina = max(0.0, round(player_cultivator.stamina - 2.0, 1))
    player_cultivator.player_pos = [new_x, new_y]
    
    tiles = get_or_create_region(region_id)
    reveal_around(tiles, new_x, new_y)
    
    # Locate current tile
    current_tile = next((t for t in tiles if t["x"] == new_x and t["y"] == new_y), None)
    terrain = current_tile["type"] if current_tile else "Wilderness"
    
    # Generate encounter
    if current_tile and current_tile.get("is_faction_node"):
        faction_name = current_tile.get("faction", "Gu Yue Clan")
        rep_info = player_cultivator.get_faction_reputation(faction_name)
        is_hostile = rep_info["is_hostile"]
        
        # Build faction trade inventory
        trade_items = [
            {
                "id": f"trade_{faction_name}_1",
                "name": "Steel Skin Gu" if "Clan" in faction_name else "Merchant Spirit Gu",
                "path": "Transformation Path" if "Clan" in faction_name else "Support Path",
                "cost": 50,
                "desc": "Hardens flesh into impervious steel armor (+25 Defense). Passive body Gu." if "Clan" in faction_name else "Enhances primeval sea capacity (+15 Max Essence).",
                "gu": {
                    "name": "Steel Skin Gu" if "Clan" in faction_name else "Merchant Spirit Gu",
                    "tier": 2,
                    "path": "Transformation Path" if "Clan" in faction_name else "Support Path",
                    "gu_type": "passive_body",
                    "food": "Steel Ore Shards",
                    "effect_desc": "Tempering body with metallic steel fibers (+25 Defense).",
                    "passive_buff": {"stat": "defense", "value": 25, "label": "Steel Armor"}
                }
            },
            {
                "id": f"trade_{faction_name}_2",
                "name": "Wind Blade Gu",
                "path": "Wind Path",
                "cost": 45,
                "desc": "Releases razor-sharp wind gale arcs (Deals 50 Wind DMG). Active combat Gu.",
                "gu": {
                    "name": "Wind Blade Gu",
                    "tier": 2,
                    "path": "Wind Path",
                    "gu_type": "active",
                    "food": "Gale Petals",
                    "effect_desc": "Fires razor-sharp sonic wind blades (Deals 50 Wind damage). Costs 12% Essence.",
                    "active_power": 50,
                    "essence_cost": 12
                }
            }
        ]

        encounter = {
            "type": "faction",
            "title": f"{faction_name} Outpost",
            "desc": f"You approach the fortified banners of {faction_name}. Clan warriors and sentries stand guard upon the battlements.",
            "faction": faction_name,
            "faction_type": current_tile.get("faction_type", "Righteous Clan"),
            "standing": rep_info["standing"],
            "reputation": rep_info["reputation"],
            "is_hostile": is_hostile,
            "trade_inventory": trade_items,
            "guard_enemy": {
                "name": f"{faction_name} Sentinel Patrol",
                "hp": 95,
                "atk": 30,
                "reward_stones": 50
            }
        }
    elif current_tile and current_tile.get("is_spirit_spring"):
        if not current_tile.get("harvested"):
            encounter = generate_tile_encounter("Spirit Spring")
            amt = encounter.get("amount", 75)
            player_cultivator.spirit_stones += amt
            current_tile["harvested"] = True
        else:
            encounter = {
                "type": "resource",
                "title": "Depleted Spirit Spring",
                "desc": "The primeval spring waters are depleted for this expedition.",
                "amount": 0,
                "is_depleted": True
            }
    else:
        encounter = generate_tile_encounter(terrain)
        if encounter and encounter.get("type") == "resource":
            amt = encounter.get("amount", 15)
            player_cultivator.spirit_stones += amt

    # Dynamic Hunter Matrix: Righteous Enforcer pathfinding & chase
    enforcer_res = enforcer_manager.on_player_action(player_cultivator)
    enforcer_data = enforcer_res.get("enforcer")
    
    # Check Interception (Enforcer caught player at new_x, new_y)
    if enforcer_res.get("active") and enforcer_data:
        ex, ey = enforcer_data["pos"]
        if ex == new_x and ey == new_y:
            # INTERCEPTION: Immediately halt Overworld exploration and force CombatArena
            encounter = {
                "type": "combat",
                "is_interception": True,
                "title": f"⚖️ AMBUSH: {enforcer_data['name']}",
                "desc": f"The {enforcer_data['title']} has intercepted your demonic path! 'Demonic scoundrel, surrender your Gu worms and face the righteous order!'",
                "enemy": {
                    "id": enforcer_data["id"],
                    "name": enforcer_data["name"],
                    "title": enforcer_data["title"],
                    "rank": enforcer_data["rank"],
                    "stage": enforcer_data["stage"],
                    "hp": enforcer_data["hp"],
                    "max_hp": enforcer_data["max_hp"],
                    "atk": enforcer_data["atk"],
                    "reward_stones": enforcer_data["reward_stones"],
                    "is_enforcer": True,
                    "equipped_gu": enforcer_data.get("equipped_gu", [])
                }
            }

    # Hunger Attrition: Every movement on overworld grid deducts 5 satiety from all Gu (active & vaulted)
    starvation_alerts = player_cultivator.decay_gu_satiety(5)

    cultivator_stats = player_cultivator.get_stats()
    
    return {
        "success": True,
        "new_pos": [new_x, new_y],
        "player_pos": [new_x, new_y],
        "tile": {
            "x": new_x,
            "y": new_y,
            "type": terrain,
            "terrain": terrain,
            "biome": current_tile.get("biome", "Southern Border Mountain") if current_tile else "Southern Border Mountain",
            "is_spirit_spring": current_tile.get("is_spirit_spring", False) if current_tile else False,
            "is_faction_node": current_tile.get("is_faction_node", False) if current_tile else False,
            "faction": current_tile.get("faction", None) if current_tile else None,
            "faction_type": current_tile.get("faction_type", None) if current_tile else None,
            "harvested": current_tile.get("harvested", False) if current_tile else False
        },
        "event": encounter,
        "tiles": tiles,
        "grid": tiles,
        "enforcer": enforcer_data if (enforcer_res.get("active") and enforcer_data) else None,
        "starvation_alerts": starvation_alerts,
        "cultivator": cultivator_stats
    }

@router.post("/faction/extort")
async def faction_extort(payload: Dict[str, Any]):
    """
    Executes Demonic Armed Extortion against a Faction Outpost.
    """
    faction_name = payload.get("faction_name", "Gu Yue Clan")
    res = player_cultivator.extort_faction(faction_name)
    return res

@router.post("/faction/trade")
async def faction_trade(payload: Dict[str, Any]):
    """
    Executes an institutional trade transaction with a Faction Outpost.
    """
    faction_name = payload.get("faction_name", "Gu Yue Clan")
    item_id = payload.get("item_id", "trade_1")
    cost = payload.get("cost", 50)
    gu_payload = payload.get("gu")
    
    res = player_cultivator.trade_with_faction(faction_name, item_id, cost, gu_payload)
    return res

@router.post("/harvest")
async def harvest_node(payload: Dict[str, Any] = {}):
    """
    Directly claims resource rewards from the current tile/encounter (e.g. Spirit Springs).
    """
    pos = player_cultivator.player_pos
    region_id = payload.get("region_id", 1)
    tiles = get_or_create_region(region_id)
    current_tile = next((t for t in tiles if t["x"] == pos[0] and t["y"] == pos[1]), None)
    
    stones_awarded = 0
    if current_tile and current_tile.get("is_spirit_spring"):
        if not current_tile.get("harvested"):
            import random
            stones_awarded = random.randint(50, 100)
            player_cultivator.spirit_stones += stones_awarded
            current_tile["harvested"] = True
            msg = f"🌿 Harvested Spirit Spring for {stones_awarded} Primeval Stones!"
        else:
            msg = "This Spirit Spring has already been depleted."
    else:
        stones_awarded = 25
        player_cultivator.spirit_stones += stones_awarded
        msg = f"⛏️ Harvested resource vein for {stones_awarded} Primeval Stones!"
        
    return {
        "success": True,
        "message": msg,
        "stones_awarded": stones_awarded,
        "spirit_stones": player_cultivator.spirit_stones,
        "cultivator": player_cultivator.get_stats(),
        "tiles": tiles
    }

@router.post("/combat/action")
async def combat_action(payload: Dict[str, Any]):
    """
    Executes a combat turn and resolves actions, including Killer Move synergy strikes.
    When combat concludes (victory, defeat, or fled), deducts 5 satiety from all Gu.
    """
    action_type = payload.get("action_type", "strike")
    gu_id = payload.get("gu_id")
    killer_id = payload.get("killer_id")
    enemy_hp = payload.get("enemy_hp", 50)
    enemy_atk = payload.get("enemy_atk", 15)
    reward_stones = payload.get("reward_stones", 15)
    player_hp = payload.get("player_hp", 100)

    cultivator_stats = player_cultivator.get_stats()
    
    dmg_dealt = 0
    action_log = ""
    if action_type == "strike":
        dmg_dealt = max(5, cultivator_stats["stats"]["strength"]["total"])
        action_log = f"Dealt {dmg_dealt} martial damage with Basic Strike."
    elif action_type == "gu" and gu_id:
        gu = next((g for g in player_cultivator.aperture if g["id"] == gu_id), None)
        if gu:
            dmg_dealt = gu.get("active_power", 35)
            cost = gu.get("essence_cost", 10)
            player_cultivator.primeval_essence = max(0, player_cultivator.primeval_essence - cost)
            action_log = f"Activated {gu['name']} dealing {dmg_dealt} damage (consumed {cost}% essence)!"
        else:
            dmg_dealt = 20
            action_log = f"Dealt {dmg_dealt} damage."
    elif action_type == "killer_move":
        killer = player_cultivator.get_killer_move_synergy()
        if killer:
            dmg_dealt = killer["damage"]
            cost = killer["essence_cost"]
            player_cultivator.primeval_essence = max(0, player_cultivator.primeval_essence - cost)
            action_log = f"⚡ UNLEASHED KILLER MOVE [{killer['name']}] dealing {dmg_dealt} CATASTROPHIC DAMAGE (consumed {cost}% essence)!"
        else:
            dmg_dealt = 180
            cost = 35
            player_cultivator.primeval_essence = max(0, player_cultivator.primeval_essence - cost)
            action_log = f"⚡ Unleashed Composite Resonance Strike for {dmg_dealt} damage!"

    rem_enemy_hp = max(0, enemy_hp - dmg_dealt)
    dmg_taken = max(1, enemy_atk - (cultivator_stats["stats"]["defense"]["total"] // 2)) if rem_enemy_hp > 0 and action_type != "flee" else 0
    rem_player_hp = max(0, player_hp - dmg_taken)
    is_victory = rem_enemy_hp <= 0
    is_defeat = rem_player_hp <= 0
    fled = action_type == "flee"

    starvation_alerts = []
    # If combat concludes, apply hunger attrition (deduct 5 satiety from all Gu)
    if is_victory or is_defeat or fled:
        starvation_alerts = player_cultivator.decay_gu_satiety(5)

    dropped_gu = None
    is_enforcer_fight = payload.get("is_enforcer", False) or (payload.get("enemy_id") == "enforcer_tie_001") or ("Enforcer" in str(payload.get("enemy_name", "")))
    
    if is_victory:
        if is_enforcer_fight:
            loot_res = enforcer_manager.enforcer.generate_loot()
            reward_stones = loot_res["stones"]
            dropped_gu = loot_res.get("dropped_gu")
            if dropped_gu:
                if len(player_cultivator.aperture) < 10:
                    player_cultivator.aperture.append(dropped_gu)
                else:
                    player_cultivator.vault.append(dropped_gu)
            enforcer_manager.enforcer.status = "defeated"
            enforcer_manager.enforcer.active = False
            
        player_cultivator.spirit_stones += reward_stones
        
    player_cultivator.save_to_db()

    logs = [
        action_log if action_type != "flee" else "Attempting to escape the battlefield...",
        f"Enemy retaliated for {dmg_taken} damage!" if dmg_taken > 0 else ""
    ]
    if is_victory and dropped_gu:
        logs.append(f"🎁 Plundered Gu Worm: [{dropped_gu['name']}] ({dropped_gu['path']}) from the defeated Righteous Enforcer!")

    return {
        "success": True,
        "action_type": action_type,
        "damage_dealt": dmg_dealt,
        "damage_taken": dmg_taken,
        "enemy_hp": rem_enemy_hp,
        "player_hp": rem_player_hp,
        "is_victory": is_victory,
        "is_defeat": is_defeat,
        "fled": fled,
        "starvation_alerts": starvation_alerts,
        "logs": [l for l in logs if l],
        "loot": {
            "stones": reward_stones,
            "dropped_gu": dropped_gu
        } if is_victory else None,
        "cultivator": player_cultivator.get_stats()
    }

@router.post("/meditate")
async def meditate_in_world(payload: Dict[str, Any] = {}):
    """
    Meditate action to restore Primeval Essence and HP by burning stamina.
    """
    cost = payload.get("stamina_cost", 20.0)
    result = player_cultivator.meditate(cost)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Meditation failed."))
    return result

