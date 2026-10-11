package app.musiccurator.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ServerFileRouteTest {
    private val server = "http://192.168.1.50:47813"
    private fun t(url: String = server, method: String = "GET", scheme: String = "http", host: String? = "192.168.1.50", port: Int = 47813, path: String? = "/api/files/abc", query: String? = "token=x") =
        ServerFileRoute.target(url, method, scheme, host, port, path, query)

    @Test fun answersAFileDownloadFromTheServer() = assertEquals("$server/api/files/abc?token=x", t())
    @Test fun recognisesTheHttpsAddressChromiumUpgradedItTo() = assertEquals("$server/api/files/abc?token=x", t(scheme = "https"))
    @Test fun handlesAServerOnPort80() {
        assertEquals("http://pi/api/files/abc?token=x", t(url = "http://pi", host = "pi", port = -1, scheme = "https"))
        assertEquals("http://pi/api/files/abc?token=x", t(url = "http://pi", host = "pi", port = -1, scheme = "http"))
    }
    @Test fun keepsAPathPrefixOfAReverseProxy() = assertEquals("http://pi:8080/music/api/files/abc?token=x", t(url = "http://pi:8080/music", host = "pi", port = 8080, path = "/music/api/files/abc"))
    @Test fun leavesEverythingElseToTheWebView() {
        assertNull(t(method = "PUT"))
        assertNull(t(path = "/api/sync/pull"))
        assertNull(t(host = "example.com"))
        assertNull(t(port = 9999))
        assertNull(t(url = "https://pi.tailnet.ts.net", host = "pi.tailnet.ts.net", port = -1, scheme = "https"))
        assertNull(t(url = ""))
        assertNull(t(host = null))
    }

    private fun p(url: String = server, method: String = "GET", host: String? = "appassets.androidplatform.net", path: String? = "/__server/api/files/abc", query: String? = "token=x") =
        ServerFileRoute.proxyTarget(url, method, host, "appassets.androidplatform.net", path, query)

    @Test fun proxiesTheSameOriginPath() = assertEquals("$server/api/files/abc?token=x", p())
    @Test fun proxyKeepsAReverseProxyPrefix() = assertEquals("http://pi:8080/music/api/files/abc?token=x", p(url = "http://pi:8080/music"))
    @Test fun proxyIgnoresEverythingElse() {
        assertNull(p(method = "PUT"))
        assertNull(p(host = "example.com"))
        assertNull(p(path = "/api/files/abc"))
        assertNull(p(path = "/__server/api/sync/pull"))
        assertNull(p(path = "/__server/api/files/../../etc"))
        assertNull(p(url = "https://pi.tailnet.ts.net"))
    }
}
