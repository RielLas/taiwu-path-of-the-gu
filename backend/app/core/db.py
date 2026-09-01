"""
Database Persistence Layer (SQLite Local Database)
Ensures persistent reality across reloads without dropping tables or resetting data.
"""

import sqlite3
import os
import json
from typing import Optional, Dict, Any

# SQLite database file path placed in project workspace
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../taiwu_local.db"))
DATABASE_URL = f"sqlite:///{DB_PATH}"

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initializes SQLite database schema if not exists.
    Strictly preserves existing data across server reloads.
    Primeval stones are now physical inventory items tracked inside the JSON vault.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cultivator_state (
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
        current_region_id TEXT DEFAULT 'southern_border_gu_yue',
        updated_at REAL NOT NULL
    )
    """)
    cursor.execute("PRAGMA table_info(cultivator_state)")
    columns = [col[1] for col in cursor.fetchall()]
    if "current_region_id" not in columns:
        cursor.execute("ALTER TABLE cultivator_state ADD COLUMN current_region_id TEXT DEFAULT 'southern_border_gu_yue'")
    if "vault" not in columns:
        cursor.execute("ALTER TABLE cultivator_state ADD COLUMN vault TEXT DEFAULT '[]'")
    conn.commit()
    conn.close()

# Auto-initialize DB schema on module load
init_db()
