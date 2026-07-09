#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AriaScorePdfImporter, NSObject)

RCT_EXTERN_METHOD(importPdf:
                  (NSString *)sourceUriString
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end