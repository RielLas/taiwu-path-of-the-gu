import pytest
from fastapi.testclient import TestClient
from app.engine.world_gen import generate_region, MACRO_REGIONS
from app.engine.cultivator import player_cultivator
from app.engine.npc import RighteousEnforcer

def test_30x30_grid_tile_count_and_coordinate_bounds():
    """
    Tier 1: Verify finite 30x30 micro-grid generates exactly 900 tiles
    with strictly bounded coordinates [0..29, 0..29].
    """
    tiles = generate_region("southern_border_gu_yue", width=30, height=30, player_start=[15, 15])
    
    assert len(tiles) == 900, f"Expected 900 tiles for 30x30 grid, got {len(tiles)}"
    
    seen_coords = set()
    for tile in tiles:
        x, y = tile["x"], tile["y"]
        assert 0 <= x <= 29, f"Tile X coordinate out of bounds: {x}"
        assert 0 <= y <= 29, f"Tile Y coordinate out of bounds: {y}"
        assert (x, y) not in seen_coords, f"Duplicate coordinate ({x}, {y}) detected in grid"
        seen_coords.add((x, y))

    assert len(seen_coords) == 900

def test_five_macro_regions_grid_generation():
    """
    Tier 1: Verify procedural grid generation across all Five Macro-Regions.
    """
    for region_id, meta in MACRO_REGIONS.items():
        tiles = generate_region(region_id, width=30, height=30, player_start=[15, 15])
        assert len(tiles) == 900, f"Region {region_id} did not generate 900 tiles"
        
        # Check that way station is properly seeded at [15, 15]
        center_tile = next((t for t in tiles if t["x"] == 15 and t["y"] == 15), None)
        assert center_tile is not None, f"Center tile [15, 15] missing in {region_id}"
        assert center_tile.get("is_way_station") is True or center_tile.get("type") == "way_station" or "Way Station" in center_tile.get("terrain", "")

def test_boundary_enforcement_negative_coordinates(client: TestClient):
    """
    Tier 2: Boundary enforcement rejecting negative coordinates [-1, 0] and [0, -1] with HTTP 400.
    """
    player_cultivator.player_pos = [0, 0]
    player_cultivator.stamina = 100.0
    player_cultivator.save_to_db()

    # Move West past X=0 -> [-1, 0]
    response = client.post("/api/v1/world/move", json={"dx": -1, "dy": 0})
    assert response.status_code == 400
    assert "boundary" in response.json().get("detail", "").lower() or "boundary" in response.text.lower()
    assert player_cultivator.player_pos == [0, 0]

    # Move North past Y=0 -> [0, -1]
    response = client.post("/api/v1/world/move", json={"dx": 0, "dy": -1})
    assert response.status_code == 400
    assert "boundary" in response.json().get("detail", "").lower() or "boundary" in response.text.lower()
    assert player_cultivator.player_pos == [0, 0]

    # Diagonal out of bounds -> [-1, -1]
    response = client.post("/api/v1/world/move", json={"dx": -1, "dy": -1})
    assert response.status_code == 400
    assert player_cultivator.player_pos == [0, 0]

def test_boundary_enforcement_overflow_coordinates(client: TestClient):
    """
    Tier 2: Boundary enforcement rejecting overflow coordinates [30, 0], [0, 30], [30, 30] with HTTP 400.
    """
    player_cultivator.player_pos = [29, 29]
    player_cultivator.stamina = 100.0
    player_cultivator.save_to_db()

    # Move East past X=29 -> [30, 29]
    response = client.post("/api/v1/world/move", json={"dx": 1, "dy": 0})
    assert response.status_code == 400
    assert "boundary" in response.json().get("detail", "").lower() or "boundary" in response.text.lower()
    assert player_cultivator.player_pos == [29, 29]

    # Move South past Y=29 -> [29, 30]
    response = client.post("/api/v1/world/move", json={"dx": 0, "dy": 1})
    assert response.status_code == 400
    assert "boundary" in response.json().get("detail", "").lower() or "boundary" in response.text.lower()
    assert player_cultivator.player_pos == [29, 29]

    # Diagonal overflow -> [30, 30]
    response = client.post("/api/v1/world/move", json={"dx": 1, "dy": 1})
    assert response.status_code == 400
    assert player_cultivator.player_pos == [29, 29]

def test_boundary_enforcement_other_corners(client: TestClient):
    """
    Tier 2: Boundary enforcement at [0, 29] and [29, 0].
    """
    # Corner [0, 29]
    player_cultivator.player_pos = [0, 29]
    player_cultivator.stamina = 100.0
    player_cultivator.save_to_db()

    # Move West past X=0 -> [-1, 29]
    res1 = client.post("/api/v1/world/move", json={"dx": -1, "dy": 0})
    assert res1.status_code == 400

    # Move South past Y=29 -> [0, 30]
    res2 = client.post("/api/v1/world/move", json={"dx": 0, "dy": 1})
    assert res2.status_code == 400

    # Corner [29, 0]
    player_cultivator.player_pos = [29, 0]
    player_cultivator.stamina = 100.0
    player_cultivator.save_to_db()

    # Move East past X=29 -> [30, 0]
    res3 = client.post("/api/v1/world/move", json={"dx": 1, "dy": 0})
    assert res3.status_code == 400

    # Move North past Y=0 -> [29, -1]
    res4 = client.post("/api/v1/world/move", json={"dx": 0, "dy": -1})
    assert res4.status_code == 400

def test_valid_boundary_moves_at_all_four_corners(client: TestClient):
    """
    Tier 1 & Tier 2: Valid movement within bounds at all 4 corners of the 30x30 grid.
    """
    # 1. Corner [0, 0] -> valid East [1, 0] and South [0, 1]
    player_cultivator.player_pos = [0, 0]
    player_cultivator.stamina = 100.0
    player_cultivator.save_to_db()

    res = client.post("/api/v1/world/move", json={"dx": 1, "dy": 0})
    assert res.status_code == 200
    assert player_cultivator.player_pos == [1, 0]

    # Move back to [0, 0]
    res = client.post("/api/v1/world/move", json={"dx": -1, "dy": 0})
    assert res.status_code == 200
    assert player_cultivator.player_pos == [0, 0]

    # Move South to [0, 1]
    res = client.post("/api/v1/world/move", json={"dx": 0, "dy": 1})
    assert res.status_code == 200
    assert player_cultivator.player_pos == [0, 1]

    # 2. Corner [29, 29] -> valid West [28, 29] and North [29, 28]
    player_cultivator.player_pos = [29, 29]
    player_cultivator.stamina = 100.0
    player_cultivator.save_to_db()

    res = client.post("/api/v1/world/move", json={"dx": -1, "dy": 0})
    assert res.status_code == 200
    assert player_cultivator.player_pos == [28, 29]

    player_cultivator.player_pos = [29, 29]
    player_cultivator.save_to_db()

    res = client.post("/api/v1/world/move", json={"dx": 0, "dy": -1})
    assert res.status_code == 200
    assert player_cultivator.player_pos == [29, 28]

    # 3. Corner [0, 29] -> valid East [1, 29] and North [0, 28]
    player_cultivator.player_pos = [0, 29]
    player_cultivator.stamina = 100.0
    player_cultivator.save_to_db()

    res = client.post("/api/v1/world/move", json={"dx": 1, "dy": 0})
    assert res.status_code == 200
    assert player_cultivator.player_pos == [1, 29]

    player_cultivator.player_pos = [0, 29]
    player_cultivator.save_to_db()

    res = client.post("/api/v1/world/move", json={"dx": 0, "dy": -1})
    assert res.status_code == 200
    assert player_cultivator.player_pos == [0, 28]

    # 4. Corner [29, 0] -> valid West [28, 0] and South [29, 1]
    player_cultivator.player_pos = [29, 0]
    player_cultivator.stamina = 100.0
    player_cultivator.save_to_db()

    res = client.post("/api/v1/world/move", json={"dx": -1, "dy": 0})
    assert res.status_code == 200
    assert player_cultivator.player_pos == [28, 0]

    player_cultivator.player_pos = [29, 0]
    player_cultivator.save_to_db()

    res = client.post("/api/v1/world/move", json={"dx": 0, "dy": 1})
    assert res.status_code == 200
    assert player_cultivator.player_pos == [29, 1]

def test_npc_enforcer_30x30_grid_alignment():
    """
    Tier 1 & Tier 2: NPC Enforcer spawns and chases strictly within 30x30 coordinate bounds.
    """
    enforcer = RighteousEnforcer()
    enforcer.spawn(player_pos=[15, 15], grid_width=30, grid_height=30, player_rank=1)

    assert enforcer.active is True
    ex, ey = enforcer.pos
    assert 0 <= ex <= 29, f"Enforcer X spawn out of bounds: {ex}"
    assert 0 <= ey <= 29, f"Enforcer Y spawn out of bounds: {ey}"
    assert (ex in [0, 29]) and (ey in [0, 29]), "Enforcer must spawn at an outer edge corner"

    # Step enforcer towards player multiple times
    for _ in range(5):
        step_res = enforcer.step_towards([15, 15])
        assert 0 <= enforcer.pos[0] <= 29
        assert 0 <= enforcer.pos[1] <= 29
