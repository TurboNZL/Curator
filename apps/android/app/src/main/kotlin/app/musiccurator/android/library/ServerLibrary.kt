package app.musiccurator.android.library

import app.musiccurator.android.ServerPrefs
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Downloads the library from the user's server (the same /api/sync/pull the web client uses) and keeps it for a couple of minutes. */
class ServerLibrary(private val prefs: ServerPrefs) {
    @Volatile private var cached: LibraryIndex? = null
    @Volatile private var cachedAt = 0L
    @Volatile private var cachedFor = ""

    private val wanted = setOf("artists", "albums", "releases", "tracks", "playlists")

    /** Blocking: call from a background thread. Throws when the server cannot be reached. */
    @Synchronized
    fun get(): LibraryIndex {
        val key = prefs.serverUrl + "|" + prefs.token
        val now = System.currentTimeMillis()
        cached?.let { if (key == cachedFor && now - cachedAt < 120_000) return it }
        if (!prefs.configured) throw IllegalStateException("Set the server in the app's Settings first")
        val records = ArrayList<Rec>()
        var since = 0L
        while (true) {
            val body = fetch("/api/sync/pull?since=$since&limit=2000")
            val json = JSONObject(body)
            val arr = json.getJSONArray("records")
            for (i in 0 until arr.length()) {
                val r = arr.getJSONObject(i)
                if (r.optBoolean("deleted", false)) continue
                val table = r.getString("table")
                if (table in wanted) records.add(Rec(table, r.getString("id"), r.getJSONObject("data")))
            }
            since = json.getLong("cursor")
            if (!json.optBoolean("more", false)) break
        }
        return LibraryIndex(records).also { cached = it; cachedAt = now; cachedFor = key }
    }

    private fun fetch(path: String): String {
        val c = URL(prefs.serverUrl + path).openConnection() as HttpURLConnection
        try {
            c.connectTimeout = 10_000; c.readTimeout = 30_000
            if (prefs.token.isNotEmpty()) c.setRequestProperty("Authorization", "Bearer ${prefs.token}")
            if (c.responseCode != 200) throw IllegalStateException("Server answered ${c.responseCode}")
            return c.inputStream.bufferedReader().use { it.readText() }
        } finally { c.disconnect() }
    }

    fun fileUrl(hash: String) = "${prefs.serverUrl}/api/files/$hash?token=${prefs.token}"
}
