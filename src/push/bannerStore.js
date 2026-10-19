import createStore from '../store/createStore';

// The in-app banner for a push that arrives while the app is open (like
// Instagram's): one at a time - a new push replaces the one showing.
//   banner: { id, title, body, link } | null
const store = createStore(null);
let counter = 0;

export const showBanner = ({ title, body, link }) => {
  if (!title && !body) {
    return;
  }
  counter += 1;
  store.set({ id: counter, title: title ?? '', body: body ?? '', link: link ?? null });
};

export const hideBanner = () => store.set(null);

export const useBanner = () => store.use();
