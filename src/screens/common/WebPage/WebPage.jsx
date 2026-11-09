import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { Button, Header, ScreenContainer, StatusView } from '../../../components';
import { colors, spacing } from '../../../theme';
import { WEBSITE_URL } from '../../../api/config';
import { useLanguage, useT } from '../../../i18n';

// The website shows a page in the language of its `tg_locale` cookie (what its own
// language switcher sets) and in English without one. So the app's language goes in
// that cookie before every page loads, and a page that still came back in another
// language - the very first visit, or after the app's language changed - is loaded
// once more, under the loader, so it never flashes the wrong language.
const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;
const setLocaleCookie = language =>
  `(function(){try{document.cookie='tg_locale=${language}; path=/; max-age=${LOCALE_MAX_AGE}; samesite=lax';}catch(e){}})();true;`;
const checkLocale = language =>
  `(function(){var post=function(m){if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(m);}};` +
  `try{var key='tg_locale_retry';var have=(document.documentElement.getAttribute('lang')||'').slice(0,2);` +
  `if(have&&have!=='${language}'&&!sessionStorage.getItem(key)){sessionStorage.setItem(key,'1');post('page-reloading');location.reload();return;}` +
  `sessionStorage.removeItem(key);}catch(e){}post('page-ready');})();true;`;
// If the page can't say it's ready (scripts blocked), the loader still goes.
const READY_FALLBACK_MS = 2500;

// The web viewer is a native module: loaded on first use, so a build without
// it shows "open in browser" instead of crashing.
let WebView = null;
try {
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}

// A page of the Turag website inside the app, under the app's own header:
// help, FAQ, contact and the legal pages (Privacy Policy, Terms, Refund Policy).
// Links to other sites (mail, phone, outside pages) open in their own apps.
// params: { title, path } - e.g. { title: 'FAQs', path: '/faq' }
function WebPage({ navigation, route }) {
  const t = useT();
  const language = useLanguage();
  const { title, path = '/' } = route.params ?? {};
  const url = `${WEBSITE_URL}${path}`;
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(!WebView);
  const readyTimer = useRef(null);
  useEffect(() => () => clearTimeout(readyTimer.current), []);

  const pageReady = () => {
    clearTimeout(readyTimer.current);
    setLoading(false);
  };
  const onMessage = event => {
    const message = event.nativeEvent.data;
    if (message === 'page-ready') pageReady();
    // Loading again in the app's language: keep the loader up meanwhile.
    else if (message === 'page-reloading') clearTimeout(readyTimer.current);
  };

  const openOutside = () => Linking.openURL(url).catch(() => {});

  // Our site stays in the viewer; anything else (mailto:, tel:, other sites)
  // opens in the right app.
  const onRequest = request => {
    if (request.url.startsWith(WEBSITE_URL) || request.url === 'about:blank') return true;
    Linking.openURL(request.url).catch(() => {});
    return false;
  };

  return (
    <ScreenContainer padded={false} header={<Header onBack={navigation.goBack} title={title} />}>
      {failed ? (
        <StatusView title={t('webPage.errorTitle')} message={t('webPage.errorText')}>
          <Button title={t('webPage.openBrowser')} size="md" onPress={openOutside} style={styles.action} />
        </StatusView>
      ) : (
        <View style={styles.flex}>
          <WebView
            source={{ uri: url }}
            injectedJavaScriptBeforeContentLoaded={setLocaleCookie(language)}
            injectedJavaScript={checkLocale(language)}
            onMessage={onMessage}
            onLoadEnd={() => {
              clearTimeout(readyTimer.current);
              readyTimer.current = setTimeout(pageReady, READY_FALLBACK_MS);
            }}
            onError={() => setFailed(true)}
            onHttpError={e => e.nativeEvent.statusCode >= 500 && setFailed(true)}
            onShouldStartLoadWithRequest={onRequest}
            setSupportMultipleWindows={false}
            style={styles.flex}
          />
          {loading ? (
            <View style={styles.loading} pointerEvents="none">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : null}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  action: {
    marginTop: spacing.lg,
  },
});

export default WebPage;
