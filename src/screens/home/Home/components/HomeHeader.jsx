import { StyleSheet, View } from 'react-native';
import { AppText, Icon, IconButton, TuragWordmark } from '../../../../components';
import { colors, fonts, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// Bigger counts show as "9+" (as on the web).
const MAX_BADGE = 9;
const BUTTON = ms(42);
const LOGO_WIDTH = ms(78);

// TURAG logo + "Hello Name" + location; round search and notification buttons
// (the bell with the unread count). searchOpen: the search bar is showing.
function HomeHeader({ name, location, unreadCount = 0, searchOpen, onSearchPress, onNotificationsPress }) {
  const t = useT();
  return (
    <View style={styles.row}>
      <TuragWordmark width={LOGO_WIDTH} />

      <View style={styles.info}>
        <AppText variant="h3" numberOfLines={1} style={styles.greeting}>
          {t('home.hello', { name })}
        </AppText>
        <View style={styles.location}>
          <Icon name="navigation" size={ms(11)} color={colors.body} />
          <AppText variant="caption" numberOfLines={1}>
            {location}
          </AppText>
        </View>
      </View>

      <IconButton
        onPress={onSearchPress}
        size={BUTTON}
        backgroundColor={colors.dangerLight}
        accessibilityLabel={t(searchOpen ? 'home.closeSearch' : 'home.openSearch')}
      >
        <Icon name={searchOpen ? 'close' : 'search'} size={ms(20)} color={colors.primary} />
      </IconButton>

      <IconButton
        onPress={onNotificationsPress}
        size={BUTTON}
        backgroundColor={colors.dangerLight}
        accessibilityLabel={
          unreadCount > 0 ? t('home.notificationsUnread', { count: unreadCount }) : t('home.notifications')
        }
      >
        <Icon name="bell" size={ms(20)} color={colors.primary} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <AppText color={colors.white} style={styles.badgeText}>
              {unreadCount > MAX_BADGE ? `${MAX_BADGE}+` : unreadCount}
            </AppText>
          </View>
        ) : null}
      </IconButton>
    </View>
  );
}

const BADGE = ms(17);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  // Design greeting is smaller than the screen-title h3.
  greeting: {
    fontSize: fs(19),
    lineHeight: fs(25),
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: -ms(2),
    right: -ms(2),
    minWidth: BADGE,
    height: BADGE,
    paddingHorizontal: ms(4),
    borderRadius: BADGE / 2,
    borderWidth: 1.5,
    borderColor: colors.white,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.subtitle.bold,
    fontSize: fs(9.5),
    lineHeight: fs(12),
  },
});

export default HomeHeader;
