/**
 * AI Provider Implementations
 * Example implementations for various AI providers
 * Users can extend these or create their own
 */

import {
  AIProvider,
  AIAnalysisResult,
  createSlopAnalysisPrompt,
} from './aiConsensus';

/**
 * OpenAI Provider Implementation (Example)
 * Requires OPENAI_API_KEY environment variable
 */
export async function analyzeWithOpenAI(
  content: string,
  apiKey?: string
): Promise<AIAnalysisResult> {
  const key = apiKey || process.env.OPENAI_API_KEY;
  
  if (!key) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = createSlopAnalysisPrompt(content);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using cost-effective model
        messages: [
          {
            role: 'system',
            content: 'You are an expert content quality analyzer. Analyze content for slop characteristics and respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (
      !data.choices ||
      !Array.isArray(data.choices) ||
      data.choices.length === 0 ||
      !data.choices[0].message ||
      typeof data.choices[0].message.content !== 'string'
    ) {
      throw new Error('Invalid response structure from OpenAI API');
    }

    let aiResponse;
    try {
      aiResponse = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      throw new Error(`Failed to parse OpenAI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    // Validate required fields
    if (typeof aiResponse.score !== 'number') {
      throw new Error('OpenAI response missing required "score" field');
    }

    return {
      provider: 'OpenAI',
      score: aiResponse.score || 50,
      reasoning: aiResponse.reasoning || 'No reasoning provided',
      confidence: aiResponse.confidence || 0.8,
      factors: aiResponse.factors,
    };
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    throw error;
  }
}

/**
 * Anthropic Claude Provider Implementation (Example)
 * Requires ANTHROPIC_API_KEY environment variable
 */
export async function analyzeWithAnthropic(
  content: string,
  apiKey?: string
): Promise<AIAnalysisResult> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  
  if (!key) {
    throw new Error('Anthropic API key not configured');
  }

  const prompt = createSlopAnalysisPrompt(content);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // Using cost-effective model
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (
      !data.content ||
      !Array.isArray(data.content) ||
      data.content.length === 0 ||
      !data.content[0].text
    ) {
      throw new Error('Invalid response structure from Anthropic API');
    }
    const textContent = data.content[0].text;
    
    // Extract JSON from response (Claude might include additional text)
    // Use non-greedy approach to avoid capturing multiple JSON objects
    const jsonStart = textContent.indexOf('{');
    const jsonEnd = textContent.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      throw new Error('Could not find JSON object in Anthropic response');
    }
    const jsonStr = textContent.substring(jsonStart, jsonEnd + 1);
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(jsonStr);
    } catch (parseError) {
      throw new Error(`Failed to parse Anthropic response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    if (typeof aiResponse.score !== 'number') {
      throw new Error('Anthropic response missing required "score" field');
    }

    return {
      provider: 'Anthropic',
      score: aiResponse.score || 50,
      reasoning: aiResponse.reasoning || 'No reasoning provided',
      confidence: aiResponse.confidence || 0.8,
      factors: aiResponse.factors,
    };
  } catch (error) {
    console.error('Anthropic analysis error:', error);
    throw error;
  }
}

/**
 * Mock Provider for Testing
 * Returns simulated results without API calls
 */
export async function analyzeWithMock(
  content: string
): Promise<AIAnalysisResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Simple heuristic-based mock analysis
  const words = content.split(/\s+/).length;
  const hasAIPhrases = /delve into|dive deep|comprehensive guide/i.test(content);
  const hasClickbait = /you won't believe|shocking/i.test(content);
  
  let score = 30; // Base score
  
  if (hasAIPhrases) score += 20;
  if (hasClickbait) score += 25;
  if (words < 50) score += 15;
  
  score = Math.min(score, 100);

  return {
    provider: 'Mock',
    score,
    reasoning: `Mock analysis based on ${words} words, AI phrases: ${hasAIPhrases}, clickbait: ${hasClickbait}`,
    confidence: 0.7,
    factors: {
      repetitiveness: score * 0.3,
      aiGenerated: hasAIPhrases ? 60 : 20,
      clickbait: hasClickbait ? 70 : 10,
      lowEffort: words < 50 ? 60 : 20,
      fluff: 30,
    },
  };
}

/**
 * Provider Registry
 * Maps provider names to their implementation functions
 */
export const PROVIDER_IMPLEMENTATIONS: Record<
  string,
  (content: string, apiKey?: string) => Promise<AIAnalysisResult>
> = {
  openai: analyzeWithOpenAI,
  anthropic: analyzeWithAnthropic,
  mock: analyzeWithMock,
};

/**
 * Get available AI providers
 */
export function getAvailableProviders(): string[] {
  const providers: string[] = ['mock']; // Mock is always available
  
  if (process.env.OPENAI_API_KEY) {
    providers.push('openai');
  }
  
  if (process.env.ANTHROPIC_API_KEY) {
    providers.push('anthropic');
  }
  
  return providers;
}

/**
 * Analyze content with a specific provider by name
 */
export async function analyzeWithNamedProvider(
  content: string,
  provider: AIProvider
): Promise<AIAnalysisResult> {
  const providerName = provider.name.toLowerCase();
  
  // Validate provider name against allowed list to prevent code injection
  const allowedProviders = Object.keys(PROVIDER_IMPLEMENTATIONS);
  if (!allowedProviders.includes(providerName)) {
    // Sanitize provider name for error message to prevent injection
    const sanitizedName = provider.name.replace(/[^a-zA-Z0-9-_]/g, '');
    throw new Error(`Unknown provider: ${sanitizedName}. Available providers: ${allowedProviders.join(', ')}`);
  }
  
  const implementation = PROVIDER_IMPLEMENTATIONS[providerName];
  return implementation(content, provider.apiKey);
}
