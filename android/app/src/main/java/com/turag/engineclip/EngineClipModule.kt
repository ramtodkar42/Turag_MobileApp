package com.turag.engineclip

import android.graphics.Bitmap
import android.graphics.Matrix
import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.roundToLong

/**
 * Reads the self-inspection's engine clip on the phone, for QC's checks (the web does this in the
 * browser). Nothing is shown to the user, and one clip is read at a time on a background thread.
 *   frames(uri, times, maxDim, quality) -> [{ t, base64 }]: JPEG stills at those times (seconds),
 *     upright, the longest edge at most maxDim
 *   sound(uri, maxSeconds) -> { sampleRate, base64 } | null: the soundtrack mixed to mono, as 16-bit
 *     little-endian PCM at the clip's own sample rate. Null when there's no audio track, it can't be
 *     decoded, or it takes too long.
 */
class EngineClipModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  private val worker = Executors.newSingleThreadExecutor()

  override fun getName() = "EngineClip"

  @ReactMethod
  fun frames(uri: String, times: ReadableArray, maxDim: Double, quality: Double, promise: Promise) {
    worker.execute {
      val retriever = MediaMetadataRetriever()
      try {
        retriever.setDataSource(context, Uri.parse(uri))
        val durationUs = (metadata(retriever, MediaMetadataRetriever.METADATA_KEY_DURATION) ?: 0L) * 1000
        val rotation = metadata(retriever, MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toInt() ?: 0
        val rawWidth = metadata(retriever, MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toInt() ?: 0
        val rawHeight = metadata(retriever, MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toInt() ?: 0
        val out = Arguments.createArray()
        for (i in 0 until times.size()) {
          var us = (times.getDouble(i) * 1_000_000).roundToLong()
          if (durationUs > 0) us = us.coerceIn(0L, max(0L, durationUs - 50_000L))
          val frame = retriever.getFrameAtTime(us, MediaMetadataRetriever.OPTION_CLOSEST) ?: continue
          val upright = upright(frame, rotation, rawWidth, rawHeight)
          val jpeg = encode(upright, maxDim.roundToInt(), quality)
          out.pushMap(
            Arguments.createMap().apply {
              putDouble("t", (us / 1000.0).roundToLong() / 1000.0)
              putString("base64", Base64.encodeToString(jpeg, Base64.NO_WRAP))
            },
          )
        }
        promise.resolve(out)
      } catch (e: Exception) {
        promise.reject("unavailable", e)
      } finally {
        try {
          retriever.release()
        } catch (_: Exception) {
        }
      }
    }
  }

  @ReactMethod
  fun sound(uri: String, maxSeconds: Double, promise: Promise) {
    worker.execute {
      val extractor = MediaExtractor()
      var decoder: MediaCodec? = null
      try {
        extractor.setDataSource(context, Uri.parse(uri), null)
        val track = (0 until extractor.trackCount).firstOrNull {
          extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true
        }
        if (track == null) {
          promise.resolve(null)
          return@execute
        }
        extractor.selectTrack(track)
        val format = extractor.getTrackFormat(track)
        val codec = MediaCodec.createDecoderByType(format.getString(MediaFormat.KEY_MIME)!!)
        decoder = codec
        codec.configure(format, null, null, 0)
        codec.start()

        var sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
        var channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
        var isFloat = false
        val pcm = ByteArrayOutputStream()
        val info = MediaCodec.BufferInfo()
        val deadline = System.currentTimeMillis() + TIMEOUT_MS
        var inputDone = false
        var finished = false
        var frames = 0L
        while (!finished) {
          if (System.currentTimeMillis() > deadline) {
            promise.resolve(null)
            return@execute
          }
          if (!inputDone) {
            val index = codec.dequeueInputBuffer(WAIT_US)
            if (index >= 0) {
              val buffer = codec.getInputBuffer(index)
              val size = if (buffer != null) extractor.readSampleData(buffer, 0) else -1
              if (size < 0) {
                codec.queueInputBuffer(index, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                inputDone = true
              } else {
                codec.queueInputBuffer(index, 0, size, extractor.sampleTime, 0)
                extractor.advance()
              }
            }
          }
          val index = codec.dequeueOutputBuffer(info, WAIT_US)
          if (index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
            val out = codec.outputFormat
            sampleRate = out.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            channels = out.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            isFloat = out.containsKey(MediaFormat.KEY_PCM_ENCODING) &&
              out.getInteger(MediaFormat.KEY_PCM_ENCODING) == AudioFormat.ENCODING_PCM_FLOAT
          } else if (index >= 0) {
            val buffer = codec.getOutputBuffer(index)
            if (buffer != null && info.size > 0) {
              buffer.position(info.offset)
              buffer.limit(info.offset + info.size)
              // slice() starts big-endian: the decoder writes in the device's own order.
              frames += mixToMono(buffer.slice().order(ByteOrder.nativeOrder()), channels, isFloat, pcm)
            }
            codec.releaseOutputBuffer(index, false)
            finished = (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0 || frames >= maxSeconds * sampleRate
          }
        }
        if (frames == 0L) {
          promise.resolve(null)
          return@execute
        }
        promise.resolve(
          Arguments.createMap().apply {
            putInt("sampleRate", sampleRate)
            putString("base64", Base64.encodeToString(pcm.toByteArray(), Base64.NO_WRAP))
          },
        )
      } catch (e: Exception) {
        // A clip the phone can't decode: "not measured", as the web.
        promise.resolve(null)
      } finally {
        try {
          decoder?.stop()
        } catch (_: Exception) {
        }
        decoder?.release()
        extractor.release()
      }
    }
  }

  override fun invalidate() {
    worker.shutdown()
    super.invalidate()
  }

  private fun metadata(retriever: MediaMetadataRetriever, key: Int): Long? =
    retriever.extractMetadata(key)?.toLongOrNull()

  /** Turns a frame upright when this phone returned it as stored rather than as filmed. */
  private fun upright(frame: Bitmap, rotation: Int, rawWidth: Int, rawHeight: Int): Bitmap {
    val sideways = rotation == 90 || rotation == 270
    val notTurned = frame.width == rawWidth && frame.height == rawHeight && rawWidth != rawHeight
    if (!sideways || !notTurned) return frame
    val matrix = Matrix().apply { postRotate(rotation.toFloat()) }
    return Bitmap.createBitmap(frame, 0, 0, frame.width, frame.height, matrix, true)
  }

  private fun encode(frame: Bitmap, maxDim: Int, quality: Double): ByteArray {
    val scale = min(1.0, maxDim.toDouble() / max(frame.width, frame.height))
    val scaled =
      if (scale < 1.0) {
        Bitmap.createScaledBitmap(
          frame,
          max(1, (frame.width * scale).roundToInt()),
          max(1, (frame.height * scale).roundToInt()),
          true,
        )
      } else {
        frame
      }
    val out = ByteArrayOutputStream()
    scaled.compress(Bitmap.CompressFormat.JPEG, (quality * 100).roundToInt().coerceIn(1, 100), out)
    return out.toByteArray()
  }

  /** Appends the buffer as 16-bit mono (the channels averaged, as the web). Returns the frames added. */
  private fun mixToMono(buffer: ByteBuffer, channels: Int, isFloat: Boolean, out: ByteArrayOutputStream): Long {
    val count = max(1, channels)
    val bytesPerSample = if (isFloat) 4 else 2
    val frames = buffer.remaining() / (bytesPerSample * count)
    val bytes = ByteArray(frames * 2)
    for (f in 0 until frames) {
      var sum = 0.0
      for (c in 0 until count) {
        sum += if (isFloat) buffer.float.toDouble() else buffer.short / 32768.0
      }
      val value = (sum / count * 32767).roundToInt().coerceIn(-32768, 32767)
      bytes[2 * f] = (value and 0xff).toByte()
      bytes[2 * f + 1] = ((value shr 8) and 0xff).toByte()
    }
    out.write(bytes)
    return frames.toLong()
  }

  private companion object {
    const val WAIT_US = 10_000L
    // The web gives decoding 20 seconds too.
    const val TIMEOUT_MS = 20_000L
  }
}
