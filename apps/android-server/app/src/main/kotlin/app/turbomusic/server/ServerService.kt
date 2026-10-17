package app.turbomusic.server

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.ServiceCompat
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

/**
 * The TurboMusic server, running inside this app: a foreground service in its own process (":node") that starts Node once. Node never returns
 * the process, so "stop" ends the process; "start" again begins a fresh one. There is no screen: other apps start it with an explicit intent
 * (it needs the signature permission, so only apps signed with the same key can).
 *
 * Spike: this proves the server runs in-process. yt-dlp and ffmpeg are NOT handled yet (docs/development/ANDROID_SERVER.md).
 */
class ServerService : Service() {
    private var wake: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ServerConfig.ACTION_STOP) { stopServer(); return START_NOT_STICKY }
        val port = ServerConfig.validPort(intent?.getIntExtra(ServerConfig.EXTRA_PORT, ServerConfig.PORT) ?: ServerConfig.PORT)
        showNotification(port)
        if (intent?.getBooleanExtra(ServerConfig.EXTRA_WAKE, false) == true && wake == null) {
            wake = getSystemService(PowerManager::class.java).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "turbomusic:server").apply { acquire() }
        }
        if (running.compareAndSet(false, true)) {
            val token = tokenFor(intent?.getStringExtra(ServerConfig.EXTRA_TOKEN))
            thread(name = "node", isDaemon = false) { runNode(token, port) }
        }
        return START_STICKY
    }

    /** The token from the starting app, else the one kept from last time, else a new one (kept in no_backup, so a restore never carries it). */
    private fun tokenFor(given: String?): String {
        val file = File(noBackupFilesDir, "token")
        val token = when {
            ServerConfig.isValidToken(given) -> given!!
            ServerConfig.isValidToken(file.takeIf { it.exists() }?.readText()?.trim()) -> file.readText().trim()
            else -> ServerConfig.newToken()
        }
        file.writeText(token)
        return token
    }

    private fun runNode(token: String, port: Int) {
        try {
            val bundle = BundleInstaller.ensure(this)
            val data = (getExternalFilesDir(null)?.let { File(it, "library") } ?: File(noBackupFilesDir, "library")).apply { mkdirs() }
            val tmp = File(cacheDir, "tmp").apply { mkdirs() }
            val code = NodeHost.run(ServerConfig.nodeArgs(bundle.path, data.path), ServerConfig.env(data.path, tmp.path, filesDir.path, File(bundle, "web").path, token, port), bundle.path)
            Log.w(TAG, "Node exited with code $code")
        } catch (e: Throwable) {
            Log.e(TAG, "The server could not start", e)
        }
        stopServer()
    }

    private fun stopServer() {
        wake?.takeIf { it.isHeld }?.release()
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
        android.os.Process.killProcess(android.os.Process.myPid()) // Node cannot be started twice in one process
    }

    private fun showNotification(port: Int) {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Server", NotificationManager.IMPORTANCE_LOW))
        val stop = PendingIntent.getService(this, 1, Intent(this, ServerService::class.java).setAction(ServerConfig.ACTION_STOP), PendingIntent.FLAG_IMMUTABLE)
        val n = Notification.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_server)
            .setContentTitle("TurboMusic server")
            .setContentText("Running on port $port")
            .setOngoing(true)
            .addAction(Notification.Action.Builder(null, "Stop", stop).build())
            .build()
        val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else ServiceInfo.FOREGROUND_SERVICE_TYPE_MANIFEST
        ServiceCompat.startForeground(this, 1, n, type)
    }

    companion object {
        private const val TAG = "TurboMusicServer"
        private const val CHANNEL = "server"
        private val running = AtomicBoolean(false)
    }
}
