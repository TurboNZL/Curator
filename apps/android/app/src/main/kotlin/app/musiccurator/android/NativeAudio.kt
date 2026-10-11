package app.musiccurator.android

import android.content.ComponentName
import android.content.Context
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import org.json.JSONArray
import org.json.JSONObject

/**
 * The page's connection to the app's real player (PlaybackService). Inside the app the web client does not play sound itself: a page's
 * `<audio>` gets no notification, no lock-screen controls and is cut when the page is suspended. Instead the page hands over the
 * current track plus the next few (it owns the queue and the playback rules), this object plays them in the service and reports back
 * what happens (`curator-audio` events: state every half second, track changes, errors), so the notification's Next and Previous,
 * a Bluetooth headset or the car move the page's queue along.
 *
 * The page talks to it through CuratorBridge (`audioSync`, `audioPlay`, ...); everything here runs on the main thread.
 */
object NativeAudio {
    private val main = Handler(Looper.getMainLooper())
    private var appContext: Context? = null
    private var controller: MediaController? = null
    private var connecting = false
    private val waiting = ArrayList<(MediaController) -> Unit>()
    private var volume = 1f
    private var ticking = false

    /** set by the activity while a page is showing; null otherwise (events are then dropped) */
    @Volatile var emit: ((String) -> Unit)? = null
        set(value) {
            field = value
            // a track change that happened while no page was listening (the screen off, the app in the background) is delivered when one is
            if (value != null) { pendingTransition?.let { value(it) }; pendingTransition = null }
        }
    private var pendingTransition: String? = null
    /** the latest state, so a page that was recreated can pick up where the player is */
    @Volatile var lastState: String = "{}"

    fun init(context: Context) { appContext = context.applicationContext }

    private class Item(val id: String, val key: String, val url: String, val title: String, val artist: String, val album: String, val art: String?)

    private fun parseItems(a: JSONArray): List<Item> = (0 until a.length()).map { i ->
        val o = a.getJSONObject(i)
        Item(o.getString("id"), o.optString("key", o.getString("id")), o.getString("url"), o.optString("title"), o.optString("artist"), o.optString("album"), o.optString("art").ifEmpty { null })
    }

    private fun mediaItem(i: Item): MediaItem = MediaItem.Builder()
        .setMediaId(i.id)
        .setUri(i.url)
        .setCustomCacheKey(i.key) // files are addressed by content hash, so a replay comes from the on-phone cache
        .setMediaMetadata(MediaMetadata.Builder().setTitle(i.title).setArtist(i.artist).setAlbumTitle(i.album)
            .setIsPlayable(true).setIsBrowsable(false).setMediaType(MediaMetadata.MEDIA_TYPE_MUSIC)
            .apply { i.art?.let { setArtworkUri(android.net.Uri.parse(it)) } }.build())
        .build()

    /** Runs `block` once the player is connected (connecting also starts the service). */
    private fun withController(block: (MediaController) -> Unit) {
        main.post {
            val c = controller
            if (c != null) { block(c); return@post }
            waiting.add(block)
            val ctx = appContext
            if (connecting || ctx == null) return@post
            connecting = true
            val token = SessionToken(ctx, ComponentName(ctx, PlaybackService::class.java))
            val future = MediaController.Builder(ctx, token).setListener(object : MediaController.Listener {
                override fun onDisconnected(controller: MediaController) { this@NativeAudio.controller = null }
            }).buildAsync()
            future.addListener({
                connecting = false
                try {
                    val ready = future.get()
                    ready.addListener(listener)
                    ready.volume = volume
                    controller = ready
                    val todo = ArrayList(waiting); waiting.clear()
                    todo.forEach { it(ready) }
                } catch (e: Exception) {
                    waiting.clear()
                    send(JSONObject().put("t", "error").put("message", "Could not start the player: ${e.message}").toString())
                }
            }, ContextCompat.getMainExecutor(ctx))
        }
    }

    // ---- page → player

    /**
     * `{currentId, positionMs, play, hard, items:[{id,key,url,title,artist,album,art}]}`: the playing track and its neighbours.
     * With `hard` (or when the player is on another track) the player restarts there; otherwise only the neighbours are replaced
     * and the sound is not interrupted.
     */
    fun sync(json: String) {
        val o = try { JSONObject(json) } catch (e: Exception) { return }
        val items = parseItems(o.getJSONArray("items"))
        val currentId = o.getString("currentId")
        val at = items.indexOfFirst { it.id == currentId }
        if (at < 0) return
        val hard = o.optBoolean("hard", false)
        val position = o.optLong("positionMs", 0L)
        val play = o.optBoolean("play", true)
        withController { c ->
            if (!hard && c.currentMediaItem?.mediaId == currentId) {
                val index = c.currentMediaItemIndex
                if (index + 1 < c.mediaItemCount) c.removeMediaItems(index + 1, c.mediaItemCount)
                if (index > 0) c.removeMediaItems(0, index)
                if (at > 0) c.addMediaItems(0, items.subList(0, at).map(::mediaItem))
                if (at + 1 < items.size) c.addMediaItems(items.subList(at + 1, items.size).map(::mediaItem))
            } else {
                c.setMediaItems(items.map(::mediaItem), at, position)
                c.prepare()
                if (play) c.play() else c.pause()
            }
        }
    }

    fun play() = withController { it.play() }
    fun pause() = withController { it.pause() }
    fun seek(ms: Long) = withController { it.seekTo(ms.coerceAtLeast(0)) }
    fun stop() = withController { it.pause(); it.clearMediaItems() }
    fun setVolume(v: Float) { volume = v.coerceIn(0f, 1f); controller?.let { c -> main.post { c.volume = volume } } }

    // ---- player → page

    private fun send(json: String) {
        val e = emit
        if (e != null) e(json)
        else if (json.startsWith("{\"t\":\"index\"") || json.startsWith("{\"t\":\"next\"")) pendingTransition = json
    }

    /** The notification, a headset or the car asked for the next track and the app's player has none left in its window: the page knows the rest of the queue. */
    fun requestNext() = send(JSONObject().put("t", "next").toString())
    fun requestPrevious() = send(JSONObject().put("t", "prev").toString())

    private fun id(c: MediaController): String = c.currentMediaItem?.mediaId ?: ""

    private fun state(c: MediaController): String {
        val dur = c.duration
        val s = JSONObject().put("t", "state").put("id", id(c)).put("playing", c.isPlaying).put("pos", c.currentPosition)
            .put("dur", if (dur == C.TIME_UNSET) 0L else dur).put("buffering", c.playbackState == Player.STATE_BUFFERING)
        return s.toString()
    }

    private fun sendState(c: MediaController) { val s = state(c); lastState = s; send(s) }

    private fun tick() {
        val c = controller
        if (c == null || !c.isPlaying) { ticking = false; return }
        sendState(c)
        main.postDelayed({ tick() }, 500)
    }

    private val listener = object : Player.Listener {
        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            val c = controller ?: return
            val ids = JSONArray((0 until c.mediaItemCount).map { c.getMediaItemAt(it).mediaId })
            val why = when (reason) {
                Player.MEDIA_ITEM_TRANSITION_REASON_AUTO -> "auto"
                Player.MEDIA_ITEM_TRANSITION_REASON_SEEK -> "seek"
                Player.MEDIA_ITEM_TRANSITION_REASON_PLAYLIST_CHANGED -> "playlist"
                else -> "repeat"
            }
            send(JSONObject().put("t", "index").put("id", id(c)).put("ids", ids).put("reason", why).toString())
            sendState(c)
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
            val c = controller ?: return
            sendState(c)
            if (isPlaying && !ticking) { ticking = true; main.postDelayed({ tick() }, 500) }
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            val c = controller ?: return
            if (playbackState == Player.STATE_ENDED) send(JSONObject().put("t", "ended").put("id", id(c)).toString())
            sendState(c)
        }

        override fun onPlayerError(error: PlaybackException) {
            val c = controller ?: return
            send(JSONObject().put("t", "error").put("id", id(c)).put("code", error.errorCodeName).put("message", error.message ?: error.errorCodeName).toString())
        }
    }
}
