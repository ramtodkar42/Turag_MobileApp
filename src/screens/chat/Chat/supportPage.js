// Small scripts run inside the support chat page (the Support Engine's widget),
// so the app's SupportHeader can stand in for the page's own top bar.
//
// The widget draws one <header>: its name, "Online · replies in minutes" and,
// while a chat is going, a "New chat" button (clears the conversation). If the
// page ever changes, these simply do nothing and its own bar shows again.

// Hides the page's top bar: a style rule plus the element itself. The page
// rebuilds its document when it starts (React), which drops anything added
// before that - so this runs again after loading and on every redraw.
const HIDE_HEADER = `function hideHeader() {
  if (!document.getElementById('turag-app-hide-header')) {
    var style = document.createElement('style');
    style.id = 'turag-app-hide-header';
    style.textContent = 'header { display: none !important; }';
    (document.head || document.documentElement).appendChild(style);
  }
  var bars = document.getElementsByTagName('header');
  for (var i = 0; i < bars.length; i += 1) {
    if (bars[i].style.display !== 'none') bars[i].style.setProperty('display', 'none', 'important');
  }
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
// whenever "New chat" comes and goes ({ type: 'newChat', available }), so the
// app shows its own button then.
export const WATCH_NEW_CHAT = `(function () {
  ${HIDE_HEADER}
  ${FIND_NEW_CHAT}
  var last = null;
  function update() {
    hideHeader();
    var available = !!findNewChat();
    if (available === last) return;
    last = available;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'newChat', available: available }));
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

// A message from the page: { newChatAvailable } or null when it isn't ours.
export const readPageMessage = data => {
  try {
    const message = JSON.parse(data);
    return message?.type === 'newChat' ? { newChatAvailable: !!message.available } : null;
  } catch {
    return null;
  }
};
