import pytest
import json
from fastapi.testclient import TestClient
from app.engine.cultivator import player_cultivator, CultivatorState
from app.core.db import get_db_connection

def test_sql_injection_and_payload_sanitization_in_travel(client: TestClient):
    """
    Tier 5: Adversarial attack payloads targeting target_region_id:
    SQL injection strings, XSS scripts, path traversals, null bytes.
    Must be rejected with HTTP 400 or HTTP 422, preserving DB integrity.
    """
    malicious_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE cultivator_state; --",
        "southern_border_gu_yue' UNION SELECT 1, 2, 3 --",
        "<script>alert('xss')</script>",
        "../../etc/passwd",
        "null\x00byte_injection",
        "../../../taiwu_local.db",
        "' OR 1=1 --",
        "admin' --",
        "1; SELECT * FROM cultivator_state;"
    ]

    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.stamina = 100.0
    player_cultivator.spirit_stones = 1000
    player_cultivator.save_to_db()

    for attack_str in malicious_payloads:
        res = client.post("/api/v1/world/travel", json={"target_region_id": attack_str})
        assert res.status_code in [400, 422], f"Attack string '{attack_str}' was not rejected (status: {res.status_code})"
        
        # Verify table still exists and data not corrupted
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='cultivator_state'")
        table = cursor.fetchone()
        assert table is not None, "cultivator_state table was dropped or corrupted by SQL injection!"
        
        cursor.execute("SELECT current_region_id, stamina, vault FROM cultivator_state WHERE id = 1")
        row = cursor.fetchone()
        conn.close()
        
        assert row["current_region_id"] == "southern_border_gu_yue"
        vault_items = json.loads(row["vault"])
        stone_qty = sum(item.get("quantity", 0) for item in vault_items if item.get("item_id") == "primeval_stone" or item.get("id") == "primeval_stone")
        assert stone_qty == 1000

def test_fuzzing_malformed_travel_json_payloads(client: TestClient):
    """
    Tier 5: Fuzzing invalid types and missing fields in /travel endpoint.
    """
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.stamina = 100.0
    player_cultivator.spirit_stones = 1000
    player_cultivator.save_to_db()

    invalid_bodies = [
        {},
        {"target_region_id": None},
        {"target_region_id": ""},
        {"target_region_id": 12345},
        {"target_region_id": "nonexistent_macro_region_xyz"},
        {"wrong_field": "central_continent_spirit_affinity"}
    ]

    for body in invalid_bodies:
        res = client.post("/api/v1/world/travel", json=body)
        assert res.status_code in [400, 422], f"Malformed payload {body} returned unexpected status {res.status_code}"

    # Verify untrusted extra fields do not bypass toll mechanics
    bypass_attempt = {
        "target_region_id": "central_continent_spirit_affinity",
        "free_pass": True,
        "stamina_cost": 0,
        "spirit_stones_cost": 0,
        "override_auth": "admin"
    }
    res = client.post("/api/v1/world/travel", json=bypass_attempt)
    assert res.status_code == 200
    # Tolls must STILL be deducted
    assert round(player_cultivator.stamina, 1) == 60.0
    assert player_cultivator.spirit_stones == 900

def test_extreme_coordinate_delta_fuzzing(client: TestClient):
    """
    Tier 5: Fuzzing /move with extreme delta coordinates.
    The server should clamp step deltas to +/-1 and prevent out-of-bounds traversal.
    """
    player_cultivator.player_pos = [15, 15]
    player_cultivator.stamina = 100.0
    player_cultivator.save_to_db()

    # Extreme jump East/South: step should clamp to [16, 16] within bounds
    res = client.post("/api/v1/world/move", json={"dx": 99999, "dy": 99999})
    assert res.status_code == 200
    assert player_cultivator.player_pos == [16, 16]

    # Extreme to_x / to_y targeting
    res = client.post("/api/v1/world/move", json={"to_x": -99999, "to_y": -99999})
    assert res.status_code == 200
    assert player_cultivator.player_pos == [15, 15]

def test_rapid_successive_travel_resource_drain_and_concurrency(client: TestClient):
    """
    Tier 5: Stress test rapid sequential travel operations until funds are fully depleted.
    Verifies atomic deductions without negative balances or race condition desyncs.
    """
    # Start with exact resources for 2 travels: 90 stamina (40 + 40 = 80 needed, 10 left), 250 stones (100 + 100 = 200 needed, 50 left)
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.stamina = 90.0
    player_cultivator.spirit_stones = 250
    player_cultivator.save_to_db()

    # Travel 1: Southern Border -> Central Continent
    res1 = client.post("/api/v1/world/travel", json={"target_region_id": "central_continent_spirit_affinity"})
    assert res1.status_code == 200
    assert player_cultivator.current_region_id == "central_continent_spirit_affinity"
    assert round(player_cultivator.stamina, 1) == 50.0
    assert player_cultivator.spirit_stones == 150

    # Travel 2: Central Continent -> Western Desert
    res2 = client.post("/api/v1/world/travel", json={"target_region_id": "western_desert_thousand_li"})
    assert res2.status_code == 200
    assert player_cultivator.current_region_id == "western_desert_thousand_li"
    assert round(player_cultivator.stamina, 1) == 10.0
    assert player_cultivator.spirit_stones == 50

    # Travel 3: Attempt another travel with only 10 stamina and 50 stones -> Must fail!
    res3 = client.post("/api/v1/world/travel", json={"target_region_id": "northern_plains_ge_tribe"})
    assert res3.status_code == 400
    
    # Assert state was not altered or made negative
    assert player_cultivator.current_region_id == "western_desert_thousand_li"
    assert round(player_cultivator.stamina, 1) == 10.0
    assert player_cultivator.spirit_stones == 50
    assert player_cultivator.player_pos == [15, 15]

    # Verify DB match
    db_state = CultivatorState()
    db_state.load_from_db()
    assert db_state.current_region_id == "western_desert_thousand_li"
    assert db_state.spirit_stones == 50
    assert round(db_state.stamina, 1) == 10.0
