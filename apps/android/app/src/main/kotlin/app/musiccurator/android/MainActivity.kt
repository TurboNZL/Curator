package app.musiccurator.android

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import app.musiccurator.android.update.AppUpdater

/**
 * Shows the web client (bundled in the app's assets, served from a private https address so IndexedDB and fetch behave like on the
 * web) full screen. The library, voting and everything else are the web app; this class only supplies what a browser cannot:
 * file picking, opening links outside, the update bridge and the server address for Android Auto.
 */
class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private val chooser = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(r.resultCode, r.data))
        fileCallback = null
    }
    private val notifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        setContentView(web)
        ViewCompat.setOnApplyWindowInsetsListener(web) { v, insets ->
            val b = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime())
            v.setPadding(b.left, b.top, b.right, b.bottom)
            insets
        }
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            // the page is https, the user's server is often plain http on the home network
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            allowFileAccess = false
            allowContentAccess = false
        }
        web.setBackgroundColor(0xFF0B0B10.toInt())
        web.addJavascriptInterface(CuratorBridge(this), "CuratorAndroid")

        val loader = WebViewAssetLoader.Builder().setDomain(HOST).addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val uri = request.url
                var resp = loader.shouldInterceptRequest(uri)
                // a route of the web app (/albums/…): every such path is index.html
                if ((resp == null || resp.statusCode == 404) && uri.host == HOST && !(uri.lastPathSegment ?: "").contains('.'))
                    resp = loader.shouldInterceptRequest(Uri.parse("https://$HOST/index.html"))
                return resp
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (request.url.host == HOST) return false
                runCatching { startActivity(Intent(Intent.ACTION_VIEW, request.url)) }
                return true
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try { chooser.launch(params.createIntent()); true } catch (e: Exception) { fileCallback = null; false }
            }
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.canGoBack()) web.goBack() else { isEnabled = false; onBackPressedDispatcher.onBackPressed() }
            }
        })

        AppUpdater.listener = { s ->
            web.post { web.evaluateJavascript("window.dispatchEvent(new CustomEvent('curator-update',{detail:${s.json()}}))", null) }
        }
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            notifications.launch(Manifest.permission.POST_NOTIFICATIONS)

        if (savedInstanceState == null) web.loadUrl("https://$HOST/") else web.restoreState(savedInstanceState)
    }

    override fun onStart() {
        super.onStart()
        // look for a new version when the app opens, at most every 6 hours
        if (System.currentTimeMillis() - ServerPrefs(this).lastUpdateCheck > 6 * 3600_000L) AppUpdater.check(this)
    }

    override fun onSaveInstanceState(outState: Bundle) { super.onSaveInstanceState(outState); web.saveState(outState) }

    override fun onDestroy() {
        AppUpdater.listener = null
        web.destroy()
        super.onDestroy()
    }

    private companion object { const val HOST = "appassets.androidplatform.net" }
}
