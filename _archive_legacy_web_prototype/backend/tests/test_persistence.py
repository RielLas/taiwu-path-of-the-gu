import sqlite3
import pytest
import json
from app.engine.cultivator import CultivatorState, player_cultivator
from app.core.db import get_db_connection, init_db
import app.core.db as db_module

def test_current_region_id_db_persistence():
    """
    Tier 1 & Tier 2: Verify current_region_id and coordinate persistence
    across CultivatorState save_to_db() and load_from_db() cycles.
    """
    # 1. Update state and save to DB
    player_cultivator.name = "Fang Yuan"
    player_cultivator.current_region_id = "western_desert_thousand_li"
    player_cultivator.player_pos = [18, 12]
    player_cultivator.spirit_stones = 750
    player_cultivator.stamina = 85.0
    player_cultivator.save_to_db()

    # 2. Directly verify SQLite row contents
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT current_region_id, player_pos_x, player_pos_y, vault, stamina FROM cultivator_state WHERE id = 1")
    row = cursor.fetchone()
    conn.close()

    assert row is not None
    assert row["current_region_id"] == "western_desert_thousand_li"
    assert row["player_pos_x"] == 18
    assert row["player_pos_y"] == 12
    vault_items = json.loads(row["vault"])
    stone_qty = sum(item.get("quantity", 0) for item in vault_items if item.get("item_id") == "primeval_stone" or item.get("id") == "primeval_stone")
    assert stone_qty == 750

    # 3. Simulate new server process by loading into a brand new CultivatorState instance
    fresh_instance = CultivatorState()
    success = fresh_instance.load_from_db()
    assert success is True
    assert fresh_instance.current_region_id == "western_desert_thousand_li"
    assert fresh_instance.player_pos == [18, 12]
    assert fresh_instance.spirit_stones == 750

def test_migration_handles_missing_current_region_id(tmp_path, monkeypatch):
    """
    Tier 2: Verify that existing databases lacking current_region_id
    are gracefully migrated on startup without data loss.
    """
    legacy_db_path = str(tmp_path / "legacy_taiwu.db")
    monkeypatch.setattr(db_module, "DB_PATH", legacy_db_path)
    monkeypatch.setattr(db_module, "DATABASE_URL", f"sqlite:///{legacy_db_path}")

    # 1. Create legacy schema without current_region_id column
    conn = sqlite3.connect(legacy_db_path)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE cultivator_state (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        rank INTEGER NOT NULL,
        stage TEXT NOT NULL,
        aperture_grade TEXT NOT NULL,
        aptitude_percentage REAL NOT NULL,
        aperture_status TEXT NOT NULL,
        primeval_essence REAL NOT NULL,
        max_essence REAL NOT NULL,
        nourish_progress REAL NOT NULL,
        stamina REAL NOT NULL,
        max_stamina REAL NOT NULL,
        last_stamina_update REAL NOT NULL,
        essence_type TEXT NOT NULL,
        spirit_stones INTEGER NOT NULL,
        player_pos_x INTEGER NOT NULL,
        player_pos_y INTEGER NOT NULL,
        base_strength INTEGER NOT NULL,
        base_defense INTEGER NOT NULL,
        base_speed INTEGER NOT NULL,
        current_hp INTEGER NOT NULL,
        alignment_score INTEGER NOT NULL,
        faction_reputations TEXT NOT NULL,
        active_bounties TEXT NOT NULL,
        aperture TEXT NOT NULL,
        vault TEXT NOT NULL,
        updated_at REAL NOT NULL
    )
    """)
    # Insert a legacy cultivator row
    import time, json
    cursor.execute("""
    INSERT INTO cultivator_state (
        id, name, rank, stage, aperture_grade, aptitude_percentage, aperture_status,
        primeval_essence, max_essence, nourish_progress, stamina, max_stamina,
        last_stamina_update, essence_type, spirit_stones, player_pos_x, player_pos_y,
        base_strength, base_defense, base_speed, current_hp, alignment_score,
        faction_reputations, active_bounties, aperture, vault, updated_at
    ) VALUES (
        1, 'Legacy Fang Yuan', 1, 'Initial Stage', 'A Grade (93% Primeval Sea)', 93.0, 'Pristine',
        93.0, 93.0, 0.0, 100.0, 100.0,
        ?, 'Rank 1 Initial Green Copper Primeval Essence', 100, 7, 7,
        10, 5, 10, 100, -75,
        '{}', '[]', '[]', '[]', ?
    )
    """, (time.time(), time.time()))
    conn.commit()
    conn.close()

    # 2. Run init_db() to trigger migration
    init_db()

    # 3. Verify column is added
    conn = sqlite3.connect(legacy_db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(cultivator_state)")
    columns = [col[1] for col in cursor.fetchall()]
    assert "current_region_id" in columns, "Migration failed to add current_region_id column"

    # 4. Verify existing record preserved and accessible
    cursor.execute("SELECT * FROM cultivator_state WHERE id = 1")
    row = cursor.fetchone()
    conn.close()

    assert row is not None
    assert row["name"] == "Legacy Fang Yuan"
    assert row["current_region_id"] == "southern_border_gu_yue" or row["current_region_id"] is not None

    # 5. Verify load_from_db() works smoothly on migrated DB
    cultivator = CultivatorState()
    loaded = cultivator.load_from_db()
    assert loaded is True
    assert cultivator.name == "Legacy Fang Yuan"
    assert cultivator.current_region_id == "southern_border_gu_yue"
