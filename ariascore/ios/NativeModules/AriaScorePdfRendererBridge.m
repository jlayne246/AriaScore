// ios/AriaScorePdfRendererBridge.m

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AriaScorePdfRenderer, NSObject)

RCT_EXTERN_METHOD(getPageCount:
                  (NSString *)pdfPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(renderPage:
                  (NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearCache:
                  (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearDocumentCache:
                  (NSString *)pdfPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end