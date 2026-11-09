import createStore from '../store/createStore';

// The in-app banner at the top of the screen (like Instagram's): a push that
// arrives while the app is open, or a short message from the app itself (e.g.
// "Saved in your Garage"). One at a time - a new one replaces the one showing.
//   banner: { id, title, body, link, icon, tone, hint, onPress } | null
//   link: a push's web path (tapping opens its page); onPress: what an app
//   message does when tapped instead. icon: an icon name (default the bell);
//   tone: 'success' draws it green. hint: what a tap does, for screen readers.
const store = createStore(null);
let counter = 0;

export const showBanner = ({ title, body, link, icon, tone, hint, onPress }) => {
  if (!title && !body) {
    return;
  }
  counter += 1;
  store.set({
    id: counter,
    title: title ?? '',
    body: body ?? '',
    link: link ?? null,
    icon: icon ?? null,
    tone: tone ?? null,
    hint: hint ?? null,
    onPress: onPress ?? null,
  });
};

export const hideBanner = () => store.set(null);

export const useBanner = () => store.use();
