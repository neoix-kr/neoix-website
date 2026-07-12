module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets(=reanimated 4)의 babel 플러그인은 반드시 마지막에
    plugins: ['react-native-worklets/plugin'],
  };
};
