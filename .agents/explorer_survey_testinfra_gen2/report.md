# Test Infrastructure Survey & 5-Tier Verification Strategy
## Taiwu Instance-Based Architecture Refactor

**Author**: `explorer_survey_testinfra_gen2`  
**Working Directory**: `D:\Wonderland Discord\Bot\Taiwu Path of the Gu\.agents\explorer_survey_testinfra_gen2`  
**Date**: 2026-09-01  
**Target Milestone**: Comprehensive Test Infrastructure Mapping & Test Strategy for 'Taiwu Instance-Based Architecture'  

---

## 1. Executive Summary

This document presents the test infrastructure survey and the complete multi-tier test strategy for the **Taiwu Instance-Based Architecture** refactor. 

The architecture segments the Gu cultivation world from an ad-hoc local grid into **five isolated, finite 30x30 regional grid instances (`[0..29, 0..29]`, 900 tiles per region)** connected via **Shang Clan Caravan Way Stations** and an **Inter-Regional Travel API (`POST /api/v1/world/travel`)** governed by strict stamina (40 AP) and primeval stone (100 stones) economic sinks.

### Key Infrastructure Findings
1. **Backend Test Environment**:
   - Python runtime: `Python 3.12.3` at `C:\Users\rifas\AppData\Local\Programs\Python\Python312\python.exe`.
   - Test framework: `pytest 9.1.1` with `pluggy 1.6.0`, `anyio 4.12.1`.
   - HTTP testing client: `fastapi.testclient.TestClient` / `httpx 0.28.1`.
   - Database: SQLite local file `taiwu_local.db` connected via `sqlite3` in `app.core.db`.
   - Execution command: `python -m pytest backend/tests -v` or `pytest -v` (with `pythonpath = backend` in `pytest.ini`).
2. **Frontend Test & Build Setup**:
   - Node runtime: `Node.js v24.19.0`, `npm 11.17.0`.
   - Core framework: `React 19.2.8`, `TypeScript 6.0.2`, `Vite 8.2.2`, `Tailwind CSS 4.3.3`, `Zustand 5.0.15`.
   - Linter: `oxlint 1.79.0` via `npm run lint` (verified: 0 errors).
   - Build / Typecheck: `tsc -b && vite build` via `npm run build` (verified: 0 errors, 976ms build time).
3. **Verification Framework**:
   - Designed a rigorous **5-Tier Test Plan** spanning Unit Feature Coverage (Tier 1), Boundary & Corner Cases (Tier 2), Cross-Feature Combinations (Tier 3), Real-World Cultivator Journeys (Tier 4), and Adversarial Stress/Chaos Testing (Tier 5).

---

## 2. Backend Test Environment & Configuration

### 2.1 Runtime & Dependency Matrix
| Component | Detected Version | Executable / Location | Status |
|---|---|---|---|
| Python | 3.12.3 (64-bit Windows) | `C:\Users\rifas\AppData\Local\Programs\Python\Python312\python.exe` | Ready |
| Pytest | 9.1.1 | Installed in global Python 3.12 environment | Ready |
| FastAPI | 0.128.8 | `backend/app/main.py` | Ready |
| HTTPX / TestClient | 0.28.1 | Available for synchronous & async API tests | Ready |
| SQLite3 | Built-in (Python 3.12) | `taiwu_local.db` (root directory) | Ready |
| Pydantic | 2.12.5 | DTO schemas & request validation | Ready |

### 2.2 Recommended `pytest.ini` Configuration
To enable seamless test discovery and module resolution without requiring manual `PYTHONPATH` exports in PowerShell:
```ini
# D:\Wonderland Discord\Bot\Taiwu Path of the Gu\pytest.ini
[pytest]
pythonpath = backend
testpaths = backend/tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short --strict-markers
```

### 2.3 Directory Layout for Backend Tests
```
backend/
├── app/
│   ├── api/v1/
│   │   ├── world.py            # Overworld movement, travel router, POIs
│   │   ├── overworld.py        # Macro-regions endpoint
│   │   ├── cultivator.py       # Cultivator stats & meditation
│   │   ├── gu.py               # Aperture & feeding
│   │   ├── vault.py            # Vault inventory
│   │   └── combat.py           # Combat arena
│   ├── core/
│   │   └── db.py               # SQLite schema & connection
│   ├── engine/
│   │   ├── cultivator.py       # CultivatorState & SQLite sync
│   │   ├── world_gen.py        # 30x30 procedural generator
│   │   └── overworld.py        # 5 Macro-Regions dictionary
│   └── main.py
└── tests/
    ├── __init__.py
    ├── conftest.py             # Fixtures: TestClient, temporary SQLite DB, state resetters
    ├── test_world_bounds.py    # 30x30 grid, coordinate boundaries [0, 29], OOB rejections
    ├── test_travel_api.py      # POST /api/v1/world/travel, tolls, validation
    ├── test_persistence.py     # SQLite schema migration, current_region_id persistence
    ├── test_cross_feature.py   # Movement -> Way station -> Travel -> Persistence reload
    ├── test_cultivator_journey.py # Grand Five Regions caravan trade loop
    └── test_adversarial.py     # Concurrency, race conditions, boundary exploits, SQL injection
```

### 2.4 Pytest Fixtures Architecture (`backend/tests/conftest.py`)
To prevent test pollution of the live `taiwu_local.db` and isolate state mutations:

```python
import os
import sqlite3
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core import db
from app.engine.cultivator import player_cultivator, CultivatorState
from app.engine.npc import enforcer_manager

@pytest.fixture(scope="session")
def client():
    """Provides a FastAPI TestClient instance."""
    with TestClient(app) as c:
        yield c

@pytest.fixture(autouse=True)
def isolate_test_db(tmp_path, monkeypatch):
    """
    Creates an isolated temporary SQLite database for each test function,
    re-pointing DB_PATH to a pristine temp DB and initializing schema.
    """
    test_db_path = str(tmp_path / "test_taiwu.db")
    monkeypatch.setattr(db, "DB_PATH", test_db_path)
    monkeypatch.setattr(db, "DATABASE_URL", f"sqlite:///{test_db_path}")
    db.init_db()
    
    # Initialize fresh cultivator state
    player_cultivator.name = "Fang Yuan"
    player_cultivator.rank = 1
    player_cultivator.stage = "Initial Stage"
    player_cultivator.stamina = 100.0
    player_cultivator.max_stamina = 100.0
    player_cultivator.spirit_stones = 300
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.player_pos = [15, 15]
    player_cultivator.save_to_db()
    
    yield test_db_path

@pytest.fixture
def reset_cultivator():
    """Helper fixture to reset cultivator to baseline resources."""
    player_cultivator.stamina = 100.0
    player_cultivator.spirit_stones = 300
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.player_pos = [15, 15]
    player_cultivator.save_to_db()
    return player_cultivator
```

### 2.5 Test Execution Commands
```powershell
# Run full test suite with verbose output
python -m pytest backend/tests -v

# Run specific test tier / module
python -m pytest backend/tests/test_world_bounds.py -v
python -m pytest backend/tests/test_travel_api.py -v
python -m pytest backend/tests/test_persistence.py -v
python -m pytest backend/tests/test_cross_feature.py -v
python -m pytest backend/tests/test_cultivator_journey.py -v
python -m pytest backend/tests/test_adversarial.py -v

# Run with fail-fast mode
python -m pytest backend/tests -x -v
```

---

## 3. Frontend Test & Build Verification

### 3.1 Tooling & Scripts
In `frontend/package.json`:
- **Linting**: `npm run lint` (`oxlint`) — executes in ~111ms, validating JS/TS rules across all components.
- **Typechecking & Build**: `npm run build` (`tsc -b && vite build`) — validates TypeScript type declarations across all `.tsx` and `.ts` files, producing production bundles in `dist/`.

### 3.2 Frontend Verification Strategy
While Oxlint and TSC provide static verification and build sanity, dynamic component contract validation for the new instance architecture requires:
1. **Type Contract Verification (`src/types/api.ts`)**:
   - Ensure `Region` and `MacroRegion` interfaces define `id`, `name`, `chinese_name`, `region_group`, `dominant_biome`, `color`, `entry_point`.
   - Ensure `WorldNode` includes `is_way_station?: boolean; poi_type?: string`.
   - Ensure `CultivatorStats` contains `current_region_id: string`.
2. **Store Action Verification (`src/hooks/useWorldStore.ts`)**:
   - Verify `travelToRegion(targetRegionId: string)` sends `POST /api/v1/world/travel` with `{ target_region_id }`.
   - Updates `playerLocation` to `[15, 15]` and `grid` to the returned 900-tile array.
3. **Modal Mounting Contract (`src/components/world/WayStationModal.tsx`)**:
   - Mounts when player is located on `is_way_station` tile.
   - Accurately checks cultivator stamina >= 40 and stones >= 100 before enabling the "Board Caravan" action.
4. **Grid Viewport Clamping (`src/components/map/MapGrid.tsx`)**:
   - `gridTemplateColumns: 'repeat(30, minmax(0, 1fr))'` for the 30x30 matrix.
   - Smooth transform panning without coordinate overflows.

---

## 4. Comprehensive 5-Tier Test Plan

```
+-------------------------------------------------------------------------+
|                  TIER 5: ADVERSARIAL STRESS TESTING                     |
|  (State Desync, Concurrency Race Conditions, SQLi, Boundary Injections)  |
+-------------------------------------------------------------------------+
|             TIER 4: REAL-WORLD CULTIVATOR JOURNEY E2E                   |
|     (Grand 5-Regions Caravan Circuit, Economic Sinks, Recovery Loop)    |
+-------------------------------------------------------------------------+
|             TIER 3: CROSS-FEATURE INTEGRATION TESTING                   |
|  (Move -> Way Station Step -> Travel -> Explore New Region -> Reload)   |
+-------------------------------------------------------------------------+
|             TIER 2: BOUNDARY & CORNER CASES VALIDATION                  |
|  (Coords [0,0]/[29,29], OOB [-1,-1]/[30,30], <40 Stamina, <100 Stones)  |
+-------------------------------------------------------------------------+
|             TIER 1: FEATURE COVERAGE & UNIT ENDPOINT TESTS              |
|  (Macro-Regions, 30x30 Grid Gen, Travel API, Way Station POI, HUD DTO)   |
+-------------------------------------------------------------------------+
```

---

### Tier 1: Feature Coverage (Unit & Functional Endpoint Testing)

| Test ID | Test Target | Input / Precondition | Expected Output / Assertion |
|---|---|---|---|
| **T1.1** | Macro-Regions Dictionary | Import `MACRO_REGIONS` from `app.engine.overworld` | All 5 canonical regions exist (`southern_border_gu_yue`, `central_continent_spirit_affinity`, `western_desert_thousand_li`, `northern_plains_ge_tribe`, `eastern_sea_blue_wave`). Each has `id`, `name`, `chinese_name`, `region_group`, `dominant_biome`, `color`, `entry_point=[15, 15]`. |
| **T1.2** | 30x30 Procedural Grid Generation | Call `generate_region("southern_border_gu_yue", width=30, height=30)` | Returns exactly 900 tile dictionaries. Every tile has $x \in [0..29]$ and $y \in [0..29]$. |
| **T1.3** | Deterministic Region Seeding | Call `generate_region("western_desert_thousand_li")` twice | Both calls produce identical tile layout, biomes, and POI placements. |
| **T1.4** | Way Station POI Seeding | Inspect tiles generated for any macro-region | Tile at `[15, 15]` has `is_way_station=True`, `poi_type='way_station'`, `terrain='Way Station'`, and Shang Clan caravan merchant metadata. |
| **T1.5** | `POST /api/v1/world/travel` Success | Player in `southern_border_gu_yue` with 100 Stamina, 300 Stones; target `central_continent_spirit_affinity` | Returns `HTTP 200`, `success=True`, `cultivator.current_region_id="central_continent_spirit_affinity"`, `cultivator.stamina=60.0` (-40), `cultivator.spirit_stones=200` (-100), `player_pos=[15, 15]`, and 900 tiles. |
| **T1.6** | Region Grid API (`GET /api/v1/world/region/{region_id}`) | Request `GET /api/v1/world/region/southern_border_gu_yue` | Returns `HTTP 200`, `width=30`, `height=30`, `tiles` (900 items), `player_pos`, and `cultivator`. |
| **T1.7** | Macro-Regions List API (`GET /api/v1/overworld/regions` & `GET /api/v1/world/regions`) | Request `GET /api/v1/world/regions` | Returns `HTTP 200`, list of 5 macro-regions with active region indicator. |
| **T1.8** | Database Schema Reflection | Inspect `cultivator_state` columns in `taiwu_local.db` | Column `current_region_id` exists with `TEXT DEFAULT 'southern_border_gu_yue'`. |

---

### Tier 2: Boundary & Corner Cases (Validation & Invariant Enforcements)

| Test ID | Test Target | Input / Precondition | Expected Output / Assertion |
|---|---|---|---|
| **T2.1** | Corner Coordinates Valid Moves | Player at `[0, 0]` moves to `[0, 1]` or `[1, 0]`; Player at `[29, 29]` moves to `[28, 29]` or `[29, 28]` | Returns `HTTP 200`, position updates correctly to `[0, 1]` and `[28, 29]`. |
| **T2.2** | Out-of-Bounds Movement Negative X/Y | Player at `[0, 0]` attempts `dx=-1, dy=0` (target `[-1, 0]`) or `dx=0, dy=-1` (target `[0, -1]`) | Returns `HTTP 400` ("out of regional instance bounds"). Player pos remains `[0, 0]`, stamina not deducted. |
| **T2.3** | Out-of-Bounds Movement Max X/Y | Player at `[29, 29]` attempts `dx=1, dy=0` (target `[30, 29]`) or `dx=0, dy=1` (target `[29, 30]`) | Returns `HTTP 400` ("out of regional instance bounds"). Player pos remains `[29, 29]`, stamina not deducted. |
| **T2.4** | Diagonal Out-of-Bounds Rejection | Player at `[0, 0]` attempts `dx=-1, dy=-1` (target `[-1, -1]`); at `[29, 29]` attempts `dx=1, dy=1` (target `[30, 30]`) | Returns `HTTP 400`. No state mutation. |
| **T2.5** | Travel Insufficient Stamina (< 40 AP) | Player has 39.9 Stamina, 500 Stones; requests travel to `western_desert_thousand_li` | Returns `HTTP 400` ("Insufficient Stamina: Requires 40 Stamina"). Region, position, and stones unchanged. |
| **T2.6** | Travel Insufficient Stones (< 100 Stones) | Player has 100 Stamina, 99 Stones; requests travel to `western_desert_thousand_li` | Returns `HTTP 400` ("Insufficient Primeval Stones: Requires 100 Primeval Stones"). Region, position, and stamina unchanged. |
| **T2.7** | Travel Zero / Negative Resources | Player has 0 Stamina, 0 Stones; requests travel | Returns `HTTP 400`. Rejection message specifies missing stamina and stones. |
| **T2.8** | Invalid Destination Region ID | Player requests travel with `target_region_id="celestial_court_void_realm"` | Returns `HTTP 404` ("Invalid destination region ID"). |
| **T2.9** | Self-Travel (Same Region Destination) | Player in `southern_border_gu_yue` requests travel to `southern_border_gu_yue` | Returns `HTTP 400` ("Cultivator is already present in this regional instance"). 0 Stamina and 0 Stones deducted. |

---

### Tier 3: Cross-Feature Combinations (Multi-System Integrations)

| Test ID | Scenario Description | Execution Steps | Verification Points |
|---|---|---|---|
| **T3.1** | Full Exploration-Transit-Persistence Pipeline | 1. Player starts at `[15, 15]` in `southern_border_gu_yue` (100 AP, 300 Stones).<br>2. Move 3 steps North to `[15, 12]` (burns 6 AP, 15 satiety decay).<br>3. Move 3 steps South back to `[15, 15]` (Way Station tile).<br>4. Call `POST /api/v1/world/travel` to `western_desert_thousand_li`.<br>5. Move 1 step East to `[16, 15]`.<br>6. Reload state via `cultivator.load_from_db()`. | - Step 4 deducts 40 AP and 100 Stones.<br>- Step 5 updates pos to `[16, 15]` in Western Desert.<br>- Step 6 DB reload restores `current_region_id="western_desert_thousand_li"`, `player_pos=[16, 15]`, stamina=46.0, stones=200. |
| **T3.2** | Karmic Predator Matrix Across Regional Warp | 1. Cultivator with high demonic reputation (-75 alignment) triggers Righteous Enforcer in Southern Border.<br>2. Cultivator uses Way Station to warp to Northern Plains.<br>3. Query enforcer status via `step_hunter_matrix` / `check_enforcer_status`. | - Regional coordinate space is reset cleanly.<br>- Enforcer tracking does not crash or target invalid cross-region coordinates.<br>- Northern Plains instance initializes fresh local hunting matrix. |
| **T3.3** | Gu Worm Parasite Hunger Attrition Across Travel | 1. Record satiety of all equipped and vaulted Gu worms.<br>2. Execute travel from Central Continent to Eastern Sea.<br>3. Check satiety levels. | - All Gu worms sustain regular or caravan travel hunger attrition.<br>- Passive buffs remain active if satiety >= 20, or enter starvation state if < 20. |
| **T3.4** | Tile Fog-of-War Discovery Per Instance | 1. Explore tiles in Region A (e.g. reveal `[14, 15]`, `[16, 15]`).<br>2. Travel to Region B.<br>3. Fetch Region B tiles -> Verify only tiles around `[15, 15]` are revealed.<br>4. Return to Region A -> Verify previously revealed tiles in Region A persist. | - Region caches maintain independent fog-of-war discovery state without bleed across regional instances. |

---

### Tier 4: Real-World Cultivator Journey (Full E2E Simulation)

| Test ID | Narrative Workflow | Simulation Actions | Invariant Checks |
|---|---|---|---|
| **T4.1** | **The Grand Five-Region Caravan Circuit** | 1. **Southern Border**: Start with 100 AP, 500 Stones at `[15, 15]`. Move to `[18, 12]`, harvest Spirit Spring (+75 stones). Return to `[15, 15]`.<br>2. **Hop 1 -> Western Desert**: Travel to `western_desert_thousand_li` (-40 AP, -100 Stones).<br>3. **Hop 2 -> Central Continent**: Meditate (+AP), Travel to `central_continent_spirit_affinity` (-40 AP, -100 Stones).<br>4. **Hop 3 -> Northern Plains**: Travel to `northern_plains_ge_tribe` (-40 AP, -100 Stones).<br>5. **Hop 4 -> Eastern Sea**: Travel to `eastern_sea_blue_wave` (-40 AP, -100 Stones).<br>6. **Hop 5 -> Southern Border**: Return home (-40 AP, -100 Stones). | - Total 5 caravan travels executed successfully.<br>- Stones precisely deducted (net -500 + 75 = -425 stones).<br>- Position at every regional destination is strictly `[15, 15]`.<br>- All 5 regional 30x30 grids load distinct biomes.<br>- DB accurately records final state in Southern Border. |
| **T4.2** | **Resource Exhaustion & Meditation Recovery Loop** | 1. Cultivator has 45 Stamina and 150 Stones.<br>2. Travels once to Western Desert -> Stamina drops to 5.0.<br>3. Attempts second travel to Northern Plains -> Fails with `HTTP 400` (Insufficient Stamina).<br>4. Cultivator performs Meditation (`POST /api/v1/world/meditate` or time recovery) -> Restores Stamina to 50.<br>5. Retries travel to Northern Plains -> Succeeds! | - Error handling correctly prevents negative stamina.<br>- Meditation recovery enables recovery and progression.<br>- State remains consistent throughout. |
| **T4.3** | **Aperture & Vault Inventory Preservation** | 1. Cultivator equips 5 Gu worms in Aperture and stores 3 Gu worms in Vault.<br>2. Executes multi-region caravan transit.<br>3. Inspects Aperture and Vault after transit. | - Zero Gu worms are lost, duplicated, or corrupted.<br>- JSON serialization in SQLite `cultivator_state` remains intact. |

---

### Tier 5: Adversarial Stress & Chaos Testing

| Test ID | Adversarial Vector | Attack / Stress Payload | Expected Defense & Mitigation |
|---|---|---|---|
| **T5.1** | **Concurrent Travel Race Condition** | Fire 5 concurrent `POST /api/v1/world/travel` requests simultaneously in parallel threads when user only has 100 Stamina / 120 Stones (enough for exactly 1 travel). | Exactly 1 request succeeds (`HTTP 200`); remaining 4 requests fail (`HTTP 400 Insufficient Resources`). No double-spending or negative balances. |
| **T5.2** | **Malformed Coordinate Injections** | Send movement payloads: `{"to_x": 999999, "to_y": -999999}`, `{"to_x": "NaN", "to_y": "Infinity"}`, `{"dx": 100, "dy": 100}`. | Pydantic / FastAPI input validation rejects malformed types (`HTTP 422`). Bound checks reject out-of-range deltas (`HTTP 400`). Position clamped. |
| **T5.3** | **SQL Injection via Region ID** | Send `POST /api/v1/world/travel` with `{"target_region_id": "southern_border'; DROP TABLE cultivator_state; --"}`. | Key validation against `MACRO_REGIONS` rejects key (`HTTP 404`). Parameterized queries ensure SQLite table is untouched. |
| **T5.4** | **Null / None Body Payloads** | Send empty JSON `{}`, `{"target_region_id": null}`, or invalid Content-Types to travel and move endpoints. | Clean `HTTP 400` / `HTTP 422` error responses without 500 Unhandled Server Exceptions or server process crashes. |
| **T5.5** | **Rapid Repeated Grid Boundary Bumping** | Script sends 100 consecutive `dx=-1, dy=0` moves against boundary `[0, 15]`. | All 100 requests rejected cleanly with `HTTP 400`. Cultivator position remains locked at `[0, 15]`, 0 Stamina lost. |

---

## 5. Concrete Test Implementation Blueprint

Below is the ready-to-run implementation blueprint for `backend/tests/test_world_bounds.py` and `backend/tests/test_travel_api.py`.

### 5.1 `backend/tests/test_world_bounds.py`
```python
import pytest
from app.engine.world_gen import generate_region
from app.engine.cultivator import player_cultivator

def test_grid_generation_30x30():
    """Verify procedural generation produces exactly 900 tiles in [0..29, 0..29]."""
    tiles = generate_region("southern_border_gu_yue", width=30, height=30)
    assert len(tiles) == 900
    
    coords = set((t["x"], t["y"]) for t in tiles)
    assert len(coords) == 900
    for x in range(30):
        for y in range(30):
            assert (x, y) in coords

def test_way_station_seeded_at_origin():
    """Verify Way Station POI is seeded at [15, 15]."""
    tiles = generate_region("southern_border_gu_yue", width=30, height=30)
    origin_tile = next((t for t in tiles if t["x"] == 15 and t["y"] == 15), None)
    assert origin_tile is not None
    assert origin_tile.get("is_way_station") is True
    assert origin_tile.get("type") == "Way Station" or origin_tile.get("terrain") == "Way Station"

def test_movement_within_bounds(client, reset_cultivator):
    """Test valid step movement on 30x30 grid."""
    player_cultivator.player_pos = [15, 15]
    player_cultivator.stamina = 100.0
    player_cultivator.save_to_db()

    res = client.post("/api/v1/world/move", json={"dx": 0, "dy": 1})
    assert res.status_code == 200
    data = res.json()
    assert data["new_pos"] == [15, 16]

def test_movement_out_of_bounds_rejection(client, reset_cultivator):
    """Test movement below 0 or above 29 is strictly rejected."""
    # Min bounds [0, 0]
    player_cultivator.player_pos = [0, 0]
    player_cultivator.stamina = 100.0
    player_cultivator.save_to_db()

    res_neg_x = client.post("/api/v1/world/move", json={"dx": -1, "dy": 0})
    assert res_neg_x.status_code == 400
    assert "bounds" in res_neg_x.json()["detail"].lower()

    res_neg_y = client.post("/api/v1/world/move", json={"dx": 0, "dy": -1})
    assert res_neg_y.status_code == 400

    # Max bounds [29, 29]
    player_cultivator.player_pos = [29, 29]
    player_cultivator.save_to_db()

    res_max_x = client.post("/api/v1/world/move", json={"dx": 1, "dy": 0})
    assert res_max_x.status_code == 400

    res_max_y = client.post("/api/v1/world/move", json={"dx": 0, "dy": 1})
    assert res_max_y.status_code == 400
```

### 5.2 `backend/tests/test_travel_api.py`
```python
import pytest
from app.engine.cultivator import player_cultivator

def test_travel_success(client, reset_cultivator):
    """Verify successful inter-regional travel with toll deductions."""
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.stamina = 100.0
    player_cultivator.spirit_stones = 300
    player_cultivator.player_pos = [10, 10]
    player_cultivator.save_to_db()

    res = client.post("/api/v1/world/travel", json={"target_region_id": "western_desert_thousand_li"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["cultivator"]["current_region_id"] == "western_desert_thousand_li"
    assert data["cultivator"]["stamina"] == 60.0  # 100 - 40
    assert data["cultivator"]["spirit_stones"] == 200  # 300 - 100
    assert data["player_pos"] == [15, 15]
    assert len(data["grid"]) == 900

def test_travel_insufficient_stamina(client, reset_cultivator):
    """Verify travel fails when stamina < 40."""
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.stamina = 35.0
    player_cultivator.spirit_stones = 300
    player_cultivator.save_to_db()

    res = client.post("/api/v1/world/travel", json={"target_region_id": "western_desert_thousand_li"})
    assert res.status_code == 400
    assert "stamina" in res.json()["detail"].lower()
    assert player_cultivator.current_region_id == "southern_border_gu_yue"
    assert player_cultivator.spirit_stones == 300

def test_travel_insufficient_stones(client, reset_cultivator):
    """Verify travel fails when spirit stones < 100."""
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.stamina = 100.0
    player_cultivator.spirit_stones = 80
    player_cultivator.save_to_db()

    res = client.post("/api/v1/world/travel", json={"target_region_id": "western_desert_thousand_li"})
    assert res.status_code == 400
    assert "stone" in res.json()["detail"].lower()

def test_travel_to_same_region_rejected(client, reset_cultivator):
    """Verify travel to current region is rejected with 0 toll deduction."""
    player_cultivator.current_region_id = "southern_border_gu_yue"
    player_cultivator.stamina = 100.0
    player_cultivator.spirit_stones = 300
    player_cultivator.save_to_db()

    res = client.post("/api/v1/world/travel", json={"target_region_id": "southern_border_gu_yue"})
    assert res.status_code == 400
    assert "already present" in res.json()["detail"].lower()
    assert player_cultivator.stamina == 100.0
    assert player_cultivator.spirit_stones == 300

def test_travel_invalid_region_id(client, reset_cultivator):
    """Verify travel to non-existent region returns 404."""
    res = client.post("/api/v1/world/travel", json={"target_region_id": "non_existent_void"})
    assert res.status_code == 404
```

---

## 6. Actionable Implementation Checklist for Implementers

1. **Test Runner Setup**:
   - [ ] Add `pytest.ini` at project root with `pythonpath = backend` and `testpaths = backend/tests`.
   - [ ] Create `backend/tests/conftest.py` with `client`, `isolate_test_db`, and `reset_cultivator` fixtures.
2. **Test Suite Creation**:
   - [ ] Implement `backend/tests/test_world_bounds.py` (Tier 1 & Tier 2).
   - [ ] Implement `backend/tests/test_travel_api.py` (Tier 1 & Tier 2).
   - [ ] Implement `backend/tests/test_persistence.py` (Tier 1 & Tier 3).
   - [ ] Implement `backend/tests/test_cross_feature.py` (Tier 3).
   - [ ] Implement `backend/tests/test_cultivator_journey.py` (Tier 4).
   - [ ] Implement `backend/tests/test_adversarial.py` (Tier 5).
3. **Execution & CI Gate**:
   - [ ] Execute `python -m pytest backend/tests -v` -> ensure all test cases pass with 100% green status.
   - [ ] Execute `npm run lint` and `npm run build` in `frontend` -> ensure 0 errors and clean bundle build.
