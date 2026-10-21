// Top-level build file
plugins {
    id("com.android.application") version "8.5.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
    // 🔥 Google Services plugin — required for Firebase integration.
    // Reads google-services.json from app/ and injects FCM credentials.
    id("com.google.gms.google-services") version "4.4.2" apply false
}
