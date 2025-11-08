/**
 * Slop Detection Algorithm
 * Analyzes content for low-effort, repetitive, AI-generated, or spammy characteristics
 */

export interface SlopAnalysis {
  score: number; // 0-100, where 100 is maximum slop
  factors: {
    repetitiveness: number;
    aiGenerated: number;
    clickbait: number;
    lowEffort: number;
    fluff: number;
  };
  details: string[];
}

// Common AI-generated phrases and patterns
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

// Clickbait patterns
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

// Filler words and phrases
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

// Pre-compiled RegExp objects for filler phrases (for performance)
const FILLER_REGEXES = FILLER_PHRASES.map(
  filler => new RegExp(`\\b${filler}\\b`, 'gi')
);

export function analyzeSlopContent(content: string): SlopAnalysis {
  const lowerContent = content.toLowerCase();
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  const details: string[] = [];
  
  // 1. Repetitiveness Score (0-100)
  const repetitiveness = calculateRepetitiveness(words, sentences, details);
  
  // 2. AI-Generated Score (0-100)
  const aiGenerated = calculateAIScore(lowerContent, details);
  
  // 3. Clickbait Score (0-100)
  const clickbait = calculateClickbaitScore(lowerContent, content, details);
  
  // 4. Low Effort Score (0-100)
  const lowEffort = calculateLowEffortScore(content, words, sentences, details);
  
  // 5. Fluff Score (0-100)
  const fluff = calculateFluffScore(lowerContent, words, details);
  
  // Calculate overall slop score (weighted average)
  const score = Math.round(
    repetitiveness * 0.25 +
    aiGenerated * 0.25 +
    clickbait * 0.2 +
    lowEffort * 0.15 +
    fluff * 0.15
  );
  
  return {
    score,
    factors: {
      repetitiveness,
      aiGenerated,
      clickbait,
      lowEffort,
      fluff,
    },
    details,
  };
}

function calculateRepetitiveness(words: string[], sentences: string[], details: string[]): number {
  let score = 0;
  
  // Check for repeated words
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized.length > 3) {
      wordFreq.set(normalized, (wordFreq.get(normalized) || 0) + 1);
    }
  });
  
  const highRepeatWords = Array.from(wordFreq.entries())
    .filter(([, count]) => count > 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  if (highRepeatWords.length > 0) {
    score += 30;
    details.push(`Highly repeated words: ${highRepeatWords.map(([w, c]) => `"${w}" (${c}x)`).join(', ')}`);
  }
  
  // Check for repeated sentences
  const sentenceFreq = new Map<string, number>();
  sentences.forEach(sentence => {
    const normalized = sentence.trim().toLowerCase();
    if (normalized.length > 10) {
      sentenceFreq.set(normalized, (sentenceFreq.get(normalized) || 0) + 1);
    }
  });
  
  const repeatedSentences = Array.from(sentenceFreq.entries()).filter(([, count]) => count > 1);
  if (repeatedSentences.length > 0) {
    score += 40;
    details.push(`${repeatedSentences.length} sentence(s) repeated multiple times`);
  }
  
  return Math.min(score, 100);
}

function calculateAIScore(lowerContent: string, details: string[]): number {
  let score = 0;
  const foundPhrases: string[] = [];
  
  AI_PHRASES.forEach(phrase => {
    if (lowerContent.includes(phrase)) {
      foundPhrases.push(phrase);
      score += 15;
    }
  });
  
  if (foundPhrases.length > 0) {
    details.push(`AI-typical phrases detected: ${foundPhrases.slice(0, 3).join(', ')}${foundPhrases.length > 3 ? '...' : ''}`);
  }
  
  return Math.min(score, 100);
}

function calculateClickbaitScore(lowerContent: string, content: string, details: string[]): number {
  let score = 0;
  const foundPatterns: string[] = [];
  
  CLICKBAIT_PATTERNS.forEach(pattern => {
    const match = content.match(pattern);
    if (match) {
      foundPatterns.push(match[0]);
      score += 25;
    }
  });
  
  // Check for excessive punctuation
  const exclamationCount = (content.match(/!/g) || []).length;
  
  if (exclamationCount > 5) {
    score += 20;
    details.push(`Excessive exclamation marks (${exclamationCount})`);
  }
  
  if (foundPatterns.length > 0) {
    details.push(`Clickbait patterns: ${foundPatterns.slice(0, 2).join(', ')}`);
  }
  
  return Math.min(score, 100);
}

function calculateLowEffortScore(content: string, words: string[], sentences: string[], details: string[]): number {
  let score = 0;
  
  // Very short content
  if (words.length < 50) {
    score += 40;
    details.push(`Very short content (${words.length} words)`);
  }
  
  // Very long sentences (might be padding)
  const avgSentenceLength = words.length / Math.max(sentences.length, 1);
  if (avgSentenceLength > 50) {
    score += 30;
    details.push(`Unusually long sentences (avg ${Math.round(avgSentenceLength)} words)`);
  }
  
  // Lack of structure (very few sentences)
  if (sentences.length < 3 && words.length > 30) {
    score += 20;
    details.push('Lacks proper sentence structure');
  }
  
  return Math.min(score, 100);
}

function calculateFluffScore(lowerContent: string, words: string[], details: string[]): number {
  let score = 0;
  let fillerCount = 0;
  
  FILLER_REGEXES.forEach(regex => {
    const matches = lowerContent.match(regex);
    if (matches) {
      fillerCount += matches.length;
    }
  });
  
  if (fillerCount > words.length * 0.05) {
    score += 50;
    details.push(`High filler word usage (${fillerCount} filler words)`);
  } else if (fillerCount > words.length * 0.02) {
    score += 25;
    details.push(`Moderate filler word usage (${fillerCount} filler words)`);
  }
  
  return Math.min(score, 100);
}

export function getSlopRating(score: number): string {
  if (score >= 80) return 'Extreme Slop';
  if (score >= 60) return 'High Slop';
  if (score >= 40) return 'Moderate Slop';
  if (score >= 20) return 'Low Slop';
  return 'Minimal Slop';
}

export function getSlopColor(score: number): string {
  if (score >= 80) return 'text-red-600';
  if (score >= 60) return 'text-orange-600';
  if (score >= 40) return 'text-yellow-600';
  if (score >= 20) return 'text-blue-600';
  return 'text-green-600';
}
