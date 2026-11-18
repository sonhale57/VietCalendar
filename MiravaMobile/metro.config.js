// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const fs = require('fs');
try {
  const gracefulFs = require('graceful-fs');
  gracefulFs.gracefulify(fs);
} catch {}

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Tối ưu watcher và loại bỏ các thư mục không cần thiết để tránh tràn file handles (EMFILE trên Windows)
// Chú ý: KHÔNG chặn node_modules/react-native-web/dist! Chỉ chặn dist ở thư mục gốc của project.
const escapedDir = __dirname.replace(/\\/g, '[\\\\/]');
const additionalBlockList = [
  new RegExp(`^${escapedDir}[\\\\/]dist[\\\\/].*`),
  /.*[\\\/]\.claude[\\\/].*/,
  /.*[\\\/]\.vscode[\\\/].*/,
  /.*[\\\/]\.git[\\\/].*/,
];

if (Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList.push(...additionalBlockList);
} else if (config.resolver.blockList) {
  config.resolver.blockList = [config.resolver.blockList, ...additionalBlockList];
} else {
  config.resolver.blockList = additionalBlockList;
}

module.exports = config;
