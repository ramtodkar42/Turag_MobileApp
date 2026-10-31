import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useKeyboardVisible from '../../../hooks/useKeyboardVisible';
import { Button, ScreenContainer, StatusView } from '../../../components';
import { spacing } from '../../../theme';
import { SUPPORT_CHAT_ORIGIN } from '../../../api/config';
import { useT } from '../../../i18n';
import SupportHeader from './components/SupportHeader';
import ChatLoader from './components/ChatLoader';
import { HIDE_PAGE_HEADER, PRESS_NEW_CHAT, WATCH_NEW_CHAT, readPageMessage } from './supportPage';
import useSupportChat from './useSupportChat';

// How long the loader waits for the chat page to report in after loading.
const PAGE_REPORT_WAIT_MS = 1500;
// The longest the loader covers a conversation that's still loading.
const PAGE_LOADING_MAX_MS = 12000;

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
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardVisible();
  const chat = useSupportChat();
  const page = useRef(null);
  const [newChat, setNewChat] = useState(false);
  // The page is loading the conversation (its own grey spinner is hidden; the
  // app's red one stays up in the same place until it's ready).
  const [pageLoading, setPageLoading] = useState(false);
  // A conversation that can't load (e.g. an old chat the server dropped):
  // the loader steps aside after a while, so the message box is never blocked.
  useEffect(() => {
    if (!pageLoading) return undefined;
    const timer = setTimeout(() => setPageLoading(false), PAGE_LOADING_MAX_MS);
    return () => clearTimeout(timer);
  }, [pageLoading]);
  const showLoader = chat.loading || pageLoading;
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
    setPageLoading(message.pageLoading);
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
      {/* Clear of the phone's navigation bar (the message box sat behind it);
          with the keyboard up, the screen already ends at the keyboard. */}
      <View style={[styles.flex, keyboardOpen ? null : { paddingBottom: insets.bottom }]}>
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
            // The chat sizes itself to the screen and never zooms (the page's
            // viewport is fixed too, see supportPage.js keepScale).
            scalesPageToFit={false}
            setBuiltInZoomControls={false}
            setDisplayZoomControls={false}
            textZoom={100}
            keyboardDisplayRequiresUserAction={false}
            style={styles.flex}
          />
        ) : null}
        {/* One loader, always the same: the app's red spinner, centred, from
            opening until the conversation is on screen; it fades out. */}
        <ChatLoader visible={showLoader} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  retry: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
});

export default Chat;
