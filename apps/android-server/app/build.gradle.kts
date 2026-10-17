plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// CI passes the release's version (-PappVersion=0.2.0); versionCode grows with it, which Android needs to accept an update
val appVersion = (findProperty("appVersion") as String?) ?: "0.1.0"
val parts = appVersion.split(".").map { it.toIntOrNull() ?: 0 }
val code = parts.getOrElse(0) { 0 } * 10000 + parts.getOrElse(1) { 0 } * 100 + parts.getOrElse(2) { 0 }
// the phone's processor types to build for; libnode is ~85 MB each, so CI's emulator run asks for x86_64 only (-PserverAbis=x86_64)
val abis = ((findProperty("serverAbis") as String?) ?: "arm64-v8a,x86_64").split(",").map { it.trim() }.filter { it.isNotEmpty() }

android {
    namespace = "app.turbomusic.server"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.turbomusic.server"
        minSdk = 26
        targetSdk = 35
        versionCode = code
        versionName = appVersion
        ndk { abiFilters += abis }
        externalNativeBuild { cmake { arguments += listOf("-DANDROID_STL=c++_shared") } }
    }
    externalNativeBuild { cmake { path = file("CMakeLists.txt"); version = "3.22.1" } }

    // Same key as the TurboMusic app: the app starts this one's service, and a signature permission only lets apps with one key do that.
    // The alias and passwords are stored INSIDE the keystore file (see apps/android/app/build.gradle.kts).
    signingConfigs {
        create("turbomusic") {
            storeFile = file("../../android/turbomusic.keystore")
            storePassword = "curator-personal"
            keyAlias = "curator"
            keyPassword = "curator-personal"
        }
    }
    buildTypes {
        release { signingConfig = signingConfigs.getByName("turbomusic"); isMinifyEnabled = false }
        debug { signingConfig = signingConfigs.getByName("turbomusic") }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    // libnode.so comes from the nodejs-mobile release (scripts/fetch-libnode.sh puts it in app/libnode/bin/<abi>/)
    sourceSets["main"].jniLibs.srcDir("libnode/bin")
    // the server bundle (headless.mjs + web/) is an asset; scripts/make-bundle.sh builds it into ../bundle
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/server"))
    packaging { jniLibs { useLegacyPackaging = false } }
}

val copyServer by tasks.registering(Copy::class) {
    val bundle = file("../bundle")
    from(bundle)
    into(layout.buildDirectory.dir("generated/server/server"))
    doFirst { check(bundle.resolve("headless.mjs").exists()) { "Build the server bundle first: apps/android-server/scripts/make-bundle.sh" } }
}
tasks.matching { it.name == "preBuild" }.configureEach { dependsOn(copyServer) }

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    testImplementation("junit:junit:4.13.2")
}
