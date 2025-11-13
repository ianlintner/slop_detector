# API Reference

Technical documentation for the Slop Detector algorithm and API.

## Overview

Slop Detector provides two modes of analysis:

1. **Internal Analysis** - Fast, rule-based detection using predefined patterns
2. **AI Consensus Analysis** - Enhanced analysis using multiple AI providers (see [AI Consensus Guide](ai-consensus.md))

## Core API

### `analyzeSlopContent(content: string): SlopAnalysis`

The main function that analyzes content for slop characteristics.

**Parameters:**
- `content` (string): The text content to analyze

**Returns:** `SlopAnalysis` object

**Example:**
```typescript
import { analyzeSlopContent } from '@/lib/slopDetector';

const text = "Your content here...";
const analysis = analyzeSlopContent(text);

console.log(`Score: ${analysis.score}`);
console.log(`Details: ${analysis.details.join(', ')}`);
```

## Data Types

### `SlopAnalysis`

```typescript
interface SlopAnalysis {
  score: number;        // Overall slop score (0-100)
  factors: {
    repetitiveness: number;  // 0-100
    aiGenerated: number;     // 0-100
    clickbait: number;       // 0-100
    lowEffort: number;       // 0-100
    fluff: number;           // 0-100
  };
  details: string[];   // Array of specific issues detected
}
```

**Fields:**

- **score** (number): Overall slop score from 0-100, where higher scores indicate more slop
- **factors** (object): Individual scores for each detection category
  - **repetitiveness**: Measures word and sentence repetition
  - **aiGenerated**: Detects AI-typical writing patterns
  - **clickbait**: Identifies sensationalist content
  - **lowEffort**: Catches poor structure and padding
  - **fluff**: Counts filler words and phrases
- **details** (string[]): Human-readable descriptions of detected issues

## Algorithm Details

### Score Calculation

The overall slop score is computed as a weighted average:

```typescript
score = Math.round(
  repetitiveness * 0.25 +
  aiGenerated * 0.25 +
  clickbait * 0.2 +
  lowEffort * 0.15 +
  fluff * 0.15
);
```

| Factor | Weight | Impact |
|--------|--------|--------|
| Repetitiveness | 25% | Highest impact |
| AI-Generated | 25% | Highest impact |
| Clickbait | 20% | High impact |
| Low Effort | 15% | Moderate impact |
| Fluff | 15% | Moderate impact |

### Detection Methods

#### 1. Repetitiveness Detection

**Method:** `calculateRepetitiveness(words, sentences, details)`

**Logic:**
1. Counts frequency of words longer than 3 characters
2. Identifies words repeated more than 5 times
3. Detects identical sentences appearing multiple times

**Scoring:**
- +30 points: High-repeat words found (>5 occurrences)
- +40 points: Duplicate sentences detected
- Cap: 100 points maximum

**Example:**
```typescript
// Input with repetition
"The best product. The best service. The best price. 
The best quality. The best choice."

// Detection: "best" repeated 5+ times → +30 points
```

#### 2. AI-Generated Content Detection

**Method:** `calculateAIScore(lowerContent, details)`

**Patterns Detected:**
```typescript
const AI_PHRASES = [
  'delve into',
  'dive deep',
  'it\'s important to note',
  'in conclusion',
  'in today\'s digital age',
  'revolutionize',
  'game-changer',
  'unlock the secrets',
  'ultimate guide',
  'comprehensive guide',
  'navigate the complexities',
  'multifaceted',
  'holistic approach',
  'leverage',
  'synergy',
  'paradigm shift',
];
```

**Scoring:**
- +15 points per AI phrase detected
- Cap: 100 points maximum

**Example:**
```typescript
// Input with AI phrases
"Let's delve into this comprehensive guide to navigate 
the complexities of this paradigm shift."

// Detection: 4 AI phrases → 60 points
```

#### 3. Clickbait Detection

**Method:** `calculateClickbaitScore(lowerContent, content, details)`

**Patterns Detected:**
```typescript
const CLICKBAIT_PATTERNS = [
  /you won't believe/i,
  /shocking/i,
  /this one trick/i,
  /doctors hate/i,
  /number \d+ will shock you/i,
  /what happens next/i,
  /\d+ secrets/i,
  /the truth about/i,
  /they don't want you to know/i,
];
```

**Scoring:**
- +25 points per clickbait pattern matched
- +20 points if >5 exclamation marks found
- Cap: 100 points maximum

**Example:**
```typescript
// Input with clickbait
"You won't believe these 5 secrets doctors hate!!!"

// Detection: 
// - "You won't believe" → +25
// - "secrets" → +25
// - "doctors hate" → +25
// - 3 exclamation marks (under threshold)
// Total: 75 points
```

#### 4. Low Effort Detection

**Method:** `calculateLowEffortScore(content, words, sentences, details)`

**Checks:**
1. Very short content (<50 words)
2. Unusually long sentences (>50 words average)
3. Lack of structure (<3 sentences but >30 words)

**Scoring:**
- +40 points: Content <50 words
- +30 points: Average sentence length >50 words
- +20 points: Poor sentence structure
- Cap: 100 points maximum

**Example:**
```typescript
// Input with low effort
"Buy now great product works well very good"

// Detection: Only 7 words → +40 points
```

#### 5. Fluff Detection

**Method:** `calculateFluffScore(lowerContent, words, details)`

**Filler Words Detected:**
```typescript
const FILLER_PHRASES = [
  'basically',
  'literally',
  'actually',
  'honestly',
  'so yeah',
  'um',
  'uh',
  'you know',
  'like',
  'sort of',
  'kind of',
];
```

**Scoring:**
- +50 points: Filler words >5% of total words
- +25 points: Filler words >2% of total words
- Cap: 100 points maximum

**Example:**
```typescript
// Input with fluff (50 words, 5 filler words = 10%)
"So basically this is like literally the best thing..."

// Detection: 5/50 = 10% > 5% threshold → +50 points
```

## Utility Functions

### `getSlopRating(score: number): string`

Converts numeric score to human-readable rating.

**Parameters:**
- `score` (number): Slop score from 0-100

**Returns:** String rating

**Mappings:**
```typescript
score >= 80 → "Extreme Slop"
score >= 60 → "High Slop"
score >= 40 → "Moderate Slop"
score >= 20 → "Low Slop"
score < 20  → "Minimal Slop"
```

**Example:**
```typescript
getSlopRating(75)  // Returns: "High Slop"
getSlopRating(15)  // Returns: "Minimal Slop"
```

### `getSlopColor(score: number): string`

Returns Tailwind CSS color class for score visualization.

**Parameters:**
- `score` (number): Slop score from 0-100

**Returns:** Tailwind CSS color class string

**Mappings:**
```typescript
score >= 80 → "text-red-600"     // Extreme
score >= 60 → "text-orange-600"  // High
score >= 40 → "text-yellow-600"  // Moderate
score >= 20 → "text-blue-600"    // Low
score < 20  → "text-green-600"   // Minimal
```

**Example:**
```typescript
getSlopColor(85)  // Returns: "text-red-600"
getSlopColor(10)  // Returns: "text-green-600"
```

## API Routes

### POST `/api/analyze-youtube`

Analyzes YouTube video transcripts.

**Request Body:**
```typescript
{
  url: string;  // YouTube video URL
}
```

**Response:**
```typescript
{
  success: boolean;
  analysis?: SlopAnalysis;
  error?: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/analyze-youtube \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID"}'
```

### POST `/api/ai-analyze`

Analyzes content with optional AI consensus. See [AI Consensus Guide](ai-consensus.md) for detailed documentation.

**Request Body:**
```typescript
{
  content: string;  // Content to analyze
  config?: {
    useAI?: boolean;          // Enable AI consensus (default: false)
    providers?: AIProvider[]; // AI providers to use, e.g., [{ name: 'openai', apiKey?: 'sk-...' }]
    includeInternal?: boolean; // Include internal score (default: true)
    weights?: {
      internal?: number;      // Weight for internal score (default: 0.5)
      ai?: number;           // Weight for AI consensus (default: 0.5)
    }
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  analysis: EnrichedSlopAnalysis; // May include AI consensus data
  warning?: string;               // Warning if AI analysis failed
  aiError?: string;              // Details of AI error
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/ai-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Your content here...",
    "config": {
      "useAI": true,
      "providers": [{"name": "mock"}],
      "includeInternal": true,
      "weights": {"internal": 0.5, "ai": 0.5}
    }
  }'
```

**Success Response:**
```json
{
  "success": true,
  "analysis": {
    "score": 45,
    "factors": {
      "repetitiveness": 30,
      "aiGenerated": 60,
      "clickbait": 25,
      "lowEffort": 20,
      "fluff": 40
    },
    "details": [
      "AI-typical phrases detected: delve into, comprehensive guide",
      "Moderate filler word usage (12 filler words)"
    ]
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "No transcript available for this video"
}
```

## Performance Considerations

### Time Complexity

- **Text Analysis**: O(n) where n is the number of words
- **Pattern Matching**: O(n × m) where m is the number of patterns
- **Overall**: Linear time complexity for typical content

### Memory Usage

- Minimal memory overhead
- No external API calls for text analysis
- YouTube analysis requires network request

### Optimization

The algorithm is optimized for:
- Fast execution (<100ms for typical content)
- Low memory footprint
- No database or external dependencies (except YouTube API)

## Integration Examples

### React Component

```typescript
'use client';

import { useState } from 'react';
import { analyzeSlopContent, getSlopRating, getSlopColor } from '@/lib/slopDetector';

export default function SlopAnalyzer() {
  const [content, setContent] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = () => {
    const result = analyzeSlopContent(content);
    setAnalysis(result);
  };

  return (
    <div>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} />
      <button onClick={handleAnalyze}>Analyze</button>
      {analysis && (
        <div>
          <h2 className={getSlopColor(analysis.score)}>
            Score: {analysis.score} - {getSlopRating(analysis.score)}
          </h2>
          <ul>
            {analysis.details.map((detail, i) => (
              <li key={i}>{detail}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Node.js Script

```javascript
const { analyzeSlopContent } = require('./lib/slopDetector');

const content = process.argv[2] || "Sample text to analyze";
const analysis = analyzeSlopContent(content);

console.log(`Slop Score: ${analysis.score}/100`);
console.log('\nFactors:');
Object.entries(analysis.factors).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});
console.log('\nDetails:');
analysis.details.forEach(detail => console.log(`  - ${detail}`));
```

## Extending the Algorithm

### Adding New Detection Patterns

To add new AI phrases:

```typescript
// In lib/slopDetector.ts
const AI_PHRASES = [
  // ... existing phrases
  'your new phrase here',
];
```

To add new clickbait patterns:

```typescript
const CLICKBAIT_PATTERNS = [
  // ... existing patterns
  /your new pattern/i,
];
```

### Adjusting Weights

Modify the scoring weights in `analyzeSlopContent`:

```typescript
const score = Math.round(
  repetitiveness * 0.30 +  // Increased from 0.25
  aiGenerated * 0.20 +      // Decreased from 0.25
  clickbait * 0.20 +
  lowEffort * 0.15 +
  fluff * 0.15
);
```

### Custom Scoring Functions

Create your own scoring function:

```typescript
export function customAnalyze(content: string): CustomAnalysis {
  const baseAnalysis = analyzeSlopContent(content);
  
  // Add custom logic
  const customScore = calculateCustomMetric(content);
  
  return {
    ...baseAnalysis,
    customMetric: customScore,
  };
}
```
