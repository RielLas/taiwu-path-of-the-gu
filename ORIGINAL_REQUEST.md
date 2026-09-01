# Original User Request

## Initial Request — 2026-09-01T12:45:50Z

Refactor the overworld architecture into the 'Taiwu Instance-Based Architecture', segmenting the Gu world into isolated, finite 30x30 regional grid instances connected via inter-regional Way Stations and Caravan transit routers with stamina and stone tolls.

Working directory: D:\Wonderland Discord\Bot\Taiwu Path of the Gu
Integrity mode: development

## Requirements

### R1. Backend Regional Instances & 30x30 Finite Micro-Grid
Define a dictionary of Macro-Regions across the Five Regions (e.g., `southern_border_gu_yue`: "Southern Border: Gu Yue Sector", `central_continent_spirit_affinity`: "Central Continent: Spirit Affinity Sector", `western_desert_thousand_li`: "Western Desert: Thousand Li Dunes", `northern_plains_ge_tribe`: "Northern Plains: Ge Tribe Grassland", `eastern_sea_blue_wave`: "Eastern Sea: Blue Wave Archipelago").
When generating or loading a region, establish a strictly bounded 30x30 coordinate matrix (`[0..29, 0..29]`). Prevent player and entity coordinates from exceeding `[0, 29]`. Persist `current_region_id` in `taiwu_local.db`.

### R2. Way Station Router & Inter-Regional Travel API
Seed designated POI nodes on the 30x30 grid of type `way_station` / `caravan`.
Implement `POST /api/v1/world/travel` accepting `{ target_region_id: str }`.
Upon invocation:
- Validate that the target region exists and is distinct from the current region.
- Deduct required travel tolls (e.g., 40 Stamina and 100 Primeval Stones).
- Update player's `current_region_id` and reset coordinates to the new region's entry point `[15, 15]`.
- Persist state atomically to `taiwu_local.db` and return the new region's 30x30 grid data and updated cultivator status.

### R3. Bounded Viewport 30x30 Grid Renderer
Update the frontend grid renderer to strictly render the 30x30 bounds with clean edge termination, void borders, or atmospheric fog outside the `[0..29, 0..29]` coordinate space. Ensure smooth panning, zooming, and coordinate clamping.

### R4. Regional Travel UI & Geographic Instance Header
Create `WayStationModal.tsx` that opens when the player steps onto a Way Station / Caravan POI tile.
The modal displays a stylized Five Regions macro-selector with travel costs (Stamina + Stones) and a "Travel Caravan" action button.
Update `TaiwuHUD.tsx` to display the active isolated instance name (e.g., "Southern Border 📍 Gu Yue Sector Grid").

## Acceptance Criteria

### Instance Bounds & Grid Integrity
- [ ] Overworld grid coordinates are strictly bounded within 0 to 29 on both X and Y axes. Movement attempts beyond index 29 or below index 0 are rejected.
- [ ] Database schema stores `current_region_id` and restores the correct regional instance on reload.

### Travel Router & Economy Sinks
- [ ] `POST /api/v1/world/travel` verifies stamina >= 40 and stones >= 100, deducts them, and transitions the player to the target 30x30 instance.
- [ ] When stepping on a `way_station` tile, `WayStationModal.tsx` mounts displaying destination regional instances and travel tolls.

### UI & HUD Realignment
- [ ] HUD displays the active instance name and region clearly.
- [ ] Grid viewport renders the 30x30 grid with 0 layout crashes or coordinate overflow.
- [ ] Frontend builds cleanly with `npm run build` with 0 errors.
