package app.turbomusic.android

import org.json.JSONObject
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * The equaliser curve of the web client (ten bands, a bass shelf and an overall level; apps/web/src/lib/eqPresets.ts) fitted to the
 * phone's own `android.media.audiofx.Equalizer`, which usually has only five bands at fixed centres. No Android classes except
 * org.json (which the JVM tests supply), so it is unit-tested. Keep the maths in step with eqPresets.ts.
 */
object EqMap {
    val FREQS = intArrayOf(31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000)

    class Config(val on: Boolean, val bands: DoubleArray, val preamp: Double, val bass: Double) {
        val active: Boolean get() = on && (bass != 0.0 || preamp != 0.0 || bands.any { it != 0.0 })
    }

    fun parse(json: String): Config? = try {
        val o = JSONObject(json)
        val b = o.optJSONArray("bands")
        Config(o.optBoolean("on", false), DoubleArray(FREQS.size) { b?.optDouble(it, 0.0) ?: 0.0 }, o.optDouble("preamp", 0.0), o.optDouble("bass", 0.0))
    } catch (e: Exception) { null }

    /** gain in dB at `hz`, interpolated on a log-frequency axis between the band centres */
    fun gainAt(bands: DoubleArray, hz: Double): Double {
        if (hz <= FREQS.first()) return bands.first()
        if (hz >= FREQS.last()) return bands.last()
        var i = 0
        while (FREQS[i + 1] < hz) i++
        val t = (ln(hz) - ln(FREQS[i].toDouble())) / (ln(FREQS[i + 1].toDouble()) - ln(FREQS[i].toDouble()))
        return bands[i] + (bands[i + 1] - bands[i]) * t
    }

    /** the bass shelf: full under 80 Hz, fading out by about 220 Hz */
    fun bassAt(bass: Double, hz: Double): Double = when {
        hz <= 80 -> bass
        hz >= 220 -> 0.0
        else -> bass * (1 - (ln(hz) - ln(80.0)) / (ln(220.0) - ln(80.0)))
    }

    /** overall level in dB: the user's preamp minus most of the boost, so boosted music does not clip */
    fun preGainDb(c: Config): Double = c.preamp - (max(0.0, c.bands.max()) + max(0.0, c.bass)) * 0.55

    /** Band levels in millibel for hardware bands centred at `centresHz`, clamped to the range the hardware allows. */
    fun levels(c: Config, centresHz: IntArray, minMb: Int, maxMb: Int): IntArray {
        val pre = preGainDb(c)
        return IntArray(centresHz.size) { i ->
            val hz = centresHz[i].toDouble().coerceAtLeast(1.0)
            ((gainAt(c.bands, hz) + bassAt(c.bass, hz) + pre) * 100).roundToInt().coerceIn(minMb, maxMb)
        }
    }

}
