import pytest
import sqlite3
import os
import hashlib
from fastapi.testclient import TestClient

from app.main import app
from app.core.db import get_db_connection, init_db, DB_PATH
from app.engine.cultivator import CultivatorState, player_cultivator
from app.engine.world_gen import MACRO_REGIONS, generate_region
from app.engine.npc import RighteousEnforcer, enforcer_manager
from app.engine.overworld import get_all_regions, resolve_region_id

client = TestClient(app)

def test_db_schema_has_current_region_id():
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(cultivator_state)")
    columns = [col[1] for col in cursor.fetchall()]
    conn.close()
    assert "current_region_id" in columns, "cultivator_state table must contain current_region_id column"

def test_cultivator_state_defaults_and_serialization():
    c = CultivatorState()
    assert c.current_region_id == "southern_border_gu_yue"
    assert c.player_pos == [15, 15]
    
    # Check stats dict, to_dict, and export_stats
    stats = c.get_stats()
    assert stats["current_region_id"] == "southern_border_gu_yue"
    assert stats["location"] == [15, 15]
    
    assert c.to_dict()["current_region_id"] == "southern_border_gu_yue"
    assert c.export_stats()["current_region_id"] == "southern_border_gu_yue"
    
    # Test DB persistence roundtrip
    c.current_region_id = "central_continent_spirit_affinity"
    c.player_pos = [10, 20]
    c.save_to_db()
    
    c2 = CultivatorState()
    loaded = c2.load_from_db()
    assert loaded is True
    assert c2.current_region_id == "central_continent_spirit_affinity"
    assert c2.player_pos == [10, 20]

def test_macro_regions_definition():
    expected_regions = [
        "southern_border_gu_yue",
        "central_continent_spirit_affinity",
        "western_desert_thousand_li",
        "northern_plains_ge_tribe",
        "eastern_sea_blue_wave"
    ]
    for r in expected_regions:
        assert r in MACRO_REGIONS, f"Missing macro region {r}"
        data = MACRO_REGIONS[r]
        assert "name" in data
        assert "dominant_biome" in data
        assert "travel_toll_stamina" in data
        assert "travel_toll_stones" in data

def test_generate_region_30x30_and_way_station():
    tiles = generate_region("southern_border_gu_yue", width=30, height=30, player_start=[15, 15])
    assert len(tiles) == 900, f"Expected 900 tiles for 30x30 grid, got {len(tiles)}"
    
    # Check bounds
    all_x = [t["x"] for t in tiles]
    all_y = [t["y"] for t in tiles]
    assert min(all_x) == 0 and max(all_x) == 29
    assert min(all_y) == 0 and max(all_y) == 29
    
    # Find Way Station tile at [15, 15]
    way_station_tile = next((t for t in tiles if t["x"] == 15 and t["y"] == 15), None)
    assert way_station_tile is not None
    assert way_station_tile["is_way_station"] is True
    assert way_station_tile["type"] == "way_station"
    assert way_station_tile["name"] == "Way Station Caravan Hub"
    assert way_station_tile["is_revealed"] is True

def test_enforcer_bounds_30x30():
    enforcer = RighteousEnforcer()
    enforcer.spawn(player_pos=[15, 15], grid_width=30, grid_height=30, player_rank=1)
    assert enforcer.active is True
    assert enforcer.pos in [[0, 0], [29, 0], [0, 29], [29, 29]]

def test_api_world_region_30x30():
    res = client.get("/api/v1/world/region/southern_border_gu_yue")
    assert res.status_code == 200
    data = res.json()
    assert data["width"] == 30
    assert data["height"] == 30
    assert len(data["tiles"]) == 900
    assert data["region_id"] == "southern_border_gu_yue"

def test_api_move_boundary_rejection():
    # Set player at boundary (0, 0)
    player_cultivator.player_pos = [0, 0]
    player_cultivator.stamina = 100.0
    player_cultivator.save_to_db()
    
    # Move left beyond [0, 0] -> (-1, 0)
    res = client.post("/api/v1/world/move", json={"dx": -1, "dy": 0})
    assert res.status_code == 400
    assert "Cannot traverse beyond regional boundary" in res.json()["detail"]
    
    # Move up beyond [0, 0] -> (0, -1)
    res = client.post("/api/v1/world/move", json={"dx": 0, "dy": -1})
    assert res.status_code == 400
    assert "Cannot traverse beyond regional boundary" in res.json()["detail"]
    
    # Set player at boundary (29, 29)
    player_cultivator.player_pos = [29, 29]
    player_cultivator.stamina = 100.0
    player_cultivator.save_to_db()
    
    # Move right beyond (29, 29) -> (30, 29)
    res = client.post("/api/v1/world/move", json={"dx": 1, "dy": 0})
    assert res.status_code == 400
    assert "Cannot traverse beyond regional boundary" in res.json()["detail"]

def test_api_travel_caravan():
    # Setup player in southern border with sufficient stamina and stones
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.player_pos = [5, 5]
    player_cultivator.stamina = 100.0
    player_cultivator.spirit_stones = 500
    player_cultivator.save_to_db()
    
    # 1. Travel to same region should fail
    res = client.post("/api/v1/world/travel", json={"target_region_id": "southern_border_gu_yue"})
    assert res.status_code == 400
    
    # 2. Travel to non-existent region should fail
    res = client.post("/api/v1/world/travel", json={"target_region_id": "invalid_region_realm"})
    assert res.status_code == 400
    
    # 3. Insufficient stamina should fail
    player_cultivator.stamina = 20.0
    player_cultivator.save_to_db()
    res = client.post("/api/v1/world/travel", json={"target_region_id": "northern_plains_ge_tribe"})
    assert res.status_code == 400
    assert "Insufficient Stamina" in res.json()["detail"]
    
    # 4. Insufficient stones should fail
    player_cultivator.stamina = 80.0
    player_cultivator.spirit_stones = 50
    player_cultivator.save_to_db()
    res = client.post("/api/v1/world/travel", json={"target_region_id": "northern_plains_ge_tribe"})
    assert res.status_code == 400
    assert "Insufficient Primeval Stones" in res.json()["detail"]
    
    # 5. Successful transit
    player_cultivator.stamina = 80.0
    player_cultivator.spirit_stones = 250
    player_cultivator.save_to_db()
    
    res = client.post("/api/v1/world/travel", json={"target_region_id": "northern_plains_ge_tribe"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["current_region_id"] == "northern_plains_ge_tribe"
    assert data["player_pos"] == [15, 15]
    assert data["stamina"] == 40.0 # 80 - 40
    assert data["spirit_stones"] == 150 # 250 - 100
    assert len(data["grid"]) == 900
    
    # Check DB persistence
    check_c = CultivatorState()
    check_c.load_from_db()
    assert check_c.current_region_id == "northern_plains_ge_tribe"
    assert check_c.player_pos == [15, 15]
    assert check_c.spirit_stones == 150
