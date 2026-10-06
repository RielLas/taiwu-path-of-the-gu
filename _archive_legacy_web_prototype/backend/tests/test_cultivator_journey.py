import pytest
from fastapi.testclient import TestClient
from app.engine.cultivator import player_cultivator, CultivatorState

def test_cultivator_five_regions_grand_tour(client: TestClient):
    """
    Tier 4: Cultivator Grand Tour across all 5 Macro-Regions:
    Southern Border -> Central Continent -> Western Desert -> Northern Plains -> Eastern Sea -> Southern Border.
    Tracks stamina consumption, stones depletion, and coordinate resets across the complete journey.
    """
    # Initialize rich cultivator ready for long-distance caravan journey
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.player_pos = [15, 15]
    player_cultivator.stamina = 500.0
    player_cultivator.max_stamina = 500.0
    player_cultivator.spirit_stones = 2000
    player_cultivator.save_to_db()

    itinerary = [
        ("central_continent_spirit_affinity", "Central Continent"),
        ("western_desert_thousand_li", "Western Desert"),
        ("northern_plains_ge_tribe", "Northern Plains"),
        ("eastern_sea_blue_wave", "Eastern Sea"),
        ("southern_border_gu_yue", "Southern Border")
    ]

    expected_stamina = 500.0
    expected_stones = 2000

    for target_id, region_name in itinerary:
        # 1. Travel via Caravan
        res = client.post("/api/v1/world/travel", json={"target_region_id": target_id})
        assert res.status_code == 200, f"Failed leg to {region_name} ({target_id}): {res.text}"

        expected_stamina -= 40.0
        expected_stones -= 100

        data = res.json()
        assert player_cultivator.current_region_id == target_id
        assert player_cultivator.player_pos == [15, 15]
        assert round(player_cultivator.stamina, 1) == round(expected_stamina, 1)
        assert player_cultivator.spirit_stones == expected_stones

        # Verify returned 30x30 grid data
        grid = data.get("grid") or data.get("tiles")
        assert len(grid) == 900

        # 2. Explore 2 tiles within the new region
        move_res1 = client.post("/api/v1/world/move", json={"dx": 1, "dy": 0})
        assert move_res1.status_code == 200
        expected_stamina -= 2.0

        move_res2 = client.post("/api/v1/world/move", json={"dx": 0, "dy": 1})
        assert move_res2.status_code == 200
        expected_stamina -= 2.0

        assert player_cultivator.player_pos == [16, 16]
        assert round(player_cultivator.stamina, 1) == round(expected_stamina, 1)

    # Verify cumulative journey statistics
    # 5 travels * 40 = 200 stamina, 5 legs * 4 movement stamina = 20 stamina -> total 220 stamina spent
    # 5 travels * 100 = 500 stones spent -> remaining 1500 stones
    assert round(player_cultivator.stamina, 1) == 280.0
    assert player_cultivator.spirit_stones == 1500
    assert player_cultivator.current_region_id == "southern_border_gu_yue"

    # Verify final persistent reality in database
    db_state = CultivatorState()
    db_state.load_from_db()
    assert db_state.current_region_id == "southern_border_gu_yue"
    assert db_state.player_pos == [16, 16]
    assert db_state.spirit_stones == 1500
