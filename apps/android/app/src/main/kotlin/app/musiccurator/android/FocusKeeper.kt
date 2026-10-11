package app.musiccurator.android

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import androidx.media3.common.Player

/**
 * Audio focus, handled by hand instead of by ExoPlayer (`handleAudioFocus = false`). ExoPlayer's own handling refuses to play while
 * another app holds focus, and during a phone call that means pressing Play does nothing. This behaves like Spotify:
 *  - a call, an alarm or another music app pauses playback; when it was only a temporary loss, playback carries on afterwards by itself;
 *  - a navigation prompt (focus loss that may duck) only lowers the volume;
 *  - pressing Play always plays, even in the middle of a call; focus is requested, but the answer does not matter.
 * Must be created and used on the main thread.
 */
class FocusKeeper(context: Context, private val player: Player) {
    private val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val main = Handler(Looper.getMainLooper())
    private var request: AudioFocusRequest? = null
    /** playback was paused by a temporary loss and should resume when focus comes back */
    private var resumeOnGain = false
    private var pausedByFocus = false
    private var ducked = false
    private var volumeBeforeDuck = 1f

    private val onFocus = AudioManager.OnAudioFocusChangeListener { change ->
        when (change) {
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                if (!ducked) { ducked = true; volumeBeforeDuck = player.volume; player.volume = volumeBeforeDuck * 0.25f }
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                if (player.playWhenReady) { resumeOnGain = true; pausedByFocus = true; player.pause() }
            }
            AudioManager.AUDIOFOCUS_LOSS -> {
                // permanent (another music app took over): pause, and do not come back by itself
                resumeOnGain = false
                if (player.playWhenReady) { pausedByFocus = true; player.pause() }
                abandon()
            }
            AudioManager.AUDIOFOCUS_GAIN -> {
                if (ducked) { ducked = false; player.volume = volumeBeforeDuck }
                if (resumeOnGain) { resumeOnGain = false; player.play() }
            }
        }
    }

    private val listener = object : Player.Listener {
        override fun onPlayWhenReadyChanged(playWhenReady: Boolean, reason: Int) {
            if (playWhenReady) {
                pausedByFocus = false
                resumeOnGain = false
                request() // asked for, never waited for: Play works during a call too
            } else if (!pausedByFocus) {
                // the user (or the notification) paused: nothing should resume it later
                resumeOnGain = false
                abandon()
            }
            if (!playWhenReady) pausedByFocus = false
        }
    }

    init { player.addListener(listener) }

    private fun request() {
        if (request != null) return
        val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()
        val r = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(attrs).setOnAudioFocusChangeListener(onFocus, main).setWillPauseWhenDucked(false).build()
        request = r
        try { audio.requestAudioFocus(r) } catch (_: Exception) { /* playing without focus is still playing */ }
    }

    private fun abandon() {
        val r = request ?: return
        request = null
        if (ducked) { ducked = false; player.volume = volumeBeforeDuck }
        try { audio.abandonAudioFocusRequest(r) } catch (_: Exception) { /* ignore */ }
    }

    fun release() {
        player.removeListener(listener)
        abandon()
    }
}
