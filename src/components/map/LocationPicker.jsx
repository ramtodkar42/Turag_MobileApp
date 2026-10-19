import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '../common/AppText';
import SkeletonBox from '../feedback/SkeletonBox';
import { colors, radius, spacing } from '../../theme';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';

// Loaded safely (like utils/maps.js): before the app is rebuilt with the
// native web view, the map shows "not available" instead of crashing.
let WebView = null;
try {
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}

const PUNE = { lat: 18.5204, lng: 73.8567 };

// The same map as the web's booking page: Leaflet + free OpenStreetMap tiles
// (no API key), a red pin, tap to move it. window.setPin(lat, lng) moves it
// from the app (search / current location). Messages back to the app:
// { lat, lng } on a tap, { error: true } if the map can't load.
const mapHtml = ({ lat, lng }, pinColor) => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html, body, #map { height: 100%; margin: 0; } .leaflet-control-attribution { font-size: 9px; }</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  function send(data) { window.ReactNativeWebView.postMessage(JSON.stringify(data)); }
  if (!window.L) { send({ error: true }); } else {
    var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], 13);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    var pin = L.circleMarker([${lat}, ${lng}], {
      radius: 9, color: '#FFFFFF', fillColor: '${pinColor}', fillOpacity: 1, weight: 3
    }).addTo(map);
    map.on('click', function (e) {
      pin.setLatLng(e.latlng);
      send({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    window.setPin = function (lat, lng) {
      pin.setLatLng([lat, lng]);
      map.setView([lat, lng], Math.max(map.getZoom(), 16));
    };
  }
</script></body></html>`;

// Map to pin where the vehicle will be: tap to drop the pin -> onChange(lat, lng).
// value: { lat, lng } or null (starts on Pune, as the web); a new value set
// by the app (search / current location) moves the pin there.
// children: shown over the map (e.g. a "current location" button).
function LocationPicker({ value, onChange, height = ms(220), children, style }) {
  const t = useT();
  const web = useRef(null);
  const fromMap = useRef(null); // the last point the map itself reported
  const [failed, setFailed] = useState(!WebView);
  const [loaded, setLoaded] = useState(false);
  // Built once: later moves happen inside the map, not by reloading it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => mapHtml(value ?? PUNE, colors.primary), []);

  // A point chosen outside the map: move the pin.
  useEffect(() => {
    if (loaded && value && value !== fromMap.current) {
      web.current?.injectJavaScript(`window.setPin && window.setPin(${value.lat}, ${value.lng}); true;`);
    }
  }, [loaded, value]);

  const onMessage = event => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.error) {
        setFailed(true);
      } else if (Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
        const point = { lat: data.lat, lng: data.lng };
        fromMap.current = point;
        onChange(point);
      }
    } catch {
      // Not ours.
    }
  };

  return (
    <View style={[styles.frame, { height }, style]} accessibilityLabel={t('booking.address.mapLabel')}>
      {failed ? (
        <View style={styles.center}>
          <AppText variant="caption" align="center">
            {t('booking.address.mapUnavailable')}
          </AppText>
        </View>
      ) : (
        <>
          <WebView
            ref={web}
            originWhitelist={['*']}
            // A real origin, so OpenStreetMap's tile servers accept the requests.
            source={{ html, baseUrl: 'https://turag.ai/' }}
            onMessage={onMessage}
            onLoadEnd={() => setLoaded(true)}
            onError={() => setFailed(true)}
            nestedScrollEnabled
            scrollEnabled={false}
            javaScriptEnabled
            style={styles.web}
          />
          {!loaded ? <SkeletonBox height="100%" style={StyleSheet.absoluteFill} /> : null}
          {children ? <View style={styles.overlay}>{children}</View> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.imagePlaceholder,
  },
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  overlay: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
  },
});

export default LocationPicker;
