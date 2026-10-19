import { StyleSheet, View } from 'react-native';
import { AppText, Avatar } from '../../../../components';
import { spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';

// Photo + name + role ("Consumer" / "Inspection Officer").
function ProfileHeader({ name, role, photoUri }) {
  return (
    <View style={styles.row}>
      <Avatar source={photoUri ? { uri: photoUri } : null} name={name} size={ms(44)} />
      <View style={styles.text}>
        <AppText variant="h3" numberOfLines={1} style={styles.name}>
          {name}
        </AppText>
        <AppText variant="caption">{role}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
  },
  name: {
    fontSize: fs(20),
    lineHeight: fs(26),
  },
});

export default ProfileHeader;
