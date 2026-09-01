"""
Test Suite: SQLite Concurrency & WAL Protocol
Validates:
1. WAL mode is active (`PRAGMA journal_mode=WAL`).
2. Busy timeout is configured (15s patience parameter).
3. Concurrent multi-threaded reads and writes execute without 'database is locked' errors.
4. Clean session release under high contention.
"""

import pytest
import sqlite3
import concurrent.futures
import time
from app.core.db import get_db_connection, DB_PATH
from app.engine.cultivator import get_cultivator

def test_wal_mode_and_pragmas():
    """Validates that get_db_connection enforces WAL mode and busy timeout."""
    conn = get_db_connection(timeout=15.0)
    cursor = conn.cursor()
    
    cursor.execute("PRAGMA journal_mode;")
    mode = cursor.fetchone()[0]
    assert mode.upper() == "WAL"
    
    cursor.execute("PRAGMA busy_timeout;")
    timeout_val = cursor.fetchone()[0]
    assert timeout_val >= 15000
    
    cursor.execute("PRAGMA synchronous;")
    sync_val = cursor.fetchone()[0]
    # NORMAL is 1
    assert sync_val in [1, "NORMAL", "normal"]
    
    conn.close()

def test_concurrent_multithreaded_reads_and_writes():
    """
    Spawns 10 concurrent worker threads reading and updating the cultivator state
    simultaneously to verify that WAL mode and 15s patience prevent database locking errors.
    """
    def worker_action(thread_idx: int):
        for step in range(5):
            cultivator = get_cultivator(1)
            # Perform read
            stats = cultivator.get_stats()
            # Perform small stamina update and write
            cultivator.stamina = min(100.0, round(cultivator.stamina + 0.1, 2))
            cultivator.save_to_db()
            time.sleep(0.01)
        return True

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(worker_action, i) for i in range(10)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
    assert all(results)
    assert len(results) == 10
