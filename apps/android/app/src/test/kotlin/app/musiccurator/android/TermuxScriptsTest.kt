package app.musiccurator.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TermuxScriptsTest {
    @Test fun fillReplacesEveryPlaceholder() {
        val out = TermuxScripts.fill("port=@PORT@ again=@PORT@ token='@TOKEN@'", mapOf("PORT" to "47813", "TOKEN" to "abcDEF123"))
        assertEquals("port=47813 again=47813 token='abcDEF123'", out)
    }

    @Test fun fillRefusesAValueThatCouldBreakOutOfTheScript() {
        for (bad in listOf("a b", "x;rm -rf ~", "\$(id)", "a'b", "`id`", "a\nb")) {
            val failed = try { TermuxScripts.fill("@V@", mapOf("V" to bad)); false } catch (e: IllegalArgumentException) { true }
            assertTrue("accepted: $bad", failed)
        }
        assertEquals("", TermuxScripts.fill("@V@", mapOf("V" to "")))
    }

    @Test fun tokensAreLongAndDifferent() {
        val a = TermuxScripts.newToken(); val b = TermuxScripts.newToken()
        assertEquals(32, a.length)
        assertFalse(a == b)
        assertTrue(a.all { it.isLetterOrDigit() })
    }
}
