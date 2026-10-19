package com.turag.voice

import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap

/**
 * Voice search with Android's built-in speech recognition (the same engine as
 * the keyboard's mic) - no backend, no API key. The app shows its own
 * listening UI; this sends what was heard as events:
 *   VoiceSearch_partial { text }   words so far, while speaking
 *   VoiceSearch_result  { text }   the final text
 *   VoiceSearch_level   { level }  mic level 0..1 (for the animation)
 *   VoiceSearch_error   { code }   "no_match" | "permission" | "network" | "busy" | "unavailable" | "error"
 *   VoiceSearch_end     {}         stopped listening (after a result or error too)
 * SpeechRecognizer must be created and used on the main thread.
 */
class VoiceSearchModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  private var recognizer: SpeechRecognizer? = null

  override fun getName() = "VoiceSearch"

  private fun emit(event: String, params: WritableMap = Arguments.createMap()) {
    if (context.hasActiveReactInstance()) {
      context.emitDeviceEvent(event, params)
    }
  }

  private fun textEvent(event: String, results: Bundle?) {
    val text = results
      ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
      ?.firstOrNull()
      ?.trim()
      .orEmpty()
    emit(event, Arguments.createMap().apply { putString("text", text) })
  }

  private val listener = object : RecognitionListener {
    override fun onReadyForSpeech(params: Bundle?) {}
    override fun onBeginningOfSpeech() {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEvent(eventType: Int, params: Bundle?) {}

    override fun onRmsChanged(rmsdB: Float) {
      // Roughly -2..10 dB while speaking -> 0..1.
      val level = ((rmsdB + 2f) / 12f).coerceIn(0f, 1f)
      emit("VoiceSearch_level", Arguments.createMap().apply { putDouble("level", level.toDouble()) })
    }

    override fun onPartialResults(partialResults: Bundle?) = textEvent("VoiceSearch_partial", partialResults)

    override fun onResults(results: Bundle?) {
      textEvent("VoiceSearch_result", results)
      emit("VoiceSearch_end")
    }

    override fun onEndOfSpeech() {}

    override fun onError(error: Int) {
      val code = when (error) {
        SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "no_match"
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "permission"
        SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT,
        SpeechRecognizer.ERROR_SERVER -> "network"
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "busy"
        else -> "error"
      }
      emit("VoiceSearch_error", Arguments.createMap().apply { putString("code", code) })
      emit("VoiceSearch_end")
    }
  }

  /** Whether this phone has a speech recognition service. */
  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(SpeechRecognizer.isRecognitionAvailable(context))
  }

  /** Starts listening in [locale] (e.g. "en-IN", "hi-IN", "mr-IN"). */
  @ReactMethod
  fun start(locale: String, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
          emit("VoiceSearch_error", Arguments.createMap().apply { putString("code", "unavailable") })
          promise.resolve(false)
          return@runOnUiThread
        }
        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
          setRecognitionListener(listener)
        }
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
          putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
          putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale)
          putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
          putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
          putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
        }
        recognizer?.startListening(intent)
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("voice_start_failed", e.message, e)
      }
    }
  }

  /** Stops listening; what was said so far still comes back as a result. */
  @ReactMethod
  fun stop() {
    UiThreadUtil.runOnUiThread { recognizer?.stopListening() }
  }

  /** Stops listening without a result and frees the recognizer. */
  @ReactMethod
  fun cancel() {
    UiThreadUtil.runOnUiThread {
      recognizer?.cancel()
      recognizer?.destroy()
      recognizer = null
    }
  }

  // Required by NativeEventEmitter on the JS side.
  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Int) {}

  override fun invalidate() {
    UiThreadUtil.runOnUiThread {
      recognizer?.destroy()
      recognizer = null
    }
    super.invalidate()
  }
}
