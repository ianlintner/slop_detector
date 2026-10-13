import { NextRequest, NextResponse } from 'next/server';
import { analyzeSlopContent } from '@/lib/slopDetector';
import {
  performAIConsensus,
  enrichWithAI,
  AIConsensusConfig,
  DEFAULT_AI_CONFIG,
} from '@/lib/aiConsensus';
import {
  MAX_CONTENT_CHARS,
  MAX_PROVIDERS,
  previewGateDenied,
  readBoundedJson,
} from '@/lib/previewGate';
import { errorClass } from '@/lib/safeError';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const denied = previewGateDenied(request);
  if (denied) return denied;
  try {
    const body = await readBoundedJson(request);
    if (!body.ok) return body.response;
    const { content, config } = (body.value ?? {}) as {
      content?: unknown;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config?: any;
    };

    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content must be a non-empty string' },
        { status: 400 }
      );
    }
    if (content.length > MAX_CONTENT_CHARS) {
      return NextResponse.json(
        { error: `Content exceeds ${MAX_CONTENT_CHARS} characters.` },
        { status: 413 }
      );
    }
    if (
      config !== undefined &&
      (config === null || typeof config !== 'object' || Array.isArray(config))
    ) {
      return NextResponse.json(
        { error: 'config must be an object' },
        { status: 400 }
      );
    }
    if (
      config?.providers !== undefined &&
      (!Array.isArray(config.providers) ||
        config.providers.length > MAX_PROVIDERS ||
        config.providers.some(
          (p: unknown) =>
            !p ||
            typeof p !== 'object' ||
            typeof (p as { name?: unknown }).name !== 'string' ||
            (p as { name: string }).name.length > 32
        ))
    ) {
      return NextResponse.json(
        {
          error: `providers must list at most ${MAX_PROVIDERS} named providers`,
        },
        { status: 400 }
      );
    }

    // Get internal analysis first
    const internalAnalysis = analyzeSlopContent(content);

    // If AI consensus is requested and configured
    const useAI = config?.useAI ?? false;

    if (!useAI) {
      // Return just internal analysis
      return NextResponse.json({
        success: true,
        analysis: internalAnalysis,
      });
    }

    // Perform AI consensus analysis
    // Validate and normalize weights if present in config
    const normalizedConfig = { ...config };
    // Callers may not supply provider credentials; servers use their own keys.
    if (Array.isArray(normalizedConfig.providers))
      normalizedConfig.providers = normalizedConfig.providers.map(
        (p: { name: string }) => ({ name: p.name })
      );
    if (
      normalizedConfig.weights &&
      typeof normalizedConfig.weights === 'object'
    )
      normalizedConfig.weights = { ...normalizedConfig.weights };
    else delete normalizedConfig.weights;
    if (normalizedConfig.weights) {
      let internal = Number(normalizedConfig.weights.internal);
      let ai = Number(normalizedConfig.weights.ai);
      // Default to 0.5 if not a valid number
      if (!isFinite(internal) || internal < 0 || internal > 1) internal = 0.5;
      if (!isFinite(ai) || ai < 0 || ai > 1) ai = 0.5;
      const sum = internal + ai;
      if (sum > 0) {
        normalizedConfig.weights.internal = internal / sum;
        normalizedConfig.weights.ai = ai / sum;
      } else {
        // If both are zero, default to 0.5 each
        normalizedConfig.weights.internal = 0.5;
        normalizedConfig.weights.ai = 0.5;
      }
    }
    const aiConfig: AIConsensusConfig = {
      ...DEFAULT_AI_CONFIG,
      includeInternal: normalizedConfig.includeInternal === true,
      providers: Array.isArray(normalizedConfig.providers)
        ? (normalizedConfig.providers as { name: string }[])
        : DEFAULT_AI_CONFIG.providers,
      ...(normalizedConfig.weights
        ? { weights: normalizedConfig.weights }
        : {}),
    };

    try {
      const aiConsensus = await performAIConsensus(content, aiConfig);
      const enrichedAnalysis = enrichWithAI(
        internalAnalysis,
        aiConsensus,
        aiConfig
      );

      return NextResponse.json({
        success: true,
        analysis: enrichedAnalysis,
      });
    } catch (aiError) {
      // If AI analysis fails, return internal analysis with error info
      // Log only the error class: provider errors can echo request content.
      console.error('AI consensus analysis failed:', errorClass(aiError));

      return NextResponse.json({
        success: true,
        analysis: internalAnalysis,
        warning:
          'AI consensus analysis not available. Showing internal analysis only.',
        aiError: 'AI provider unavailable',
      });
    }
  } catch (error) {
    console.error('Error in AI analyze endpoint:', errorClass(error));
    return NextResponse.json(
      { error: 'Failed to analyze content' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const denied = previewGateDenied(request);
  if (denied) return denied;
  return NextResponse.json({
    info: 'AI-powered slop analysis endpoint',
    usage: {
      method: 'POST',
      body: {
        content: 'string (required) - Content to analyze',
        config: {
          useAI: 'boolean (optional) - Enable AI consensus analysis',
          providers: 'array (optional) - AI providers to use',
          includeInternal:
            'boolean (optional) - Include internal scoring in consensus',
          weights: {
            internal: 'number (optional) - Weight for internal score (0-1)',
            ai: 'number (optional) - Weight for AI consensus (0-1)',
          },
        },
      },
    },
    example: {
      content: 'Your text content here...',
      config: {
        useAI: true,
        includeInternal: true,
        weights: {
          internal: 0.5,
          ai: 0.5,
        },
      },
    },
  });
}
