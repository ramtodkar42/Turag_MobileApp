const LOOKUP_URL = 'https://itunes.apple.com/lookup';
const COUNTRY = 'in'; // the Indian App Store, where Turag is sold
const TIMEOUT_MS = 8000;

// The app's current App Store release, from Apple's public lookup: { version, url,
// minimumOsVersion }, or null when it isn't listed. Apple's service, not Turag's backend,
// so it goes straight to fetch: no session or backend address.
export const getAppStoreRelease = async bundleId => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const query = `?bundleId=${encodeURIComponent(bundleId)}&country=${COUNTRY}`;
    const response = await fetch(`${LOOKUP_URL}${query}`, { signal: controller.signal });
    if (!response.ok) return null;
    const app = (await response.json())?.results?.[0];
    if (!app?.version || !app?.trackViewUrl) return null;
    return { version: app.version, url: app.trackViewUrl, minimumOsVersion: app.minimumOsVersion };
  } finally {
    clearTimeout(timer);
  }
};
