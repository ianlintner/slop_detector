# AI Consensus Analysis

The Slop Detector now supports AI consensus analysis, allowing you to enrich the internal scoring system with insights from multiple AI providers.

## Overview

AI Consensus Analysis combines the internal rule-based slop detection with insights from one or more AI language models to provide:

- **Enriched Scoring**: Blended scores combining internal analysis and AI consensus
- **Multiple Provider Support**: Aggregate results from different AI models
- **Confidence Metrics**: Understand how confident each AI provider is in their assessment
- **AI Insights**: Get detailed reasoning from AI models about detected issues

## Features

### 1. Multi-Provider Support

The system supports multiple AI providers that can analyze content in parallel:

- **OpenAI (GPT-4o-mini)** - Requires `OPENAI_API_KEY` environment variable
- **Anthropic (Claude 3 Haiku)** - Requires `ANTHROPIC_API_KEY` environment variable
- **Mock Provider** - Built-in testing provider (no API key required)

### 2. Consensus Aggregation

When multiple providers are used, their results are aggregated using weighted averaging based on confidence levels:

- Each provider returns a score (0-100) and confidence level (0-1)
- The consensus score is calculated as a weighted average
- Individual provider results are also displayed

### 3. Blended Scoring

The final score combines internal analysis with AI consensus:

- **Default weights**: 50% internal, 50% AI consensus
- **Customizable**: Adjust weights based on your needs
- **Fallback**: If AI analysis fails, falls back to internal analysis

## Usage

### Frontend Usage

1. **Enable AI Analysis**: Check the "🤖 Enable AI Consensus Analysis" checkbox
2. **Analyze Content**: Click the "🤖 Analyze with AI" button
3. **View Results**: See both internal and AI consensus scores, along with detailed insights

### API Usage

#### Using the AI Analyze Endpoint

```bash
curl -X POST http://localhost:3000/api/ai-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Your content to analyze...",
    "config": {
      "useAI": true,
      "providers": [
        { "name": "mock" }
      ],
      "includeInternal": true,
      "weights": {
        "internal": 0.5,
        "ai": 0.5
      }
    }
  }'
```

#### Response Format

```json
{
  "success": true,
  "analysis": {
    "score": 41,
    "finalScore": 66,
    "factors": {
      "repetitiveness": 0,
      "aiGenerated": 100,
      "clickbait": 50,
      "lowEffort": 40,
      "fluff": 0
    },
    "details": [
      "AI-typical phrases detected: delve into, dive deep...",
      "Clickbait patterns: You won't believe, shocking"
    ],
    "aiConsensus": {
      "consensusScore": 90,
      "confidence": 0.7,
      "insights": [
        "Mock: Mock analysis based on 39 words, AI phrases: true, clickbait: true"
      ],
      "individualResults": [
        {
          "provider": "Mock",
          "score": 90,
          "reasoning": "Mock analysis based on 39 words...",
          "confidence": 0.7,
          "factors": {
            "repetitiveness": 27,
            "aiGenerated": 60,
            "clickbait": 70,
            "lowEffort": 60,
            "fluff": 30
          }
        }
      ]
    }
  }
}
```

## Configuration

### Environment Variables

Configure AI providers using environment variables:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

### Provider Configuration

```typescript
import { AIProvider } from '@/lib/aiConsensus';

const providers: AIProvider[] = [
  { name: 'openai', apiKey: process.env.OPENAI_API_KEY },
  { name: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY },
  { name: 'mock' }, // For testing
];
```

### Weight Configuration

Adjust the balance between internal and AI scoring:

```typescript
const config = {
  weights: {
    internal: 0.3, // 30% weight to internal analysis
    ai: 0.7, // 70% weight to AI consensus
  },
};
```

## Programmatic Usage

### Using the AI Consensus Module

```typescript
import { performAIConsensus, enrichWithAI } from '@/lib/aiConsensus';
import { analyzeSlopContent } from '@/lib/slopDetector';

// Get internal analysis
const internalAnalysis = analyzeSlopContent(content);

// Perform AI consensus
const aiConsensus = await performAIConsensus(content, {
  providers: [{ name: 'mock' }],
  includeInternal: true,
  weights: {
    internal: 0.5,
    ai: 0.5,
  },
});

// Enrich with AI results
const enrichedAnalysis = enrichWithAI(internalAnalysis, aiConsensus);

console.log('Internal Score:', enrichedAnalysis.score);
console.log('AI Consensus:', enrichedAnalysis.aiConsensus.consensusScore);
console.log('Final Blended Score:', enrichedAnalysis.finalScore);
```

### Implementing Custom Providers

Create custom AI provider implementations:

```typescript
import { AIAnalysisResult } from '@/lib/aiConsensus';

export async function analyzeWithCustomAI(
  content: string,
  apiKey?: string
): Promise<AIAnalysisResult> {
  // Your custom AI provider logic here
  const response = await fetch('https://your-ai-api.com/analyze', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  const data = await response.json();

  return {
    provider: 'CustomAI',
    score: data.score,
    reasoning: data.reasoning,
    confidence: data.confidence,
    factors: data.factors,
  };
}

// Register in aiProviders.ts
PROVIDER_IMPLEMENTATIONS['customai'] = analyzeWithCustomAI;
```

## Benefits

### 1. Enhanced Accuracy

Combining rule-based detection with AI models provides:

- Better detection of subtle patterns
- Contextual understanding of content
- Reduced false positives/negatives

### 2. Flexibility

Choose when to use AI analysis:

- Use only internal analysis for fast, offline operation
- Enable AI for critical content that needs deeper analysis
- Mix and match providers based on your needs

### 3. Transparency

Get detailed insights:

- See both internal and AI scores separately
- Understand AI reasoning through insights
- View individual provider results
- Check confidence levels for each assessment

### 4. Cost Control

- Use AI only when needed (toggle on/off)
- Use cheaper mock provider for development/testing
- Mix expensive and cheaper providers
- Set custom weights to favor internal analysis

## Best Practices

1. **Start with Mock Provider**: Test your integration with the mock provider before using paid APIs
2. **Set Appropriate Weights**: Adjust weights based on your content type and AI provider accuracy
3. **Monitor Costs**: AI provider calls can be expensive - use them judiciously
4. **Handle Failures Gracefully**: The system falls back to internal analysis if AI fails
5. **Cache Results**: Consider caching AI results for repeated content analysis
6. **Validate Confidence**: Low confidence scores may indicate the AI is uncertain

## Limitations

- **API Costs**: AI provider calls incur costs based on usage
- **Latency**: AI analysis is slower than internal analysis (typically 1-5 seconds)
- **API Dependencies**: Requires internet connection and working API keys
- **Rate Limits**: Subject to provider rate limits
- **Context Length**: Very long content may exceed AI model token limits

## Troubleshooting

### AI Analysis Not Working

1. **Check API Keys**: Ensure environment variables are set correctly
2. **Check Provider Names**: Use 'openai', 'anthropic', or 'mock' (lowercase)
3. **Check Network**: Ensure server can reach AI provider APIs
4. **Check Logs**: Look for error messages in server console

### Unexpected Scores

1. **Review Individual Scores**: Check both internal and AI consensus separately
2. **Adjust Weights**: Fine-tune the blend ratio
3. **Check Confidence**: Low confidence may indicate uncertainty
4. **Try Different Providers**: Different AI models may give different results

### Performance Issues

1. **Use Fewer Providers**: Reduce the number of AI providers queried
2. **Increase Timeouts**: Allow more time for AI responses
3. **Cache Results**: Implement caching for repeated content
4. **Use Async Processing**: Process AI analysis in background for large batches

## Future Enhancements

Potential improvements to the AI consensus system:

- **More Providers**: Google Gemini, Cohere, local models
- **Batch Processing**: Analyze multiple pieces of content efficiently
- **Result Caching**: Cache AI results to reduce API calls
- **Custom Prompts**: Allow customization of AI analysis prompts
- **Provider Selection**: Automatic selection of best provider based on content type
- **Cost Tracking**: Monitor and report AI API costs
