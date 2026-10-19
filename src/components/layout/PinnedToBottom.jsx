import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

// The parent's height with the keyboard closed: the tallest seen at this
// width (Android shrinks the screen while the keyboard is open; a new width
// - rotation, split screen - starts over).
const useStableHeight = () => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = useCallback(event => {
    const { width, height } = event.nativeEvent.layout;
    setSize(prev => (prev.width !== width || height > prev.height ? { width, height } : prev));
  }, []);
  return [size.height, onLayout];
};

// Floating content (the tab bar, a floating button) held `offset` above the
// bottom of its parent. It's placed from the top using the parent's full
// height, so when the keyboard opens and Android shrinks the screen it stays
// where it is - behind the keyboard - instead of jumping up on top of it.
// hidden: not shown (e.g. while the keyboard is open). style: left / right / ...
function PinnedToBottom({ offset = 0, hidden = false, style, children }) {
  const [parentHeight, onParentLayout] = useStableHeight();
  const [ownHeight, setOwnHeight] = useState(0);
  const position =
    parentHeight && ownHeight ? { top: parentHeight - offset - ownHeight } : { bottom: offset };

  return (
    <>
      <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onParentLayout} />
      {hidden ? null : (
        <View
          pointerEvents="box-none"
          onLayout={event => setOwnHeight(event.nativeEvent.layout.height)}
          style={[styles.pinned, position, style]}
        >
          {children}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  pinned: {
    position: 'absolute',
  },
});

export default PinnedToBottom;
