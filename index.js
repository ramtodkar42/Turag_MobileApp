/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './src/App';
import { name as appName } from './app.json';

// Pushes that arrive while the app is in the background or closed: the system
// shows them itself (they carry a title and text); tapping one opens the app
// on its page (src/push/pushNotifications.js). Nothing else to do here.
setBackgroundMessageHandler(getMessaging(), async () => {});

AppRegistry.registerComponent(appName, () => App);
