import os
import sys
import sqlite3
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.db import init_db
import app.core.db as db_module
from app.engine.cultivator import player_cultivator
import app.api.v1.world as world_api
from app.engine.npc import enforcer_manager, RighteousEnforcer

@pytest.fixture(autouse=True)
def isolate_test_db(tmp_path, monkeypatch):
    """
    Autouse fixture that creates a fresh isolated temporary SQLite database
    for every test, ensuring taiwu_local.db is never polluted or modified.
    """
    test_db_path = str(tmp_path / "test_taiwu.db")
    monkeypatch.setattr(db_module, "DB_PATH", test_db_path)
    monkeypatch.setattr(db_module, "DATABASE_URL", f"sqlite:///{test_db_path}")

    # Initialize schema and migrations in test DB
    init_db()

    # Reset player_cultivator state to fresh defaults
    player_cultivator.name = "Fang Yuan"
    player_cultivator.rank = 1
    player_cultivator.stage = "Initial Stage"
    player_cultivator.aperture_grade = "A Grade (93% Primeval Sea)"
    player_cultivator.aptitude_percentage = 93.0
    player_cultivator.aperture_status = "Pristine"
    player_cultivator.primeval_essence = 93.0
    player_cultivator.max_essence = 93.0
    player_cultivator.nourish_progress = 0.0
    player_cultivator.stamina = 100.0
    player_cultivator.max_stamina = 100.0
    player_cultivator.spirit_stones = 1000
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.player_pos = [15, 15]
    player_cultivator.base_strength = 10
    player_cultivator.base_defense = 5
    player_cultivator.base_speed = 10
    player_cultivator.current_hp = 100
    player_cultivator.alignment_score = -75
    player_cultivator.current_node = None
    player_cultivator.save_to_db()

    # Reset region cache if present
    if hasattr(world_api, "region_cache"):
        world_api.region_cache.clear()

    # Reset NPC enforcer
    enforcer_manager.enforcer = RighteousEnforcer()
    enforcer_manager.enforcer.active = False

    yield test_db_path

@pytest.fixture
def client():
    """
    FastAPI TestClient fixture.
    """
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def cultivator():
    """
    Convenience fixture providing access to the global player_cultivator instance.
    """
    return player_cultivator
