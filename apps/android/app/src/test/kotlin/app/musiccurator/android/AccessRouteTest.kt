package app.musiccurator.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AccessRouteTest {
    @Test fun originNormalisesDefaultPorts() {
        assertEquals("https://music.example.com:443", AccessRoute.origin("https://Music.Example.com/api/files/x"))
        assertEquals("http://192.168.1.5:47813", AccessRoute.origin("http://192.168.1.5:47813"))
        assertEquals("", AccessRoute.origin("not a url"))
        assertEquals("", AccessRoute.origin("ftp://x.y/z"))
    }

    @Test fun onlyTheServerIsProxied() {
        assertTrue(AccessRoute.isServerRequest("https://m.example.com", "https://m.example.com/api/files/abc?token=t"))
        assertFalse(AccessRoute.isServerRequest("https://m.example.com", "https://other.example.com/x"))
        assertFalse(AccessRoute.isServerRequest("", "https://m.example.com/x"))
        assertFalse(AccessRoute.isServerRequest("http://localhost", "https://appassets.example/x"))
    }

    @Test fun browserBookkeepingIsNotForwarded() {
        val out = AccessRoute.forwardable(mapOf("Range" to "bytes=0-", "Origin" to "http://localhost", "Cookie" to "a=b", "Authorization" to "Bearer t"))
        assertEquals(setOf("Range", "Authorization"), out.keys)
    }

    @Test fun preflightEchoesTheRequestedHeaders() {
        assertEquals("range, cf-access-client-id", AccessRoute.preflightHeaders("range, cf-access-client-id")["Access-Control-Allow-Headers"])
        assertEquals("*", AccessRoute.preflightHeaders(null)["Access-Control-Allow-Origin"])
    }
}
