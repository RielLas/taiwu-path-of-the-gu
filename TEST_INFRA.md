# E2E Test Infra: Taiwu Instance-Based Architecture

## Test Philosophy
- Requirement-driven and opaque-box for Tiers 1-4.
- In-memory SQLite isolation for backend test repeatability (`tmp_path` fixture in `conftest.py`).
- Deterministic seed verification for 30x30 procedural world generation.
- Adversarial and stress testing in Tier 5.

---

## Feature Inventory Mapping
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|--------|:------:|:------:|:------:|:------:|
| F1 | Five Macro-Regions Dictionary | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F2 | Finite 30x30 Micro-Grid Engine | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F3 | Database Region Persistence | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F4 | Movement Boundary Clamping | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F5 | NPC Enforcer 30x30 Bounds | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F6 | Way Station POI Node Seeding | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F7 | Inter-Regional Travel API | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F8 | Bounded 30x30 Viewport Renderer | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F9 | Viewport Panning & Zooming | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F10 | WayStationModal Component | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| F11 | Geographic Instance Header | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |

---

## Test Architecture & Directory Layout

```
backend/
├── pytest.ini
├── tests/
│   ├── conftest.py                   # DB isolation & TestClient fixtures
│   ├── test_world_bounds.py          # Tier 1 & 2: 30x30 grid, boundary enforcement
│   ├── test_travel_api.py            # Tier 1 & 2: POST /travel endpoint, tolls, validation
│   ├── test_persistence.py           # Tier 1 & 2: SQLite DB migration & session reload
│   ├── test_cross_feature.py         # Tier 3: Movement -> Way station -> Travel -> Persistence
│   ├── test_cultivator_journey.py    # Tier 4: Multi-region trade journey across 5 regions
│   └── test_adversarial.py           # Tier 5: Boundary exploits, invalid payloads, state desync
```

---

## Test Execution Commands
1. **Backend Tests**:
   `python -m pytest backend/tests -v`
2. **Frontend Linter**:
   `cd frontend && npm run lint`
3. **Frontend TypeScript & Production Build**:
   `cd frontend && npm run build`
