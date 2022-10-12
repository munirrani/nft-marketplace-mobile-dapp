module.exports = {
  resolver: {
    extraNodeModules: {
      crypto: require.resolve('crypto-browserify'),
      url: require.resolve('url/'),
      assert: require.resolve('assert'),
      fs: require.resolve('expo-file-system'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      net: require.resolve('react-native-tcp'),
      os: require.resolve('os-browserify/browser.js'),
      path: require.resolve('path-browserify'),
      stream: require.resolve('readable-stream'),
      vm: require.resolve('vm-browserify'),
    },
  },
};

const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.assetExts = [...defaultConfig.resolver.assetExts, 'cjs', 'db', 'mp3', 'ttf', 'obj', 'png', 'jpg', 'gltf', 'glb'];

module.exports.resolver.assetExsts = defaultConfig.resolver.assetExts;