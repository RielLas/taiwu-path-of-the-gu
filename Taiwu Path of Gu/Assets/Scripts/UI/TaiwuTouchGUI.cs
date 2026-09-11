using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace TaiwuGu.UI
{
    /// <summary>
    /// Universal Touch-Aware IMGUI Bridge for Taiwu Path of the Gu.
    /// Bridges New Input System Touchscreen and Pointer taps to IMGUI (GUI.Button, GUI.Box).
    /// Solves the Unity 6 Device Simulator and mobile touchscreen limitation where IMGUI
    /// does not receive simulated OS mouse events (EventType.MouseDown / MouseUp).
    /// Fully preserves native Desktop mouse clicks on PC with zero overhead.
    /// HALAL COMPLIANT: Pure input translation logic, zero visual or figurative depictions.
    /// </summary>
    public static class TaiwuTouchGUI
    {
        private static int s_LastFrame = -1;
        private static bool s_HasTapThisFrame = false;
        private static bool s_TapConsumed = false;
        private static Vector2 s_TapScreenPos;
        private static Vector2 s_DownScreenPos;
        private static Vector2 s_CurrentPointerScreenPos;
        private static bool s_IsPointerDown = false;
        private static bool s_ExceededDragThreshold = false;
        private const float DRAG_THRESHOLD = 16f;
#if ENABLE_INPUT_SYSTEM
        private static readonly System.Collections.Generic.Dictionary<int, Vector2> s_TouchDownPositions = new System.Collections.Generic.Dictionary<int, Vector2>(8);
        private static readonly System.Collections.Generic.HashSet<int> s_TouchExceededDrag = new System.Collections.Generic.HashSet<int>(8);
#endif

        /// <summary>
        /// True if a touch/pointer tap occurred this frame and was consumed by a GUI control or modal.
        /// Overworld movement controllers must check this to prevent accidental world clicks through UI.
        /// </summary>
        public static bool IsTapConsumed => s_TapConsumed;

        /// <summary>
        /// True if a touch/pointer tap occurred this frame (consumed or unconsumed).
        /// </summary>
        public static bool HasTapThisFrame => s_HasTapThisFrame;

        /// <summary>
        /// Manually consumes the tap for the current frame.
        /// </summary>
        public static void ConsumeTap()
        {
            s_TapConsumed = true;
        }

        /// <summary>
        /// Synchronizes input state with New Input System Touchscreen and Pointer devices.
        /// Safe to call multiple times per frame; executes at most once per frame.
        /// </summary>
        public static void UpdateInputState()
        {
            if (Time.frameCount == s_LastFrame) return;
            s_LastFrame = Time.frameCount;
            s_HasTapThisFrame = false;
            s_TapConsumed = false;

#if ENABLE_INPUT_SYSTEM
            var ts = Touchscreen.current;
            if (ts != null)
            {
                for (int i = 0; i < ts.touches.Count; i++)
                {
                    var tc = ts.touches[i];
                    int touchId = tc.touchId.ReadValue();
                    Vector2 pos = tc.position.ReadValue();

                    if (tc.press.wasPressedThisFrame)
                    {
                        s_TouchDownPositions[touchId] = pos;
                        s_TouchExceededDrag.Remove(touchId);
                    }
                    else if (tc.press.isPressed)
                    {
                        if (s_TouchDownPositions.TryGetValue(touchId, out var downPos))
                        {
                            if (Vector2.Distance(pos, downPos) > DRAG_THRESHOLD)
                            {
                                s_TouchExceededDrag.Add(touchId);
                            }
                        }
                        else
                        {
                            s_TouchDownPositions[touchId] = pos;
                        }
                    }
                    else if (tc.press.wasReleasedThisFrame)
                    {
                        if (s_TouchDownPositions.TryGetValue(touchId, out var downPos))
                        {
                            if (!s_TouchExceededDrag.Contains(touchId))
                            {
                                s_HasTapThisFrame = true;
                                s_TapScreenPos = pos.sqrMagnitude > 0.01f ? pos : downPos;
                            }
                            s_TouchDownPositions.Remove(touchId);
                            s_TouchExceededDrag.Remove(touchId);
                        }
                    }
                    else
                    {
                        s_TouchDownPositions.Remove(touchId);
                        s_TouchExceededDrag.Remove(touchId);
                    }
                }
            }

            // Fallback for Pointer.current (Device Simulator single click/mouse/stylus)
            if (!s_HasTapThisFrame)
            {
                var ptr = Pointer.current;
                if (ptr != null)
                {
                    bool isPressed = ptr.press.isPressed;
                    bool wasPressed = ptr.press.wasPressedThisFrame;
                    bool wasReleased = ptr.press.wasReleasedThisFrame;
                    Vector2 currentPos = ptr.position.ReadValue();

                    if (currentPos.sqrMagnitude > 0.01f)
                    {
                        s_CurrentPointerScreenPos = currentPos;
                    }

                    if (wasPressed)
                    {
                        s_IsPointerDown = true;
                        s_DownScreenPos = currentPos;
                        s_ExceededDragThreshold = false;
                    }
                    else if (s_IsPointerDown && isPressed)
                    {
                        if (Vector2.Distance(currentPos, s_DownScreenPos) > DRAG_THRESHOLD)
                        {
                            s_ExceededDragThreshold = true;
                        }
                    }
                    else if (wasReleased || (s_IsPointerDown && !isPressed))
                    {
                        if (s_IsPointerDown && !s_ExceededDragThreshold)
                        {
                            s_HasTapThisFrame = true;
                            s_TapScreenPos = (currentPos.sqrMagnitude > 0.01f) ? currentPos : s_DownScreenPos;
                        }
                        s_IsPointerDown = false;
                        s_ExceededDragThreshold = false;
                    }
                }
            }
#endif
        }

        /// <summary>
        /// Evaluates a button with full touch, pointer, and native IMGUI support.
        /// Automatically respects any active GUI.matrix scaling.
        /// </summary>
        public static bool Button(Rect rect, string text, GUIStyle style = null)
        {
            UpdateInputState();

            // 1. Native IMGUI button click (Desktop Game view with mouse)
            bool clicked = style != null ? GUI.Button(rect, text, style) : GUI.Button(rect, text);

            // 2. Touch / Pointer tap (Device Simulator & Mobile Touchscreen)
            if (!clicked && s_HasTapThisFrame && !s_TapConsumed)
            {
                Event currentEvent = Event.current;
                if (currentEvent != null && (currentEvent.type == EventType.Layout || currentEvent.type == EventType.Repaint || currentEvent.type == EventType.MouseUp))
                {
                    Vector2 p1 = GUIUtility.GUIToScreenPoint(new Vector2(rect.xMin, rect.yMin));
                    Vector2 p2 = GUIUtility.GUIToScreenPoint(new Vector2(rect.xMax, rect.yMax));
                    Rect screenRect = new Rect(Mathf.Min(p1.x, p2.x), Mathf.Min(p1.y, p2.y), Mathf.Abs(p2.x - p1.x), Mathf.Abs(p2.y - p1.y));
                    Vector2 tapScreenPos = new Vector2(s_TapScreenPos.x, Screen.height - s_TapScreenPos.y);
                    Rect hitRect = new Rect(screenRect.x - 4f, screenRect.y - 4f, screenRect.width + 8f, screenRect.height + 8f);
                    if (hitRect.Contains(tapScreenPos))
                    {
                        s_TapConsumed = true;
                        clicked = true;
                    }
                }
            }

            if (clicked)
            {
                s_TapConsumed = true;
            }

            return clicked;
        }

        /// <summary>
        /// Evaluates a button with GUIContent with full touch, pointer, and native IMGUI support.
        /// </summary>
        public static bool Button(Rect rect, GUIContent content, GUIStyle style = null)
        {
            UpdateInputState();

            bool clicked = style != null ? GUI.Button(rect, content, style) : GUI.Button(rect, content);

            if (!clicked && s_HasTapThisFrame && !s_TapConsumed)
            {
                Event currentEvent = Event.current;
                if (currentEvent != null && (currentEvent.type == EventType.Layout || currentEvent.type == EventType.Repaint || currentEvent.type == EventType.MouseUp))
                {
                    Vector2 p1 = GUIUtility.GUIToScreenPoint(new Vector2(rect.xMin, rect.yMin));
                    Vector2 p2 = GUIUtility.GUIToScreenPoint(new Vector2(rect.xMax, rect.yMax));
                    Rect screenRect = new Rect(Mathf.Min(p1.x, p2.x), Mathf.Min(p1.y, p2.y), Mathf.Abs(p2.x - p1.x), Mathf.Abs(p2.y - p1.y));
                    Vector2 tapScreenPos = new Vector2(s_TapScreenPos.x, Screen.height - s_TapScreenPos.y);
                    Rect hitRect = new Rect(screenRect.x - 4f, screenRect.y - 4f, screenRect.width + 8f, screenRect.height + 8f);
                    if (hitRect.Contains(tapScreenPos))
                    {
                        s_TapConsumed = true;
                        clicked = true;
                    }
                }
            }

            if (clicked)
            {
                s_TapConsumed = true;
            }

            return clicked;
        }

        /// <summary>
        /// Checks if a touch or click occurred outside the specified modal rectangle.
        /// Returns true and consumes the tap if clicked outside, making backdrop dismissal seamless.
        /// </summary>
        public static bool CheckTapOutside(Rect modalRect)
        {
            UpdateInputState();

            Vector2 p1 = GUIUtility.GUIToScreenPoint(new Vector2(modalRect.xMin, modalRect.yMin));
            Vector2 p2 = GUIUtility.GUIToScreenPoint(new Vector2(modalRect.xMax, modalRect.yMax));
            Rect screenRect = new Rect(Mathf.Min(p1.x, p2.x), Mathf.Min(p1.y, p2.y), Mathf.Abs(p2.x - p1.x), Mathf.Abs(p2.y - p1.y));

            // 1. Native IMGUI mouse down outside (Desktop)
            Event currentEvent = Event.current;
            if (currentEvent != null && currentEvent.type == EventType.MouseDown)
            {
                Vector2 mouseScreen = GUIUtility.GUIToScreenPoint(currentEvent.mousePosition);
                if (!screenRect.Contains(mouseScreen))
                {
                    s_TapConsumed = true;
                    currentEvent.Use();
                    return true;
                }
            }

            // 2. Touchscreen / Pointer tap outside (Mobile / Device Simulator)
            if (s_HasTapThisFrame && !s_TapConsumed)
            {
                if (currentEvent != null && (currentEvent.type == EventType.Layout || currentEvent.type == EventType.Repaint))
                {
                    Vector2 tapScreenPos = new Vector2(s_TapScreenPos.x, Screen.height - s_TapScreenPos.y);
                    if (!screenRect.Contains(tapScreenPos))
                    {
                        s_TapConsumed = true;
                        return true;
                    }
                }
            }

            return false;
        }

        /// <summary>
        /// Evaluates a GUILayout button with full touch, pointer, and native IMGUI support.
        /// </summary>
        public static bool LayoutButton(string text, params GUILayoutOption[] options)
        {
            UpdateInputState();

            bool clicked = GUILayout.Button(text, options);
            if (!clicked && s_HasTapThisFrame && !s_TapConsumed)
            {
                Event currentEvent = Event.current;
                if (currentEvent != null && (currentEvent.type == EventType.Repaint || currentEvent.type == EventType.MouseUp))
                {
                    Rect lastRect = GUILayoutUtility.GetLastRect();
                    if (lastRect.width > 0 && lastRect.height > 0)
                    {
                        Vector2 screenPoint = GUIUtility.GUIToScreenPoint(new Vector2(lastRect.x, lastRect.y));
                        Rect screenRect = new Rect(screenPoint.x, screenPoint.y, lastRect.width, lastRect.height);
                        Vector2 tapGuiPos = new Vector2(s_TapScreenPos.x, Screen.height - s_TapScreenPos.y);
                        if (screenRect.Contains(tapGuiPos))
                        {
                            s_TapConsumed = true;
                            clicked = true;
                        }
                    }
                }
            }

            if (clicked)
            {
                s_TapConsumed = true;
            }

            return clicked;
        }

        /// <summary>
        /// Evaluates a GUILayout button with GUIStyle and full touch, pointer, and native IMGUI support.
        /// </summary>
        public static bool LayoutButton(string text, GUIStyle style, params GUILayoutOption[] options)
        {
            UpdateInputState();

            bool clicked = GUILayout.Button(text, style, options);
            if (!clicked && s_HasTapThisFrame && !s_TapConsumed)
            {
                Event currentEvent = Event.current;
                if (currentEvent != null && (currentEvent.type == EventType.Repaint || currentEvent.type == EventType.MouseUp))
                {
                    Rect lastRect = GUILayoutUtility.GetLastRect();
                    if (lastRect.width > 0 && lastRect.height > 0)
                    {
                        Vector2 screenPoint = GUIUtility.GUIToScreenPoint(new Vector2(lastRect.x, lastRect.y));
                        Rect screenRect = new Rect(screenPoint.x, screenPoint.y, lastRect.width, lastRect.height);
                        Vector2 tapGuiPos = new Vector2(s_TapScreenPos.x, Screen.height - s_TapScreenPos.y);
                        if (screenRect.Contains(tapGuiPos))
                        {
                            s_TapConsumed = true;
                            clicked = true;
                        }
                    }
                }
            }

            if (clicked)
            {
                s_TapConsumed = true;
            }

            return clicked;
        }
    }
}
