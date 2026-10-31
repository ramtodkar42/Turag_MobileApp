// Small scripts run inside the support chat page (the Support Engine's widget),
// so the app's SupportHeader can stand in for the page's own top bar.
//
// The widget draws one <header>: its name, "Online · replies in minutes" and,
// while a chat is going, a "New chat" button (clears the conversation). If the
// page ever changes, these simply do nothing and its own bar shows again.

// Hides the page's top bar (a style rule plus the element itself) and keeps
// the page from zooming. The page rebuilds its document when it starts
// (React), which drops anything added before that - so this runs again after
// loading and on every redraw.
const HIDE_HEADER = `function hideHeader() {
  if (!document.getElementById('turag-app-hide-header')) {
    var style = document.createElement('style');
    style.id = 'turag-app-hide-header';
    // ...and its own grey loading spinner: the app shows its red one instead,
    // in the same place, for as long as the page is loading (one loader only).
    // (Both of them: "Loading" while it starts, "Loading messages" while a
    // chat's messages come in.)
    style.textContent =
      'header { display: none !important; } [role="status"][aria-label^="Loading"] { visibility: hidden !important; }';
    (document.head || document.documentElement).appendChild(style);
  }
  var bars = document.getElementsByTagName('header');
  for (var i = 0; i < bars.length; i += 1) {
    if (bars[i].style.display !== 'none') bars[i].style.setProperty('display', 'none', 'important');
  }
  keepScale();
}
// The page never zooms: tapping its message box (text under 16 px) made the
// phone zoom in and stay zoomed - messages ran off the right edge and the send
// button was cut. Fixed at the phone's own width, as the app's other screens.
function keepScale() {
  var NO_ZOOM = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
  var meta = document.querySelector('meta[name=viewport]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'viewport';
    (document.head || document.documentElement).appendChild(meta);
  }
  if (meta.content !== NO_ZOOM) meta.content = NO_ZOOM;
}`;

const FIND_NEW_CHAT = `function findNewChat() {
  var buttons = document.querySelectorAll('header button');
  for (var i = 0; i < buttons.length; i += 1) {
    if (buttons[i].textContent.trim() === 'New chat') return buttons[i];
  }
  return null;
}`;

// Before the page draws: hide its top bar as early as possible.
export const HIDE_PAGE_HEADER = `(function () {
  ${HIDE_HEADER}
  hideHeader();
  document.addEventListener('DOMContentLoaded', hideHeader);
})();
true;`;

// After it loads: keep the bar hidden on every redraw, and tell the app
// whenever "New chat" comes and goes or the page starts / stops loading
// ({ type: 'newChat', available, loading }), so the app shows its own button
// and its own loader then.
export const WATCH_NEW_CHAT = `(function () {
  ${HIDE_HEADER}
  ${FIND_NEW_CHAT}
  var last = null;
  function update() {
    hideHeader();
    var available = !!findNewChat();
    var loading = !!document.querySelector('[role="status"][aria-label^="Loading"]');
    var now = available + ':' + loading;
    if (now === last) return;
    last = now;
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'newChat', available: available, loading: loading }),
    );
  }
  new MutationObserver(update).observe(document.documentElement, { childList: true, subtree: true });
  update();
})();
true;`;

// The app's "New chat": press the page's own (hidden) button, so it does
// exactly what the web does.
export const PRESS_NEW_CHAT = `(function () {
  ${FIND_NEW_CHAT}
  var button = findNewChat();
  if (button) button.click();
})();
true;`;

// A message from the page: { newChatAvailable, pageLoading } or null when it
// isn't ours.
export const readPageMessage = data => {
  try {
    const message = JSON.parse(data);
    return message?.type === 'newChat'
      ? { newChatAvailable: !!message.available, pageLoading: !!message.loading }
      : null;
  } catch {
    return null;
  }
};
