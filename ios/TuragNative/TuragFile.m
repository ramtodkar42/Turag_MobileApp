#import <CommonCrypto/CommonDigest.h>
#import <React/RCTBridgeModule.h>

// Turag's file helpers for uploads.
//   digest(uri) -> { size, sha256 }: the file's byte size and SHA-256 (lower-case hex), which the
//     backend asks for before it hands out an upload target. Read 1 MB at a time on a background
//     queue, so even a 2-minute walkaround video (tens of MB) is never held in memory at once.
@interface TuragFile : NSObject <RCTBridgeModule>
@end

static const NSUInteger kChunkBytes = 1 << 20;

@implementation TuragFile

RCT_EXPORT_MODULE(TuragFile)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (dispatch_queue_t)methodQueue
{
  static dispatch_queue_t queue;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    queue = dispatch_queue_create("ai.turag.file", DISPATCH_QUEUE_SERIAL);
  });
  return queue;
}

RCT_EXPORT_METHOD(digest:(NSString *)uri
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSURL *url = [NSURL URLWithString:uri];
  if (!url.scheme) {
    url = [NSURL fileURLWithPath:uri];
  }
  NSError *error = nil;
  NSFileHandle *handle = [NSFileHandle fileHandleForReadingFromURL:url error:&error];
  if (!handle) {
    reject(@"unreadable", error.localizedDescription ?: @"The file could not be opened.", error);
    return;
  }

  CC_SHA256_CTX context;
  CC_SHA256_Init(&context);
  unsigned long long size = 0;
  BOOL done = NO;
  while (!done) {
    // One piece at a time: each piece is released before the next is read.
    @autoreleasepool {
      NSError *readError = nil;
      NSData *chunk = [handle readDataUpToLength:kChunkBytes error:&readError];
      if (readError) {
        [handle closeAndReturnError:nil];
        reject(@"unreadable", readError.localizedDescription, readError);
        return;
      }
      if (chunk.length == 0) {
        done = YES;
      } else {
        CC_SHA256_Update(&context, chunk.bytes, (CC_LONG)chunk.length);
        size += chunk.length;
      }
    }
  }
  [handle closeAndReturnError:nil];

  unsigned char hash[CC_SHA256_DIGEST_LENGTH];
  CC_SHA256_Final(hash, &context);
  NSMutableString *hex = [NSMutableString stringWithCapacity:CC_SHA256_DIGEST_LENGTH * 2];
  for (int i = 0; i < CC_SHA256_DIGEST_LENGTH; i++) {
    [hex appendFormat:@"%02x", hash[i]];
  }
  resolve(@{ @"size" : @(size), @"sha256" : hex });
}

@end
