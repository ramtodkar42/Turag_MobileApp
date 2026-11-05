package com.turag.update

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability

/**
 * Google Play's in-app update, flexible type: Google shows its own prompt, the update
 * downloads while the app is in use, and the app then asks the user to restart. Google
 * Play decides whether a newer version exists, so there's nothing for the backend to do.
 * Works only for an app installed from Google Play. Sends one event:
 *   InAppUpdate_downloaded {}   ready to install (see install)
 */
class InAppUpdateModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  private val manager: AppUpdateManager by lazy { AppUpdateManagerFactory.create(context) }
  private var listening = false

  private val listener = InstallStateUpdatedListener { state ->
    if (state.installStatus() == InstallStatus.DOWNLOADED && context.hasActiveReactInstance()) {
      context.emitDeviceEvent("InAppUpdate_downloaded", Arguments.createMap())
    }
  }

  override fun getName() = "InAppUpdate"

  /** Resolves { available, downloaded }: a newer version on Play, or one already downloaded. */
  @ReactMethod
  fun check(promise: Promise) {
    manager.appUpdateInfo
      .addOnSuccessListener { info ->
        promise.resolve(
          Arguments.createMap().apply {
            putBoolean(
              "available",
              info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE &&
                info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE),
            )
            putBoolean("downloaded", info.installStatus() == InstallStatus.DOWNLOADED)
          },
        )
      }
      .addOnFailureListener { promise.reject("unavailable", it) }
  }

  /** Shows Google's prompt. Resolves true if it was shown. */
  @ReactMethod
  fun start(promise: Promise) {
    val activity = context.currentActivity
    if (activity == null) {
      promise.resolve(false)
      return
    }
    if (!listening) {
      manager.registerListener(listener)
      listening = true
    }
    manager.appUpdateInfo
      .addOnSuccessListener { info ->
        try {
          promise.resolve(
            manager.startUpdateFlowForResult(
              info,
              activity,
              AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(),
              UPDATE_REQUEST_CODE,
            ),
          )
        } catch (e: Exception) {
          promise.reject("unavailable", e)
        }
      }
      .addOnFailureListener { promise.reject("unavailable", it) }
  }

  /** Installs the downloaded update; the app restarts. */
  @ReactMethod
  fun install() {
    manager.completeUpdate()
  }

  // Required by NativeEventEmitter (the events are simply always sent).
  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Int) {}

  override fun invalidate() {
    if (listening) {
      manager.unregisterListener(listener)
      listening = false
    }
    super.invalidate()
  }

  private companion object {
    const val UPDATE_REQUEST_CODE = 4210
  }
}
