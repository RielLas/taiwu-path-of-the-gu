using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using TaiwuGu.Core;
using TaiwuGu.Map;
using TaiwuGu.Psychology;

namespace TaiwuGu.Combat
{
    // ArenaEncounterType lives in Core/CombatTypes.cs so Core can use it
    // without a Combat reference.

    /// <summary>
    /// Module 4 & 5: Dedicated Tale of Immortal Battle Stage & Taiwu Verdict Bridge.
    /// Manages:
    /// - Smooth arena camera transition from overworld to isolated fighting stage at Y=200
    /// - Input subjugation (Law 2): 100% routed through TaiwuInputRouter via GameEventManager CQRS
    /// - Hotbar [1..4] Gu skills & Killer moves [Q, E, R]
    /// - Dynamic visual ground arena mesh centered at (0, 200, 0)
    /// - Halts time upon enemy defeat and transfers to Module 5 Taiwu Verdict Ledger!
    /// </summary>
    public class DedicatedBattleStage : MonoBehaviour
    {
        public const float ARENA_HALF_WIDTH = 12f;
        public const float ARENA_HALF_HEIGHT = 8f;

        [Header("Arena Configuration")]
        [SerializeField] private bool isArenaActive = false;
        private bool _wasActiveOnLayout = false;
        [SerializeField] private ArenaEncounterType encounterType = ArenaEncounterType.WildBoarHunt;
        private Vector2Int originGridPos;

        [Header("Combatant Parameters")]
        [SerializeField] private float playerMaxHP = 120f;
        [SerializeField] private float playerCurrentHP = 120f;
        [SerializeField] private float enemyMaxHP = 100f;
        [SerializeField] private float enemyCurrentHP = 100f;
        [SerializeField] private string enemyName = "Frenzied Razor Boar (狂暴野彘)";

        [Header("Movement & Dash")]
        [SerializeField] private float combatMoveSpeed = 5.5f;
        [SerializeField] private float dashCooldown = 1.8f;
        private float dashTimer = 0f;
        private bool isDashing = false;
        private Vector2 currentMoveIntent = Vector2.zero;

        // Visual transforms
        private GameObject stageRoot;
        private GameObject playerCombatToken;
        private GameObject enemyCombatToken;
        private GameObject arenaFloorVisual;

        private CombatLoadoutEngine loadoutEngine;
        private TaiwuVerdictEngine verdictEngine;
        private CultivatorData playerCultivator;
        private Camera mainCam;
        private Vector3 savedOverworldCamPos;

        public bool IsArenaActive => isArenaActive;
        public float PlayerHPRatio => Mathf.Clamp01(playerCurrentHP / playerMaxHP);
        public float EnemyHPRatio => Mathf.Clamp01(enemyCurrentHP / enemyMaxHP);
        public string EnemyName => enemyName;
        public float EnemyHP => enemyCurrentHP;

        public event Action<bool> OnCombatConcluded; // true if player won

        public Vector2 CurrentMoveIntent => currentMoveIntent;
        public Camera MainCamera => mainCam;

        private void Awake()
        {
            if (loadoutEngine == null) loadoutEngine = gameObject.AddComponent<CombatLoadoutEngine>();
            if (verdictEngine == null) verdictEngine = gameObject.AddComponent<TaiwuVerdictEngine>();
            if (mainCam == null) mainCam = Camera.main;
        }

        public void OnEnable()
        {
            GameEventManager.OnCombatMoveRequested += HandleCombatMove;
            GameEventManager.OnCombatDashRequested += HandleCombatDash;
            GameEventManager.OnCombatTriggerGuSlotRequested += HandleCombatTriggerGuSlot;
            GameEventManager.OnCombatTriggerKillerMoveRequested += HandleCombatTriggerKillerMove;
            GameEventManager.OnCombatAttackRequested += HandleCombatAttack;
            GameEventManager.OnCombatSecondaryAttackRequested += HandleCombatSecondaryAttack;
            GameEventManager.OnEnterCombatRequested += HandleEnterCombatRequested;
            GameEventManager.OnExitCombatRequested += HandleExitCombatRequested;
        }

        public void OnDisable()
        {
            GameEventManager.OnCombatMoveRequested -= HandleCombatMove;
            GameEventManager.OnCombatDashRequested -= HandleCombatDash;
            GameEventManager.OnCombatTriggerGuSlotRequested -= HandleCombatTriggerGuSlot;
            GameEventManager.OnCombatTriggerKillerMoveRequested -= HandleCombatTriggerKillerMove;
            GameEventManager.OnCombatAttackRequested -= HandleCombatAttack;
            GameEventManager.OnCombatSecondaryAttackRequested -= HandleCombatSecondaryAttack;
            GameEventManager.OnEnterCombatRequested -= HandleEnterCombatRequested;
            GameEventManager.OnExitCombatRequested -= HandleExitCombatRequested;
        }

        private void HandleCombatMove(Vector2 moveDir)
        {
            currentMoveIntent = moveDir;
        }

        private void HandleCombatDash(Vector2 dashDir)
        {
            if (isArenaActive && dashTimer <= 0f && !isDashing)
            {
                StartCoroutine(PerformDashRoutine(dashDir));
            }
        }

        private void HandleCombatTriggerGuSlot(int slotIndex)
        {
            if (isArenaActive)
            {
                TriggerGuSlot(slotIndex);
            }
        }

        private void HandleCombatTriggerKillerMove(int moveIndex)
        {
            if (isArenaActive)
            {
                TriggerKillerMove(moveIndex);
            }
        }

        private void HandleCombatAttack(Vector2 screenAimPos)
        {
            if (isArenaActive)
            {
                TriggerGuSlot(0);
            }
        }

        private void HandleCombatSecondaryAttack(Vector2 screenAimPos)
        {
            if (isArenaActive)
            {
                TriggerGuSlot(1);
            }
        }

        private void HandleEnterCombatRequested(ArenaEncounterType encounter, Vector2Int tilePos)
        {
            if (!isArenaActive)
            {
                // Pull the real cultivator + equipped Gu via the bootstrapper-published
                // Core resolvers; never enter with a null loadout (Law 4)
                CultivatorData cult = playerCultivator ?? CombatContextProvider.CultivatorResolver?.Invoke();
                List<GuWormData> gu = null;
                var resolved = CombatContextProvider.GuResolver?.Invoke();
                if (resolved != null) gu = new List<GuWormData>(resolved);
                if (cult == null)
                {
                    Debug.LogError("[DedicatedBattleStage] Cannot enter combat: no cultivator data resolved.");
                    return;
                }
                EnterBattleStage(cult, gu, encounter, tilePos);
            }
        }

        private void HandleExitCombatRequested()
        {
            if (isArenaActive)
            {
                ExitBattleStage();
            }
        }

        public void SetMainCamera(Camera cam)
        {
            mainCam = cam;
        }

        public void EnterBattleStage(CultivatorData cultivator, List<GuWormData> equippedGu, ArenaEncounterType encounter, Vector2Int tilePos = default, Camera targetCam = null)
        {
            if (targetCam != null) mainCam = targetCam;
            playerCultivator = cultivator;
            encounterType = encounter;
            originGridPos = tilePos;
            isArenaActive = true;
            currentMoveIntent = Vector2.zero;
            GameEventManager.TriggerBattleStageStateChanged(true);

            if (loadoutEngine == null) loadoutEngine = gameObject.AddComponent<CombatLoadoutEngine>();
            if (verdictEngine == null) verdictEngine = gameObject.AddComponent<TaiwuVerdictEngine>();

            loadoutEngine.BindCultivator(cultivator, equippedGu);

            // Configure enemy based on encounter
            switch (encounter)
            {
                case ArenaEncounterType.WildBoarHunt:
                    enemyName = "Frenzied Razor Boar (狂暴野彘)";
                    enemyMaxHP = 90f;
                    break;
                case ArenaEncounterType.ClanPatrolDuel:
                    enemyName = "Gu Yue Clan Enforcer (古月刑堂修士)";
                    enemyMaxHP = 140f;
                    break;
                case ArenaEncounterType.DemonicCultivator:
                    enemyName = "Desperate Demonic Rogue (亡命魔修)";
                    enemyMaxHP = 120f;
                    break;
            }
            enemyCurrentHP = enemyMaxHP;
            playerCurrentHP = playerMaxHP;

            // Save overworld camera position & snap to arena stage at isolated Y=200 coordinates
            if (mainCam == null) mainCam = Camera.main;
            if (mainCam != null)
            {
                savedOverworldCamPos = mainCam.transform.position;
                mainCam.transform.position = new Vector3(0f, 200f, -10f); // Isolated stage coords
                // Park the overworld follow controller: its LateUpdate + bounds clamp
                // would otherwise drag the camera straight back to the map every frame
                var overworldCam = mainCam.GetComponent<CameraIsometricController>();
                if (overworldCam != null) overworldCam.enabled = false;
            }

            BuildArenaGeometry();

            GameEventManager.TriggerCombatStarted(encounter, enemyName, enemyMaxHP);
        }

        private void BuildArenaGeometry()
        {
            if (stageRoot == null)
            {
                var existing = transform.Find("--- ARENA_STAGE_VISUALS ---");
                if (existing != null)
                {
                    stageRoot = existing.gameObject;
                }
                else
                {
                    stageRoot = new GameObject("--- ARENA_STAGE_VISUALS ---");
                    stageRoot.transform.SetParent(transform);
                    stageRoot.transform.position = new Vector3(0f, 200f, 0f); // Isolated coordinates at Y=200

                    // Arena Ground Floor (Dark Slate Arena Platform)
                    arenaFloorVisual = GameObject.CreatePrimitive(PrimitiveType.Quad);
                    arenaFloorVisual.name = "ArenaFloor";
                    arenaFloorVisual.transform.SetParent(stageRoot.transform);
                    arenaFloorVisual.transform.localPosition = new Vector3(0f, 0f, 0.5f);
                    arenaFloorVisual.transform.localScale = new Vector3(26f, 18f, 1f);
                    SetObjectColor(arenaFloorVisual, new Color32(0x18, 0x24, 0x22, 0xFF)); // Deep Slate

                    // Player Token
                    playerCombatToken = GameObject.CreatePrimitive(PrimitiveType.Quad);
                    playerCombatToken.name = "PlayerCombatToken";
                    playerCombatToken.transform.SetParent(stageRoot.transform);
                    playerCombatToken.transform.localPosition = new Vector3(-5f, 0f, 0f);
                    playerCombatToken.transform.localScale = new Vector3(1.2f, 1.2f, 1f);
                    SetObjectColor(playerCombatToken, new Color32(0x38, 0xBD, 0xF8, 0xFF)); // Azure blue

                    // Enemy Token
                    enemyCombatToken = GameObject.CreatePrimitive(PrimitiveType.Quad);
                    enemyCombatToken.name = "EnemyCombatToken";
                    enemyCombatToken.transform.SetParent(stageRoot.transform);
                    enemyCombatToken.transform.localPosition = new Vector3(5f, 0f, 0f);
                    enemyCombatToken.transform.localScale = new Vector3(1.4f, 1.4f, 1f);
                    SetObjectColor(enemyCombatToken, new Color32(0xEF, 0x44, 0x44, 0xFF)); // Crimson red
                }
            }

            stageRoot.SetActive(true);
        }

        private void SetObjectColor(GameObject obj, Color color)
        {
            var mr = obj.GetComponent<MeshRenderer>();
            if (mr != null)
            {
                Shader shader = Shader.Find("Universal Render Pipeline/2D/Sprite-Unlit-Default");
                if (shader == null) shader = Shader.Find("Sprites/Default");
                if (shader == null) shader = Shader.Find("Unlit/Color");
                mr.sharedMaterial = new Material(shader) { color = color };
            }
        }

        private void Update()
        {
            // If verdict modal is open, time is halted!
            if (!isArenaActive || (verdictEngine != null && verdictEngine.IsVerdictActive)) return;

            if (dashTimer > 0f) dashTimer -= Time.deltaTime;

            // Apply 360° WASD movement intent routed from TaiwuInputRouter (Law 2: Input Subjugation)
            if (!isDashing && currentMoveIntent.sqrMagnitude > 0.01f && playerCombatToken != null)
            {
                Vector3 delta = (Vector3)(currentMoveIntent.normalized * (combatMoveSpeed * Time.deltaTime));
                Vector3 newPos = playerCombatToken.transform.localPosition + delta;
                newPos.x = Mathf.Clamp(newPos.x, -ARENA_HALF_WIDTH, ARENA_HALF_WIDTH);
                newPos.y = Mathf.Clamp(newPos.y, -ARENA_HALF_HEIGHT, ARENA_HALF_HEIGHT);
                playerCombatToken.transform.localPosition = newPos;
            }

            UpdateEnemyAI();
        }

        private IEnumerator PerformDashRoutine(Vector2 dir)
        {
            isDashing = true;
            dashTimer = dashCooldown;
            if (dir.sqrMagnitude < 0.1f) dir = Vector2.right;

            float elapsed = 0f;
            float dashSpeed = combatMoveSpeed * 2.8f;
            while (elapsed < 0.20f)
            {
                elapsed += Time.deltaTime;
                Vector3 newPos = playerCombatToken.transform.localPosition + (Vector3)(dir * (dashSpeed * Time.deltaTime));
                newPos.x = Mathf.Clamp(newPos.x, -ARENA_HALF_WIDTH, ARENA_HALF_WIDTH);
                newPos.y = Mathf.Clamp(newPos.y, -ARENA_HALF_HEIGHT, ARENA_HALF_HEIGHT);
                playerCombatToken.transform.localPosition = newPos;
                yield return null;
            }
            isDashing = false;
        }

        private void TriggerGuSlot(int slotIndex)
        {
            if (loadoutEngine.TryActivateSlot(slotIndex, out float cost))
            {
                // Attack logic: Fire moonblade towards enemy
                Vector2 targetDir = (enemyCombatToken.transform.position - playerCombatToken.transform.position).normalized;
                
                float lightDmg = 25f; // Fallback
                if (loadoutEngine != null && loadoutEngine.BalanceDatabase != null && slotIndex >= 0 && slotIndex < loadoutEngine.HotbarGu.Length)
                {
                    var gu = loadoutEngine.HotbarGu[slotIndex];
                    if (gu != null && loadoutEngine.BalanceDatabase.TryGetEntry(gu.GuID, out var entry))
                    {
                        lightDmg = entry.lightDamage;
                    }
                }

                DamageEnemy(lightDmg);
                Debug.Log($"<color=#38bdf8>[Combat] Cast Gu in Slot {slotIndex + 1}! Drained {cost:F1}% Essence. Hit enemy for {lightDmg:F1} DMG!</color>");
            }
            else if (loadoutEngine.CanActivateSlot(slotIndex, out string reason))
            {
                // Reachable only on race (state changed between check and cast); ignore
            }
            else
            {
                Debug.LogWarning($"<color=#fbbf24>[Combat] Gu Slot {slotIndex + 1} blocked: {reason}</color>");
            }
        }

        private void TriggerKillerMove(int moveIndex)
        {
            if (moveIndex < 0 || moveIndex >= loadoutEngine.KillerMoves.Count) return;
            var km = loadoutEngine.KillerMoves[moveIndex];

            if (loadoutEngine.CanExecuteKillerMove(km, out string reason))
            {
                StartCoroutine(ExecuteKillerMoveRoutine(km));
            }
            else
            {
                Debug.LogWarning($"[Killer Move Locked] {reason}");
            }
        }

        private IEnumerator ExecuteKillerMoveRoutine(KillerMoveData km)
        {
            km.IsInStartup = true;
            km.StartupTimer = 0f;
            Debug.Log($"<color=#fbbf24>[KILLER MOVE INITIATED] {km.Name} windup frames active...</color>");

            yield return new WaitForSeconds(km.StartupFramesDuration);

            if (km.IsInStartup)
            {
                km.IsInStartup = false;
                km.CurrentCooldownTimer = km.Cooldown;

                float realCost = (float)(km.BaseEssenceCost / playerCultivator.GetCurrentDensity());
                playerCultivator.CurrentEssenceSea = Mathf.Max(0f, playerCultivator.CurrentEssenceSea - realCost);

                float killerDmg = km.Damage > 0.01f ? km.Damage : 65f;
                DamageEnemy(killerDmg);
                Debug.Log($"<color=#fbbf24><b>★ [KILLER MOVE HIT] {km.Name} Unleashed! Dealt {killerDmg:F1} Critical Lunar Fracture Damage!</b></color>");
            }
        }

        private void UpdateEnemyAI()
        {
            if (enemyCombatToken == null || playerCombatToken == null || enemyCurrentHP <= 0f) return;

            // Simple aggressive stalking
            Vector3 diff = playerCombatToken.transform.localPosition - enemyCombatToken.transform.localPosition;
            float dist = diff.magnitude;

            if (dist > 1.8f)
            {
                enemyCombatToken.transform.localPosition += diff.normalized * (2.8f * Time.deltaTime);
            }
            else
            {
                // In melee range: strike player periodically
                if (UnityEngine.Random.value < 0.025f)
                {
                    DamagePlayer(8f);
                }
            }
        }

        public void DamagePlayer(float dmg)
        {
            playerCurrentHP = Mathf.Max(0f, playerCurrentHP - dmg);
            Debug.LogWarning($"[Combat] Player took {dmg:F0} damage! HP: {playerCurrentHP}/{playerMaxHP}");

            if (playerCurrentHP <= 0f)
            {
                ConcludeCombat(playerWon: false);
            }
        }

        public void DamageEnemy(float dmg)
        {
            enemyCurrentHP = Mathf.Max(0f, enemyCurrentHP - dmg);

            if (enemyCurrentHP <= 0f)
            {
                ConcludeCombat(playerWon: true);
            }
        }

        private void ConcludeCombat(bool playerWon)
        {
            if (playerWon)
            {
                Debug.Log("<color=#34d399><b>★★★ [VICTORY] Enemy Cultivator Collapses to their Knees! ★★★</b></color>");

                DefeatedDisposition disp = encounterType switch
                {
                    ArenaEncounterType.ClanPatrolDuel => DefeatedDisposition.RighteousClan,
                    ArenaEncounterType.DemonicCultivator => DefeatedDisposition.DemonicRogue,
                    _ => DefeatedDisposition.WildBeast
                };

                if (disp == DefeatedDisposition.WildBeast)
                {
                    ExitBattleStage();
                    GameEventManager.TriggerCombatConcluded(true, originGridPos, enemyName, encounterType);
                    OnCombatConcluded?.Invoke(true);
                }
                else if (verdictEngine != null)
                {
                    verdictEngine.OpenVerdictModal(playerCultivator, enemyName, disp, originGridPos, (action, didDetonate) =>
                    {
                        ExitBattleStage();
                        GameEventManager.TriggerCombatConcluded(true, originGridPos, enemyName, encounterType);
                        OnCombatConcluded?.Invoke(true);
                    });
                }
                else
                {
                    ExitBattleStage();
                    GameEventManager.TriggerCombatConcluded(true, originGridPos, enemyName, encounterType);
                    OnCombatConcluded?.Invoke(true);
                }
            }
            else
            {
                Debug.LogError("<color=#ef4444><b>[DEFEAT] Cultivator sustained critical injuries and retreated to camp!</b></color>");
                ExitBattleStage();
                GameEventManager.TriggerCombatConcluded(false, originGridPos, enemyName, encounterType);
                OnCombatConcluded?.Invoke(false);
            }
        }

        public void ExitBattleStage()
        {
            if (stageRoot != null)
            {
                stageRoot.SetActive(false);
            }

            // Restore overworld camera
            if (mainCam != null)
            {
                mainCam.transform.position = savedOverworldCamPos;
                var overworldCam = mainCam.GetComponent<CameraIsometricController>();
                if (overworldCam != null) overworldCam.enabled = true;
            }
            isArenaActive = false;
            currentMoveIntent = Vector2.zero;
            GameEventManager.TriggerBattleStageStateChanged(false);
        }

        private void OnGUI()
        {
            if (Event.current.type == EventType.Layout)
            {
                _wasActiveOnLayout = isArenaActive;
            }

            if (!_wasActiveOnLayout) return;

            // Responsive Mobile UI Matrix Scaling
            Matrix4x4 prevMatrix = GUI.matrix;
            float refHeight = 640f;
            float scale = Mathf.Clamp(Mathf.Max(1.0f, Screen.height / refHeight), 1.0f, 2.2f);
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1.0f));

            float virtualW = Screen.width / scale;
            float virtualH = Screen.height / scale;

            // Combat Top HUD: Player & Enemy Health Bars
            float bannerWidth = Mathf.Min(620f, virtualW - 30f);
            Rect hudRect = new Rect((virtualW - bannerWidth) * 0.5f, 15f, bannerWidth, 68f);

            GUI.backgroundColor = new Color32(0x11, 0x1A, 0x19, 0xF4);
            GUI.Box(hudRect, GUIContent.none);

            GUILayout.BeginArea(hudRect);
            GUILayout.Space(6);

            // Player Bar
            GUILayout.BeginHorizontal();
            GUILayout.Space(12);
            GUILayout.Label($"<b>Fang Yuan</b>: {playerCurrentHP:F0}/{playerMaxHP:F0} HP", GUILayout.Width(180));
            Rect pBar = GUILayoutUtility.GetRect(160, 14);
            GUI.color = Color.gray; GUI.DrawTexture(pBar, Texture2D.whiteTexture);
            GUI.color = new Color32(0x38, 0xBD, 0xF8, 0xFF);
            GUI.DrawTexture(new Rect(pBar.x, pBar.y, pBar.width * PlayerHPRatio, pBar.height), Texture2D.whiteTexture);

            GUILayout.Space(20);

            // Enemy Bar
            GUILayout.Label($"<b>{enemyName}</b>: {enemyCurrentHP:F0}/{enemyMaxHP:F0}", GUILayout.Width(220));
            Rect eBar = GUILayoutUtility.GetRect(160, 14);
            GUI.color = Color.gray; GUI.DrawTexture(eBar, Texture2D.whiteTexture);
            GUI.color = new Color32(0xEF, 0x44, 0x44, 0xFF);
            GUI.DrawTexture(new Rect(eBar.x, eBar.y, eBar.width * EnemyHPRatio, eBar.height), Texture2D.whiteTexture);
            GUILayout.EndHorizontal();

            GUILayout.Space(6);

            // Essence Sea Gauge & Dash indicator
            GUILayout.BeginHorizontal();
            GUILayout.Space(12);
            string dashStatus = dashTimer <= 0f ? "<color=#34d399>[Space] Dash READY</color>" : $"<color=#f87171>Dash ({dashTimer:F1}s)</color>";
            float seaVal = playerCultivator != null ? playerCultivator.CurrentEssenceSea : 44f;
            GUILayout.Label($"Essence: <b>{seaVal:F1}%</b> | {dashStatus}", GUILayout.Width(350));
            GUILayout.Label("Skills: [1..4] Gu Worms | [Q, E, R] Killer Moves", GUILayout.Width(250));
            GUILayout.EndHorizontal();

            GUILayout.EndArea();

            // Floating Hotbar at Bottom
            if (loadoutEngine != null && loadoutEngine.KillerMoves != null && loadoutEngine.KillerMoves.Count > 0)
            {
                float hotbarWidth = Mathf.Min(480f, virtualW - 30f);
                Rect bottomRect = new Rect((virtualW - hotbarWidth) * 0.5f, virtualH - 45f, hotbarWidth, 38f);
                GUI.Box(bottomRect, GUIContent.none);

                GUILayout.BeginArea(bottomRect);
                GUILayout.BeginHorizontal();
                GUILayout.Space(8);
                GUILayout.Label("<b>Hotbar:</b>", GUILayout.Width(60));
                var moves = loadoutEngine.KillerMoves;
                for (int i = 0; i < moves.Count; i++)
                {
                    var km = moves[i];
                    string cd = km.CurrentCooldownTimer > 0f ? $"({km.CurrentCooldownTimer:F1}s)" : "RDY";
                    GUILayout.Label($"[{km.Hotkey}] {km.Name} {cd}", GUILayout.Width(130));
                }
                GUILayout.EndHorizontal();
                GUILayout.EndArea();
            }

            GUI.matrix = prevMatrix;
        }
    }
}
