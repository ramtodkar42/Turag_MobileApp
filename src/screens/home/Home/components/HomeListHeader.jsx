import { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { Icon, MicButton, SearchBar } from '../../../../components';
import { colors, shadows, spacing } from '../../../../theme';
import useVoiceSearch from '../../../../hooks/useVoiceSearch';
import { CATEGORIES } from '../constants';
import CategoryTabs from './CategoryTabs';
import HomeHeader from './HomeHeader';
import PromoBanner from './PromoBanner';
import QuickFilters from './QuickFilters';
import SearchStatus from './SearchStatus';
import { useT } from '../../../../i18n';

const BANNER_IMAGE = require('../../../../assets/images/home/banner-dream-car.jpg');

// Everything above the vehicle grid (rendered as the list header, so the
// whole page scrolls together): greeting with search and notifications, the
// search bar (while a search from the search screen is showing - it can be
// changed here, or cleared with the X), the quick filters, the banner and the
// category bar.
// onLanguagePress(anchor): the language pill (first filter) was tapped.
// onOpenSearch(): the search button - opens the search screen.
function HomeListHeader({
  user,
  market,
  unreadCount,
  onSubmitSearch,
  onNotificationsPress,
  onLanguagePress,
  onOpenSearch,
}) {
  const t = useT();
  const firstName = user?.fullName?.split(' ')[0] || t('home.helloFallback');
  // The search bar opens with a search (from the search screen) and stays open
  // while it's being edited - even emptied - until its X closes it. (It used to
  // vanish when the last letter was deleted, under the user's finger.)
  const [barOpen, setBarOpen] = useState(false);
  useEffect(() => {
    if (market.query !== '') setBarOpen(true);
  }, [market.query]);
  const showSearch = barOpen || market.query !== '';

  // Voice search (like the web's mic): the words fill the box as you speak and
  // the search runs on the final text (the grid follows the query).
  const voice = useVoiceSearch({ onPartial: market.setQuery, onResult: market.setQuery });
  const toggleVoice = () => {
    Keyboard.dismiss();
    voice.toggle();
  };

  // The search button opens the search screen; while the bar is open it closes
  // it and clears the search instead (the button is an X then).
  const toggleSearch = () => {
    if (showSearch) {
      voice.cancel();
      Keyboard.dismiss();
      market.setQuery('');
      setBarOpen(false);
    } else {
      onOpenSearch?.();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.padded}>
        <HomeHeader
          name={firstName}
          location={t('home.location')}
          unreadCount={unreadCount}
          searchOpen={showSearch}
          onSearchPress={toggleSearch}
          onNotificationsPress={onNotificationsPress}
        />
        {/* No fade here: fading a view with a shadow flashes it black on Android. */}
        {showSearch ? (
          <View>
            <SearchBar
              value={market.query}
              onChangeText={market.setQuery}
              onSubmitEditing={onSubmitSearch}
              placeholder={voice.listening ? t('home.voice.listening') : t('home.searchPlaceholder')}
              left={<Icon name="search" color={colors.body} />}
              right={
                voice.available ? (
                  <MicButton
                    listening={voice.listening}
                    level={voice.level}
                    onPress={toggleVoice}
                    accessibilityLabel={t(voice.listening ? 'home.voice.stop' : 'home.voice.start')}
                  />
                ) : null
              }
              style={styles.search}
            />
            <SearchStatus
              hintKey={voice.hintKey}
              listening={voice.listening}
              searching={market.searching}
              query={market.query}
            />
          </View>
        ) : null}
      </View>

      <QuickFilters filters={market.filters} onChange={market.setFilter} onLanguagePress={onLanguagePress} />

      <View style={styles.padded}>
        <PromoBanner
          title={t('home.banner')}
          subtitle={t('home.bannerText')}
          image={BANNER_IMAGE}
          style={styles.banner}
        />
        <CategoryTabs
          tabs={CATEGORIES}
          value={market.category}
          onChange={market.setCategory}
          style={styles.tabs}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
  search: {
    marginTop: spacing.md,
    paddingRight: spacing.sm, // room for the mic
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  banner: {
    marginTop: spacing.xs,
  },
  tabs: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
});

export default HomeListHeader;
