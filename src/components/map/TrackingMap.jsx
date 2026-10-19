import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '../common/AppText';
import InspectorMarker from './InspectorMarker';
import { colors } from '../../theme';
import { isMapAvailable, maps, regionFor } from '../../utils/maps';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';

// Route (blue line), destination (red pin) and the moving inspector.
// `interactive={false}`: a static preview (no gestures; Android uses lite mode).
// location: { inspector, destination, route } from getInspectorLocation().
// Android draws custom marker views as a snapshot: let it render for a moment
// before freezing it, otherwise the inspector dot can appear blank.
const MARKER_SETTLE_MS = 600;

function TrackingMap({ location, interactive = true, style }) {
  const t = useT();
  const [markerReady, setMarkerReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMarkerReady(true), MARKER_SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);

  const region = useMemo(
    () => (location ? regionFor([location.inspector, location.destination, ...location.route]) : null),
    [location],
  );

  if (!isMapAvailable || !location) {
    return (
      <View style={[styles.fallback, style]}>
        <AppText variant="caption" align="center">
          {isMapAvailable ? t('common.loadingMap') : t('common.mapUnavailable')}
        </AppText>
      </View>
    );
  }

  const { MapView, Marker, Polyline } = maps;

  return (
    <View style={style} pointerEvents={interactive ? 'auto' : 'none'}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={region}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        liteMode={!interactive}
        toolbarEnabled={false}
        showsCompass={false}
      >
        <Polyline
          coordinates={[location.inspector, ...location.route]}
          strokeColor={colors.info}
          strokeWidth={ms(5)}
        />
        <Marker coordinate={location.destination} pinColor={colors.primary} />
        <Marker
          coordinate={location.inspector}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={!markerReady}
        >
          <InspectorMarker />
        </Marker>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: ms(16),
    backgroundColor: colors.input,
  },
});

export default TrackingMap;
