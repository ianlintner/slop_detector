import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
// Readiness must reflect the live process, never a cached build artifact.
export const dynamic = 'force-dynamic';

/** Container/platform readiness probe. Deliberately says nothing about
 * configuration, providers, keys, spend or access control: an unauthenticated
 * caller learns only that the process is serving HTTP. */
export function GET() {
  return NextResponse.json(
    { status: 'ok' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
