# Keep the Capacitor / WebView runtime and our main web app classes.
-keep class com.kernel.barbershopper.** { *; }

# Strip logs in release
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Keep Capacitor plugins
-keep class com.capacitorjs.** { *; }
-keep class capacitor.** { *; }
-dontwarn com.capacitorjs.**

# Strip source file/line in stack traces (less readable, smaller APK)
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable
