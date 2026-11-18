import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import QRCode from 'qrcode/lib/core/qrcode';
import { colors, radius } from '../../theme';

// The quiet zone (empty modules around the code) scanners need.
const QUIET = 2;

// One SVG path for all dark modules: "M x y h1 v1 h-1 z" per module, rows merged into runs.
const toPath = modules => {
  const { size, data } = modules;
  let d = '';
  for (let y = 0; y < size; y += 1) {
    let x = 0;
    while (x < size) {
      if (data[y * size + x]) {
        const start = x;
        while (x < size && data[y * size + x]) x += 1;
        d += `M${start + QUIET} ${y + QUIET}h${x - start}v1h-${x - start}z`;
      } else {
        x += 1;
      }
    }
  }
  return d;
};

// A QR code drawn with react-native-svg (no native code): black on white, with a
// quiet zone, on a white rounded card so it scans on any background.
// value: the text to encode. size: the code's width and height. label: what a
// screen reader says.
function QrCode({ value, size = 220, label, style }) {
  const matrix = useMemo(() => {
    if (!value) return null;
    const { modules } = QRCode.create(String(value), { errorCorrectionLevel: 'M' });
    return { path: toPath(modules), count: modules.size + QUIET * 2 };
  }, [value]);

  if (!matrix) return null;
  return (
    <View
      style={[styles.card, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${matrix.count} ${matrix.count}`}>
        <Rect x={0} y={0} width={matrix.count} height={matrix.count} fill={colors.white} />
        <Path d={matrix.path} fill={colors.heading} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    padding: 8,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
});

export default QrCode;
