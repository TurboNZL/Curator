package app.musiccurator.android

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.view.HapticFeedbackConstants
import android.view.View
import android.webkit.JavascriptInterface
import app.musiccurator.android.update.AppUpdater

/** `window.CuratorAndroid` in the web client. Java interfaces carry strings only, so results are JSON and changes arrive as events. */
class CuratorBridge(private val context: Context, private val view: View) {
    private val prefs = ServerPrefs(context)

    @JavascriptInterface fun version(): String = BuildConfig.VERSION_NAME
    @JavascriptInterface fun updateState(): String = AppUpdater.state.json()
    @JavascriptInterface fun checkForUpdate() = AppUpdater.check(context)
    @JavascriptInterface fun installUpdate() = AppUpdater.install(context)
    @JavascriptInterface fun hasUpdateToken(): Boolean = prefs.updateToken.isNotEmpty()
    @JavascriptInterface fun setUpdateToken(token: String) { prefs.updateToken = token }
    /** the web client tells the native side which server it uses, so Android Auto can browse the same library */
    @JavascriptInterface fun setServer(url: String, token: String) { prefs.serverUrl = url; prefs.token = token }

    // ---- the app's own player (notification, lock screen, Bluetooth and car controls): see NativeAudio
    @JavascriptInterface fun audioSync(json: String) = NativeAudio.sync(json)
    @JavascriptInterface fun audioPlay() = NativeAudio.play()
    @JavascriptInterface fun audioPause() = NativeAudio.pause()
    @JavascriptInterface fun audioSeek(ms: Double) = NativeAudio.seek(ms.toLong())
    @JavascriptInterface fun audioVolume(v: Double) = NativeAudio.setVolume(v.toFloat())
    @JavascriptInterface fun audioStop() = NativeAudio.stop()
    @JavascriptInterface fun audioState(): String = NativeAudio.lastState
    /** the equaliser curve as JSON ({on, bands[10], preamp, bass}); kept so the car's playback has it as well */
    @JavascriptInterface fun setEq(json: String) {
        prefs.eq = json
        Handler(Looper.getMainLooper()).post { AudioFx.current?.apply() }
    }

    /** Haptic feedback with the phone's own engine; follows the system "touch feedback" setting. */
    @JavascriptInterface fun haptic(kind: String) {
        val type = when (kind) {
            "tick" -> HapticFeedbackConstants.CLOCK_TICK
            "confirm" -> if (android.os.Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.VIRTUAL_KEY
            "reject" -> if (android.os.Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS
            "heavy" -> HapticFeedbackConstants.LONG_PRESS
            else -> HapticFeedbackConstants.VIRTUAL_KEY
        }
        view.post { view.performHapticFeedback(type) }
    }
}
