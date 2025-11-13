import { NextRequest, NextResponse } from 'next/server';
import { analyzeSlopContent } from '@/lib/slopDetector';
import {
  performAIConsensus,
  enrichWithAI,
  AIConsensusConfig,
  DEFAULT_AI_CONFIG,
} from '@/lib/aiConsensus';

export async function POST(request: NextRequest) {
  try {
    const { content, config } = await request.json();
    
    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content must be a non-empty string' },
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
      ...normalizedConfig,
    };

    try {
      const aiConsensus = await performAIConsensus(content, aiConfig);
      const enrichedAnalysis = enrichWithAI(internalAnalysis, aiConsensus, aiConfig);

      return NextResponse.json({
        success: true,
        analysis: enrichedAnalysis,
      });
    } catch (aiError) {
      // If AI analysis fails, return internal analysis with error info
      console.error('AI consensus analysis failed:', aiError);
      
      return NextResponse.json({
        success: true,
        analysis: internalAnalysis,
        warning: 'AI consensus analysis not available. Showing internal analysis only.',
        aiError: aiError instanceof Error ? aiError.message : 'Unknown AI error',
      });
    }
  } catch (error) {
    console.error('Error in AI analyze endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'AI-powered slop analysis endpoint',
    usage: {
      method: 'POST',
      body: {
        content: 'string (required) - Content to analyze',
        config: {
          useAI: 'boolean (optional) - Enable AI consensus analysis',
          providers: 'array (optional) - AI providers to use',
          includeInternal: 'boolean (optional) - Include internal scoring in consensus',
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
