import { NextResponse } from 'next/server';

// Lightweight health endpoint for Kubernetes/Istio probes
// Returns 200 immediately without rendering full React page
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'slop-detector' });
}
