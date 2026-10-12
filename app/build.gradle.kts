
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.example.beta"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.beta"
        minSdk = 23
        targetSdk = 28
        versionCode = 2
        versionName = "1.1"
    }
}
