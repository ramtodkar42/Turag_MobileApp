import { useEffect, useState } from 'react';
import { avatarImageSource } from '../api/services/profile.api';

// The account's profile photo as an <Image> source (with the login token), or
// null while it loads / when there is none (the Avatar shows initials then).
// avatarUrl: user.avatarUrl - a new photo gives a new value, so it reloads.
export default function useAvatarSource(avatarUrl) {
  const [source, setSource] = useState(null);

  useEffect(() => {
    let active = true;
    avatarImageSource(avatarUrl)
      .then(next => active && setSource(next))
      .catch(() => active && setSource(null));
    return () => {
      active = false;
    };
  }, [avatarUrl]);

  return source;
}
