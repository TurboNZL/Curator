package app.musiccurator.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.sqrt

class EqMapTest {
    private fun cfg(vararg b: Double, preamp: Double = 0.0, bass: Double = 0.0, on: Boolean = true) =
        EqMap.Config(on, DoubleArray(10) { b.getOrElse(it) { 0.0 } }, preamp, bass)

    @Test fun parsesTheWebClientsJson() {
        val c = EqMap.parse("""{"on":true,"bands":[1,2,3,4,5,6,7,8,9,10],"preamp":-2,"bass":4}""")!!
        assertTrue(c.on); assertEquals(10.0, c.bands[9], 0.0); assertEquals(-2.0, c.preamp, 0.0); assertEquals(4.0, c.bass, 0.0)
        assertNull(EqMap.parse("not json"))
    }

    @Test fun flatOrOffIsNotActive() {
        assertFalse(cfg().active)
        assertFalse(cfg(6.0, on = false).active)
        assertTrue(cfg(bass = 1.0).active)
    }

    @Test fun interpolatesOnALogAxis() {
        val b = doubleArrayOf(0.0, 4.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -8.0)
        assertEquals(0.0, EqMap.gainAt(b, 10.0), 1e-9)
        assertEquals(4.0, EqMap.gainAt(b, 62.0), 1e-9)
        assertEquals(2.0, EqMap.gainAt(b, sqrt(31.0 * 62.0)), 1e-9)
        assertEquals(-8.0, EqMap.gainAt(b, 20000.0), 1e-9)
    }

    @Test fun bassFadesOut() {
        assertEquals(6.0, EqMap.bassAt(6.0, 40.0), 0.0)
        assertEquals(0.0, EqMap.bassAt(6.0, 300.0), 0.0)
        assertTrue(EqMap.bassAt(6.0, 120.0) in 0.1..5.9)
    }

    @Test fun makesRoomForBoostsLikeTheWebClient() {
        assertEquals(0.0, EqMap.preGainDb(cfg()), 1e-9)
        assertEquals(-5.5, EqMap.preGainDb(cfg(6.0, bass = 4.0)), 1e-9)
        assertEquals(0.0, EqMap.preGainDb(cfg(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -6.0)), 1e-9)
    }

    @Test fun fitsFiveHardwareBandsAndClampsToTheirRange() {
        val c = cfg(6.0, 6.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, bass = 0.0)
        val l = EqMap.levels(c, intArrayOf(60, 230, 910, 3600, 14000), -1500, 1500)
        assertEquals(5, l.size)
        assertTrue(l[0] > l[1]); assertEquals(l[1], l[2])
        assertEquals(-330, l[4]) // flat band, only the headroom (-6 * 0.55 dB) remains
        assertEquals(500, EqMap.levels(cfg(12.0), intArrayOf(31), -1500, 500)[0]) // +12 dB less 6.6 dB headroom = 540 mB, over the hardware's 500
    }
}
