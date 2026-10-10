package app.musiccurator.android

import android.content.Context

/**
 * What the native side (Android Auto, notifications, updates) needs to know. The server address and token are pushed here by the web
 * client whenever its Settings change; the update token is typed in Settings > App updates.
 */
class ServerPrefs(context: Context) {
    private val p = context.applicationContext.getSharedPreferences("curator", Context.MODE_PRIVATE)

    var serverUrl: String
        get() = p.getString("serverUrl", "") ?: ""
        set(v) { p.edit().putString("serverUrl", v.trim().trimEnd('/')).apply() }
    var token: String
        get() = p.getString("token", "") ?: ""
        set(v) { p.edit().putString("token", v.trim()).apply() }
    /** a GitHub token with read access, only needed while the repository is private */
    var updateToken: String
        get() = p.getString("updateToken", "") ?: ""
        set(v) { p.edit().putString("updateToken", v.trim()).apply() }
    var lastUpdateCheck: Long
        get() = p.getLong("lastUpdateCheck", 0L)
        set(v) { p.edit().putLong("lastUpdateCheck", v).apply() }

    val configured get() = serverUrl.isNotEmpty()
}
