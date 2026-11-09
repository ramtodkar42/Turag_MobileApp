package com.turag.file

import android.net.Uri
import android.os.SystemClock
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.io.File
import java.io.FileNotFoundException
import java.net.InetAddress
import java.net.Socket
import java.security.MessageDigest
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import javax.net.SocketFactory
import okhttp3.MediaType
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.RequestBody
import okio.Buffer
import okio.BufferedSink
import okio.source

/**
 * Turag's file helpers for uploads.
 *   digest(uri) -> { size, sha256 }: the file's byte size and SHA-256 (lower-case hex), which the
 *     backend asks for before it hands out an upload target. Read 1 MB at a time on a background
 *     thread, so even a 2-minute walkaround video (tens of MB) is never held in memory - reading it
 *     whole in JavaScript ran the phone out of memory.
 *   upload(id, uri, url, method, headers, timeoutMs) -> { status, body }: sends the file straight to
 *     an upload target (a signed S3 link). The body is the file itself with its exact length, and it
 *     is read again from the start whenever OkHttp has to resend it (a dropped connection, a redirect).
 *     React Native's own file body is a one-time stream that a resend leaves empty, so S3 waited for
 *     bytes that never came and refused the upload after reaching 100%. Progress goes out as
 *     "TuragFileUploadProgress" { id, sent, total } events, about every 100 ms.
 *     "Sent" means sent: the connection keeps only a small send buffer (the phone's default can hold
 *     several MB, so the bar reached 100% long before the bytes had really gone out).
 */
class TuragFileModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  private val worker = Executors.newSingleThreadExecutor()
  private val uploads = Executors.newSingleThreadExecutor()
  private val client: OkHttpClient by lazy {
    OkHttpClient.Builder()
      .connectTimeout(CONNECT_TIMEOUT_S, TimeUnit.SECONDS)
      // One big PUT: plain HTTP/1.1 (no HTTP/2 flow-control windows in the way).
      .protocols(listOf(Protocol.HTTP_1_1))
      .socketFactory(SmallSendBufferSockets(SEND_BUFFER_BYTES))
      .build()
  }

  override fun getName() = "TuragFile"

  @ReactMethod
  fun digest(uri: String, promise: Promise) {
    worker.execute {
      try {
        val parsed = Uri.parse(if (uri.startsWith("/")) "file://$uri" else uri)
        val input = context.contentResolver.openInputStream(parsed) ?: throw FileNotFoundException(uri)
        val sha256 = MessageDigest.getInstance("SHA-256")
        var size = 0L
        input.use { stream ->
          val buffer = ByteArray(CHUNK_BYTES)
          while (true) {
            val read = stream.read(buffer)
            if (read == -1) break
            sha256.update(buffer, 0, read)
            size += read
          }
        }
        val hex = StringBuilder(64)
        for (byte in sha256.digest()) {
          val value = byte.toInt() and 0xff
          hex.append(HEX[value ushr 4]).append(HEX[value and 0x0f])
        }
        promise.resolve(
          Arguments.createMap().apply {
            putDouble("size", size.toDouble())
            putString("sha256", hex.toString())
          },
        )
      } catch (e: Exception) {
        promise.reject("unreadable", e)
      }
    }
  }

  @ReactMethod
  fun upload(
    id: String,
    uri: String,
    url: String,
    method: String,
    headers: ReadableMap,
    timeoutMs: Double,
    promise: Promise,
  ) {
    uploads.execute {
      try {
        val file = fileOf(uri)
        val names = headers.keySetIterator()
        var contentType: String? = null
        val request = Request.Builder().url(url)
        while (names.hasNextKey()) {
          val name = names.nextKey()
          val value = headers.getString(name) ?: continue
          if (name.equals("content-type", ignoreCase = true)) contentType = value
          request.header(name, value)
        }
        val throttle = Throttle()
        val body = FileBody(file, contentType?.toMediaTypeOrNull()) { sent, total ->
          if (throttle.due(sent >= total)) {
            context.emitDeviceEvent(
              PROGRESS_EVENT,
              Arguments.createMap().apply {
                putString("id", id)
                putDouble("sent", sent.toDouble())
                putDouble("total", total.toDouble())
              },
            )
          }
        }
        request.method(method.uppercase(), body)
        val timeout = timeoutMs.toLong().coerceAtLeast(MIN_TIMEOUT_MS)
        val call =
          client
            .newBuilder()
            .writeTimeout(timeout, TimeUnit.MILLISECONDS)
            .readTimeout(timeout, TimeUnit.MILLISECONDS)
            .callTimeout(timeout, TimeUnit.MILLISECONDS)
            .build()
            .newCall(request.build())
        call.execute().use { response ->
          val text = response.body?.string().orEmpty()
          promise.resolve(
            Arguments.createMap().apply {
              putInt("status", response.code)
              putString("body", text.take(MAX_BODY_CHARS))
            },
          )
        }
      } catch (e: Exception) {
        promise.reject("network", e.message ?: e.javaClass.simpleName, e)
      }
    }
  }

  override fun invalidate() {
    worker.shutdown()
    uploads.shutdown()
    super.invalidate()
  }

  private fun fileOf(uri: String): File {
    val parsed = Uri.parse(if (uri.startsWith("/")) "file://$uri" else uri)
    val path = parsed.path
    if (parsed.scheme != "file" || path == null) throw FileNotFoundException("Not a file: $uri")
    val file = File(path)
    if (!file.isFile) throw FileNotFoundException(uri)
    return file
  }

  /** The file as a request body: exact length, read from the start every time it's written. */
  private class FileBody(
    private val file: File,
    private val type: MediaType?,
    private val onProgress: (Long, Long) -> Unit,
  ) : RequestBody() {
    override fun contentType(): MediaType? = type

    override fun contentLength(): Long = file.length()

    override fun writeTo(sink: BufferedSink) {
      val total = file.length()
      var sent = 0L
      file.source().use { source ->
        val buffer = Buffer()
        while (true) {
          val read = source.read(buffer, CHUNK_BYTES.toLong())
          if (read == -1L) break
          sink.write(buffer, read)
          sent += read
          onProgress(sent, total)
        }
      }
    }
  }

  /** Plain sockets with a small send buffer, so the upload progress follows what has really gone out. */
  private class SmallSendBufferSockets(private val bytes: Int) : SocketFactory() {
    private val system: SocketFactory = SocketFactory.getDefault()

    private fun tuned(socket: Socket): Socket = socket.apply { sendBufferSize = bytes }

    override fun createSocket(): Socket = tuned(system.createSocket())

    override fun createSocket(host: String?, port: Int): Socket = tuned(system.createSocket(host, port))

    override fun createSocket(host: String?, port: Int, localHost: InetAddress?, localPort: Int): Socket =
      tuned(system.createSocket(host, port, localHost, localPort))

    override fun createSocket(host: InetAddress?, port: Int): Socket = tuned(system.createSocket(host, port))

    override fun createSocket(address: InetAddress?, port: Int, localAddress: InetAddress?, localPort: Int): Socket =
      tuned(system.createSocket(address, port, localAddress, localPort))
  }

  /** At most one progress event every PROGRESS_EVERY_MS, plus the last one. */
  private class Throttle {
    private var last = 0L

    fun due(done: Boolean): Boolean {
      val now = SystemClock.elapsedRealtime()
      if (!done && now - last < PROGRESS_EVERY_MS) return false
      last = now
      return true
    }
  }

  private companion object {
    const val CHUNK_BYTES = 1 shl 20
    const val HEX = "0123456789abcdef"
    const val PROGRESS_EVENT = "TuragFileUploadProgress"
    const val PROGRESS_EVERY_MS = 100L
    const val CONNECT_TIMEOUT_S = 30L
    const val MIN_TIMEOUT_MS = 30_000L
    const val MAX_BODY_CHARS = 4000
    // Enough to keep a phone network busy (Android doubles it), small enough that 100% is close to done.
    const val SEND_BUFFER_BYTES = 256 * 1024
  }
}
