"""
Test Suite: Stones to Vault Item Refactoring Protocol
Validates:
1. Physical enforcement of Primeval Stones as a Vault JSON item (`item_id: "primeval_stone"`).
2. Starting wealth initialization (500 Primeval Stones inside the Vault ledger).
3. Thermodynamics of Primeval Stones: `POST /api/v1/cultivator/consume-stone` accepts `quantity`.
4. Gu feeding from Vault item: `POST /api/v1/gu/feed` verifies and deducts from Vault item stack.
5. Error handling: "item not found" / insufficient funds returns 400 error.
6. Equip / Unequip cycle preserving physical items and Gu worms in Vault.
"""

import pytest
import sqlite3
import os
import json
from fastapi.testclient import TestClient
from app.main import app
from app.core.db import get_db_connection, DB_PATH
from app.engine.cultivator import get_cultivator, CultivatorState

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_fresh_test_cultivator():
    """Sets up a clean cultivator state with physical Vault item ledger in SQLite DB."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE cultivator_state SET
        primeval_essence = 10.0,
        max_essence = 93.0,
        aptitude_percentage = 93.0,
        stamina = 100.0,
        max_stamina = 100.0,
        aperture = ?,
        vault = ?
    WHERE id = 1
    """, (
        json.dumps([
            {
                "id": "gu_test_moonlight",
                "name": "Moonlight Gu",
                "tier": 1,
                "path": "Moon Path",
                "gu_type": "active",
                "satiety": 40,
                "hunger": 40,
                "food": "Moon Orchid Petals",
                "essence_cost": 10
            }
        ]),
        json.dumps([
            {
                "item_id": "primeval_stone",
                "id": "primeval_stone",
                "name": "Primeval Stone",
                "quantity": 500,
                "type": "material",
                "description": "Standard currency and essence recovery medium of the Gu World."
            },
            {
                "id": "gu_test_vault_boar",
                "name": "White Boar Gu",
                "tier": 1,
                "path": "Strength Path",
                "gu_type": "passive_body",
                "satiety": 50,
                "hunger": 50,
                "food": "Boar Meat",
                "essence_cost": 0
            }
        ])
    ))
    conn.commit()
    conn.close()

def test_starting_wealth_and_vault_ledger_structure():
    """Validates that a fresh cultivator initializes with 500 Primeval Stones inside Vault ledger."""
    cultivator = CultivatorState(character_id=999)
    assert cultivator.get_primeval_stones_count() == 500
    stone_item = next((i for i in cultivator.vault if i.get("item_id") == "primeval_stone"), None)
    assert stone_item is not None
    assert stone_item["quantity"] == 500

def test_consume_primeval_stones_thermodynamics_with_quantity():
    """
    Validates POST /api/v1/cultivator/consume-stone:
    - Accepts `{"quantity": 4}`.
    - Restores 5% of max essence per stone (93.0 * 0.05 = 4.65 per stone, total +18.6).
    - Deducts 4 stones from Vault stack (500 -> 496).
    - Preserves 100.0 Stamina (zero stamina drain).
    """
    response = client.post("/api/v1/cultivator/consume-stone", json={"quantity": 4})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["quantity_consumed"] == 4
    assert data["vault_stones_remaining"] == 496
    assert abs(data["primeval_essence"] - 28.6) < 0.2
    assert data["cultivator"]["stamina"] == 100.0

    # Verify Vault JSON ledger directly in DB
    cultivator = get_cultivator(1)
    assert cultivator.get_primeval_stones_count() == 496
    assert abs(cultivator.primeval_essence - 28.6) < 0.2

def test_consume_primeval_stones_insufficient_rejection():
    """Rejects consumption if quantity exceeds stones in Vault item stack."""
    response = client.post("/api/v1/cultivator/consume-stone", json={"quantity": 9999})
    assert response.status_code == 400
    assert "Insufficient" in response.json()["detail"]

def test_feed_gu_from_vault_item_stack():
    """
    Validates POST /api/v1/gu/feed:
    - Accepts `{"gu_id": "...", "quantity": 2}`.
    - Deducts 2 stones from the Vault item stack (500 -> 498).
    - Restores +40 satiety (from 40 to 80).
    """
    response = client.post("/api/v1/gu/feed", json={
        "gu_id": "gu_test_moonlight",
        "quantity": 2
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["satiety"] == 80
    assert data["stones_deducted"] == 2
    assert data["vault_stones_remaining"] == 498

    # Direct DB inspection
    cultivator = get_cultivator(1)
    assert cultivator.get_primeval_stones_count() == 498
    gu = next(g for g in cultivator.aperture if g["id"] == "gu_test_moonlight")
    assert gu["satiety"] == 80

def test_feed_gu_insufficient_funds_when_item_missing():
    """Handles missing primeval_stone Vault item as insufficient funds error."""
    # Purge stones from vault
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE cultivator_state SET
        vault = ?
    WHERE id = 1
    """, (
        json.dumps([
            {
                "id": "gu_test_vault_boar",
                "name": "White Boar Gu",
                "tier": 1,
                "path": "Strength Path",
                "gu_type": "passive_body",
                "satiety": 50
            }
        ]),
    ))
    conn.commit()
    conn.close()

    response = client.post("/api/v1/gu/feed", json={
        "gu_id": "gu_test_moonlight",
        "quantity": 1
    })
    assert response.status_code == 400
    assert "Insufficient funds" in response.json()["detail"]

def test_unequip_and_equip_gu_vault_cycle():
    """
    Validates:
    1. POST /api/v1/gu/unequip moves Gu from Aperture to Vault.
    2. POST /api/v1/gu/equip moves Gu from Vault to Aperture.
    3. GET /api/v1/gu/vault returns full vault list including materials and Gu.
    """
    # 1. Unequip Moonlight Gu
    res1 = client.post("/api/v1/gu/unequip", json={"gu_id": "gu_test_moonlight"})
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["success"] is True
    assert len(data1["aperture"]) == 0
    # Vault now has: primeval_stone, gu_test_vault_boar, gu_test_moonlight
    assert len(data1["vault"]) == 3

    # 2. Check Vault endpoint
    res_vault = client.get("/api/v1/gu/vault")
    assert res_vault.status_code == 200
    vault_data = res_vault.json()
    assert len(vault_data["vault"]) == 3
    vault_ids = [g.get("id") or g.get("item_id") for g in vault_data["vault"]]
    assert "primeval_stone" in vault_ids
    assert "gu_test_moonlight" in vault_ids
    assert "gu_test_vault_boar" in vault_ids

    # 3. Equip White Boar Gu into Aperture
    res2 = client.post("/api/v1/gu/equip", json={"gu_id": "gu_test_vault_boar"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["success"] is True
    assert len(data2["aperture"]) == 1
    assert data2["aperture"][0]["id"] == "gu_test_vault_boar"
    assert len(data2["vault"]) == 2

    # Verify direct DB state
    cultivator = get_cultivator(1)
    assert len(cultivator.aperture) == 1
    assert cultivator.aperture[0]["id"] == "gu_test_vault_boar"
    assert len(cultivator.vault) == 2
    assert cultivator.get_primeval_stones_count() == 500
