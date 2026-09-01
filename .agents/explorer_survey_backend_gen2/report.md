# Backend Survey & Architecture Specification: Taiwu Instance-Based Architecture Refactor

**Author**: `explorer_survey_backend_gen2`  
**Target Milestone**: Taiwu Instance-Based Architecture Refactor (Gen 2)  
**Date**: 2026-09-01  
**Working Directory**: `D:\Wonderland Discord\Bot\Taiwu Path of the Gu\.agents\explorer_survey_backend_gen2`  

---

## 1. Executive Architecture Overview

The backend is built upon **FastAPI** (Python 3.12) running under Uvicorn, serving as the real-time simulation and state engine for *Taiwu: Path of the Gu*.

### 1.1 App Initialization & Lifecycle
- **Entry Point**: `backend/app/main.py`
  - Instantiates `app = FastAPI(title="Taiwu: Path of the Gu API", version="0.1.0")`.
  - `@app.on_event("startup")` executes `init_db()` from `app.core.db`, initializing `taiwu_local.db` without dropping existing tables.
  - Configures `CORSMiddleware` with `allow_origins=["*"]`, `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`.
  - Mounts root API router at `/api/v1` (`app.include_router(api_v1_router.router, prefix="/api/v1")`).
  - Health check at `GET /health` returning `{"status": "healthy", "database": DATABASE_URL}`.

### 1.2 Router Hierarchy (`backend/app/api/v1/router.py`)
The sub-routers mounted under `/api/v1` are:
| Prefix | Sub-Router Module | Primary Responsibility |
|---|---|---|
| `/world` | `app.api.v1.world` | Grid retrieval, tile movement, faction extortion/trade, combat triggers, meditation, plunder |
| `/overworld` | `app.api.v1.overworld` | 5 Macro-Regions overview, node listings, node entry |
| `/cultivator` | `app.api.v1.cultivator` | Cultivator statistics, meditation recovery |
| `/gu` | `app.api.v1.gu` | Aperture inventory, feeding, refinement cauldron, wild Gu capture, ascension breakthroughs |
| `/vault` | `app.api.v1.vault` | Inactive Gu storage, equip/unequip slots, vault feeding |
| `/combat` | `app.api.v1.combat` | BEU essence cost matrix, combat action resolution, plunder tables |

### 1.3 State Management & Dependency Injection
- State is held in global in-memory singletons:
  - `player_cultivator`: `CultivatorState` instance in `app.engine.cultivator`.
  - `enforcer_manager`: `EnforcerManager` instance in `app.engine.npc`.
  - `region_cache`: In-memory dictionary in `app.api.v1.world` caching generated tile grids.
  - `region_tile_cache`: In-memory dictionary in `app.api.v1.overworld`.
- Database access is direct via `get_db_connection()` (`sqlite3.connect(DB_PATH)` with `row_factory = sqlite3.Row`). No ORM/SQLAlchemy layer is used, keeping overhead minimal and execution deterministic.

---

## 2. World Grid Generation & Coordinate Systems

### 2.1 Current Generation Engine (`backend/app/engine/world_gen.py`)
- **Current Dimension**: Hardcoded to `15x15` (`width=15, height=15`, 225 tiles) with player start at `[7, 7]`.
- **Seeding Mechanism**: Uses integer seed `random.seed(region_id)`.
- **Procedural Distribution**:
  - `dominant_biome`: Derived from `REGION_BIOMES` mapping or randomly picked from `BIOMES`.
  - `spring_coords`: Hardcoded modulo offsets around player start `[((px+3)%15, (py-3)%15), ((px-4)%15, (py+4)%15)]`.
  - `faction_coords_map`: Hardcoded offsets from `REGION_FACTIONS` (e.g., `(-3, -3)` and `(4, 3)`).
  - 60% probability of dominant biome; 40% random biome from `BIOMES`.
  - Fog of War: Tiles within Manhattan distance 1 of player start are initialized as `is_revealed=True, discovered=True`.
- **Tile Dictionary Structure**:
  ```python
  {
      "x": int,
      "y": int,
      "type": str,
      "terrain": str,
      "biome": str,
      "is_spirit_spring": bool,
      "is_faction_node": bool,
      "faction": Optional[str],
      "faction_type": Optional[str],
      "harvested": bool,
      "is_revealed": bool,
      "discovered": bool
  }
  ```

### 2.2 Shortcomings & Required Refactor
1. **Dimension Expansion**: Needs to expand to a finite **30x30 coordinate matrix (`[0..29, 0..29]`, 900 tiles total)**.
2. **String Region Key Hashing**: Region IDs are canonical strings (e.g. `"southern_border_gu_yue"`). The generator must use stable deterministic hashing: `random.seed(int(hashlib.md5(str(region_id).encode()).hexdigest(), 16) % (10**8))` to avoid Python hash randomization issues across restarts.
3. **Player Start**: Defaults to center coordinate `[15, 15]`.
4. **Way Station / Caravan POI Seeding**:
   - Seed dedicated `way_station` / `caravan` POI tiles on each 30x30 grid.
   - Tile attributes:
     ```python
     "is_way_station": True,
     "poi_type": "way_station",
     "type": "Way Station",
     "terrain": "Way Station",
     "name": "Caravan Way Station",
     "desc": "An inter-regional transit outpost managed by Shang Clan merchant caravans with domestic transit Gu beasts."
     ```
   - Seed placement: At `[15, 15]` (the regional entry hub) and/or strategic road intersections (e.g. `[15, 15]`, `[5, 5]`, `[24, 24]`).

---

## 3. Database Schema & Persistence Layer

### 3.1 SQLite Database (`taiwu_local.db`)
- Located at project root: `D:\Wonderland Discord\Bot\Taiwu Path of the Gu\taiwu_local.db`.
- Managed in `backend/app/core/db.py`.

### 3.2 Existing Table Definition: `cultivator_state`
```sql
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
);
```

### 3.3 Critical Gap & Migration Strategy
- **Missing Column**: `current_region_id TEXT DEFAULT 'southern_border_gu_yue'` is not present in `cultivator_state`.
- **Migration in `init_db()`**:
  To protect existing databases without dropping tables, `init_db()` in `backend/app/core/db.py` must execute schema reflection and dynamic column addition:
  ```python
  cursor.execute("PRAGMA table_info(cultivator_state)")
  columns = [col[1] for col in cursor.fetchall()]
  if "current_region_id" not in columns:
      cursor.execute("ALTER TABLE cultivator_state ADD COLUMN current_region_id TEXT DEFAULT 'southern_border_gu_yue'")
  ```
- **Sync in `CultivatorState` (`backend/app/engine/cultivator.py`)**:
  - Add attribute `self.current_region_id: str = "southern_border_gu_yue"`.
  - Update `save_to_db()` to include `current_region_id` in INSERT and `ON CONFLICT DO UPDATE SET current_region_id=excluded.current_region_id`.
  - Update `load_from_db()` to load `self.current_region_id = row["current_region_id"] if ("current_region_id" in row.keys() and row["current_region_id"]) else "southern_border_gu_yue"`.
  - Update `get_stats()` to export `"current_region_id": self.current_region_id`.

---

## 4. Player Movement & Boundaries Audit

### 4.1 Current Movement Logic (`backend/app/api/v1/world.py:101-294`)
- Endpoint: `POST /api/v1/world/move`
- Accepts `dx, dy` query params or `{ "dx", "dy" }` / `{ "to_x", "to_y" }` / `{ "region_id" }` in JSON body.
- Movement step calculation:
  ```python
  step_x = 1 if target_dx > 0 else (-1 if target_dx < 0 else 0)
  step_y = 1 if target_dy > 0 else (-1 if target_dy < 0 else 0)
  new_x = player_cultivator.player_pos[0] + step_x
  new_y = player_cultivator.player_pos[1] + step_y
  ```

### 4.2 Deficiencies Found
1. **Zero Bounds Validation**: There is currently NO boundary check on `new_x` or `new_y`. The cultivator can traverse into negative coordinates or exceed the grid bounds.
2. **Hardcoded Region ID**: Line 111 defaults to `region_id = 1` instead of reading `player_cultivator.current_region_id`.
3. **Hardcoded Grid Size**: `get_or_create_region(region_id)` hardcodes `width=15, height=15`.

### 4.3 Required Enforcement
- **Strict Boundary Check**:
  ```python
  if new_x < 0 or new_x > 29 or new_y < 0 or new_y > 29:
      raise HTTPException(
          status_code=400,
          detail="Movement out of regional instance bounds [0..29, 0..29]. Celestial boundary barrier reached."
      )
  ```
- **Stamina Economy**: Verified at 2.0 Stamina per tile traversal (`player_cultivator.stamina = max(0.0, round(player_cultivator.stamina - 2.0, 1))`).
- **Gu Satiety Attrition**: 5 Satiety deducted from all Gu (`player_cultivator.decay_gu_satiety(5)`).
- **Enforcer Predator Matrix**: Enforcer chase step updated to 30x30 bounds.
- **Persistence**: Explicitly invoke `player_cultivator.save_to_db()` upon move completion.

---

## 5. Five Macro-Regions Specification

The Gu World is segmented into Five isolated Regional Instances:

```python
MACRO_REGIONS = {
    "southern_border_gu_yue": {
        "id": "southern_border_gu_yue",
        "name": "Southern Border: Gu Yue Sector",
        "chinese_name": "南疆 · 古月山庄",
        "region_group": "Southern Border",
        "desc": "Humid karst mountains and thick venomous bamboo jungles. Ancestral domain of the Gu Yue Clan upon Qing Mao Mountain.",
        "dominant_biome": "Southern Border Mountain",
        "color": "#2D5A27",
        "position": {"x": 50, "y": 78},
        "entry_point": [15, 15],
        "default_factions": ["Gu Yue Clan", "Shang Clan Merchant City"]
    },
    "central_continent_spirit_affinity": {
        "id": "central_continent_spirit_affinity",
        "name": "Central Continent: Spirit Affinity Sector",
        "chinese_name": "中洲 · 灵缘宗界",
        "region_group": "Central Continent",
        "desc": "The heartland of the Gu world. Fertile spiritual plains ruled by the ten great ancient righteous sects and Spirit Affinity House.",
        "dominant_biome": "Central Continent Plains",
        "color": "#8B6914",
        "position": {"x": 50, "y": 45},
        "entry_point": [15, 15],
        "default_factions": ["Central Continent Sect", "Shang Clan Merchant City"]
    },
    "western_desert_thousand_li": {
        "id": "western_desert_thousand_li",
        "name": "Western Desert: Thousand Li Dunes",
        "chinese_name": "西漠 · 千里流沙",
        "region_group": "Western Desert",
        "desc": "Endless scorching sands, ancient obelisks, and hidden oases dominated by nomadic merchant caravans.",
        "dominant_biome": "Western Desert Dunes",
        "color": "#B8860B",
        "position": {"x": 18, "y": 45},
        "entry_point": [15, 15],
        "default_factions": ["Shang Clan Merchant City", "Shadow Sect Remnants"]
    },
    "northern_plains_ge_tribe": {
        "id": "northern_plains_ge_tribe",
        "name": "Northern Plains: Ge Tribe Grassland",
        "chinese_name": "北原 · 葛家草场",
        "region_group": "Northern Plains",
        "desc": "Vast windswept steppes howling with bitter gales. Nomadic beast masters and wolf-riding tribes battle for seasonal survival.",
        "dominant_biome": "Northern Plains Grassland",
        "color": "#4A7FA5",
        "position": {"x": 50, "y": 15},
        "entry_point": [15, 15],
        "default_factions": ["Bai Clan", "Xiong Clan"]
    },
    "eastern_sea_blue_wave": {
        "id": "eastern_sea_blue_wave",
        "name": "Eastern Sea: Blue Wave Archipelago",
        "chinese_name": "东海 · 碧波群岛",
        "region_group": "Eastern Sea",
        "desc": "Endless crashing azure tides and luminous coral reefs rich in water path resources and marine inheritances.",
        "dominant_biome": "Eastern Sea Reef",
        "color": "#1A4A6E",
        "position": {"x": 82, "y": 45},
        "entry_point": [15, 15],
        "default_factions": ["Shang Clan Merchant City", "Xiong Clan"]
    }
}
```

---

## 6. Way Station / Caravan POI Seeding Plan

### 6.1 Placement Matrix on 30x30 Grid
For each regional instance:
1. **Primary Transit Way Station Hub**: Positioned directly at the instance origin `[15, 15]`.
2. **Secondary Frontier Outposts**: Optional secondary hubs positioned at quadrant gateways (e.g., `[7, 7]` and `[22, 22]`).

### 6.2 Tile Metadata Attributes
```python
{
    "x": 15,
    "y": 15,
    "type": "Way Station",
    "terrain": "Way Station",
    "biome": dominant_biome,
    "is_way_station": True,
    "poi_type": "way_station",
    "name": "Shang Clan Caravan Way Station",
    "desc": "A fortified inter-regional transit router managed by Shang Clan merchant caravans. Board a caravan to travel across the Five Regions.",
    "is_spirit_spring": False,
    "is_faction_node": False,
    "faction": "Shang Clan Merchant City",
    "faction_type": "Neutral Commercial Caravanserai",
    "harvested": False,
    "is_revealed": True,
    "discovered": True
}
```

---

## 7. Inter-Regional Travel API Specification (`POST /api/v1/world/travel`)

### 7.1 Request Schema
- **Endpoint**: `POST /api/v1/world/travel`
- **Request Body (JSON)**:
  ```json
  {
    "target_region_id": "central_continent_spirit_affinity"
  }
  ```

### 7.2 Validation & Execution Workflow
1. **Target Region Validation**:
   - Check if `target_region_id` exists in `MACRO_REGIONS`. If not: `404 Not Found {"detail": "Invalid destination region ID."}`.
2. **Distinct Region Check**:
   - Check if `target_region_id == player_cultivator.current_region_id`. If same: `400 Bad Request {"detail": "Cultivator is already present in this regional instance."}`.
3. **Passive Stamina Update**:
   - Call `player_cultivator.update_stamina_passive()`.
4. **Economic Toll Verification**:
   - **Stamina Toll**: Requires `>= 40.0 Stamina`. If insufficient: `400 Bad Request {"detail": "Exhausted! Insufficient Stamina to board the caravan (Requires 40 Stamina, Current: X.X)."}`.
   - **Primeval Stone Toll**: Requires `>= 100 Primeval Stones`. If insufficient: `400 Bad Request {"detail": "Insufficient funds! Shang Clan caravan demands 100 Primeval Stones (Current: X)."}`.
5. **Deduct Tolls & Update Cultivator**:
   - `player_cultivator.stamina = max(0.0, round(player_cultivator.stamina - 40.0, 1))`
   - `player_cultivator.spirit_stones -= 100`
   - `player_cultivator.current_region_id = target_region_id`
   - `player_cultivator.player_pos = [15, 15]`
   - Satiety Attrition: `player_cultivator.decay_gu_satiety(10)`
6. **Enforcer Hunter Matrix Reset**:
   - When entering a new regional instance, reset or respawn the Enforcer for the new 30x30 coordinate system:
     `enforcer_manager.enforcer.active = False`
     `enforcer_manager.check_and_update(player_cultivator, auto_spawn=True)`
7. **Database Persistence**:
   - Atomically call `player_cultivator.save_to_db()` to record the new `current_region_id`, `player_pos_x=15`, `player_pos_y=15`, `stamina`, and `spirit_stones`.
8. **Grid Instance Generation**:
   - `tiles = get_or_create_region(target_region_id, width=30, height=30, player_start=[15, 15])`
   - `reveal_around(tiles, 15, 15, radius=2)`

### 7.3 Success Response (200 OK)
```json
{
  "success": true,
  "message": "Boarded Shang Clan Caravan and traveled to Central Continent: Spirit Affinity Sector!",
  "current_region_id": "central_continent_spirit_affinity",
  "region": {
    "id": "central_continent_spirit_affinity",
    "name": "Central Continent: Spirit Affinity Sector",
    "chinese_name": "中洲 · 灵缘宗界",
    "biome": "Central Continent Plains"
  },
  "player_pos": [15, 15],
  "tiles": [... 900 tile objects ...],
  "grid": [... 900 tile objects ...],
  "enforcer": null,
  "cultivator": { ... CultivatorStats with current_region_id ... },
  "toll_paid": {
    "stamina": 40.0,
    "spirit_stones": 100
  }
}
```

---

## 8. Exact Code Modifications Blueprint

### 8.1 `backend/app/core/db.py`
- Modify `init_db()` to create `current_region_id` column if table exists without it:
```python
def init_db():
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
        updated_at REAL NOT NULL,
        current_region_id TEXT NOT NULL DEFAULT 'southern_border_gu_yue'
    )
    """)
    cursor.execute("PRAGMA table_info(cultivator_state)")
    columns = [col[1] for col in cursor.fetchall()]
    if "current_region_id" not in columns:
        cursor.execute("ALTER TABLE cultivator_state ADD COLUMN current_region_id TEXT DEFAULT 'southern_border_gu_yue'")
    conn.commit()
    conn.close()
```

### 8.2 `backend/app/engine/cultivator.py`
- In `__init__`:
  - `self.player_pos: List[int] = [15, 15]`
  - `self.current_region_id: str = "southern_border_gu_yue"`
- In `save_to_db()`:
  - Add `current_region_id` to INSERT and UPDATE clauses.
- In `load_from_db()`:
  - Load `self.current_region_id = row["current_region_id"] if ("current_region_id" in row.keys() and row["current_region_id"]) else "southern_border_gu_yue"`.
- In `get_stats()`:
  - Add `"current_region_id": self.current_region_id`.

### 8.3 `backend/app/engine/world_gen.py`
- Define `MACRO_REGIONS` dictionary.
- Update `generate_region(region_id: str, width: int = 30, height: int = 30, player_start: List[int] = [15, 15])`:
  - Seed with `int(hashlib.md5(str(region_id).encode()).hexdigest(), 16) % (10**8)`.
  - Seed `Way Station` tile at `[15, 15]`.
  - Seed `Spirit Springs` at offset points (e.g. `[18, 12]`, `[11, 19]`, `[8, 22]`).
  - Seed `Faction Outposts` from regional configurations.

### 8.4 `backend/app/api/v1/world.py`
- Update `region_cache: Dict[str, List[Dict[str, Any]]] = {}`.
- Update `get_or_create_region(region_id: str, width: int = 30, height: int = 30)` to default to 30x30.
- Update `move_player()`:
  - Use `player_cultivator.current_region_id`.
  - Enforce bounds `0 <= new_x <= 29` and `0 <= new_y <= 29`.
  - Persist cultivator with `player_cultivator.save_to_db()`.
- Add `POST /api/v1/world/travel` endpoint implementing toll validation (40 Stamina + 100 Stones), location update to `[15, 15]`, state persistence, and returning 30x30 grid data.

### 8.5 `backend/app/engine/npc.py`
- Update `spawn()` grid defaults: `grid_width: int = 30, grid_height: int = 30`.
- Update `EnforcerManager.check_and_update()` to pass `30, 30`.

---

## 9. Verification Protocol

The subsequent implementing agent can independently verify the implementation with the following steps:

1. **Database Schema Verification**:
   ```pwsh
   python -c "from app.core.db import get_db_connection; conn=get_db_connection(); cur=conn.cursor(); cur.execute('PRAGMA table_info(cultivator_state)'); print([c[1] for c in cur.fetchall()])"
   ```
   *Expected Output*: Contains `'current_region_id'`.

2. **30x30 Grid Dimension Verification**:
   ```pwsh
   python -c "from app.engine.world_gen import generate_region; grid=generate_region('southern_border_gu_yue', 30, 30); print(len(grid), grid[0]['x'], grid[-1]['x'], grid[-1]['y'])"
   ```
   *Expected Output*: `900 0 29 29`.

3. **Way Station Seed Verification**:
   ```pwsh
   python -c "from app.engine.world_gen import generate_region; grid=generate_region('southern_border_gu_yue', 30, 30); way_stations=[t for t in grid if t.get('is_way_station')]; print(len(way_stations), way_stations[0]['x'], way_stations[0]['y'])"
   ```
   *Expected Output*: `1 15 15` (or configured way station coordinates).

4. **Boundary Clamping Test**:
   Invoke `POST /api/v1/world/move` with coordinates attempting to cross beyond `[0..29, 0..29]`. Verify HTTP 400 rejection.

5. **Inter-Regional Travel Test**:
   Invoke `POST /api/v1/world/travel` with `{"target_region_id": "central_continent_spirit_affinity"}`. Verify:
   - Deducts 40 Stamina and 100 Stones.
   - Sets `current_region_id` to `"central_continent_spirit_affinity"`.
   - Sets position to `[15, 15]`.
   - Returns 900 tiles for the 30x30 instance.
