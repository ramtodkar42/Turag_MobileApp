// Scrolls a screen's ScrollView (ScreenContainer's scrollRef) smoothly so `node`
// (a View - give it collapsable={false}) sits `gap` below the top of the visible area.
// Measured against the scroll view's content view itself (getInnerViewRef): the new
// architecture's measureLayout only accepts a view, and quietly does nothing when
// given a node number (what getInnerViewNode returns) - nothing scrolled.
// Best effort: nothing happens if either of them can't be measured.
export const scrollToView = (scrollRef, node, gap = 0) => {
  const list = scrollRef?.current;
  const content = list?.getInnerViewRef?.() ?? list?.getNativeScrollRef?.();
  if (!node?.measureLayout || !content || typeof list.scrollTo !== 'function') return;
  node.measureLayout(
    content,
    (_x, y) => list.scrollTo({ y: Math.max(0, y - gap), animated: true }),
    () => {},
  );
};
