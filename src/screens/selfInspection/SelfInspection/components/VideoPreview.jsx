import { Platform, StyleSheet, View } from 'react-native';
import { colors, radius } from '../../../../theme';

// The web viewer is a native module: loaded on first use, so a build without it
// simply shows no preview (the clip can still be used or retaken).
let WebView = null;
try {
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}

const escapeAttr = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const playerHtml = uri => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000}video{width:100%;height:100%;object-fit:contain}</style></head>
<body><video src="${escapeAttr(uri)}" controls playsinline preload="metadata"></video></body></html>`;

// iOS opens the file itself, with read access to its folder; Android loads it from
// a small player page.
const sourceProps = uri =>
  Platform.OS === 'ios'
    ? { source: { uri }, allowingReadAccessToURL: uri.slice(0, uri.lastIndexOf('/') + 1) }
    : { source: { html: playerHtml(uri), baseUrl: 'file:///' } };

// Plays a clip that's still on the phone, before it's sent (the server never gives
// video back). Uses the web viewer, so it needs no extra native video library.
function VideoPreview({ uri, label, style }) {
  if (!WebView || !uri) return null;
  return (
    <View style={[styles.frame, style]} accessibilityLabel={label}>
      <WebView
        {...sourceProps(uri)}
        originWhitelist={['*']}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        scrollEnabled={false}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.black,
  },
  web: {
    flex: 1,
    backgroundColor: colors.black,
  },
});

export default VideoPreview;
