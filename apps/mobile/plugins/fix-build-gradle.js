const { withAppBuildGradle } = require("@expo/config-plugins");

/**
 * Removes `enableBundleCompression` from app/build.gradle.
 * This property was removed from ReactExtension in react-native 0.76.x
 * but Expo 53's prebuild template still generates it.
 */
module.exports = function fixBuildGradle(config) {
  return withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents.replace(
      /\s*enableBundleCompression = \(findProperty\('android\.enableBundleCompression'\) \?: false\)\.toBoolean\(\)\n/,
      "\n"
    );
    return mod;
  });
};
