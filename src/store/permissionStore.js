import createStore from './createStore';

// A permission the user has turned off ('camera' | 'photos' | 'location' |
// 'microphone'), or null. While set, PermissionDialog (mounted once in App)
// explains it and offers to open the phone's Settings.
const store = createStore(null);

export const showPermissionOff = kind => store.set(kind);
export const hidePermissionOff = () => store.set(null);
export const usePermissionOff = () => store.use();
