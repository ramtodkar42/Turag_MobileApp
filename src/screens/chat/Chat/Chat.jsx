import { useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { AppText, Button, FadeIn, ScreenContainer, Spinner, StatusView } from '../../../components';
import { colors, spacing } from '../../../theme';
import { ms } from '../../../utils/responsive';
import { SUPPORT_CHAT_ORIGIN } from '../../../api/config';
import { useT } from '../../../i18n';
import SupportHeader from './components/SupportHeader';
import { HIDE_PAGE_HEADER, PRESS_NEW_CHAT, WATCH_NEW_CHAT, readPageMessage } from './supportPage';
import useSupportChat from './useSupportChat';

// How long the loader waits for the chat page to report in after loading.
const PAGE_REPORT_WAIT_MS = 1500;

// The web viewer is a native module: loaded on first use (see WebPage), so a
// build without it shows the error screen instead of crashing.
let WebView = null;
try {
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}

// TURAG.AI assistant = Turag's support chat (the web's support widget, the
// Support Engine). One header: the app's "Turag Support" (SupportHeader) - the
// page's own top bar is hidden and its "New chat" is pressed from the app's
// (supportPage.js). Guests get answers from Turag's help articles; signed-in
// users also about their own bookings and offers. Opened from the TURAG.AI
// button (after its splash) and from Profile > Chat with support. Links to
// other sites, phone numbers and emails open in their own apps. The chat's
// message box stays above the keyboard (ScreenContainer). No route params.
function Chat({ navigation }) {
  const t = useT();
  const chat = useSupportChat();
  const page = useRef(null);
  const [newChat, setNewChat] = useState(false);
  const header = (
    <SupportHeader
      onBack={navigation.goBack}
      onNewChat={newChat && !chat.failed ? () => page.current?.injectJavaScript(PRESS_NEW_CHAT) : null}
    />
  );

  // Only the chat page's own messages count. Its first one comes from the
  // script that hides its top bar, so the loader only lifts once that's done.
  const onMessage = event => {
    if (!String(event.nativeEvent.url ?? '').startsWith(SUPPORT_CHAT_ORIGIN)) return;
    const message = readPageMessage(event.nativeEvent.data);
    if (!message) return;
    setNewChat(message.newChatAvailable);
    chat.onLoaded();
  };
  // Loaded but the page never reported (it changed): show it anyway, shortly.
  const onLoadEnd = () => setTimeout(chat.onLoaded, PAGE_REPORT_WAIT_MS);

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
            ref={page}
            key={chat.attempt}
            source={{ uri: chat.url }}
            injectedJavaScriptBeforeContentLoaded={HIDE_PAGE_HEADER}
            injectedJavaScript={WATCH_NEW_CHAT}
            onMessage={onMessage}
            onLoadEnd={onLoadEnd}
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
