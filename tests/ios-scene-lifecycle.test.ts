import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { adoptScene } = createRequire(import.meta.url)('../plugins/ios-scene-lifecycle.js');

// Shape of the SDK 57 template AppDelegate.swift that prebuild generates.
const template = `@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
`;

test('scene plugin hands window creation to the scene delegate', () => {
  const out = adoptScene(template);
  assert.match(out, /class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider \{/);
  assert.doesNotMatch(out, /startReactNative|UIWindow\(frame/);
  assert.match(out, /reactNativeFactory = factory\n/);
  assert.match(out, /return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/);
  assert.equal(adoptScene(out), out, 're-running prebuild must not change it again');
});

test('scene plugin fails loudly on an unknown AppDelegate', () => {
  assert.throws(() => adoptScene(template.replace('UIScreen.main.bounds', 'someOtherBounds')), /no longer matches/);
});
