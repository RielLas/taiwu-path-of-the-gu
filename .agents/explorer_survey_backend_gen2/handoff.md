# Handoff Report: Backend Architecture Survey for Taiwu Instance-Based Architecture

**Agent**: `explorer_survey_backend_gen2`  
**Milestone**: Backend Survey (Gen 2 Refactor)  
**Date**: 2026-09-01  
**Handoff Type**: Hard (Task Complete)  

---

## 1. Observation

1. **Backend Entry Point & App Structure**:
   - `backend/app/main.py:1-32`: FastAPI instance initialized, runs `init_db()` in `@app.on_event("startup")`, adds CORS middleware, mounts sub-router `/api/v1` (`app.api.v1.router`).
   - `backend/app/api/v1/router.py:1-17`: Sub-routers mounted at `/world`, `/gu`, `/overworld`, `/vault`, `/cultivator`, `/combat`.
   - Dependency injection uses singleton in-memory state objects (`player_cultivator` in `app.engine.cultivator`, `enforcer_manager` in `app.engine.npc`) with SQLite persistence via `sqlite3` in `app.core.db`.

2. **World Generation & Coordinate System**:
   - `backend/app/engine/world_gen.py:50`: `generate_region(region_id: int, width: int = 15, height: int = 15, player_start: List[int] = [7, 7])` hardcodes a 15x15 grid (225 tiles) with start at `[7, 7]`.
   - `backend/app/engine/world_gen.py:56`: `random.seed(region_id)` assumes integer region IDs and lacks string hashing for canonical region keys.
   - `backend/app/engine/world_gen.py:61-120`: Procedurally generates tiles, placing `Spirit Spring` and `Faction Outpost` via modulo offsets, but has no `Way Station` / `caravan` POI node type.

3. **Database Schema & Persistence**:
   - `backend/app/core/db.py:28-57`: `cultivator_state` table defines 27 columns for player attributes, stats, aperture, and vault, but does **not** have `current_region_id`.
   - `backend/app/engine/cultivator.py:197-240`: `save_to_db()` saves player coordinates `player_pos_x, player_pos_y` without `current_region_id`.
   - `backend/app/engine/cultivator.py:254-289`: `load_from_db()` restores player state but defaults to `player_pos = [7, 7]` and does not read region identity.

4. **Player Movement & Boundaries**:
   - `backend/app/api/v1/world.py:101-294`: `POST /api/v1/world/move` computes `new_x = player_cultivator.player_pos[0] + step_x` and `new_y = player_cultivator.player_pos[1] + step_y` without any bounds checking (`0 <= new_x < width`, `0 <= new_y < height`).
   - Line 111: Hardcodes `region_id = 1` as default when unsupplied.

5. **NPC Hunter Matrix**:
   - `backend/app/engine/npc.py:75, 244`: `spawn()` defaults to `grid_width = 15, grid_height = 15` and hardcodes `spawn(player_cultivator.player_pos, 15, 15, ...)`.

---

## 2. Logic Chain

1. **Observation 1 & 3 → Database State Persistence**:
   Because `cultivator_state` currently lacks `current_region_id`, reloading the server or changing regions cannot persist across sessions without a database schema migration. Adding `current_region_id TEXT DEFAULT 'southern_border_gu_yue'` in `init_db()` using `ALTER TABLE` reflection ensures backward compatibility and zero data loss on existing `taiwu_local.db` files.

2. **Observation 2 & 4 → 30x30 Matrix & Boundary Clamping**:
   Because `generate_region()` defaults to 15x15 and `move_player()` has no boundary checks, upgrading to the Taiwu Instance architecture requires setting default dimensions to `width=30, height=30` (`[0..29, 0..29]`, 900 tiles total) with default origin `[15, 15]`. `move_player()` must explicitly reject any movement where `new_x < 0 or new_x > 29 or new_y < 0 or new_y > 29` with an HTTP 400 status code.

3. **Observation 2 & 5 → POI Seeding & Macro-Regions**:
   Replacing integer region IDs with canonical 5 Macro-Region keys (`southern_border_gu_yue`, `central_continent_spirit_affinity`, `western_desert_thousand_li`, `northern_plains_ge_tribe`, `eastern_sea_blue_wave`) requires using stable string hashing (e.g. `int(hashlib.md5(str(region_id).encode()).hexdigest(), 16) % (10**8)`) for seed reproducibility. Seeding a `Way Station` tile at `[15, 15]` in every instance provides the anchor node for caravan inter-regional routing.

4. **Observation 1, 3, 4 → Inter-Regional Travel Router**:
   The new `POST /api/v1/world/travel` endpoint in `app/api/v1/world.py` must validate the target region, verify economic sinks (>= 40 Stamina and >= 100 Primeval Stones), deduct tolls, set `current_region_id = target_region_id` and `player_pos = [15, 15]`, decay Gu satiety, reset the enforcer for 30x30 bounds, persist state via `save_to_db()`, and return the 900-tile instance grid.

---

## 3. Caveats

1. **In-Memory Cache Invalidation**:
   `region_cache` in `world.py` stores generated tile grids by region ID. When migrating to 30x30, the in-memory cache must key on string `region_id` and must be populated with 30x30 tiles.
2. **Frontend Synchrony**:
   The frontend `useWorldStore.ts` and `MapGrid.tsx` currently assume `15x15` grids and hardcoded integer `region_id: 1`. The backend changes (providing 900 tiles, string region keys, and `current_region_id` in cultivator stats) are designed to be fully compatible with frontend consumers.
3. **No External ORM Dependency**:
   The project strictly uses standard library `sqlite3` without SQLAlchemy or Alembic; migrations must be handled via `PRAGMA table_info` in `init_db()`.

---

## 4. Conclusion

The backend architecture is clear, modular, and ready for implementation of the Taiwu Instance-Based Architecture refactor. All required modifications have been surveyed and documented in detail in `report.md`. The implementation requires edits to:
- `backend/app/core/db.py` (table migration)
- `backend/app/engine/cultivator.py` (`current_region_id` property, DB serialization/deserialization, stats export)
- `backend/app/engine/world_gen.py` (30x30 grid generation, string hashing, Way Station POI seeding, Macro-Regions dictionary)
- `backend/app/api/v1/world.py` (30x30 cache, boundary enforcement in `/move`, new `POST /travel` endpoint)
- `backend/app/engine/npc.py` (30x30 Enforcer grid bounds)
- `backend/app/engine/overworld.py` (Macro-Regions dictionary alignment)

---

## 5. Verification Method

Once implemented, the backend refactor can be verified using the following commands:

1. **Verify Database Schema Migration**:
   ```pwsh
   python -c "from app.core.db import get_db_connection; conn=get_db_connection(); cur=conn.cursor(); cur.execute('PRAGMA table_info(cultivator_state)'); cols=[c[1] for c in cur.fetchall()]; assert 'current_region_id' in cols, 'Missing current_region_id'; print('DB Schema OK:', cols)"
   ```

2. **Verify 30x30 Grid Generation & Way Station Seeding**:
   ```pwsh
   python -c "from app.engine.world_gen import generate_region; grid=generate_region('southern_border_gu_yue', 30, 30); assert len(grid) == 900, f'Expected 900 tiles, got {len(grid)}'; ws=[t for t in grid if t.get('is_way_station')]; assert len(ws) >= 1, 'No Way Station found'; print('Grid 30x30 & Way Station OK. Tiles:', len(grid), 'WayStation:', ws[0]['x'], ws[0]['y'])"
   ```

3. **Verify Movement Boundary Clamping & Travel API**:
   Start backend with `uvicorn app.main:app --port 8001` and run tests:
   - Test invalid movement beyond bounds (`dx=-20, dy=-20` when at `[0,0]`) -> Expects HTTP 400.
   - Test valid travel `POST /api/v1/world/travel` with `{"target_region_id": "central_continent_spirit_affinity"}` -> Expects HTTP 200, 40 Stamina deducted, 100 Stones deducted, `current_region_id` updated, 900 tiles returned.
