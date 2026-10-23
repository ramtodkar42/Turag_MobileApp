import { useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { Button, Header, ScreenContainer, StatusView } from '../../../components';
import { colors, spacing } from '../../../theme';
import { WEBSITE_URL } from '../../../api/config';
import { useT } from '../../../i18n';

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
  const { title, path = '/' } = route.params ?? {};
  const url = `${WEBSITE_URL}${path}`;
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(!WebView);

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
            onLoadEnd={() => setLoading(false)}
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
