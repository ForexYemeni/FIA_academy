plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "academy.fia.future"
    compileSdk = 34

    defaultConfig {
        applicationId = "academy.fia.future"
        minSdk = 24
        targetSdk = 34
        versionCode = 22
        versionName = "2.4.3"
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

    // OneSignal SDK — instant external OS-level push notifications even
    // when the app is force-killed. Version 5.10.2 is the latest stable
    // available on Maven Central (5.8.6 wasn't published there — it
    // required the OneSignal gradle plugin).
    implementation("com.onesignal:OneSignal:5.10.2")

    // Firebase messaging — required by OneSignal for FCM delivery on
    // Android.
    implementation(platform("com.google.firebase:firebase-bom:33.4.0"))
    implementation("com.google.firebase:firebase-messaging")

    // Coroutines — used by NotificationPollService for the 5s polling
    // loop. Keeps the network call off the main thread.
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // Markwon — markdown rendering for push notification bodies (kept
    // for parity with v2.2.0).
    implementation("io.noties.markwon:core:4.6.2")
}
