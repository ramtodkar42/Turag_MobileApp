import { Linking, StyleSheet, View } from 'react-native';
import { AppText, Button, FadeIn, ScreenContainer, Spinner, StatusView } from '../../../components';
import { colors, spacing } from '../../../theme';
import { ms } from '../../../utils/responsive';
import { SUPPORT_CHAT_ORIGIN } from '../../../api/config';
import { useT } from '../../../i18n';
import ChatHeader from './components/ChatHeader';
import useSupportChat from './useSupportChat';

// The web viewer is a native module: loaded on first use (see WebPage), so a
// build without it shows the error screen instead of crashing.
let WebView = null;
try {
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}

// TURAG.AI assistant = Turag's support chat (the web's support widget, the
// Support Engine), under the app's own TURAG.AI header. Guests get answers from
// Turag's help articles; signed-in users also about their own bookings and
// offers. Opened from the TURAG.AI button (after its splash) and from Profile
// > Chat with support. Links to other sites, phone numbers and emails open in
// their own apps. The chat's message box stays above the keyboard
// (ScreenContainer). No route params.
function Chat({ navigation }) {
  const t = useT();
  const chat = useSupportChat();
  const header = <ChatHeader onBack={navigation.goBack} />;

  // The chat stays in the viewer; anything else (help article links to the
  // website, tel:, mailto:) opens in the right app.
  const onRequest = request => {
    const { url } = request;
    // Frames inside the chat page (iOS asks for those too) are the chat's own.
    if (request.isTopFrame === false) return true;
    if (url.startsWith(SUPPORT_CHAT_ORIGIN) || url === 'about:blank' || url.startsWith('data:')) return true;
    Linking.openURL(url).catch(() => {});
    return false;
  };

  if (!WebView || chat.failed) {
    return (
      <ScreenContainer header={header}>
        <StatusView title={t('chat.support.errorTitle')} message={t('chat.support.errorText')}>
          <Button title={t('common.retry')} onPress={chat.retry} style={styles.retry} />
        </StatusView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false} header={header}>
      <View style={styles.flex}>
        {chat.url ? (
          <WebView
            key={chat.attempt}
            source={{ uri: chat.url }}
            onLoadEnd={chat.onLoaded}
            onError={chat.onFailed}
            onHttpError={e => e.nativeEvent.statusCode >= 500 && chat.onFailed()}
            onShouldStartLoadWithRequest={onRequest}
            setSupportMultipleWindows={false}
            javaScriptEnabled
            domStorageEnabled
            // The chat sizes itself to the screen; no pinch-zoom on the message box.
            scalesPageToFit={false}
            textZoom={100}
            keyboardDisplayRequiresUserAction={false}
            style={styles.flex}
          />
        ) : null}
        {chat.loading ? (
          <View style={styles.overlay} pointerEvents="none">
            <FadeIn offset={0} style={styles.center}>
              <Spinner size={ms(52)} />
              <AppText variant="subtitle" align="center" style={styles.wait}>
                {t('chat.support.connecting')}
              </AppText>
            </FadeIn>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
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
  center: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  wait: {
    marginTop: spacing.lg,
  },
  retry: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
});

export default Chat;
