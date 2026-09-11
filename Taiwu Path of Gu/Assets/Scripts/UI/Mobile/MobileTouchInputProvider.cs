using System;
using UnityEngine;
using UnityEngine.EventSystems;
using TaiwuGu.Core;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.Controls;
#endif

namespace TaiwuGu.UI.Mobile
{
    /// <summary>
    /// Enterprise Pluggable Mobile Input & On-Screen Touch Overlay.
    /// Provides responsive virtual controls for Android/iOS under Constitutional Law 2 (Input Subjugation).
    /// Emits identical abstract intents through GameEventManager with 0% impact on the standalone PC build.
    /// HALAL COMPLIANT: Uses geometric talisman discs, bronze rings, and Chinese calligraphy only.
    /// </summary>
    public class MobileTouchInputProvider : MonoBehaviour, ITaiwuInputProvider
    {
        private TaiwuInputRouter _router;
        private InputControlMode _currentMode = InputControlMode.Overworld;

        // --- Virtual Joystick (Combat) ---
        private Vector2 _joystickKnobPos = Vector2.zero;
        private bool _isJoystickActive = false;
        private Vector2 _currentMoveIntent = Vector2.zero;
        private const float JOYSTICK_RADIUS = 75f;
#if ENABLE_INPUT_SYSTEM
        private int _joystickTouchId = -1;
#else
        private int _joystickFingerId = -1;
#endif

        // --- Overworld Touch Drag & Pinch ---
        private Vector2 _lastTouchPanPos;
        private Vector2 _touchDownPos;
        private bool _isTouchPanning = false;
        private bool _touchExceededThreshold = false;
#if !ENABLE_INPUT_SYSTEM
        private int _panFingerId = -1;
#endif
        private float _lastPinchDistance = 0f;
        private const float TOUCH_DRAG_THRESHOLD = 14f;

        // --- Styles & Textures ---
        private Texture2D _texCircleBg;
        private Texture2D _texKnob;
        private Texture2D _texButtonBg;
        private GUIStyle _sealBtnStyle;
        private GUIStyle _combatBtnStyle;
        private GUIStyle _stickLabelStyle;
        private bool _stylesInitialized = false;

        public void Initialize(TaiwuInputRouter router)
        {
            _router = router;
            _isJoystickActive = false;
#if ENABLE_INPUT_SYSTEM
            _joystickTouchId = -1;
#else
            _joystickFingerId = -1;
#endif
            _joystickKnobPos = Vector2.zero;
            _isTouchPanning = false;
            _touchExceededThreshold = false;
            _currentMoveIntent = Vector2.zero;
            enabled = true;
        }

        public void Teardown()
        {
            _router = null;
            _isJoystickActive = false;
#if ENABLE_INPUT_SYSTEM
            _joystickTouchId = -1;
#else
            _joystickFingerId = -1;
#endif
            _joystickKnobPos = Vector2.zero;
            _isTouchPanning = false;
            _touchExceededThreshold = false;
            _currentMoveIntent = Vector2.zero;
            enabled = false;
        }

        public void Tick(InputControlMode mode)
        {
            _currentMode = mode;

            if (mode == InputControlMode.CombatArena)
            {
                TickCombatTouch();
            }
            else if (mode == InputControlMode.Overworld)
            {
                TickOverworldTouch();
            }
        }

        private void TickCombatTouch()
        {
            float refHeight = 640f;
            float scale = Mathf.Clamp(Mathf.Max(1.0f, Screen.height / refHeight), 1.0f, 2.2f);
            Vector2 screenCenter = new Vector2(110f * scale, 110f * scale);
            float maxRadius = JOYSTICK_RADIUS * scale;
            float grabRadius = maxRadius * 1.6f;

#if ENABLE_INPUT_SYSTEM
            var ts = Touchscreen.current;
            if (ts != null)
            {
                if (_joystickTouchId != -1)
                {
                    bool found = false;
                    for (int i = 0; i < ts.touches.Count; i++)
                    {
                        var tc = ts.touches[i];
                        if (tc.touchId.ReadValue() == _joystickTouchId)
                        {
                            found = true;
                            if (tc.press.isPressed)
                            {
                                UpdateJoystickFromScreenPos(tc.position.ReadValue(), screenCenter, maxRadius, scale);
                            }
                            else
                            {
                                ReleaseJoystick();
                            }
                            break;
                        }
                    }
                    if (!found)
                    {
                        ReleaseJoystick();
                    }
                }

                if (_joystickTouchId == -1)
                {
                    for (int i = 0; i < ts.touches.Count; i++)
                    {
                        var tc = ts.touches[i];
                        if (tc.press.wasPressedThisFrame || tc.press.isPressed)
                        {
                            Vector2 pos = tc.position.ReadValue();
                            if (IsInsideJoystickZone(pos, screenCenter, grabRadius))
                            {
                                _joystickTouchId = tc.touchId.ReadValue();
                                _isJoystickActive = true;
                                UpdateJoystickFromScreenPos(pos, screenCenter, maxRadius, scale);
                                break;
                            }
                        }
                    }
                }
            }

            // Fallback for Pointer.current (Unity Device Simulator pointer / mouse drag)
            if (!_isJoystickActive)
            {
                var ptr = Pointer.current;
                if (ptr != null && ptr.press.wasPressedThisFrame)
                {
                    Vector2 pos = ptr.position.ReadValue();
                    if (IsInsideJoystickZone(pos, screenCenter, grabRadius))
                    {
                        _isJoystickActive = true;
                        _joystickTouchId = -999;
                        UpdateJoystickFromScreenPos(pos, screenCenter, maxRadius, scale);
                    }
                }
            }
            else if (_joystickTouchId == -999)
            {
                var ptr = Pointer.current;
                if (ptr != null && ptr.press.isPressed)
                {
                    Vector2 pos = ptr.position.ReadValue();
                    UpdateJoystickFromScreenPos(pos, screenCenter, maxRadius, scale);
                }
                else
                {
                    ReleaseJoystick();
                }
            }
#else
            if (_joystickFingerId != -1)
            {
                bool found = false;
                for (int i = 0; i < Input.touchCount; i++)
                {
                    Touch t = Input.GetTouch(i);
                    if (t.fingerId == _joystickFingerId)
                    {
                        found = true;
                        if (t.phase != TouchPhase.Ended && t.phase != TouchPhase.Canceled)
                        {
                            UpdateJoystickFromScreenPos(t.position, screenCenter, maxRadius, scale);
                        }
                        else
                        {
                            ReleaseJoystick();
                        }
                        break;
                    }
                }
                if (!found) ReleaseJoystick();
            }

            if (!_isJoystickActive)
            {
                for (int i = 0; i < Input.touchCount; i++)
                {
                    Touch t = Input.GetTouch(i);
                    if (t.phase == TouchPhase.Began && IsInsideJoystickZone(t.position, screenCenter, grabRadius))
                    {
                        _joystickFingerId = t.fingerId;
                        _isJoystickActive = true;
                        UpdateJoystickFromScreenPos(t.position, screenCenter, maxRadius, scale);
                        break;
                    }
                }

                if (!_isJoystickActive && Input.GetMouseButton(0))
                {
                    Vector2 mousePos = Input.mousePosition;
                    if (IsInsideJoystickZone(mousePos, screenCenter, grabRadius))
                    {
                        _isJoystickActive = true;
                        _joystickFingerId = -999;
                        UpdateJoystickFromScreenPos(mousePos, screenCenter, maxRadius, scale);
                    }
                }
            }
            else if (_joystickFingerId == -999)
            {
                if (Input.GetMouseButton(0))
                {
                    UpdateJoystickFromScreenPos(Input.mousePosition, screenCenter, maxRadius, scale);
                }
                else
                {
                    ReleaseJoystick();
                }
            }
#endif

            // Process continuous movement intent to Combat Stage
            if (_isJoystickActive && _currentMoveIntent.sqrMagnitude > 0.01f)
            {
                GameEventManager.RaiseRequestCombatMove(_currentMoveIntent);
            }
            else
            {
                GameEventManager.RaiseRequestCombatMove(Vector2.zero);
            }
        }

        private void TickOverworldTouch()
        {
            if (_router != null && _router.IsUIModalActive)
            {
                _isTouchPanning = false;
                _touchExceededThreshold = false;
                return;
            }

            bool overUI = (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject()) || GUIUtility.hotControl != 0;

#if ENABLE_INPUT_SYSTEM
            var ts = Touchscreen.current;
            if (ts != null)
            {
                // Multi-touch scan for pinch-zoom
                int pressedTouchCount = 0;
                Vector2 p0 = Vector2.zero;
                Vector2 p1 = Vector2.zero;

                for (int i = 0; i < ts.touches.Count; i++)
                {
                    var tc = ts.touches[i];
                    if (tc.press.isPressed)
                    {
                        if (pressedTouchCount == 0) p0 = tc.position.ReadValue();
                        else if (pressedTouchCount == 1) p1 = tc.position.ReadValue();
                        pressedTouchCount++;
                    }
                }

                if (pressedTouchCount >= 2)
                {
                    float dist = Vector2.Distance(p0, p1);
                    if (_lastPinchDistance > 0f)
                    {
                        float delta = (dist - _lastPinchDistance) * 0.01f;
                        if (Mathf.Abs(delta) > 0.005f)
                        {
                            GameEventManager.TriggerZoom(delta);
                        }
                    }
                    _lastPinchDistance = dist;
                    _isTouchPanning = false;
                    return;
                }
                else
                {
                    _lastPinchDistance = 0f;
                }

                // Single touch pan & tap
                var primary = ts.primaryTouch;
                if (primary.press.wasPressedThisFrame)
                {
                    Vector2 startPos = primary.position.ReadValue();
                    if (!overUI)
                    {
                        _isTouchPanning = true;
                        _touchDownPos = startPos;
                        _lastTouchPanPos = startPos;
                        _touchExceededThreshold = false;
                    }
                }
                else if (_isTouchPanning && primary.press.isPressed)
                {
                    Vector2 currentPos = primary.position.ReadValue();
                    float dist = Vector2.Distance(currentPos, _touchDownPos);
                    if (dist > TOUCH_DRAG_THRESHOLD)
                    {
                        _touchExceededThreshold = true;
                    }

                    if (_touchExceededThreshold)
                    {
                        Vector2 delta = currentPos - _lastTouchPanPos;
                        if (delta.sqrMagnitude > 0.001f)
                        {
                            GameEventManager.TriggerPan(delta);
                        }
                        _lastTouchPanPos = currentPos;
                    }
                }
                else if (_isTouchPanning && primary.press.wasReleasedThisFrame)
                {
                    Vector2 endPos = primary.position.ReadValue();
                    if (!_touchExceededThreshold && !overUI && !TaiwuTouchGUI.IsTapConsumed && (_router == null || !_router.IsUIModalActive))
                    {
                        GameEventManager.TriggerWorldClick(endPos);
                    }
                    _isTouchPanning = false;
                    _touchExceededThreshold = false;
                }
                else if (!primary.press.isPressed)
                {
                    _isTouchPanning = false;
                }
                return;
            }

            // Fallback for Pointer.current (e.g. Device Simulator / Stylus / Mouse simulation)
            var pointer = Pointer.current;
            if (pointer != null)
            {
                Vector2 currentPos = pointer.position.ReadValue();

                if (pointer.press.wasPressedThisFrame)
                {
                    if (!overUI)
                    {
                        _isTouchPanning = true;
                        _touchDownPos = currentPos;
                        _lastTouchPanPos = currentPos;
                        _touchExceededThreshold = false;
                    }
                }
                else if (_isTouchPanning && pointer.press.isPressed)
                {
                    float dist = Vector2.Distance(currentPos, _touchDownPos);
                    if (dist > TOUCH_DRAG_THRESHOLD)
                    {
                        _touchExceededThreshold = true;
                    }

                    if (_touchExceededThreshold)
                    {
                        Vector2 delta = currentPos - _lastTouchPanPos;
                        if (delta.sqrMagnitude > 0.001f)
                        {
                            GameEventManager.TriggerPan(delta);
                        }
                        _lastTouchPanPos = currentPos;
                    }
                }
                else if (_isTouchPanning && pointer.press.wasReleasedThisFrame)
                {
                    if (!_touchExceededThreshold && !overUI && !TaiwuTouchGUI.IsTapConsumed && (_router == null || !_router.IsUIModalActive))
                    {
                        GameEventManager.TriggerWorldClick(currentPos);
                    }
                    _isTouchPanning = false;
                    _touchExceededThreshold = false;
                }
                else if (!pointer.press.isPressed)
                {
                    _isTouchPanning = false;
                }
            }
#else
            // Legacy Input Manager fallback
            if (Input.touchCount >= 2)
            {
                Touch t0 = Input.GetTouch(0);
                Touch t1 = Input.GetTouch(1);

                float currentPinchDist = Vector2.Distance(t0.position, t1.position);
                if (_lastPinchDistance > 0f)
                {
                    float delta = (currentPinchDist - _lastPinchDistance) * 0.01f;
                    if (Mathf.Abs(delta) > 0.005f)
                    {
                        GameEventManager.TriggerZoom(delta);
                    }
                }
                _lastPinchDistance = currentPinchDist;
                _isTouchPanning = false;
                return;
            }
            else
            {
                _lastPinchDistance = 0f;
            }

            if (Input.touchCount == 1)
            {
                Touch t = Input.GetTouch(0);

                if (t.phase == TouchPhase.Began && !overUI)
                {
                    _isTouchPanning = true;
                    _panFingerId = t.fingerId;
                    _touchDownPos = t.position;
                    _lastTouchPanPos = t.position;
                    _touchExceededThreshold = false;
                }
                else if (t.fingerId == _panFingerId && (t.phase == TouchPhase.Moved || t.phase == TouchPhase.Stationary) && _isTouchPanning)
                {
                    if (Vector2.Distance(t.position, _touchDownPos) > TOUCH_DRAG_THRESHOLD)
                    {
                        _touchExceededThreshold = true;
                    }

                    if (_touchExceededThreshold)
                    {
                        Vector2 delta = t.position - _lastTouchPanPos;
                        if (delta.sqrMagnitude > 0.001f)
                        {
                            GameEventManager.TriggerPan(delta);
                        }
                        _lastTouchPanPos = t.position;
                    }
                }
                else if (t.fingerId == _panFingerId && (t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled))
                {
                    if (_isTouchPanning && !_touchExceededThreshold && !overUI)
                    {
                        GameEventManager.TriggerWorldClick(t.position);
                    }
                    _isTouchPanning = false;
                    _panFingerId = -1;
                }
            }
            else
            {
                _isTouchPanning = false;
                _panFingerId = -1;
            }
#endif
        }

        private void InitStyles()
        {
            if (_stylesInitialized) return;

            _texCircleBg = MakeDiscTexture(128, new Color32(0x0F, 0x17, 0x2A, 0xAA), new Color32(0xD4, 0xAF, 0x37, 0xCC));
            _texKnob = MakeDiscTexture(64, new Color32(0x10, 0xB9, 0x81, 0xDD), new Color32(0x34, 0xD3, 0x99, 0xFF));
            _texButtonBg = MakeDiscTexture(96, new Color32(0x1E, 0x29, 0x3B, 0xDD), new Color32(0xF5, 0x9E, 0x0B, 0xFF));

            _sealBtnStyle = new GUIStyle(GUI.skin.button)
            {
                fontSize = 15,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter
            };
            _sealBtnStyle.normal.textColor = new Color32(0xFB, 0xBF, 0x24, 0xFF); // Golden seal text

            _combatBtnStyle = new GUIStyle(GUI.skin.button)
            {
                fontSize = 15,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter
            };
            _combatBtnStyle.normal.textColor = Color.white;

            _stickLabelStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 12,
                alignment = TextAnchor.MiddleCenter
            };
            _stickLabelStyle.normal.textColor = new Color32(0x94, 0xA3, 0xB8, 0xCC);

            _stylesInitialized = true;
        }

        private void OnGUI()
        {
            InitStyles();

            // Responsive Mobile UI Matrix Scaling
            Matrix4x4 prevMatrix = GUI.matrix;
            float refHeight = 640f;
            float scale = Mathf.Max(1.0f, Screen.height / refHeight);
            scale = Mathf.Clamp(scale, 1.0f, 2.2f);
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1.0f));

            float virtualW = Screen.width / scale;
            float virtualH = Screen.height / scale;

            switch (_currentMode)
            {
                case InputControlMode.CombatArena:
                    DrawCombatTouchOverlay(virtualW, virtualH);
                    break;
                case InputControlMode.AlchemicalCauldron:
                    DrawCauldronTouchOverlay(virtualW, virtualH);
                    break;
                case InputControlMode.Overworld:
                default:
                    DrawOverworldTouchOverlay(virtualW, virtualH);
                    break;
            }

            GUI.matrix = prevMatrix;
        }

        private void DrawOverworldTouchOverlay(float virtualW, float virtualH)
        {
            // Floating Quick-Access Talismans on right side (below top HUD)
            float btnSize = 58f;
            float startX = virtualW - btnSize - 18f;
            float startY = 85f;
            float gap = 12f;

            GUI.backgroundColor = new Color32(0x1E, 0x29, 0x3B, 0xEE);

            // 【账】 Ledger Toggle
            if (TaiwuTouchGUI.Button(new Rect(startX, startY, btnSize, btnSize), "【账】\nLedger", _sealBtnStyle))
            {
                GameEventManager.TriggerLedgerToggle();
            }

            // 【鼎】 Cauldron Toggle
            if (TaiwuTouchGUI.Button(new Rect(startX, startY + (btnSize + gap), btnSize, btnSize), "【鼎】\nCauldron", _sealBtnStyle))
            {
                GameEventManager.RaiseRequestOpenCauldron();
            }

            // 【定】 Recenter Camera
            if (TaiwuTouchGUI.Button(new Rect(startX, startY + (btnSize + gap) * 2f, btnSize, btnSize), "【定】\nCenter", _sealBtnStyle))
            {
                GameEventManager.TriggerRecenterCamera();
            }
        }

        private void DrawCombatTouchOverlay(float virtualW, float virtualH)
        {
            // 1. Virtual Movement Stick (Bottom Left)
            float baseSize = JOYSTICK_RADIUS * 2f;
            float stickBaseX = 35f;
            float stickBaseY = virtualH - baseSize - 35f;
            Rect stickBaseRect = new Rect(stickBaseX, stickBaseY, baseSize, baseSize);

            Vector2 center = new Vector2(stickBaseX + JOYSTICK_RADIUS, stickBaseY + JOYSTICK_RADIUS);

            // Draw Base Ring
            GUI.DrawTexture(stickBaseRect, _texCircleBg);
            GUI.Label(new Rect(stickBaseX, stickBaseY + baseSize - 18f, baseSize, 20f), "【身法·挪移】", _stickLabelStyle);

            // Draw Knob
            Vector2 knobCenter = _isJoystickActive ? (center + _joystickKnobPos) : center;
            float knobSize = 52f;
            Rect knobRect = new Rect(knobCenter.x - knobSize * 0.5f, knobCenter.y - knobSize * 0.5f, knobSize, knobSize);
            GUI.DrawTexture(knobRect, _texKnob);

            // 2. Action Cluster (Bottom Right)
            float rightMargin = virtualW - 20f;
            float bottomMargin = virtualH - 20f;

            // Primary Attack (【击】) - Main action disc (bottom-right)
            GUI.backgroundColor = new Color32(0xDC, 0x26, 0x26, 0xEE); // Crimson
            if (TaiwuTouchGUI.Button(new Rect(rightMargin - 80f, bottomMargin - 80f, 75f, 75f), "【击】\nAttack", _combatBtnStyle))
            {
                GameEventManager.RaiseRequestCombatAttack(Vector2.zero);
            }

            // Secondary Attack (【斩】) - Left of Attack
            GUI.backgroundColor = new Color32(0xB9, 0x1C, 0x1C, 0xEE);
            if (TaiwuTouchGUI.Button(new Rect(rightMargin - 165f, bottomMargin - 80f, 75f, 75f), "【斩】\nStrike", _combatBtnStyle))
            {
                GameEventManager.RaiseRequestCombatSecondaryAttack(Vector2.zero);
            }

            // Dash / Dodge (【闪】) - Above Attack
            GUI.backgroundColor = new Color32(0x25, 0x63, 0xEB, 0xEE); // Azure
            if (TaiwuTouchGUI.Button(new Rect(rightMargin - 80f, bottomMargin - 165f, 75f, 75f), "【闪】\nDash", _combatBtnStyle))
            {
                Vector2 dashDir = _currentMoveIntent.sqrMagnitude > 0.01f ? _currentMoveIntent.normalized : Vector2.right;
                GameEventManager.RaiseRequestCombatDash(dashDir);
            }

            // Killer Move (【绝】) - Above Strike
            GUI.backgroundColor = new Color32(0x7C, 0x3A, 0xED, 0xEE); // Violet
            if (TaiwuTouchGUI.Button(new Rect(rightMargin - 165f, bottomMargin - 165f, 75f, 75f), "【绝】\nKiller", _combatBtnStyle))
            {
                GameEventManager.RaiseRequestCombatTriggerKillerMove(0);
            }

            // Gu Slot Hotbar (【壹】【贰】【叁】【肆】) - 2x2 grid to the left with 20px gap
            string[] guLabels = new string[] { "【壹】", "【贰】", "【叁】", "【肆】" };
            for (int i = 0; i < 4; i++)
            {
                GUI.backgroundColor = new Color32(0x05, 0x96, 0x69, 0xEE); // Emerald
                float colX = (i % 2 == 0) ? (rightMargin - 307f) : (rightMargin - 241f);
                float rowY = (i < 2) ? (bottomMargin - 150f) : (bottomMargin - 80f);
                if (TaiwuTouchGUI.Button(new Rect(colX, rowY, 56f, 56f), guLabels[i], _combatBtnStyle))
                {
                    GameEventManager.RaiseRequestCombatTriggerGuSlot(i);
                }
            }

            // Top-Right Flee / Escape (【退】)
            GUI.backgroundColor = new Color32(0x47, 0x55, 0x69, 0xEE);
            if (TaiwuTouchGUI.Button(new Rect(virtualW - 105f, 20f, 85f, 38f), "【退】Exit", _combatBtnStyle))
            {
                GameEventManager.TriggerEscape();
            }
        }

        private void DrawCauldronTouchOverlay(float virtualW, float virtualH)
        {
            // Bottom Alchemical Refinement Console
            float barWidth = Mathf.Min(740f, virtualW * 0.94f);
            float barHeight = 65f;
            float barX = (virtualW - barWidth) * 0.5f;
            float barY = virtualH - barHeight - 15f;

            GUILayout.BeginArea(new Rect(barX, barY, barWidth, barHeight));
            GUILayout.BeginHorizontal();

            GUI.backgroundColor = new Color32(0xEA, 0x58, 0x0C, 0xEE); // Heat
            if (TaiwuTouchGUI.LayoutButton("【温】Pulse Heat\n(+12°C)", GUILayout.Height(55)))
            {
                GameEventManager.RaiseRequestCauldronPulseHeat();
            }

            GUI.backgroundColor = new Color32(0x02, 0x84, 0xC7, 0xEE); // Will Left
            if (GUILayout.RepeatButton("【意◀】Steer Left\n(Will Focus)", GUILayout.Height(55)))
            {
                GameEventManager.RaiseRequestCauldronAdjustWillFocus(-1.2f * Time.deltaTime);
            }

            if (GUILayout.RepeatButton("【意▶】Steer Right\n(Will Focus)", GUILayout.Height(55)))
            {
                GameEventManager.RaiseRequestCauldronAdjustWillFocus(1.2f * Time.deltaTime);
            }

            GUI.backgroundColor = new Color32(0x7C, 0x3A, 0xED, 0xEE); // Suppress
            if (TaiwuTouchGUI.LayoutButton("【镇】Suppress\n(-1.5% Sea)", GUILayout.Height(55)))
            {
                GameEventManager.RaiseRequestCauldronSuppressWill();
            }

            GUI.backgroundColor = new Color32(0x05, 0x96, 0x69, 0xEE); // Crush
            if (TaiwuTouchGUI.LayoutButton("【碎】Crush Stone\n(+14% Stb)", GUILayout.Height(55)))
            {
                GameEventManager.RaiseRequestCauldronCrushStone();
            }

            GUI.backgroundColor = new Color32(0x47, 0x55, 0x69, 0xEE); // Close
            if (TaiwuTouchGUI.LayoutButton("【退】Close", GUILayout.Width(80), GUILayout.Height(55)))
            {
                GameEventManager.RaiseRequestCloseCauldron();
            }

            GUILayout.EndHorizontal();
            GUILayout.EndArea();
        }

        private bool IsInsideJoystickZone(Vector2 screenPos, Vector2 screenCenter, float grabRadius)
        {
            if (Vector2.Distance(screenPos, screenCenter) <= grabRadius) return true;
            return screenPos.x >= 0f && screenPos.x <= screenCenter.x + grabRadius * 0.75f
                && screenPos.y >= 0f && screenPos.y <= screenCenter.y + grabRadius * 0.75f;
        }

        private void UpdateJoystickFromScreenPos(Vector2 screenPos, Vector2 screenCenter, float maxRadius, float scale)
        {
            Vector2 delta = screenPos - screenCenter;
            float dist = delta.magnitude;
            if (dist > maxRadius)
            {
                delta = delta.normalized * maxRadius;
            }

            // Normalised movement intent (screen space: Y+ is up, X+ is right)
            _currentMoveIntent = new Vector2(delta.x / maxRadius, delta.y / maxRadius);

            // GUI virtual knob offset (GUI space: Y+ is down, so negate Y)
            float virtualDist = Mathf.Min(dist / scale, JOYSTICK_RADIUS);
            Vector2 norm = delta.sqrMagnitude > 0.0001f ? delta.normalized : Vector2.zero;
            _joystickKnobPos = new Vector2(norm.x * virtualDist, -norm.y * virtualDist);
        }

        private void ReleaseJoystick()
        {
            _isJoystickActive = false;
#if ENABLE_INPUT_SYSTEM
            _joystickTouchId = -1;
#else
            _joystickFingerId = -1;
#endif
            _joystickKnobPos = Vector2.zero;
            _currentMoveIntent = Vector2.zero;
            GameEventManager.RaiseRequestCombatMove(Vector2.zero);
        }

        private static Texture2D MakeDiscTexture(int size, Color32 fill, Color32 border)
        {
            Texture2D tex = new Texture2D(size, size, TextureFormat.RGBA32, false);
            tex.filterMode = FilterMode.Bilinear;
            tex.wrapMode = TextureWrapMode.Clamp;

            Vector2 center = new Vector2(size * 0.5f, size * 0.5f);
            float radius = size * 0.48f;
            float inner = radius - 3.5f;

            Color32 clear = new Color32(0, 0, 0, 0);
            Color32[] px = new Color32[size * size];

            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float d = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), center);
                    if (d > radius)
                        px[y * size + x] = clear;
                    else if (d >= inner)
                        px[y * size + x] = border;
                    else
                        px[y * size + x] = fill;
                }
            }

            tex.SetPixels32(px);
            tex.Apply();
            return tex;
        }

        private void OnDestroy()
        {
            if (_texCircleBg != null) Destroy(_texCircleBg);
            if (_texKnob != null) Destroy(_texKnob);
            if (_texButtonBg != null) Destroy(_texButtonBg);
        }
    }
}
