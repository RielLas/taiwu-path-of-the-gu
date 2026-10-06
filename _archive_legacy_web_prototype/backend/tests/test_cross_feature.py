import pytest
from fastapi.testclient import TestClient
from app.engine.cultivator import player_cultivator, CultivatorState

def test_full_cross_feature_way_station_travel_and_exploration_flow(client: TestClient):
    """
    Tier 3: End-to-End Cross-Feature Integration:
    1. Cultivator starts at [14, 15] in Southern Border.
    2. Moves East to step on Way Station [15, 15].
    3. Triggers Inter-Regional Caravan Travel to Northern Plains.
    4. Verifies arrival at [15, 15] in Northern Plains with toll deductions.
    5. Navigates within the new Northern Plains 30x30 instance.
    6. Verifies persistence across reloads.
    7. Meditates in new region to recover resources.
    """
    # 1. Setup initial state
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.player_pos = [14, 15]
    player_cultivator.stamina = 100.0
    player_cultivator.spirit_stones = 500
    player_cultivator.primeval_essence = 50.0
    player_cultivator.save_to_db()

    # 2. Step onto Way Station at [15, 15]
    move_res = client.post("/api/v1/world/move", json={"dx": 1, "dy": 0})
    assert move_res.status_code == 200
    assert player_cultivator.player_pos == [15, 15]
    assert round(player_cultivator.stamina, 1) <= 98.0  # -2 stamina for move

    # Verify tile is Way Station
    tile_data = move_res.json().get("tile", {})
    assert (
        tile_data.get("is_way_station") is True
        or tile_data.get("type") == "way_station"
        or "way station" in str(tile_data.get("terrain", "")).lower()
        or "way station" in str(tile_data.get("name", "")).lower()
    )

    stamina_before_travel = player_cultivator.stamina
    stones_before_travel = player_cultivator.spirit_stones

    # 3. Invoke Inter-Regional Travel to Northern Plains
    travel_res = client.post("/api/v1/world/travel", json={"target_region_id": "northern_plains_ge_tribe"})
    assert travel_res.status_code == 200

    travel_data = travel_res.json()
    assert travel_data.get("current_region_id") == "northern_plains_ge_tribe" or player_cultivator.current_region_id == "northern_plains_ge_tribe"
    assert player_cultivator.player_pos == [15, 15]
    assert round(player_cultivator.stamina, 1) == round(stamina_before_travel - 40.0, 1)  # 40.0 toll
    assert player_cultivator.spirit_stones == stones_before_travel - 100                 # 100 toll

    stones_in_new_region = player_cultivator.spirit_stones

    # 4. Explore within Northern Plains
    move1 = client.post("/api/v1/world/move", json={"dx": 0, "dy": -1})
    assert move1.status_code == 200
    assert player_cultivator.player_pos == [15, 14]

    move2 = client.post("/api/v1/world/move", json={"dx": 1, "dy": 0})
    assert move2.status_code == 200
    assert player_cultivator.player_pos == [16, 14]

    # 5. Verify database persistence
    reloaded = CultivatorState()
    reloaded.load_from_db()
    assert reloaded.current_region_id == "northern_plains_ge_tribe"
    assert reloaded.player_pos == [16, 14]
    assert reloaded.spirit_stones >= stones_in_new_region

    # 6. Meditate in Northern Plains
    meditate_res = client.post("/api/v1/world/meditate", json={"stamina_cost": 20.0})
    assert meditate_res.status_code == 200
    assert player_cultivator.current_region_id == "northern_plains_ge_tribe"
    assert player_cultivator.player_pos == [16, 14]
    assert player_cultivator.primeval_essence > 50.0
