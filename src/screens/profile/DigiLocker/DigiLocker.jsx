import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Header, ScreenContainer, Spinner, StatusView } from '../../../components';
import { colors, spacing } from '../../../theme';
import { ms } from '../../../utils/responsive';
import { useT } from '../../../i18n';
import useDigiLocker, { isReturnUrl } from './useDigiLocker';
import DigiLockerResult from './components/DigiLockerResult';

// The web viewer is a native module: loaded on first use (see WebPage).
let WebView = null;
try {
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}

// "Verify with DigiLocker" (as the web, ADR-0041): DigiLocker opens inside the
// app; when it sends the user back to Turag, the app finishes the check with
// the server and shows the result - verified at once, or why not. The consent
// was ticked on the Identity verification page. No route params.
function DigiLocker({ navigation }) {
  const t = useT();
  const dl = useDigiLocker();
  const [pageLoading, setPageLoading] = useState(true);
  const header = <Header onBack={navigation.goBack} title={t('verify.dl.title')} />;

  // Leaving DigiLocker for Turag's return page: stop there and finish in the app.
  const onRequest = request => {
    if (isReturnUrl(request.url)) {
      dl.onReturn();
      return false;
    }
    return true;
  };

  if (dl.phase === 'web' && WebView) {
    return (
      <ScreenContainer padded={false} header={header}>
        <View style={styles.flex}>
          <WebView
            key={dl.url}
            source={{ uri: dl.url }}
            onLoadStart={() => setPageLoading(true)}
            onLoadEnd={() => setPageLoading(false)}
            onShouldStartLoadWithRequest={onRequest}
            onNavigationStateChange={nav => isReturnUrl(nav.url) && dl.onReturn()}
            setSupportMultipleWindows={false}
            style={styles.flex}
          />
          {pageLoading ? (
            <View style={styles.overlay} pointerEvents="none">
              <Spinner size={ms(48)} />
            </View>
          ) : null}
        </View>
      </ScreenContainer>
    );
  }

  let body;
  if (dl.phase === 'done') {
    body = (
      <DigiLockerResult
        verification={dl.verification}
        onDone={navigation.goBack}
        onCheckAgain={dl.checkAgain}
        onTryAgain={dl.restart}
      />
    );
  } else if (dl.phase === 'error' || (dl.phase === 'web' && !WebView)) {
    body = (
      <StatusView title={t('verify.dl.errorTitle')} message={dl.error ?? t('webPage.errorText')}>
        <Button
          title={t(dl.canCheck ? 'verify.dl.checkAgain' : 'common.retry')}
          onPress={dl.canCheck ? dl.checkAgain : dl.restart}
          style={styles.action}
        />
      </StatusView>
    );
  } else {
    // Starting, or finishing with the server.
    body = (
      <StatusView icon={<Spinner size={ms(56)} />}>
        <AppText variant="subtitle" align="center" style={styles.wait}>
          {t(dl.phase === 'checking' ? 'verify.dl.checking' : 'verify.dl.opening')}
        </AppText>
      </StatusView>
    );
  }

  return <ScreenContainer header={header}>{body}</ScreenContainer>;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  wait: {
    marginTop: spacing.lg,
  },
  action: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});

export default DigiLocker;
