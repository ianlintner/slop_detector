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
    const aiResponse = JSON.parse(data.choices[0].message.content);

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
    const textContent = data.content[0].text;
    
    // Extract JSON from response (Claude might include additional text)
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Anthropic response');
    }
    
    const aiResponse = JSON.parse(jsonMatch[0]);

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
  const implementation = PROVIDER_IMPLEMENTATIONS[providerName];
  
  if (!implementation) {
    throw new Error(`Unknown provider: ${provider.name}. Available providers: ${Object.keys(PROVIDER_IMPLEMENTATIONS).join(', ')}`);
  }
  
  return implementation(content, provider.apiKey);
}
