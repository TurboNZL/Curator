package app.musiccurator.android

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import java.io.FilterInputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Answers the page's image and audio downloads from a plain-http server natively (see ServerFileRoute for why), with the Range support audio
 * needs for seeking. Everything else the page does (sync, uploads, https servers) goes through the WebView as before.
 */
object ServerFiles {
    // not If-*: a 304 is not a status a WebResourceResponse may carry
    private val forward = setOf("range", "authorization", "accept")
    private val skip = setOf("transfer-encoding", "connection", "keep-alive")

    fun answer(request: WebResourceRequest, serverUrl: String, pageHost: String): WebResourceResponse? {
        val u = request.url
        val proxied = ServerFileRoute.proxyTarget(serverUrl, request.method, u.host, pageHost, u.encodedPath, u.encodedQuery)
        val target = proxied ?: ServerFileRoute.target(serverUrl, request.method, u.scheme ?: "http", u.host, u.port, u.encodedPath, u.encodedQuery) ?: return null
        return try {
            val c = URL(target).openConnection() as HttpURLConnection
            c.connectTimeout = 15_000; c.readTimeout = 60_000
            for ((k, v) in request.requestHeaders) if (k.lowercase() in forward) c.setRequestProperty(k, v)
            val code = c.responseCode
            if (code in 300..399) { c.disconnect(); return if (proxied != null) bad("redirect") else null }
            val type = (c.contentType ?: "application/octet-stream").substringBefore(';').trim()
            val headers = HashMap<String, String>()
            for ((k, v) in c.headerFields) if (k != null && v.isNotEmpty() && k.lowercase() !in skip) headers[k] = v.last()
            val body = (if (code >= 400) c.errorStream else c.inputStream) ?: run { c.disconnect(); return if (proxied != null) bad("empty response") else null }
            WebResourceResponse(type, null, code, c.responseMessage?.takeIf { it.isNotBlank() } ?: "OK", headers, Closing(body))
        } catch (e: Exception) {
            // an address of ours must never fall through to the app's pages (they would answer with index.html)
            if (proxied != null) bad(e.message ?: "server unreachable") else null
        }
    }

    private fun bad(why: String) = WebResourceResponse("text/plain", "utf-8", 502, "Bad Gateway", emptyMap(), java.io.ByteArrayInputStream(why.toByteArray()))

    /**
     * Closing the stream (the WebView does so when it is done or abandons it, as a seek does) is enough: a fully read response returns its
     * connection to the keep-alive pool, so the many cover requests of a page reuse one connection instead of opening a new one each.
     */
    private class Closing(input: InputStream) : FilterInputStream(input)
}
