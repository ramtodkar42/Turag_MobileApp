import { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { FadeIn, Icon, MicButton, SearchBar } from '../../../../components';
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
// search bar (opened by the search button, or showing a search), the quick
// filters, the banner and the category bar.
function HomeListHeader({ user, market, unreadCount, onSubmitSearch, onNotificationsPress }) {
  const t = useT();
  const firstName = user?.fullName?.split(' ')[0] || t('home.helloFallback');
  const [searchOpen, setSearchOpen] = useState(false);
  const showSearch = searchOpen || market.query !== '';

  // Voice search (like the web's mic): the words fill the box as you speak and
  // the search runs on the final text (the grid follows the query).
  const voice = useVoiceSearch({ onPartial: market.setQuery, onResult: market.setQuery });
  const toggleVoice = () => {
    Keyboard.dismiss();
    voice.toggle();
  };

  // The search button opens the bar; tapped again it closes it and clears the search.
  const toggleSearch = () => {
    if (showSearch) {
      voice.cancel();
      market.setQuery('');
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
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
        {showSearch ? (
          <FadeIn>
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
              autoFocus={searchOpen && market.query === ''}
              style={styles.search}
            />
            <SearchStatus
              hintKey={voice.hintKey}
              listening={voice.listening}
              searching={market.searching}
              query={market.query}
            />
          </FadeIn>
        ) : null}
      </View>

      <QuickFilters filters={market.filters} onChange={market.setFilter} />

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
