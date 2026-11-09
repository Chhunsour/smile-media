// shortcut: Expo's iOS template runs react-native-xcode.sh unquoted, so bundling fails when the project path has a space; drop once upstream quotes it.
const { withXcodeProject } = require('expo/config-plugins');

module.exports = config => withXcodeProject(config, mod => {
  for (const phase of Object.values(mod.modResults.hash.project.objects.PBXShellScriptBuildPhase)) {
    if (typeof phase?.shellScript !== 'string') continue;
    phase.shellScript = phase.shellScript.replace(
      /`(\\"\$NODE_BINARY\\" --print [^`]*react-native-xcode\.sh'\\")`/,
      (_, cmd) => `\\"$(${cmd})\\"`,
    );
  }
  return mod;
});
