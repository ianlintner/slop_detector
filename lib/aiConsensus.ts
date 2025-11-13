/**
 * AI Consensus Module
 * Provides ability to analyze content using multiple AI providers
 * and aggregate results with internal scoring system
 */

import { SlopAnalysis } from './slopDetector';

export interface AIProvider {
  name: string;
  apiKey?: string;
  endpoint?: string;
}

export interface AIAnalysisResult {
  provider: string;
  score: number; // 0-100 slop score from AI
  reasoning: string;
  confidence: number; // 0-1 confidence in the analysis
  factors?: {
    repetitiveness?: number;
    aiGenerated?: number;
    clickbait?: number;
    lowEffort?: number;
    fluff?: number;
  };
}

export interface AIConsensusResult {
  consensusScore: number; // Aggregated score from all AI providers
  individualResults: AIAnalysisResult[];
  confidence: number; // Overall confidence
  insights: string[]; // Key insights from AI analysis
}

export interface EnrichedSlopAnalysis extends SlopAnalysis {
  aiConsensus?: AIConsensusResult;
  finalScore?: number; // Blended score combining internal + AI
}

/**
 * Configuration for AI consensus analysis
 */
export interface AIConsensusConfig {
  providers: AIProvider[];
  includeInternal: boolean; // Whether to include internal score in consensus
  weights?: {
    internal?: number; // Weight for internal scoring (default: 0.5)
    ai?: number; // Weight for AI consensus (default: 0.5)
  };
}

/**
 * Default configuration for AI consensus
 */
export const DEFAULT_AI_CONFIG: AIConsensusConfig = {
  providers: [],
  includeInternal: true,
  weights: {
    internal: 0.5,
    ai: 0.5,
  },
};

/**
 * Analyze content using a specific AI provider
 * This is a template function that can be extended for specific providers
 */
export async function analyzeWithProvider(
  content: string,
  provider: AIProvider
): Promise<AIAnalysisResult> {
  // Import provider implementations dynamically to avoid circular dependencies
  const { analyzeWithNamedProvider } = await import('./aiProviders');
  return analyzeWithNamedProvider(content, provider);
}

/**
 * Aggregate multiple AI analysis results into a consensus
 */
export function aggregateAIResults(
  results: AIAnalysisResult[]
): AIConsensusResult {
  if (results.length === 0) {
    return {
      consensusScore: 0,
      individualResults: [],
      confidence: 0,
      insights: ['No AI analysis results available'],
    };
  }

  // Calculate weighted consensus score based on confidence
  const totalWeight = results.reduce((sum, r) => sum + r.confidence, 0);
  if (totalWeight === 0) {
    // Handle case where all confidences are 0
    return {
      consensusScore: 0,
      individualResults: results,
      confidence: 0,
      insights: ['All AI providers returned 0 confidence'],
    };
  }
  const consensusScore = Math.round(
    results.reduce((sum, r) => sum + r.score * r.confidence, 0) / totalWeight
  );

  // Calculate overall confidence (average)
  const confidence =
    results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  // Collect unique insights from all providers
  const insights: string[] = [];
  const reasoningSet = new Set<string>();

  results.forEach((result) => {
    if (result.reasoning && !reasoningSet.has(result.reasoning)) {
      reasoningSet.add(result.reasoning);
      insights.push(`${result.provider}: ${result.reasoning}`);
    }
  });

  return {
    consensusScore,
    individualResults: results,
    confidence,
    insights,
  };
}

/**
 * Perform AI consensus analysis on content
 */
export async function performAIConsensus(
  content: string,
  config: AIConsensusConfig = DEFAULT_AI_CONFIG
): Promise<AIConsensusResult> {
  const results: AIAnalysisResult[] = [];

  // Analyze with all providers in parallel
  const promises = config.providers.map((provider) =>
    analyzeWithProvider(content, provider)
      .then((result) => ({ status: 'fulfilled' as const, value: result }))
      .catch((error: unknown) => ({
        status: 'rejected' as const,
        reason: error,
        providerName: provider.name,
      }))
  );

  const settled = await Promise.all(promises);

  settled.forEach((result) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      // Log error without using user-controlled provider name in format string
      console.error('Failed to analyze with AI provider:', {
        error:
          result.reason instanceof Error
            ? result.reason.message
            : 'Unknown error',
        providerNameLength: result.providerName.length,
      });
      // Continue with other providers even if one fails
    }
  });

  return aggregateAIResults(results);
}

/**
 * Enrich internal slop analysis with AI consensus
 */
export function enrichWithAI(
  internalAnalysis: SlopAnalysis,
  aiConsensus: AIConsensusResult,
  config: AIConsensusConfig = DEFAULT_AI_CONFIG
): EnrichedSlopAnalysis {
  const internalWeight = config.weights?.internal ?? 0.5;
  const aiWeight = config.weights?.ai ?? 0.5;

  // Calculate blended score
  const finalScore = config.includeInternal
    ? Math.round(
        internalAnalysis.score * internalWeight +
          aiConsensus.consensusScore * aiWeight
      )
    : aiConsensus.consensusScore;

  return {
    ...internalAnalysis,
    aiConsensus,
    finalScore,
  };
}

/**
 * Generic AI provider call function
 * Can be extended to support different AI APIs
 */
export async function callAIProvider(
  provider: AIProvider,
  _prompt: string,
  _content: string
): Promise<string> {
  // This is a generic function that can be customized per provider
  // For security, API keys should be stored in environment variables

  const ALLOWED_ENV_KEYS: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
  };
  const envKey = ALLOWED_ENV_KEYS[provider.name.toLowerCase()];
  if (!provider.apiKey && (!envKey || !process.env[envKey])) {
    throw new Error(`API key not configured for provider: ${provider.name}`);
  }

  // Placeholder for actual API implementation
  // Each provider would have its own implementation
  throw new Error(`AI provider ${provider.name} implementation pending`);
}

/**
 * Create a prompt for AI slop analysis
 */
export function createSlopAnalysisPrompt(content: string): string {
  // Limit content length to prevent token limit issues
  const maxLength = 10000;
  const truncatedContent =
    content.length > maxLength
      ? content.substring(0, maxLength) + '...[truncated]'
      : content;

  // Escape triple quotes and backslashes to prevent breaking the prompt structure
  const sanitizedContent = truncatedContent
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/"""/g, '\\"""'); // Then escape triple quotes

  return `Analyze the following content for "slop" characteristics - low-effort, repetitive, AI-generated, clickbait, or spammy content.

Provide a score from 0-100 where:
- 0-19: Minimal Slop (high quality)
- 20-39: Low Slop (generally good)
- 40-59: Moderate Slop (noticeable issues)
- 60-79: High Slop (significant issues)
- 80-100: Extreme Slop (very low quality)

Analyze these factors:
1. Repetitiveness: Repeated words, phrases, sentences
2. AI-Generated: Common AI writing patterns and phrases
3. Clickbait: Sensationalist headlines and patterns
4. Low Effort: Poor structure, very short or padded content
5. Fluff: Excessive filler words

Content to analyze:
"""
${sanitizedContent}
"""

Respond with:
1. Overall slop score (0-100)
2. Brief reasoning for the score
3. Confidence level (0-1)
4. Optional: Individual factor scores

Format your response as JSON with this structure:
{
  "score": <number>,
  "reasoning": "<string>",
  "confidence": <number>,
  "factors": {
    "repetitiveness": <number>,
    "aiGenerated": <number>,
    "clickbait": <number>,
    "lowEffort": <number>,
    "fluff": <number>
  }
}`;
}
