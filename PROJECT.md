# Project: Taiwu Instance-Based Architecture

## Architecture
The 'Taiwu Instance-Based Architecture' refactors the overworld from an unconstrained / 15x15 map into isolated, finite 30x30 regional grid instances (`[0..29, 0..29]`, 900 tiles each) across the canonical Five Regions. Inter-regional transit is handled through dedicated Way Station / Caravan POI nodes with economic tolls (40 Stamina and 100 Primeval Stones).

### Data Flow & Component Model
1. **Backend Engine**:
   - `backend/app/engine/world_gen.py`: Macro-Regions dictionary, 30x30 procedural grid generator with deterministic MD5 seed hashing, Way Station POI placement at `[15, 15]`.
   - `backend/app/core/db.py`: SQLite persistence in `taiwu_local.db` with `current_region_id` column migration.
   - `backend/app/engine/cultivator.py`: `CultivatorState` managing `current_region_id`, `player_pos`, stamina, spirit stones, and DB serialization/deserialization.
   - `backend/app/api/v1/world.py`: REST routes for `POST /api/v1/world/move` (with `0 <= x, y <= 29` boundary clamping) and `POST /api/v1/world/travel` (inter-regional caravan router).
   - `backend/app/engine/npc.py`: Enforcer manager updated for 30x30 coordinate bounds.
2. **Frontend Viewport & State**:
   - `frontend/src/hooks/useWorldStore.ts`: Zustand store tracking `currentRegionId`, `currentRegionName`, 30x30 `grid`, `playerLocation`, `activePOI`, and `travelRegionalCaravan()`.
   - `frontend/src/components/map/MapGrid.tsx`: 2.5D Isometric 30x30 finite grid renderer with atmospheric void fog / boundary borders, smooth zoom/pan via `react-zoom-pan-pinch`, and Way Station POI tile interactions.
   - `frontend/src/components/map/WayStationModal.tsx`: Five Regions modal selector with toll breakdown (40 Stamina, 100 Stones) and caravan transit trigger.
   - `frontend/src/components/ui/TaiwuHUD.tsx`: HUD instance header displaying active regional sector (e.g., "Southern Border 📍 Gu Yue Sector Grid").

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Five Macro-Regions Dictionary | Define canonical 5 Macro-Regions across the Five Regions | M1 | ORIGINAL_REQUEST §R1 |
| F2 | Finite 30x30 Micro-Grid Engine | Deterministic 30x30 grid generator (`[0..29, 0..29]`, 900 tiles) with string MD5 hashing and entry at `[15, 15]` | M1 | ORIGINAL_REQUEST §R1 |
| F3 | Database Region Persistence | Add `current_region_id` column to `cultivator_state` with migration and restore on reload | M1 | ORIGINAL_REQUEST §R1 |
| F4 | Movement Coordinate Boundary Enforcement | Strict boundary validation in `/api/v1/world/move` rejecting any coordinate $<0$ or $>29$ with HTTP 400 | M1 | ORIGINAL_REQUEST §R1 |
| F5 | NPC Enforcer 30x30 Grid Alignment | Update enforcer spawner and patrol matrix to respect 30x30 bounds | M1 | ORIGINAL_REQUEST §R1 |
| F6 | Way Station POI Node Seeding | Seed `way_station` / `caravan` POI at `[15, 15]` in every regional instance | M2 | ORIGINAL_REQUEST §R2 |
| F7 | Inter-Regional Travel API | `POST /api/v1/world/travel` with validation, economic toll deduction (40 Stamina + 100 Stones), coords reset to `[15, 15]`, atomic persistence | M2 | ORIGINAL_REQUEST §R2 |
| F8 | Bounded 30x30 Viewport Renderer | Render 30x30 grid with 30 columns, boundary edge frames, and atmospheric void fog | M3 | ORIGINAL_REQUEST §R3 |
| F9 | Viewport Panning, Zooming & Clamping | Smooth camera navigation with zoom/pan and coordinate boundary clamping in MapGrid | M3 | ORIGINAL_REQUEST §R3 |
| F10 | WayStationModal Component | Stylized Five Regions macro-selector modal with cost display and "Travel Caravan" action | M4 | ORIGINAL_REQUEST §R4 |
| F11 | Geographic Instance Header in HUD | Update `TaiwuHUD.tsx` and top bar to display active instance name and region | M4 | ORIGINAL_REQUEST §R4 |
| F12 | Comprehensive 5-Tier Test Suite | Automated pytest suite (Tiers 1-5) and frontend build verification | M5 | ORIGINAL_REQUEST §Quality |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Regional Instances & 30x30 Grid | F1, F2, F3, F4, F5: Macro-regions, 30x30 generator, DB migration, move bounds checking, NPC bounds | none | PLANNED |
| M2 | Way Station Router & Inter-Regional Travel API | F6, F7: Way station seeding, `POST /api/v1/world/travel` endpoint with tolls and persistence | M1 | PLANNED |
| M3 | Bounded Viewport 30x30 Grid Renderer | F8, F9: 30x30 isometric grid layout, atmospheric void fog, edge termination, camera clamping | M1 | PLANNED |
| M4 | Regional Travel UI & Geographic Instance Header | F10, F11: `WayStationModal.tsx`, `useWorldStore.ts` travel actions, `TaiwuHUD.tsx` instance header | M2, M3 | PLANNED |
| M5 | Full Verification & E2E Test Hardening | F12: Tiers 1-5 pytest execution, frontend lint/build verification | M1, M2, M3, M4 | PLANNED |

---

## Interface Contracts

### 1. Macro-Regions Dictionary
```python
MACRO_REGIONS = {
    "southern_border_gu_yue": {
        "id": "southern_border_gu_yue",
        "name": "Gu Yue Sector",
        "region": "Southern Border",
        "full_name": "Southern Border: Gu Yue Sector",
        "theme": "mountain_bamboo",
        "description": "Ancient karst mountains cloaked in spirit mist and ancestral Gu Yue bamboo groves."
    },
    "central_continent_spirit_affinity": {
        "id": "central_continent_spirit_affinity",
        "name": "Spirit Affinity Sector",
        "region": "Central Continent",
        "full_name": "Central Continent: Spirit Affinity Sector",
        "theme": "immortal_lakes",
        "description": "Glistening spirit lakes and towering sect pavilions radiating profound immortal qi."
    },
    "western_desert_thousand_li": {
        "id": "western_desert_thousand_li",
        "name": "Thousand Li Dunes",
        "region": "Western Desert",
        "full_name": "Western Desert: Thousand Li Dunes",
        "theme": "desert_oasis",
        "description": "Endless golden sand dunes punctuated by oasis trade hubs and scorching heat."
    },
    "northern_plains_ge_tribe": {
        "id": "northern_plains_ge_tribe",
        "name": "Ge Tribe Grassland",
        "region": "Northern Plains",
        "full_name": "Northern Plains: Ge Tribe Grassland",
        "theme": "plains_camps",
        "description": "Vast tempestuous grasslands home to nomadic heroic clans and wolf pack hunting grounds."
    },
    "eastern_sea_blue_wave": {
        "id": "eastern_sea_blue_wave",
        "name": "Blue Wave Archipelago",
        "region": "Eastern Sea",
        "full_name": "Eastern Sea: Blue Wave Archipelago",
        "theme": "sea_islands",
        "description": "Azure archipelagos, undersea coral reefs, and bustling maritime merchant ports."
    }
}
```

### 2. `POST /api/v1/world/travel`
- **Request Body**:
  ```json
  {
    "target_region_id": "central_continent_spirit_affinity"
  }
  ```
- **Validation Rules**:
  1. `target_region_id` must exist in `MACRO_REGIONS`.
  2. `target_region_id` must != `current_region_id`.
  3. `player_cultivator.stamina >= 40` (else HTTP 400 "Insufficient stamina. Required: 40").
  4. `player_cultivator.spirit_stones >= 100` (else HTTP 400 "Insufficient primeval stones. Required: 100").
- **Response Body (HTTP 200)**:
  ```json
  {
    "message": "Caravan safely arrived at Central Continent: Spirit Affinity Sector",
    "current_region_id": "central_continent_spirit_affinity",
    "region_name": "Central Continent: Spirit Affinity Sector",
    "player_pos": [15, 15],
    "stamina": 60,
    "spirit_stones": 900,
    "grid": [... 900 tiles ...],
    "cultivator": { ... full cultivator state ... }
  }
  ```

### 3. `POST /api/v1/world/move` Boundary Contract
- **Validation Rules**:
  - `step_x = dx`, `step_y = dy`
  - `new_x = player_pos[0] + step_x`, `new_y = player_pos[1] + step_y`
  - If `new_x < 0 or new_x > 29 or new_y < 0 or new_y > 29`:
    Raise HTTP 400: `{"detail": "Cannot traverse beyond regional boundary [0..29, 0..29]"}`

---

## Code Layout

### Backend
- `backend/app/core/db.py`: SQLite schema migration (`current_region_id`)
- `backend/app/engine/cultivator.py`: Cultivator state management, stamina/stone deduction, DB load/save
- `backend/app/engine/world_gen.py`: 30x30 grid generator, Macro-Regions definition, Way Station POI seeding
- `backend/app/engine/npc.py`: Enforcer 30x30 coordinate bounds
- `backend/app/api/v1/world.py`: `/move` bounds checking and `POST /travel` inter-regional router
- `backend/tests/`: Pytest suite (Tiers 1-5)

### Frontend
- `frontend/src/hooks/useWorldStore.ts`: Regional state, current region tracking, `travelRegionalCaravan()`
- `frontend/src/components/map/MapGrid.tsx`: 30x30 2.5D isometric renderer, atmospheric void styling, way station tile badges
- `frontend/src/components/map/WayStationModal.tsx`: Caravan travel modal with 5 regions selection and toll verification
- `frontend/src/components/ui/TaiwuHUD.tsx`: Active region and instance name header
