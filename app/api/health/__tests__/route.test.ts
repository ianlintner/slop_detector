/** @jest-environment node */
import { GET } from '../route';

test('health stays dynamic and reveals no provider configuration', async () => {
  const response = GET();
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ status: 'ok' });
});
