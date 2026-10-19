import { RefreshControl } from 'react-native';
import { colors } from '../../theme';

// The one pull-to-refresh spinner for the whole app: brand red on a white
// circle (Android) / brand red (iOS). Use it for every list that refreshes:
//   <FlatList refreshControl={<AppRefreshControl refreshing={x} onRefresh={y} />} />
// Other props (and the list the native side passes in) are forwarded.
function AppRefreshControl({ refreshing = false, onRefresh, ...props }) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[colors.primary]}
      progressBackgroundColor={colors.white}
      tintColor={colors.primary}
      {...props}
    />
  );
}

export default AppRefreshControl;
