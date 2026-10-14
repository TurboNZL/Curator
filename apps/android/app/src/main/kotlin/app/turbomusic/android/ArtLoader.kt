package app.turbomusic.android

import android.graphics.Bitmap
import android.net.Uri
import android.util.LruCache
import androidx.media3.common.util.BitmapLoader
import androidx.media3.common.util.UnstableApi
import com.google.common.util.concurrent.FutureCallback
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors

/**
 * The notification / lock-screen cover loader with a small memory of what it already fetched. Every sync from the page re-sends the
 * playing track and its neighbours, and without this each one downloaded its cover again over the tunnel, competing with the song that
 * was starting. A failed load is forgotten so the next attempt tries again.
 */
@UnstableApi
class ArtLoader(private val inner: BitmapLoader) : BitmapLoader {
    private val cache = LruCache<String, ListenableFuture<Bitmap>>(12)

    override fun supportsMimeType(mimeType: String): Boolean = inner.supportsMimeType(mimeType)
    override fun decodeBitmap(data: ByteArray): ListenableFuture<Bitmap> = inner.decodeBitmap(data)

    override fun loadBitmap(uri: Uri): ListenableFuture<Bitmap> {
        val key = uri.toString()
        synchronized(cache) { cache.get(key)?.let { if (!it.isCancelled) return it } }
        val future = inner.loadBitmap(uri)
        synchronized(cache) { cache.put(key, future) }
        Futures.addCallback(future, object : FutureCallback<Bitmap> {
            override fun onSuccess(result: Bitmap?) {}
            override fun onFailure(t: Throwable) { synchronized(cache) { if (cache.get(key) === future) cache.remove(key) } }
        }, MoreExecutors.directExecutor())
        return future
    }
}
