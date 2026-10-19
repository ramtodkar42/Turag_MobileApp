import { StyleSheet } from 'react-native';
import AppText from './AppText';
import Card from './Card';
import StatusTimeline from './StatusTimeline';
import { spacing } from '../../theme';
import { fs } from '../../utils/responsive';
import { useT } from '../../i18n';

// Card with a vertical progress timeline (inspection tracking, moderation).
// `completed` = number of finished steps. `badge` replaces the title
// (e.g. "Pending Moderation"). `link` = one tappable step (see StatusTimeline).
function ProgressCard({ title: titleProp, badge, steps, completed, link, style }) {
  const t = useT();
  const title = titleProp ?? t('common.progress');
  return (
    <Card style={style}>
      {badge ?? (
        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>
      )}
      <StatusTimeline
        steps={steps}
        currentStep={completed - 1}
        link={link}
        style={styles.timeline}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  timeline: {
    marginTop: spacing.sm,
  },
});

export default ProgressCard;
