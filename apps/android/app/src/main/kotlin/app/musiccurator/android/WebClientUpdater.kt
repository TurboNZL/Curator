package app.musiccurator.android

import android.content.Context
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Updates the web client without installing a new APK: the files of the build the user's server hosts (`/web-manifest.json` lists them)
 * are downloaded into the app's private storage and served instead of the bundled copy. A copy made for another app version is ignored,
 * so installing a newer APK always brings its own (newer) client back.
 */
object WebClientUpdater {
    class State(val status: String, val message: String? = null, val version: String? = null) {
        fun json(): String = JSONObject().put("status", status).put("message", message ?: JSONObject.NULL).put("version", version ?: JSONObject.NULL).toString()
    }

    @Volatile var state = State("idle")
        private set
    @Volatile var listener: ((State) -> Unit)? = null
    /** set by the activity: shows the page again from the (new) files */
    @Volatile var reloader: (() -> Unit)? = null
    @Volatile private var running = false

    private fun set(s: State) { state = s; listener?.invoke(s) }
    private fun home(c: Context) = File(c.filesDir, "web")
    private fun meta(c: Context) = File(home(c), ".meta")

    /** The folder to serve from, or null to use the bundled client. */
    fun root(c: Context): File? {
        val m = meta(c)
        if (!m.exists() || !File(home(c), "index.html").exists()) return null
        return if (m.readLines().firstOrNull() == BuildConfig.VERSION_NAME) home(c) else null
    }

    fun installedVersion(c: Context): String? = if (root(c) != null) meta(c).readLines().getOrNull(1) else null

    /** Pure and tested: a manifest path must stay inside the target folder. */
    fun safePath(p: String): Boolean = p.isNotEmpty() && !p.startsWith("/") && !p.contains("\\") && p.split("/").none { it == ".." || it == "." || it.isEmpty() }

    fun reset(c: Context) { home(c).deleteRecursively(); set(State("idle")) }

    fun update(c: Context) {
        if (running) return
        val server = ServerPrefs(c).serverUrl
        if (server.isEmpty()) { set(State("error", "Set the server address in Settings first.")); return }
        running = true
        set(State("checking"))
        Thread {
            val next = File(c.filesDir, "web-next")
            try {
                val text = get("$server/web-manifest.json").readBytes().toString(Charsets.UTF_8)
                // a server from before this feature answers every unknown address with the app's index.html
                val manifest = try { JSONObject(text) } catch (e: org.json.JSONException) {
                    throw IllegalStateException("Your server did not answer with a web client list (it sent a web page). Update the server first: docs/UPDATING.md.")
                }
                val version = manifest.getString("version")
                if (version == installedVersion(c)) { set(State("none", "Already the version your server has.", version)); return@Thread }
                val files = manifest.getJSONArray("files")
                next.deleteRecursively(); next.mkdirs()
                for (i in 0 until files.length()) {
                    val f = files.getJSONObject(i)
                    val path = f.getString("path")
                    if (!safePath(path)) throw IllegalStateException("The server listed a bad file name: $path")
                    set(State("downloading", "${i + 1} / ${files.length()}", version))
                    val target = File(next, path)
                    target.parentFile?.mkdirs()
                    val bytes = get("$server/" + path.split("/").joinToString("/") { java.net.URLEncoder.encode(it, "UTF-8").replace("+", "%20") }).readBytes()
                    if (bytes.size.toLong() != f.getLong("size")) throw IllegalStateException("$path came back with the wrong size")
                    target.writeBytes(bytes)
                }
                if (!File(next, "index.html").exists()) throw IllegalStateException("The server's web client has no index.html")
                File(next, ".meta").writeText("${BuildConfig.VERSION_NAME}\n$version\n")
                home(c).deleteRecursively()
                if (!next.renameTo(home(c))) throw IllegalStateException("Could not store the new files")
                set(State("ready", "Web client updated.", version))
            } catch (e: Exception) {
                next.deleteRecursively()
                set(State("error", e.message ?: e.javaClass.simpleName))
            } finally { running = false }
        }.start()
    }

    private fun get(url: String): java.io.InputStream {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 15_000; conn.readTimeout = 60_000
        val code = conn.responseCode
        if (code == 404) throw IllegalStateException("Your server has no web client to offer: update the server first (docs/UPDATING.md).")
        if (code !in 200..299) throw IllegalStateException("Server said $code")
        return conn.inputStream
    }
}
