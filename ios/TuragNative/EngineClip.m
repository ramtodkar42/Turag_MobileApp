#import <AVFoundation/AVFoundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTBridgeModule.h>

// Reads the self-inspection's engine clip on the phone, for QC's checks (the web does this in the
// browser). Nothing is shown to the user, and one clip is read at a time on a background queue.
//   frames(uri, times, maxDim, quality) -> [{ t, base64 }]: JPEG stills at those times (seconds),
//     upright, the longest edge at most maxDim
//   sound(uri, maxSeconds) -> { sampleRate, base64 } | null: the soundtrack mixed to mono, as 16-bit
//     little-endian PCM at the clip's own sample rate. Null when there's no audio track, it can't be
//     decoded, or it takes too long.
@interface EngineClip : NSObject <RCTBridgeModule>
@end

// The web gives decoding 20 seconds too.
static const NSTimeInterval kDecodeTimeout = 20;

static NSURL *ClipURL(NSString *uri)
{
  NSURL *url = [NSURL URLWithString:uri];
  return url.scheme ? url : [NSURL fileURLWithPath:uri];
}

@implementation EngineClip

RCT_EXPORT_MODULE(EngineClip)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (dispatch_queue_t)methodQueue
{
  static dispatch_queue_t queue;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    queue = dispatch_queue_create("ai.turag.engineclip", DISPATCH_QUEUE_SERIAL);
  });
  return queue;
}

// The synchronous AVFoundation calls are fine here: this runs on its own background queue.
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"

RCT_EXPORT_METHOD(frames:(NSString *)uri
                  times:(NSArray<NSNumber *> *)times
                  maxDim:(double)maxDim
                  quality:(double)quality
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  AVURLAsset *asset = [AVURLAsset URLAssetWithURL:ClipURL(uri) options:nil];
  AVAssetImageGenerator *generator = [AVAssetImageGenerator assetImageGeneratorWithAsset:asset];
  generator.appliesPreferredTrackTransform = YES;
  generator.maximumSize = CGSizeMake(maxDim, maxDim);
  generator.requestedTimeToleranceBefore = CMTimeMakeWithSeconds(0.1, 600);
  generator.requestedTimeToleranceAfter = CMTimeMakeWithSeconds(0.1, 600);
  double duration = CMTimeGetSeconds(asset.duration);

  NSMutableArray *out = [NSMutableArray array];
  for (NSNumber *time in times) {
    double seconds = time.doubleValue;
    if (duration > 0) {
      seconds = MIN(seconds, MAX(0, duration - 0.05));
    }
    CMTime actual = kCMTimeZero;
    CGImageRef image = [generator copyCGImageAtTime:CMTimeMakeWithSeconds(seconds, 600) actualTime:&actual error:nil];
    if (!image) {
      continue;
    }
    NSData *jpeg = UIImageJPEGRepresentation([UIImage imageWithCGImage:image], quality);
    CGImageRelease(image);
    if (!jpeg) {
      continue;
    }
    [out addObject:@{
      @"t" : @(round(CMTimeGetSeconds(actual) * 1000) / 1000),
      @"base64" : [jpeg base64EncodedStringWithOptions:0],
    }];
  }
  resolve(out);
}

RCT_EXPORT_METHOD(sound:(NSString *)uri
                  maxSeconds:(double)maxSeconds
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  AVURLAsset *asset = [AVURLAsset URLAssetWithURL:ClipURL(uri) options:nil];
  AVAssetTrack *track = [asset tracksWithMediaType:AVMediaTypeAudio].firstObject;
  if (!track) {
    resolve([NSNull null]);
    return;
  }
  double sampleRate = 44100;
  CMAudioFormatDescriptionRef format = (__bridge CMAudioFormatDescriptionRef)track.formatDescriptions.firstObject;
  const AudioStreamBasicDescription *stream = format ? CMAudioFormatDescriptionGetStreamBasicDescription(format) : NULL;
  if (stream && stream->mSampleRate > 0) {
    sampleRate = stream->mSampleRate;
  }

  NSError *error = nil;
  AVAssetReader *reader = [AVAssetReader assetReaderWithAsset:asset error:&error];
  if (!reader) {
    resolve([NSNull null]);
    return;
  }
  NSDictionary *settings = @{
    AVFormatIDKey : @(kAudioFormatLinearPCM),
    AVSampleRateKey : @(sampleRate),
    AVNumberOfChannelsKey : @1,
    AVLinearPCMBitDepthKey : @16,
    AVLinearPCMIsFloatKey : @NO,
    AVLinearPCMIsBigEndianKey : @NO,
    AVLinearPCMIsNonInterleaved : @NO,
  };
  // The mix output averages the channels into one, as the web does.
  AVAssetReaderAudioMixOutput *output = [AVAssetReaderAudioMixOutput assetReaderAudioMixOutputWithAudioTracks:@[ track ]
                                                                                                audioSettings:settings];
  if (![reader canAddOutput:output]) {
    resolve([NSNull null]);
    return;
  }
  [reader addOutput:output];
  reader.timeRange = CMTimeRangeMake(kCMTimeZero, CMTimeMakeWithSeconds(maxSeconds, 600));
  if (![reader startReading]) {
    resolve([NSNull null]);
    return;
  }

  NSDate *deadline = [NSDate dateWithTimeIntervalSinceNow:kDecodeTimeout];
  NSMutableData *pcm = [NSMutableData data];
  CMSampleBufferRef sample = NULL;
  while ((sample = [output copyNextSampleBuffer])) {
    CMBlockBufferRef block = CMSampleBufferGetDataBuffer(sample);
    size_t length = block ? CMBlockBufferGetDataLength(block) : 0;
    if (length > 0) {
      NSUInteger offset = pcm.length;
      [pcm setLength:offset + length];
      CMBlockBufferCopyDataBytes(block, 0, length, (char *)pcm.mutableBytes + offset);
    }
    CFRelease(sample);
    if ([deadline timeIntervalSinceNow] < 0) {
      [reader cancelReading];
      resolve([NSNull null]);
      return;
    }
  }
  if (reader.status != AVAssetReaderStatusCompleted || pcm.length == 0) {
    resolve([NSNull null]);
    return;
  }
  resolve(@{ @"sampleRate" : @(sampleRate), @"base64" : [pcm base64EncodedStringWithOptions:0] });
}

#pragma clang diagnostic pop

@end
