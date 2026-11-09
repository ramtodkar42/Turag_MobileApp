package com.turag

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.turag.engineclip.EngineClipPackage
import com.turag.file.TuragFilePackage
import com.turag.update.InAppUpdatePackage
import com.turag.voice.VoiceSearchPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
          add(VoiceSearchPackage()) // voice search (Android speech recognition)
          add(InAppUpdatePackage()) // Google Play's in-app update
          add(EngineClipPackage()) // the self-inspection's engine clip, read for QC
          add(TuragFilePackage()) // a big file's size + SHA-256, read in pieces (video uploads)
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
