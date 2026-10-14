import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import {
  MAX_CONTENT_CHARS,
  MAX_URL_CHARS,
  previewGateDenied,
  readBoundedJson,
} from '@/lib/previewGate';
import { errorClass } from '@/lib/safeError';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const denied = previewGateDenied(request);
  if (denied) return denied;
  try {
    const body = await readBoundedJson(request, 8 * 1024);
    if (!body.ok) return body.response;
    const { url } = (body.value ?? {}) as { url?: unknown };

    if (typeof url === 'string' && url.length > MAX_URL_CHARS) {
      return NextResponse.json({ error: 'URL too long' }, { status: 413 });
    }
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Extract video ID from URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    // Fetch transcript
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    // Combine transcript text
    // Bound the response so it can be passed to /api/ai-analyze unchanged.
    const full = transcript.map((item) => item.text).join(' ');
    const truncated = full.length > MAX_CONTENT_CHARS;
    const text = truncated ? full.slice(0, MAX_CONTENT_CHARS) : full;

    return NextResponse.json({ text, truncated });
  } catch (error) {
    console.error('Error fetching transcript:', errorClass(error));
    return NextResponse.json(
      {
        error:
          'Failed to fetch YouTube transcript. The video may not have captions available.',
      },
      { status: 500 }
    );
  }
}

function extractVideoId(url: string): string | null {
  // Match various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1] && /^[\w-]{11}$/.test(match[1])) {
      return match[1];
    }
  }

  return null;
}
