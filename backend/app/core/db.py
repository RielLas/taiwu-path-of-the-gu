"""
Database Persistence Layer (SQLite Local Database with WAL Mode & Concurrency Protection)
Ensures persistent reality across reloads without dropping tables, resetting data, or database locking.
"""

import sqlite3
import os
import json
from typing import Optional, Dict, Any
from contextlib import contextmanager

# SQLite database file path placed in project workspace
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../taiwu_local.db"))
DATABASE_URL = f"sqlite:///{DB_PATH}"

def get_db_connection(timeout: float = 15.0) -> sqlite3.Connection:
    """
    Creates an SQLite connection configured for high concurrency:
    - WAL journal mode: allows simultaneous readers and writers.
    - Synchronous=NORMAL: optimizes disk write performance safely in WAL.
    - Busy timeout (15s): waits in queue for locked locks instead of failing immediately.
    """
    conn = sqlite3.connect(DB_PATH, timeout=timeout)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute(f"PRAGMA busy_timeout={int(timeout * 1000)};")
    return conn

@contextmanager
def get_db_cursor(commit: bool = False, timeout: float = 15.0):
    """
    Strict Session Context Manager:
    Guarantees that database connections and locks are properly committed and closed.
    """
    conn = get_db_connection(timeout=timeout)
    cursor = conn.cursor()
    try:
        yield cursor
        if commit:
            conn.commit()
    finally:
        conn.close()

def init_db():
    """
    Initializes SQLite database schema if not exists with WAL concurrency enabled.
    Strictly preserves existing data across server reloads.
    """
    conn = get_db_connection()
    try:
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
    finally:
        conn.close()

# Auto-initialize DB schema on module load
init_db()
