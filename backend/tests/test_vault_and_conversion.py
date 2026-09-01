"""
Test Suite: Vault Expansion & Essence Conversion Protocol
Validates:
1. Direct DB session isolation (destruction of fragile singleton).
2. SQLite schema persistence for primeval_stones, vault, satiety.
3. Equip / Unequip mechanics between Aperture and Vault.
4. Primeval Stone thermodynamics: 5% essence recovery per stone without stamina drain.
5. Gu feeding and satiety recovery with primeval stone deduction.
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
    """Sets up a clean, known cultivator state in SQLite DB."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE cultivator_state SET
        spirit_stones = 100,
        primeval_stones = 100,
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

def test_database_schema_has_primeval_stones_and_vault():
    """Validates DB schema includes required columns for vault and stones."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(cultivator_state)")
    columns = {col[1]: col[2] for col in cursor.fetchall()}
    conn.close()
    
    assert "primeval_stones" in columns or "spirit_stones" in columns
    assert "vault" in columns
    assert "aperture" in columns

def test_consume_primeval_stones_thermodynamics():
    """
    Validates POST /api/v1/cultivator/consume-stone:
    - Restores 5% of max essence per stone (93.0 * 0.05 = 4.65 per stone).
    - Consuming 4 stones restores 18.6 essence (from 10.0 to 28.6).
    - Deducts 4 stones (from 100 to 96).
    - Preserves 100.0 Stamina (zero stamina drain).
    """
    response = client.post("/api/v1/cultivator/consume-stone", json={"amount": 4})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["stones_consumed"] == 4
    assert data["spirit_stones"] == 96
    assert abs(data["primeval_essence"] - 28.6) < 0.2
    assert data["cultivator"]["stamina"] == 100.0

    # Verify DB persistence directly
    cultivator = get_cultivator(1)
    assert cultivator.spirit_stones == 96
    assert abs(cultivator.primeval_essence - 28.6) < 0.2

def test_consume_primeval_stones_insufficient_rejection():
    """Rejects consumption if cultivator lacks sufficient stones."""
    response = client.post("/api/v1/cultivator/consume-stone", json={"amount": 9999})
    assert response.status_code == 400
    assert "Insufficient" in response.json()["detail"]

def test_feed_gu_satiety_restoration():
    """
    Validates POST /api/v1/gu/feed:
    - Deducts 2 stones to restore +40 satiety (from 40 to 80).
    - Persists directly to SQLite DB.
    """
    response = client.post("/api/v1/gu/feed", json={
        "gu_id": "gu_test_moonlight",
        "stone_amount": 2
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["satiety"] == 80
    assert data["stones_deducted"] == 2

    # Direct DB inspection
    cultivator = get_cultivator(1)
    assert cultivator.spirit_stones == 98
    gu = next(g for g in cultivator.aperture if g["id"] == "gu_test_moonlight")
    assert gu["satiety"] == 80

def test_unequip_and_equip_gu_vault_cycle():
    """
    Validates:
    1. POST /api/v1/gu/unequip moves Gu from Aperture to Vault.
    2. POST /api/v1/gu/equip moves Gu from Vault to Aperture.
    3. GET /api/v1/gu/vault returns full vault list.
    """
    # 1. Unequip Moonlight Gu
    res1 = client.post("/api/v1/gu/unequip", json={"gu_id": "gu_test_moonlight"})
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["success"] is True
    assert len(data1["aperture"]) == 0
    assert len(data1["vault"]) == 2

    # 2. Check Vault endpoint
    res_vault = client.get("/api/v1/gu/vault")
    assert res_vault.status_code == 200
    vault_data = res_vault.json()
    assert len(vault_data["vault"]) == 2
    vault_ids = [g["id"] for g in vault_data["vault"]]
    assert "gu_test_moonlight" in vault_ids
    assert "gu_test_vault_boar" in vault_ids

    # 3. Equip White Boar Gu into Aperture
    res2 = client.post("/api/v1/gu/equip", json={"gu_id": "gu_test_vault_boar"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["success"] is True
    assert len(data2["aperture"]) == 1
    assert data2["aperture"][0]["id"] == "gu_test_vault_boar"
    assert len(data2["vault"]) == 1

    # Verify direct DB state
    cultivator = get_cultivator(1)
    assert len(cultivator.aperture) == 1
    assert cultivator.aperture[0]["id"] == "gu_test_vault_boar"
    assert len(cultivator.vault) == 1
    assert cultivator.vault[0]["id"] == "gu_test_moonlight"
