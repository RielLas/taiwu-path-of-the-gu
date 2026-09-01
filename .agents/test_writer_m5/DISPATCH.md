## 2026-09-01T13:14:21Z
You are test_writer_m5.
Working directory: D:\Wonderland Discord\Bot\Taiwu Path of the Gu\.agents\test_writer_m5
Original Request: D:\Wonderland Discord\Bot\Taiwu Path of the Gu\.agents\ORIGINAL_REQUEST.md
Project Spec: D:\Wonderland Discord\Bot\Taiwu Path of the Gu\PROJECT.md
Test Infra Spec: D:\Wonderland Discord\Bot\Taiwu Path of the Gu\TEST_INFRA.md
Parent conversation ID: 38e300b2-5b89-43e1-8d54-090f49addde0

Your task is to author the comprehensive 5-Tier test suite in `backend/tests/` according to `PROJECT.md` and `TEST_INFRA.md`.
Exclusively own: `backend/pytest.ini`, `backend/tests/**`.

Deliverables:
1. `backend/pytest.ini` configuring `pythonpath = backend` and test discovery.
2. `backend/tests/conftest.py` with:
   - `isolate_test_db` autouse fixture creating a fresh temporary SQLite DB for tests so `taiwu_local.db` is never polluted.
   - `client` fixture using `fastapi.testclient.TestClient(app)`.
3. `backend/tests/test_world_bounds.py` (Tier 1 & Tier 2):
   - 30x30 grid size (900 tiles), `[0..29, 0..29]` coordinate bounds.
   - Boundary enforcement rejecting negative coordinates (`[-1, 0]`, `[0, -1]`) and overflow coordinates (`[30, 0]`, `[0, 30]`, `[30, 30]`) with HTTP 400.
   - Valid boundary moves at corners `[0, 0]`, `[29, 29]`, `[0, 29]`, `[29, 0]`.
4. `backend/tests/test_travel_api.py` (Tier 1 & Tier 2):
   - `POST /api/v1/world/travel` happy path across Five Regions with toll deduction (40 Stamina + 100 Spirit Stones), coordinate reset to `[15, 15]`, and returned 900-tile grid.
   - Error cases: Insufficient stamina (< 40) -> HTTP 400; Insufficient spirit stones (< 100) -> HTTP 400; Unknown region ID -> HTTP 400; Travelling to current region -> HTTP 400.
5. `backend/tests/test_persistence.py` (Tier 1 & Tier 2):
   - `current_region_id` column persistence in SQLite DB across server reload / `load_from_db()`.
   - Migration test verifying schema handles missing `current_region_id` gracefully.
6. `backend/tests/test_cross_feature.py` (Tier 3):
   - Step sequence: Move to Way Station `[15, 15]` -> Invoke Travel to another region -> Verify location `[15, 15]`, new region ID, tolls deducted -> Move within new region -> Verify persistence.
7. `backend/tests/test_cultivator_journey.py` (Tier 4):
   - Cultivator completing a grand tour across all 5 macro-regions: Southern Border -> Central Continent -> Western Desert -> Northern Plains -> Eastern Sea -> Southern Border.
   - Tracking stamina consumption, stones depletion, and coordinate resets.
8. `backend/tests/test_adversarial.py` (Tier 5):
   - Fuzzing invalid JSON payloads, SQL injection strings in `target_region_id`, extreme coordinate steps, rapid successive travel requests.

Write all test files, ensure `python -m pytest backend/tests -v` runs, write `handoff.md` and report back to parent (ID: 38e300b2-5b89-43e1-8d54-090f49addde0).
