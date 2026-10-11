package app.musiccurator.android

import android.content.Context
import android.webkit.JavascriptInterface
import app.musiccurator.android.update.AppUpdater

/** `window.CuratorAndroid` in the web client. Java interfaces carry strings only, so results are JSON and changes arrive as events. */
class CuratorBridge(private val context: Context) {
    private val prefs = ServerPrefs(context)

    @JavascriptInterface fun version(): String = BuildConfig.VERSION_NAME
    @JavascriptInterface fun updateState(): String = AppUpdater.state.json()
    @JavascriptInterface fun checkForUpdate() = AppUpdater.check(context)
    @JavascriptInterface fun installUpdate() = AppUpdater.install(context)
    @JavascriptInterface fun hasUpdateToken(): Boolean = prefs.updateToken.isNotEmpty()
    @JavascriptInterface fun setUpdateToken(token: String) { prefs.updateToken = token }
    /** the page may load library files from `/__server/…` on its own origin (see ServerFiles) */
    @JavascriptInterface fun fileProxy(): Boolean = true
    @JavascriptInterface fun webClientState(): String = WebClientUpdater.state.json()
    @JavascriptInterface fun webClientVersion(): String = WebClientUpdater.installedVersion(context) ?: ""
    @JavascriptInterface fun updateWebClient() = WebClientUpdater.update(context)
    @JavascriptInterface fun useBundledWebClient() { WebClientUpdater.reset(context); WebClientUpdater.reloader?.invoke() }
    @JavascriptInterface fun reloadWebClient() { WebClientUpdater.reloader?.invoke() }
    /** the web client tells the native side which server it uses, so Android Auto can browse the same library */
    @JavascriptInterface fun setServer(url: String, token: String) { prefs.serverUrl = url; prefs.token = token }
}
