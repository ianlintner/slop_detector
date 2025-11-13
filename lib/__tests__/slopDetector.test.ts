import {
  analyzeSlopContent,
  getSlopRating,
  getSlopColor,
} from '../slopDetector';

describe('analyzeSlopContent', () => {
  test('should analyze high-quality content with low slop score', () => {
    const content =
      'This is a well-written article with clear structure. Each sentence provides value. The content is original and informative.';
    const result = analyzeSlopContent(content);

    expect(result.score).toBeLessThan(40);
    expect(result.factors).toHaveProperty('repetitiveness');
    expect(result.factors).toHaveProperty('aiGenerated');
    expect(result.factors).toHaveProperty('clickbait');
    expect(result.factors).toHaveProperty('lowEffort');
    expect(result.factors).toHaveProperty('fluff');
    expect(Array.isArray(result.details)).toBe(true);
  });

  test('should detect AI-generated phrases', () => {
    const content =
      "In today's digital age, it's important to note that we must delve into this topic. This comprehensive guide will revolutionize your approach.";
    const result = analyzeSlopContent(content);

    expect(result.factors.aiGenerated).toBeGreaterThan(0);
    expect(result.details.some((d) => d.includes('AI-typical phrases'))).toBe(
      true
    );
  });

  test('should detect clickbait patterns', () => {
    const content =
      "You won't believe what happens next!!! This one trick doctors hate! Shocking results!!!";
    const result = analyzeSlopContent(content);

    expect(result.factors.clickbait).toBeGreaterThan(0);
    expect(
      result.details.some(
        (d) => d.includes('Clickbait patterns') || d.includes('exclamation')
      )
    ).toBe(true);
  });

  test('should detect repetitive content', () => {
    const content =
      'Testing testing testing testing testing testing. Content content content content content content.';
    const result = analyzeSlopContent(content);

    expect(result.factors.repetitiveness).toBeGreaterThan(0);
    expect(result.details.some((d) => d.includes('repeated'))).toBe(true);
  });

  test('should detect low effort content (too short)', () => {
    const content = 'This is short.';
    const result = analyzeSlopContent(content);

    expect(result.factors.lowEffort).toBeGreaterThan(0);
    expect(result.details.some((d) => d.includes('short'))).toBe(true);
  });

  test('should detect filler words', () => {
    const content =
      'Like, basically, you know, literally this is, um, actually sort of, kind of filled with, you know, filler words.';
    const result = analyzeSlopContent(content);

    expect(result.factors.fluff).toBeGreaterThan(0);
    expect(result.details.some((d) => d.includes('filler'))).toBe(true);
  });

  test('should return a score between 0 and 100', () => {
    const testCases = [
      'High quality content.',
      "You won't believe this shocking trick!",
      'delve into comprehensive guide revolutionize paradigm shift',
    ];

    testCases.forEach((content) => {
      const result = analyzeSlopContent(content);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  test('should handle empty content gracefully', () => {
    const content = '';
    const result = analyzeSlopContent(content);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.factors.lowEffort).toBeGreaterThan(0);
  });

  test('should detect repeated sentences', () => {
    const content =
      'This is a repeated sentence. This is a repeated sentence. Other content here.';
    const result = analyzeSlopContent(content);

    expect(result.factors.repetitiveness).toBeGreaterThan(0);
    expect(result.details.some((d) => d.includes('sentence'))).toBe(true);
  });

  test('should detect excessive exclamation marks', () => {
    const content =
      'Amazing! Wow! Incredible! Shocking! Unbelievable! Fantastic!';
    const result = analyzeSlopContent(content);

    expect(result.factors.clickbait).toBeGreaterThan(0);
    expect(result.details.some((d) => d.includes('exclamation'))).toBe(true);
  });
});

describe('getSlopRating', () => {
  test('should return correct rating for extreme slop', () => {
    expect(getSlopRating(90)).toBe('Extreme Slop');
    expect(getSlopRating(80)).toBe('Extreme Slop');
  });

  test('should return correct rating for high slop', () => {
    expect(getSlopRating(70)).toBe('High Slop');
    expect(getSlopRating(60)).toBe('High Slop');
  });

  test('should return correct rating for moderate slop', () => {
    expect(getSlopRating(50)).toBe('Moderate Slop');
    expect(getSlopRating(40)).toBe('Moderate Slop');
  });

  test('should return correct rating for low slop', () => {
    expect(getSlopRating(30)).toBe('Low Slop');
    expect(getSlopRating(20)).toBe('Low Slop');
  });

  test('should return correct rating for minimal slop', () => {
    expect(getSlopRating(10)).toBe('Minimal Slop');
    expect(getSlopRating(0)).toBe('Minimal Slop');
  });
});

describe('getSlopColor', () => {
  test('should return correct color classes for different scores', () => {
    expect(getSlopColor(90)).toBe('text-red-600');
    expect(getSlopColor(70)).toBe('text-orange-600');
    expect(getSlopColor(50)).toBe('text-yellow-600');
    expect(getSlopColor(30)).toBe('text-blue-600');
    expect(getSlopColor(10)).toBe('text-green-600');
  });

  test('should handle boundary values', () => {
    expect(getSlopColor(80)).toBe('text-red-600');
    expect(getSlopColor(60)).toBe('text-orange-600');
    expect(getSlopColor(40)).toBe('text-yellow-600');
    expect(getSlopColor(20)).toBe('text-blue-600');
    expect(getSlopColor(0)).toBe('text-green-600');
  });
});
