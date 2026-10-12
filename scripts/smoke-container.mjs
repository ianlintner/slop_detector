import assert from 'node:assert/strict';

const base = process.env.SLOP_SMOKE_BASE_URL || 'http://127.0.0.1:3190';
let healthy = false;
for (let attempt = 0; attempt < 20; attempt++) {
  try {
    const response = await fetch(`${base}/api/health`);
    if (response.ok) {
      assert.deepEqual(await response.json(), { status: 'ok' });
      assert.equal(response.headers.get('cache-control'), 'no-store');
      healthy = true;
      break;
    }
  } catch {
    // Container may still be starting; never retry a provider call.
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
assert.ok(healthy, 'container readiness did not become healthy');

const home = await fetch(base);
assert.equal(home.status, 200, 'UI must load');
const html = await home.text();
const asset = html.match(/\/_next\/static\/[^" ]+\.css/);
assert.ok(asset, 'UI must reference a static CSS asset');
const staticResponse = await fetch(`${base}${asset[0]}`);
assert.equal(staticResponse.status, 200, 'static CSS must load');

const unauthorized = await fetch(`${base}/api/screenshot`, { method: 'POST' });
assert.equal(unauthorized.status, 401, 'unauthenticated upload must be denied');

const form = new FormData();
form.set('scope', 'image');
form.set('context', 'synthetic test');
form.set('consent', 'yes');
form.set('image', new Blob(['not an image'], { type: 'image/png' }), 'bad.png');
const invalid = await fetch(`${base}/api/screenshot`, {
  method: 'POST',
  headers: { Authorization: 'Bearer synthetic-token-12345678901234567890' },
  body: form,
});
assert.equal(
  invalid.status,
  415,
  'malformed image must be rejected before provider egress'
);
console.log('container smoke passed: health, UI, CSS, 401, 415');
