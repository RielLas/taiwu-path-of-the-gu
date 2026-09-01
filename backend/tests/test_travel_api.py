import pytest
from fastapi.testclient import TestClient
from app.engine.cultivator import player_cultivator
from app.engine.world_gen import MACRO_REGIONS

def test_travel_happy_path_across_all_macro_regions(client: TestClient):
    """
    Tier 1 & Tier 2: Happy path caravan travel to every other macro-region.
    Verifies toll deduction (40 Stamina + 100 Spirit Stones),
    coordinate reset to [15, 15], returned 900-tile grid, and region update.
    """
    destinations = [
        "central_continent_spirit_affinity",
        "western_desert_thousand_li",
        "northern_plains_ge_tribe",
        "eastern_sea_blue_wave",
        "southern_border_gu_yue"
    ]

    for dest in destinations:
        if player_cultivator.current_region_id == dest:
            continue

        player_cultivator.stamina = 100.0
        player_cultivator.spirit_stones = 1000
        player_cultivator.player_pos = [5, 5]  # Non-center position before travel
        player_cultivator.save_to_db()

        init_stamina = player_cultivator.stamina
        init_stones = player_cultivator.spirit_stones

        response = client.post("/api/v1/world/travel", json={"target_region_id": dest})
        assert response.status_code == 200, f"Failed travel to {dest}: {response.text}"

        data = response.json()
        assert data.get("current_region_id") == dest or data.get("cultivator", {}).get("current_region_id") == dest
        assert data.get("player_pos") == [15, 15] or player_cultivator.player_pos == [15, 15]
        
        # Verify 900-tile grid returned
        grid = data.get("grid") or data.get("tiles")
        assert grid is not None, "Travel response must return the destination 30x30 grid"
        assert len(grid) == 900, f"Expected 900 tiles in destination grid, got {len(grid)}"

        # Verify toll deduction
        assert round(player_cultivator.stamina, 1) == round(init_stamina - 40.0, 1)
        assert player_cultivator.spirit_stones == init_stones - 100
        assert player_cultivator.current_region_id == dest
        assert player_cultivator.player_pos == [15, 15]

def test_travel_insufficient_stamina(client: TestClient):
    """
    Tier 2: Travel rejected when cultivator has < 40 Stamina (HTTP 400).
    """
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.stamina = 39.0
    player_cultivator.spirit_stones = 500
    player_cultivator.player_pos = [15, 15]
    player_cultivator.save_to_db()

    response = client.post("/api/v1/world/travel", json={"target_region_id": "central_continent_spirit_affinity"})
    assert response.status_code == 400
    detail = response.json().get("detail", "").lower()
    assert "stamina" in detail

    # State remains uncharged
    assert player_cultivator.current_region_id == "southern_border_gu_yue"
    assert player_cultivator.stamina < 40.0
    assert abs(player_cultivator.stamina - 39.0) < 0.5
    assert player_cultivator.spirit_stones == 500

def test_travel_insufficient_spirit_stones(client: TestClient):
    """
    Tier 2: Travel rejected when cultivator has < 100 Spirit Stones (HTTP 400).
    """
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.stamina = 100.0
    player_cultivator.spirit_stones = 99
    player_cultivator.player_pos = [15, 15]
    player_cultivator.save_to_db()

    response = client.post("/api/v1/world/travel", json={"target_region_id": "western_desert_thousand_li"})
    assert response.status_code == 400
    detail = response.json().get("detail", "").lower()
    assert "stone" in detail

    # State remains uncharged
    assert player_cultivator.current_region_id == "southern_border_gu_yue"
    assert player_cultivator.stamina <= 100.0
    assert player_cultivator.spirit_stones == 99

def test_travel_to_current_region_rejected(client: TestClient):
    """
    Tier 2: Attempting to travel to the region already currently occupied raises HTTP 400.
    """
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.stamina = 100.0
    player_cultivator.spirit_stones = 500
    player_cultivator.save_to_db()

    response = client.post("/api/v1/world/travel", json={"target_region_id": "southern_border_gu_yue"})
    assert response.status_code == 400
    detail = response.json().get("detail", "").lower()
    assert "current" in detail or "already" in detail

    # No tolls deducted
    assert player_cultivator.spirit_stones == 500

def test_travel_to_unknown_region_rejected(client: TestClient):
    """
    Tier 2: Attempting to travel to an invalid / nonexistent region ID raises HTTP 400.
    """
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.stamina = 100.0
    player_cultivator.spirit_stones = 500
    player_cultivator.save_to_db()

    response = client.post("/api/v1/world/travel", json={"target_region_id": "invalid_region_realm_999"})
    assert response.status_code == 400
    detail = response.json().get("detail", "").lower()
    assert "not found" in detail or "unknown" in detail or "invalid" in detail

    # No tolls deducted
    assert player_cultivator.spirit_stones == 500

def test_travel_exact_toll_thresholds(client: TestClient):
    """
    Tier 2: Exact boundary toll values (exactly 40 stamina and 100 stones) must succeed.
    """
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.stamina = 40.0
    player_cultivator.spirit_stones = 100
    player_cultivator.save_to_db()

    response = client.post("/api/v1/world/travel", json={"target_region_id": "eastern_sea_blue_wave"})
    assert response.status_code == 200

    assert player_cultivator.current_region_id == "eastern_sea_blue_wave"
    assert round(player_cultivator.stamina, 1) == 0.0
    assert player_cultivator.spirit_stones == 0
    assert player_cultivator.player_pos == [15, 15]
