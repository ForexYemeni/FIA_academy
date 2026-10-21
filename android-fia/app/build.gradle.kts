plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

android {
    // namespace MUST match the Kotlin package declaration (academy.fia.future)
    // because Android uses it to generate the R class.
    //
    // applicationId (below in defaultConfig) is what users see in the Google
    // Play Store and what Firebase uses to register the device. We changed
    // applicationId to "com.fiaacademy" to match the google-services.json
    // package_name.
    //
    // So:
    //   - namespace = "academy.fia.future" (matches the Kotlin package)
    //   - applicationId = "com.fiaacademy" (matches the Firebase config)
    namespace = "academy.fia.future"
    // ⚠️ IMPORTANT: applicationId MUST match the package_name in
    // google-services.json, otherwise Firebase won't register the
    // device for FCM. We changed this from "academy.fia.future" to
    // "com.fiaacademy" to match the Firebase project configuration
    // provided by the user.
    //
    // IMPACT: Users who have the old APK installed will need to
    // UNINSTALL it before installing this new APK — Android won't
    // allow installing an app with a different package name as an
    // update to the existing one.
    compileSdk = 34

    defaultConfig {
        applicationId = "com.fiaacademy"
        minSdk = 24
        targetSdk = 34
        versionCode = 30
        versionName = "2.7.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // Sign with the embedded debug-style key so the APK is installable
            // without a proper keystore. This is fine for a closed beta of a
            // medical academy app — the signing identity is not used for
            // anything else.
            signingConfig = signingConfigs.getByName("debug")
        }
        debug {
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = false
    }
}

dependencies {
    // AndroidX core
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")

    // 🔥 WorkManager — reliable background work scheduling. Survives
    // app kills, device reboots, and is optimized for battery. Used by
    // NotificationFallbackWorker to restart the polling service if it
    // gets killed by the OS or manufacturer's battery optimizer.
    implementation("androidx.work:work-runtime-ktx:2.9.1")

    // 🔥 Firebase — direct FCM push notifications (NO OneSignal).
    // We use the Firebase SDK directly to register the device for FCM
    // and receive push notifications. The server uses Firebase Admin
    // SDK to send pushes directly to the user's FCM token.
    implementation(platform("com.google.firebase:firebase-bom:33.4.0"))
    implementation("com.google.firebase:firebase-messaging")
    implementation("com.google.firebase:firebase-analytics")

    // Coroutines — used by NotificationPollService for the polling
    // loop. Keeps the network call off the main thread.
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // Markwon — markdown rendering for push notification bodies (kept
    // for parity with v2.2.0).
    implementation("io.noties.markwon:core:4.6.2")
}
