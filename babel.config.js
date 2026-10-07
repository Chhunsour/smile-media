module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],
    // This is `nativewind/babel` minus its Reanimated plugin: babel-preset-expo already adds the
    // worklets plugin, and running it twice silently breaks every useAnimatedStyle.
    plugins: [require('react-native-css-interop/dist/babel-plugin').default],
  };
};
