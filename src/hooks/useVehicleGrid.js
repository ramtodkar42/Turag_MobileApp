import { useWindowDimensions } from 'react-native';
import { spacing } from '../theme';
import { MAX_CONTENT_WIDTH } from '../constants/layout';
import { getGridColumns } from '../utils/responsive';

export const GRID_GAP = spacing.md;

// Vehicle grid sizing: 2 columns on phones, 3 on tablets, inside the
// screen's side padding and the tablet content cap.
export default function useVehicleGrid() {
  const { width } = useWindowDimensions();
  const columns = getGridColumns();
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH) - spacing.lg * 2;
  const cardWidth = (contentWidth - GRID_GAP * (columns - 1)) / columns;

  return { columns, cardWidth, gap: GRID_GAP };
}
