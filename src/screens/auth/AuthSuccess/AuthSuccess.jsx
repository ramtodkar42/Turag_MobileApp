import { useEffect } from 'react';
import { CheckCircle, PopIn, ScreenContainer, StatusView } from '../../../components';
import { ms } from '../../../utils/responsive';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';

const NEXT_SCREEN_DELAY = 2000;

// Green tick for 2 seconds after a successful OTP, then the user's home.
// params: { titleKey: 'auth.loginSuccessful' | 'auth.accountCreated' (or a ready `title`), next: home route (by role) }
function AuthSuccess({ navigation, route }) {
  const t = useT();
  const { titleKey, title: readyTitle } = route.params ?? {};
  const title = titleKey ? t(titleKey) : readyTitle ?? t('auth.loginSuccessful');
  const next = route.params?.next ?? ROUTES.MAIN_TABS;

  useEffect(() => {
    const timer = setTimeout(() => navigation.replace(next), NEXT_SCREEN_DELAY);
    return () => clearTimeout(timer);
  }, [navigation, next]);

  return (
    <ScreenContainer>
      <StatusView
        icon={
          <PopIn>
            <CheckCircle size={ms(84)} />
          </PopIn>
        }
        title={title}
        message={t('auth.success.message')}
      />
    </ScreenContainer>
  );
}

export default AuthSuccess;
