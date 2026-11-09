// Checks the backend's "session expired" fix on the live server, the way the app
// renews its sign-in (POST /api/v1/auth/refresh with { refresh_token }, no cookies):
//
//   1. Renew with the token: it must work (200) and hand out a new one.
//   2. Renew AGAIN with the SAME old token a few seconds later - what happens when the
//      first reply never reached the phone (weak network, app closed / reloaded).
//      Fixed: accepted (200, the current tokens). Not fixed: 401, and the whole
//      session is signed out.
//   3. Renew with the newest token: the session must still be alive.
//   + Whether the reply carries refresh_token in its JSON body (the optional item).
//
// The other half of the fix - the 30-day limit moving forward on each renewal - can't be
// seen from outside (the cookie always says 30 days); it needs a look at the backend code.
//
// Usage (PowerShell), with the tg_refresh cookie from a FRESH login on turag.ai
// (Chrome: F12 > Application > Cookies > https://turag.ai > tg_refresh > Value):
//   $env:TURAG_REFRESH = "<value>"; node scripts/check-session-refresh.mjs
// The token is a password: never paste it into a chat or commit it. The test uses up
// that browser session (log in on the website again afterwards).
// Another server: $env:TURAG_BASE = "https://turag-staging.vercel.app"

const BASE = (process.env.TURAG_BASE ?? 'https://turag.ai').replace(/\/+$/, '');
const URL = `${BASE}/api/v1/auth/refresh`;
const token0 = (process.env.TURAG_REFRESH ?? '').trim();
const GAP_MS = 3000;

const mask = value => (value ? `${String(value).slice(0, 6)}…` : '(none)');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// The rotated refresh token from the cookie the server sets (when it sets one).
const cookieToken = headers => {
  const all = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [headers.get('set-cookie') ?? ''];
  const cookie = all.find(c => /^tg_refresh=./.test(c));
  return cookie ? decodeURIComponent(cookie.split(';')[0].slice('tg_refresh='.length)) : null;
};

const renew = async refreshToken => {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.status === 429) {
    console.log('\nThe server is limiting renewals right now (HTTP 429). Wait a minute and run it again.');
    process.exit(3);
  }
  return {
    status: res.status,
    code: data?.error?.code ?? data?.code ?? null,
    bodyToken: data?.refresh_token ?? null,
    access: data?.access_token ?? null,
    next: data?.refresh_token ?? cookieToken(res.headers),
  };
};

const line = (ok, text) => console.log(`${ok === null ? '  -  ' : ok ? ' PASS' : ' FAIL'}  ${text}`);

if (!token0) {
  console.error('Set TURAG_REFRESH first (see the top of this file).');
  process.exit(2);
}

console.log(`Server: ${URL}\nToken:  ${mask(token0)}\n`);

const first = await renew(token0);
console.log(`1. Renew with the token           -> HTTP ${first.status}${first.code ? ` ${first.code}` : ''}`);
if (first.status !== 200 || !first.next) {
  line(false, 'The token itself was refused - use one from a fresh login (each token works once).');
  process.exit(1);
}
line(true, `renewed; new token ${mask(first.next)}`);

await wait(GAP_MS);
const again = await renew(token0);
console.log(`2. Same OLD token again (+${GAP_MS / 1000}s)    -> HTTP ${again.status}${again.code ? ` ${again.code}` : ''}`);
const graceOk = again.status === 200 && !!again.access;
line(graceOk, graceOk ? 'accepted within the grace window (no sign-out)' : 'refused - a lost reply still signs the user out');

const latest = (graceOk ? again.next : null) ?? first.next;
const third = await renew(latest);
console.log(`3. Renew with the newest token     -> HTTP ${third.status}${third.code ? ` ${third.code}` : ''}`);
line(third.status === 200, third.status === 200 ? 'the session is still alive' : 'the session was ended');

console.log('');
line(null, `refresh_token in the JSON body: ${first.bodyToken ? 'yes' : 'no (cookie only - the app handles both)'}`);

const fixed = graceOk && third.status === 200;
console.log(`\nResult: ${fixed ? 'FIXED - a lost refresh reply no longer signs the user out.' : 'NOT FIXED yet (see above).'}`);
process.exit(fixed ? 0 : 1);
