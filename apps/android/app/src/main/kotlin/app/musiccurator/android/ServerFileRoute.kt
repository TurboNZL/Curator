package app.musiccurator.android

import java.net.URL

/**
 * Decides which requests of the web page the app answers itself (see ServerFiles): downloads of the user's library files from a plain-http
 * server. The page is served from a private https address, and Chromium's WebView upgrades images, audio and video that an https page
 * loads over http to https (even with mixed content allowed), which a home server does not speak. The upgraded address is the same host
 * and port, so it is recognised by host and port, not by scheme. No Android classes here, so it can be tested on the JVM.
 */
object ServerFileRoute {
    /** The real http address to fetch, or null when the request is not a file download from the configured http server. */
    fun target(serverUrl: String, method: String, scheme: String, host: String?, port: Int, encodedPath: String?, encodedQuery: String?): String? {
        if (!method.equals("GET", ignoreCase = true) || host == null || encodedPath == null) return null
        val base = try { URL(serverUrl) } catch (e: Exception) { return null }
        if (base.protocol != "http") return null // an https server needs no help
        if (!encodedPath.contains("/api/files/")) return null
        if (!host.equals(base.host, ignoreCase = true)) return null
        val basePort = if (base.port == -1) 80 else base.port
        val reqPort = if (port != -1) port else if (scheme == "https") 443 else 80
        // "http://pi" (port 80) is upgraded to "https://pi" (port 443)
        if (reqPort != basePort && !(basePort == 80 && reqPort == 443 && scheme == "https")) return null
        val authority = if (base.port == -1) base.host else "${base.host}:${base.port}"
        return "http://$authority$encodedPath" + (if (encodedQuery.isNullOrEmpty()) "" else "?$encodedQuery")
    }
}
