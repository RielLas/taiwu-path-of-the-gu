using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace TaiwuGu.Editor
{
    /// <summary>
    /// Enterprise One-Click Android APK Builder for Taiwu Path of the Gu.
    /// Automates building version 0.0.1 APK with required package identifier, bundle version,
    /// scene hierarchy verification, and output folder provisioning.
    /// HALAL COMPLIANT: Pure build automation tool.
    /// </summary>
    public static class TaiwuApkBuilder
    {
        public const string VERSION_STRING = "0.0.1";
        public const int BUNDLE_VERSION_CODE = 1;
        public const string PACKAGE_NAME = "com.Wonderland.TaiwuPathOfGu";
        public const string OUTPUT_DIRECTORY = "Builds/Android";
        public const string APK_FILENAME = "TaiwuPathOfGu_v0.0.1.apk";

        [MenuItem("Taiwu/Build/Build Android APK (v0.0.1)", false, 200)]
        public static void BuildAndroidApk()
        {
            Debug.Log("<color=#38bdf8>[TaiwuApkBuilder]</color> Starting automated build for Android APK v" + VERSION_STRING + "...");

            // 1. Ensure Player Settings are production ready
            PlayerSettings.bundleVersion = VERSION_STRING;
            PlayerSettings.Android.bundleVersionCode = BUNDLE_VERSION_CODE;
            PlayerSettings.companyName = "Wonderland";
            PlayerSettings.productName = "Taiwu Path of Gu";
            PlayerSettings.SetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.Android, PACKAGE_NAME);

            // 2. Ensure Output Directory exists
            string projectRoot = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
            string outputDirPath = Path.Combine(projectRoot, OUTPUT_DIRECTORY);
            if (!Directory.Exists(outputDirPath))
            {
                Directory.CreateDirectory(outputDirPath);
                Debug.Log($"<color=#38bdf8>[TaiwuApkBuilder]</color> Created output directory: {outputDirPath}");
            }

            string fullApkPath = Path.Combine(outputDirPath, APK_FILENAME);

            // 3. Resolve Scenes in Build
            string[] scenes = EditorBuildSettings.scenes
                .Where(s => s.enabled && !string.IsNullOrEmpty(s.path))
                .Select(s => s.path)
                .ToArray();

            if (scenes.Length == 0)
            {
                scenes = new[]
                {
                    "Assets/Scenes/TitleScene.unity",
                    "Assets/Scenes/LoadingScene.unity",
                    "Assets/Scenes/OverworldScene.unity"
                };
            }

            Debug.Log($"<color=#38bdf8>[TaiwuApkBuilder]</color> Packaging {scenes.Length} scene(s): {string.Join(", ", scenes)}");

            // 4. Configure Build Options
            BuildPlayerOptions options = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = fullApkPath,
                target = BuildTarget.Android,
                options = BuildOptions.None
            };

            // 5. Execute Build Pipeline
            DateTime startTime = DateTime.Now;
            BuildReport report = BuildPipeline.BuildPlayer(options);
            BuildSummary summary = report.summary;
            TimeSpan duration = DateTime.Now - startTime;

            if (summary.result == BuildResult.Succeeded)
            {
                long sizeBytes = (long)summary.totalSize;
                double sizeMb = sizeBytes / (1024.0 * 1024.0);
                Debug.Log($"<color=#34d399><b>[TaiwuApkBuilder] SUCCESS!</b></color> Android APK built in {duration.TotalSeconds:F1}s: {fullApkPath} ({sizeMb:F2} MB)");
                EditorUtility.RevealInFinder(fullApkPath);
            }
            else if (summary.result == BuildResult.Failed)
            {
                Debug.LogError($"<color=#ef4444><b>[TaiwuApkBuilder] FAILED!</b></color> Build failed with {summary.totalErrors} error(s). Please verify Android Build Support in Unity Hub.");
            }
            else if (summary.result == BuildResult.Cancelled)
            {
                Debug.LogWarning("<color=#f59e0b>[TaiwuApkBuilder] CANCELLED.</color> Build was cancelled by user.");
            }
        }

        [MenuItem("Taiwu/Build/Open Android Builds Folder", false, 201)]
        public static void OpenBuildsFolder()
        {
            string projectRoot = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
            string outputDirPath = Path.Combine(projectRoot, OUTPUT_DIRECTORY);
            if (!Directory.Exists(outputDirPath))
            {
                Directory.CreateDirectory(outputDirPath);
            }
            EditorUtility.RevealInFinder(outputDirPath);
        }
    }
}
