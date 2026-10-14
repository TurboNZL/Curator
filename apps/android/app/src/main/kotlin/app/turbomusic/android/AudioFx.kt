package app.turbomusic.android

import android.media.audiofx.Equalizer

/**
 * Applies the web client's equaliser curve (see EqMap) to the app's player through the phone's `Equalizer` effect. The effect is bound
 * to the player's audio session, which changes when the player is rebuilt, hence `attach`.
 */
class AudioFx(private val prefs: ServerPrefs) {
    private var eq: Equalizer? = null

    fun attach(sessionId: Int) {
        release()
        if (sessionId == 0) return
        eq = try { Equalizer(0, sessionId) } catch (e: Exception) { null } // some devices have none
        apply()
    }

    fun apply() {
        val e = eq ?: return
        try {
            val cfg = EqMap.parse(prefs.eq)
            if (cfg == null || !cfg.active) { e.enabled = false; return }
            val range = e.bandLevelRange
            val centres = IntArray(e.numberOfBands.toInt()) { e.getCenterFreq(it.toShort()) / 1000 } // reported in millihertz
            val levels = EqMap.levels(cfg, centres, range[0].toInt(), range[1].toInt())
            for (i in levels.indices) e.setBandLevel(i.toShort(), levels[i].toShort())
            e.enabled = true
        } catch (ex: Exception) { /* an effect that cannot be set is not worth stopping the music for */ }
    }

    fun release() { try { eq?.release() } catch (e: Exception) { /* already gone */ }; eq = null }

    companion object {
        /** the running service's effect, so a change in Settings reaches it at once */
        @Volatile var current: AudioFx? = null
    }
}
