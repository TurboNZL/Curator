package app.turbomusic.server

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ServerConfigTest {
    @Test fun tokensAreLongPlainWords() {
        val t = ServerConfig.newToken()
        assertEquals(32, t.length)
        assertTrue(ServerConfig.isValidToken(t))
        assertFalse(ServerConfig.isValidToken("short"))
        assertFalse(ServerConfig.isValidToken("has a space in it, which is not ok"))
        assertFalse(ServerConfig.isValidToken(null))
    }

    @Test fun portsBelow1024FallBack() {
        assertEquals(47813, ServerConfig.validPort(80))
        assertEquals(47813, ServerConfig.validPort(70000))
        assertEquals(50000, ServerConfig.validPort(50000))
    }

    @Test fun nodeGetsTheBundleAndTheLibraryFolder() {
        assertEquals(listOf("node", "/b/headless.mjs", "--data-dir", "/d"), ServerConfig.nodeArgs("/b", "/d").toList())
    }

    @Test fun environmentSetsWhatAndroidLacks() {
        val env = ServerConfig.env("/d", "/t", "/h", "/b/web", "tok", 50000).toList()
        assertTrue("TMPDIR=/t" in env)
        assertTrue("HOME=/h" in env)
        assertTrue("TURBOMUSIC_DATA_DIR=/d" in env)
        assertTrue("TURBOMUSIC_WEB_DIR=/b/web" in env)
        assertTrue("TURBOMUSIC_PORT=50000" in env)
        assertTrue("TURBOMUSIC_TOKEN=tok" in env)
        assertTrue(env.any { it.startsWith("NODE_OPTIONS=") && "max-old-space-size-percentage" in it })
    }
}
