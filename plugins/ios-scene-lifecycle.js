// iOS 27 kills apps at launch unless they adopt the UIScene life cycle. Expo ships EXExpoAppSceneDelegate
// for this, but the SDK 57 AppDelegate template still starts React Native in its own window.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const START_IN_APP_DELEGATE =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

function adoptScene(contents) {
  if (contents.includes('ExpoReactNativeFactoryProvider')) return contents;
  if (!contents.includes('class AppDelegate: ExpoAppDelegate {') || !START_IN_APP_DELEGATE.test(contents)) {
    // Fail the prebuild loudly instead of shipping an app that crashes on iOS 27.
    throw new Error('ios-scene-lifecycle: AppDelegate.swift no longer matches the SDK 57 template; update this plugin.');
  }
  return contents
    .replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {')
    .replace(START_IN_APP_DELEGATE, '\n    // EXExpoAppSceneDelegate creates the window and starts React Native from the scene.\n');
}

const withSceneLifecycle = config => {
  config = withAppDelegate(config, mod => {
    if (mod.modResults.language !== 'swift') throw new Error('ios-scene-lifecycle: expected a Swift AppDelegate.');
    mod.modResults.contents = adoptScene(mod.modResults.contents);
    return mod;
  });
  return withInfoPlist(config, mod => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' },
        ],
      },
    };
    return mod;
  });
};

module.exports = withSceneLifecycle;
module.exports.adoptScene = adoptScene;
