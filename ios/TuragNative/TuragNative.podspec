# Turag's own native code for iOS (added in the Podfile): EngineClip, which reads the
# self-inspection's engine clip on the phone for QC's checks, and TuragFile, which gives a
# big file's size + SHA-256 read in pieces (video uploads). CommonCrypto is part of the
# system, so no extra framework is listed for it.
Pod::Spec.new do |s|
  s.name         = 'TuragNative'
  s.version      = '1.0.0'
  s.summary      = "Turag's own native modules for iOS."
  s.homepage     = 'https://turag.ai'
  s.license      = { :type => 'Proprietary' }
  s.authors      = 'Turag'
  s.platforms    = { :ios => '15.1' }
  # Used from this folder (the Podfile's :path), so this source is never fetched.
  s.source       = { :git => 'https://github.com/ramtodkar42/Turag_MobileApp.git', :tag => s.version.to_s }
  s.source_files = '*.{h,m}'
  s.frameworks   = 'AVFoundation', 'CoreMedia', 'UIKit'
  s.dependency 'React-Core'
end
