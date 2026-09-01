# Frontend Codebase Survey & Architectural Plan: Taiwu Instance-Based Architecture

**Investigator**: Frontend Survey Explorer Subagent  
**Working Directory**: `D:\Wonderland Discord\Bot\Taiwu Path of the Gu\.agents\explorer_survey_frontend`  
**Date**: 2026-09-01  
**Target Goal**: Map the frontend codebase and design the frontend implementation for the 'Taiwu Instance-Based Architecture' refactor (30x30 Finite Micro-Grids, Five Regions Regional Instances, Way Station POIs, and Transit UI).

---

## Executive Summary

The frontend is a modern **React 19 + TypeScript + Vite 8 + Tailwind CSS v4** single-page application using **Zustand v5** for centralized state management and **react-zoom-pan-pinch** with **CSS 3D / 2.5D Isometric transformations** for overworld exploration.

Currently, overworld movement takes place on a 15x15 sector grid loaded via `MapGrid.tsx` and macro navigation via `OverworldModal.tsx` / `OverworldMap.tsx`. The proposed refactor establishes **isolated, finite 30x30 regional grid instances (`[0..29, 0..29]`)** across the Five Regions, connected via **Way Station / Caravan POI routers** (`WayStationModal.tsx`), **`POST /api/v1/world/travel`** tolls (40 Stamina + 100 Primeval Stones), and a persistent **Geographic Instance Header in `TaiwuHUD.tsx`** (e.g., *"Southern Border 📍 Gu Yue Sector Grid"*).

---

## 1. Frontend Framework, Directory Structure & Build System

### 1.1 Tech Stack & Tooling
* **Core Framework**: React `^19.2.8` + React-DOM `^19.2.8`
* **Build Tool**: Vite `^8.2.2` with `@vitejs/plugin-react` `^6.1.0`
* **Language & Type System**: TypeScript `~6.0.2`
* **Styling**: Tailwind CSS `^4.3.3` (`@tailwindcss/vite` & `@tailwindcss/postcss`) with custom CSS variables in `src/index.css` (parchment, ink, jade, crimson, gold color palette, glassmorphism utilities, combat shake, and floating damage numbers).
* **Viewport & Camera Library**: `react-zoom-pan-pinch` `^4.0.4`
* **State Management**: Zustand `^5.0.15`
* **Linter**: Oxlint `^1.79.0`

### 1.2 Package Scripts
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "oxlint",
  "preview": "vite preview"
}
```
*Build Verification*: Verified with `npm run build` — compiles cleanly in 1.07s producing zero type errors.

### 1.3 Directory Structure
```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── public/
│   ├── favicon.svg
│   ├── gu_world_map.jpg
│   └── icons.svg
└── src/
    ├── App.css
    ├── App.tsx                    # Main app coordinator & tab switcher
    ├── index.css                  # Theme tokens, font definitions, glassmorphism, animations
    ├── main.tsx                   # React root mount
    ├── assets/
    │   ├── hero.png
    │   └── world_map.jpg
    ├── components/
    │   ├── aperture/
    │   │   ├── ApertureModal.tsx  # Aperture wall washing, feeding, primeval sea gauge
    │   │   └── GuVault.tsx        # Inactive Gu storage & loadout manager
    │   ├── combat/
    │   │   └── CombatArena.tsx    # Re-export of views/CombatArena.tsx
    │   ├── crucible/
    │   │   └── CrucibleModal.tsx  # Alchemy & crucible crafting
    │   ├── map/
    │   │   └── MapGrid.tsx        # 2.5D Isometric tile grid explorer & encounter modal
    │   ├── refinement/
    │   │   └── RefinementCauldron.tsx # Gu combination / synthesis
    │   ├── ui/
    │   │   └── TaiwuHUD.tsx       # Bottom HUD, character portrait, tabs, stamina/meditation
    │   ├── views/
    │   │   ├── AscensionChamber.tsx # Major rank breakthrough modal
    │   │   ├── CharacterLedger.tsx  # Scroll of Taiwu stats, karmic ledger, factions
    │   │   └── CombatArena.tsx      # Tactical turn-based battle overlay
    │   └── world/
    │       ├── OverworldMap.tsx   # 16:9 Chinese ink map view with regional nodes
    │       └── OverworldModal.tsx # Static/live 5-region selector & node browser
    ├── hooks/
    │   ├── useAudio.ts            # Procedural Web Audio API sound generator
    │   ├── useCombat.ts           # Tactical battle state machine
    │   ├── useCultivator.ts       # Cultivator stats, aperture, feeding, ascension, meditation
    │   ├── useVault.ts            # Gu vault loadout store
    │   └── useWorldStore.ts       # World grid, player position, enforcer, overworld nodes
    └── types/
        └── api.ts                 # TypeScript interfaces for backend DTOs & state
```

---

## 2. Overworld Grid Renderer Component & Viewport Mechanics

### 2.1 Component: `src/components/map/MapGrid.tsx`
`MapGrid.tsx` renders the local micro-grid where the player explores tiles in real-time.

### 2.2 Viewport & Camera Mechanics
* **Pan & Zoom Container**: Wrapped in `<TransformWrapper>` and `<TransformComponent>` from `react-zoom-pan-pinch`:
  ```tsx
  <TransformWrapper
    initialScale={0.8}
    minScale={0.5}
    maxScale={2.5}
    centerOnInit={true}
    limitToBounds={false}
    wheel={{ step: 0.08 }}
  >
  ```
* **2.5D Isometric Tilt Matrix**:
  The grid wrapper applies a persistent 3D isometric rotation:
  ```css
  transform: rotateX(60deg) rotateZ(-45deg);
  transform-style: preserve-3d;
  ```
* **Billboard Counter-Rotation**:
  Every entity/icon inside a tile (player `🚶`, enforcer `🗡️`, biome icons `⛰️`, `🏯`, `💎`) applies an inverse transformation to stand upright in 3D space:
  ```css
  transform: rotateZ(45deg) rotateX(-60deg);
  transform-origin: center center;
  ```

### 2.3 Tile & Entity Rendering
* **Current Grid Dimensions**: Currently styled as `gridTemplateColumns: repeat(15, minmax(0, 1fr))`.
* **Refactor Requirement for 30x30**:
  - Update grid columns to `gridTemplateColumns: repeat(30, minmax(0, 1fr))`.
  - Adjust tile dimensions for high density: `w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9` with `gap-1` or `gap-1.5`.
  - Increase the canvas minimum size in `TransformComponent`: `min-w-[1800px] min-h-[1600px]`.
* **Rendered Entities & Biomes**:
  - **Player**: `🚶` with bounce animation, golden halo (`ring-2 ring-[#c89b3c] shadow-[0_0_25px_rgba(200,155,60,0.9)] scale-110 z-30`).
  - **Righteous Enforcer**: `🗡️` with pulse animation, dynamic distance indicator, and floating health/stamina badge (`⚔️ Enforcer (⚡...)`).
  - **Biomes & POIs**: `BIOME_STYLES` dictionary mapping terrain keys to color gradients, icons, borders, and glowing aura.

---

## 3. Grid Boundary Rendering & Atmospheric Edge Termination

### 3.1 Current Boundary State
Currently, the 15x15 plane sits inside a dark wrapper with `bg-[#0a0907]/95 rounded-2xl border-2 border-[#2a2620] shadow-[0_0_80px_rgba(0,0,0,0.95)]`. Outside coordinates are simply unrendered.

### 3.2 Instance-Based Architecture Requirements (30x30 Bounds `[0..29, 0..29]`)
1. **Clean Edge Termination & Outer Frame**:
   - Wrap the 30x30 grid plane in a carved inkstone/gold-embossed celestial border:
     ```tsx
     <div
       className="relative p-6 bg-[#0a0907]/95 rounded-3xl border-4 border-[#c89b3c]/40 shadow-[0_0_120px_rgba(0,0,0,0.95)] ring-1 ring-[#c89b3c]/20"
       style={{
         display: 'grid',
         gridTemplateColumns: 'repeat(30, minmax(0, 1fr))',
         transformStyle: 'preserve-3d'
       }}
     >
     ```
2. **Primordial Void Sea & Atmospheric Edge Fog**:
   - Apply a radial gradient fog mask around the boundary perimeter:
     ```css
     /* Inset shadow & radial fog vignette simulating the Great Void beyond the regional boundary */
     box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.9), 0 0 100px rgba(0, 0, 0, 1);
     ```
   - Ambient background beyond the 30x30 plane: Drifting celestial mist/particles with `bg-[#070605]` and subtle ink wash textures.
3. **Coordinate Clamping**:
   - Strict bounds check on interaction:
     `0 <= targetX <= 29` and `0 <= targetY <= 29`.
   - Prevent any move execution or hover state outside this discrete matrix.

---

## 4. Player Movement Triggers & POI Interaction Handling

### 4.1 Movement Flow
1. **Tile Selection**: Player clicks an adjacent tile (`Math.abs(tile.x - playerLocation.x) <= 1 && Math.abs(tile.y - playerLocation.y) <= 1`).
2. **Move Invocation**: Calls `handleTravel(tile.x, tile.y)` in `MapGrid.tsx:91`.
3. **Store Execution**: `useWorldStore.travel(targetX, targetY)` dispatches `POST /api/v1/world/move` with payload `{ to_x, to_y }`.
4. **Backend State Update**:
   - Deducts 2 Stamina.
   - Updates player position `[new_x, new_y]`.
   - Reveals surrounding tiles (radius 1).
   - Righteous Enforcer pathfinding & interception check.
   - Gu hunger attrition (deducts 5 satiety).
   - Generates and returns tile encounter.
5. **Frontend State Synchronization**:
   - Store updates `grid`, `playerLocation`, and `enforcer`.
   - Syncs cultivator stamina, essence, and stones via `fetchAperture()`.

### 4.2 POI Encounter Handling
* Existing encounter types handled in `MapGrid.tsx:442`:
  - `faction`: Outpost Market Trade, Demonic Armed Extortion, or Hostile Sentinel Combat.
  - `wild_gu`: Rare Gu Sighting with "Subdue & Store".
  - `resource`: Fortuitous primeval stone vein harvest.
  - `combat`: Forced ambush or wild beast encounter.
* **New POI Type: `way_station` / `caravan`**:
  - When stepping onto a tile with `tile.type === 'way_station'` or `encounter?.type === 'way_station'`, intercept the encounter flow and trigger `WayStationModal.tsx`!

---

## 5. Existing HUD Components, Status Headers & Modals

### 5.1 `TaiwuHUD.tsx` (Bottom Navigation Shell)
* **Location**: `src/components/ui/TaiwuHUD.tsx`
* **Features**:
  - **Left Portrait**: Cultivator avatar, rank, title, and Aperture Status pill (`✨ Pristine` or `💀 Fractured`). Clicking opens the Character Ledger (`activeTab = 'Ledger'`).
  - **Tab Switcher**: Buttons for `World`, `Aperture`, `Refine`, `Ascend` (only rendered when peak stage), and `Ledger`.
  - **Center Primeval Sea Sphere**: Floating orb with dynamic liquid height (`cultivator.primeval_essence%`) and color corresponding to rank/stage.
  - **Bottom-Right Stamina Console**: Real-time Stamina meter (`⚡ stamina / max_stamina`) and `🧘 Meditate (-20 ⚡)` action button.
  - **Global Damage Alert**: Full-screen crimson vignette when HP < 30%.

### 5.2 Header & Status Indicators
* `MapGrid.tsx:231`: Floating top-left camera control bar:
  `Sector Grid (2.5D) • [{playerLocation.x}, {playerLocation.y}]`, Zoom In, Zoom Out, Reset Camera, Exit Node.
* `OverworldModal.tsx:129`: Title banner `"天下 • UNDER HEAVEN"`.
* `OverworldMap.tsx:39`: Header `"Five Great Regions of the Gu World"`.

### 5.3 HUD Realignment for Instance-Based Architecture
Update `TaiwuHUD.tsx` and `MapGrid.tsx` to feature an **Imperial Jade Instance Header**:
```tsx
{/* Regional Instance Header Badge */}
<div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-[#12100d]/90 backdrop-blur-md border border-[#c89b3c]/60 px-5 py-2 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
  <span className="text-sm">📍</span>
  <div className="flex flex-col items-center">
    <span className="text-xs font-serif font-bold text-amber-200 tracking-widest uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
      {currentRegionName || "Southern Border: Gu Yue Sector"}
    </span>
    <span className="text-[9px] font-sans font-semibold text-[#8a8275] tracking-wider">
      Isolated Instance Grid • Sector Coordinates: [{playerLocation.x}, {playerLocation.y}]
    </span>
  </div>
</div>
```

---

## 6. API Client Layer & State Management (Zustand)

### 6.1 `useWorldStore.ts` Structure & Enhancements
* **Current State**:
  - `regions: Region[]`
  - `overworldNodes: OverworldNode[]`
  - `grid: WorldNode[]`
  - `playerLocation: { x: number; y: number }`
  - `enforcer: RighteousEnforcer | null`
  - `isLoading: boolean`, `error: string | null`
* **Required Store Additions for Instance Architecture**:
  ```typescript
  interface WorldState {
    // Current Instance Metadata
    currentRegionId: string;       // e.g., 'southern_border_gu_yue'
    currentRegionName: string;     // e.g., 'Southern Border: Gu Yue Sector'
    
    // Finite 30x30 Matrix Grid
    grid: WorldNode[];
    playerLocation: { x: number; y: number };
    enforcer: RighteousEnforcer | null;
    
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchRegionalGrid: (regionId?: string) => Promise<void>;
    travelStep: (targetX: number, targetY: number) => Promise<{ encounter: Encounter | null; logs: string[] }>;
    travelRegionalCaravan: (targetRegionId: string) => Promise<{ success: boolean; message: string }>;
  }
  ```

### 6.2 New API Endpoint Integration: `POST /api/v1/world/travel`
* **Request Payload**:
  ```json
  {
    "target_region_id": "central_continent_spirit_affinity"
  }
  ```
* **Response Payload**:
  ```json
  {
    "success": true,
    "message": "Caravan arrived at Central Continent: Spirit Affinity Sector.",
    "current_region_id": "central_continent_spirit_affinity",
    "current_region_name": "Central Continent: Spirit Affinity Sector",
    "player_pos": [15, 15],
    "grid": [...], // 30x30 WorldNode array (900 tiles)
    "cultivator": { ... }, // Updated stamina (-40) and spirit stones (-100)
    "enforcer": null
  }
  ```

---

## 7. Concrete Design Specifications for New & Modified Components

### 7.1 `WayStationModal.tsx` Component Design
* **File Path**: `frontend/src/components/world/WayStationModal.tsx`
* **Purpose**: Mounts when stepping on a Way Station POI (`is_way_station` / `type === 'way_station'`). Provides the inter-regional transit router with Five Regions selection, toll validation, and caravan travel execution.
* **Macro-Regions Roster**:
  1. `southern_border_gu_yue`: *"Southern Border: Gu Yue Sector"* (Biome: Mountain & Venom Jungle)
  2. `central_continent_spirit_affinity`: *"Central Continent: Spirit Affinity Sector"* (Biome: Sacred Mountain & Spirit Spring)
  3. `western_desert_thousand_li`: *"Western Desert: Thousand Li Dunes"* (Biome: Sand Dunes & Ancient Obelisks)
  4. `northern_plains_ge_tribe`: *"Northern Plains: Ge Tribe Grassland"* (Biome: Steppes & Beast Camps)
  5. `eastern_sea_blue_wave`: *"Eastern Sea: Blue Wave Archipelago"* (Biome: Reefs & Coastal Islands)

* **UI Layout & Features**:
  1. **Header**: *"Gu World Way Station & Merchant Caravan"* (商队驿站 • 跨域行商).
  2. **Current Location Badge**: Displays current region name and coordinates `[X, Y]`.
  3. **Five Regions Macro-Selector**: Stylized cards/tiles with regional artwork, dominant biomes, and lore descriptions.
  4. **Travel Tolls Assessment Box**:
     - **Stamina Toll**: 40 ⚡ (Current: `{cultivator.stamina} / {cultivator.max_stamina}`)
     - **Primeval Stone Toll**: 100 💎 (Current: `{cultivator.spirit_stones}`)
     - Sufficiency validation: If `stamina < 40` or `spirit_stones < 100`, highlight the deficit in crimson.
  5. **Action Buttons**:
     - **"Embark via Caravan" (启程行商)**: Enabled only if distinct destination selected and tolls met.
     - **"Depart Station" (离开驿站)**: Closes modal and resumes local exploration.
  6. **Travel Execution**:
     - Calls `useWorldStore.travelRegionalCaravan(targetRegionId)`.
     - Triggers `playJadeClinkSound()` and brief ink-wash transition curtain.
     - Re-centers camera on entry point `[15, 15]`.
     - Syncs cultivator status.

### 7.2 `TaiwuHUD.tsx` Updates
* **Active Instance Indicator**: Add a prominent instance header pill at the top center of the exploration screen.
* **Cultivator Stones & Stamina Visibility**: Ensure current stones and stamina counters are clearly visible in both the HUD and the meditation console.

### 7.3 `MapGrid.tsx` Updates for 30x30 Finite Micro-Grid
* Update grid column definition to `gridTemplateColumns: repeat(30, minmax(0, 1fr))`.
* Scale down tile dimensions for optimal 30x30 viewport density: `w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9`.
* Add styling for `Way Station` / `Caravan Transit Hub` POI tiles (`icon: '🧳'`, gold pulsing border, high-visibility beacon).
* Add Way Station stepping detector to automatically open `WayStationModal`.
* Add coordinate bounds clamping `[0..29, 0..29]`.

---

## 8. Verification & Test Plan

1. **Static Typing & Compilation**:
   - Run `npm run build` in `frontend/` to ensure 0 TypeScript compilation errors.
2. **Viewport & Camera Integrity**:
   - Verify 30x30 grid renders all 900 tiles with zero layout overflow or canvas clipping.
   - Verify panning, zooming (scale 0.5 to 2.5), and camera reset operate smoothly.
3. **Movement & Clamping**:
   - Verify adjacent movement functions across `[0..29, 0..29]`.
   - Verify boundary tiles at `x = 0, x = 29, y = 0, y = 29` cannot navigate out of bounds.
4. **Way Station Router Interaction**:
   - Step onto a Way Station tile -> `WayStationModal` mounts.
   - Attempt travel with < 40 stamina or < 100 stones -> Button disabled with error warning.
   - Attempt travel with sufficient resources -> 40 stamina and 100 stones deducted, player arrives at destination instance at `[15, 15]`.
5. **HUD Instance Header**:
   - Verify HUD header accurately displays the active regional instance name (e.g., *"Southern Border 📍 Gu Yue Sector Grid"*).
