package app.turbomusic.server

import android.content.Context
import android.os.Build
import java.io.File

/**
 * Node cannot read a script out of the APK (it is a zip), so the bundled server (assets/server: headless.mjs and the web client) is copied into
 * the app's files folder, once per app version. The marker file is written last, so a copy that was interrupted is simply done again.
 */
object BundleInstaller {
    private const val MARKER = ".installed"

    fun ensure(ctx: Context): File {
        val info = ctx.packageManager.getPackageInfo(ctx.packageName, 0)
        @Suppress("DEPRECATION")
        val version = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()
        val dest = File(ctx.filesDir, "server-$version")
        if (File(dest, MARKER).exists()) return dest
        ctx.filesDir.listFiles { f -> f.name.startsWith("server-") }?.forEach { it.deleteRecursively() }
        copyAssets(ctx, "server", dest)
        File(dest, MARKER).writeText(version.toString())
        return dest
    }

    private fun copyAssets(ctx: Context, path: String, to: File) {
        val names = ctx.assets.list(path) ?: emptyArray()
        if (names.isEmpty()) { // a file
            to.parentFile?.mkdirs()
            ctx.assets.open(path).use { input -> to.outputStream().use { out -> input.copyTo(out) } }
        } else {
            to.mkdirs()
            for (n in names) copyAssets(ctx, "$path/$n", File(to, n))
        }
    }
}
