# Usage Guide

Learn how to use Slop Detector to analyze content quality.

## Interface Overview

The Slop Detector interface consists of two main analysis modes:

1. **📝 Text Content** - Direct text analysis
2. **🎥 YouTube URL** - YouTube video transcript analysis

## Analyzing Text Content

### Step-by-Step Instructions

1. **Navigate to the Text Content Tab**
   - Click on the "📝 Text Content" tab at the top of the interface

2. **Enter Your Content**
   - Paste or type the text you want to analyze into the text area
   - The text area accepts any length of content, but works best with at least 50 words

3. **Analyze**
   - Click the "🔍 Analyze Content" button
   - The analysis typically completes in less than a second

4. **Review Results**
   - View your overall slop score (0-100)
   - Check the score rating (Minimal, Low, Moderate, High, or Extreme Slop)
   - Examine the detailed breakdown of each factor
   - Read the specific issues detected in your content

### Example Text Analysis

Let's analyze a sample text:

```
You won't believe this shocking revelation! In today's digital age,
it's important to note that this revolutionary solution will literally
change everything. This comprehensive guide will delve into the
ultimate secrets that doctors don't want you to know. Basically,
this is a game-changer that will unlock incredible benefits!
```

**Expected Results:**

- High clickbait score (phrases like "You won't believe", "shocking", "don't want you to know")
- Elevated AI-generated score (phrases like "In today's digital age", "delve into", "comprehensive guide")
- Moderate fluff score (words like "basically", "literally")

## Analyzing YouTube Videos

### Step-by-Step Instructions

1. **Navigate to the YouTube URL Tab**
   - Click on the "🎥 YouTube URL" tab

2. **Enter Video URL**
   - Paste a YouTube video URL in the input field
   - Supported formats:
     - `https://www.youtube.com/watch?v=VIDEO_ID`
     - `https://youtu.be/VIDEO_ID`
     - `https://www.youtube.com/embed/VIDEO_ID`

3. **Requirements**
   - The video must have captions or transcripts available
   - Auto-generated captions work fine
   - The video must be publicly accessible

4. **Analyze**
   - Click the "🔍 Analyze Content" button
   - The system will fetch the transcript and analyze it
   - This may take a few seconds depending on video length

5. **Review Results**
   - See the slop score for the video's transcript
   - Check which characteristics are present
   - Review specific examples found in the transcript

!!! warning "Video Limitations" - Videos without captions cannot be analyzed - Private or age-restricted videos may not work - Very long videos (>2 hours) may take longer to process

## Understanding the Results

### Slop Score

The overall slop score is calculated as a weighted average:

```
Score = (Repetitiveness × 0.25) +
        (AI-Generated × 0.25) +
        (Clickbait × 0.20) +
        (Low Effort × 0.15) +
        (Fluff × 0.15)
```

### Factor Breakdown

#### Repetitiveness (25% weight)

Detects:

- Words repeated more than 5 times
- Sentences that appear multiple times
- Excessive use of the same phrases

**Example Detection:**

```
"This product is amazing. This product is amazing.
This product will change your life."
```

→ High repetitiveness due to repeated sentence

#### AI-Generated (25% weight)

Identifies common AI writing patterns:

- "delve into", "dive deep"
- "it's important to note"
- "in today's digital age"
- "revolutionary", "game-changer"
- "comprehensive guide", "ultimate guide"
- And more...

**Example Detection:**

```
"Let's delve into this comprehensive guide to unlock
the secrets of this revolutionary approach."
```

→ Multiple AI-typical phrases detected

#### Clickbait (20% weight)

Catches clickbait patterns:

- "you won't believe"
- "shocking", "this one trick"
- "doctors hate", "secrets"
- Excessive exclamation marks (>5)

**Example Detection:**

```
"You won't believe these 7 shocking secrets!!!"
```

→ Multiple clickbait patterns and excessive punctuation

#### Low Effort (15% weight)

Detects:

- Very short content (<50 words)
- Unusually long sentences (>50 words average)
- Lack of proper sentence structure

**Example Detection:**

```
"This is a product it does things and you should buy it
because it's good and will help you with stuff and things."
```

→ Long run-on sentence without proper structure

#### Fluff (15% weight)

Identifies excessive filler words:

- "basically", "literally", "actually"
- "honestly", "you know", "like"
- "sort of", "kind of"
- "um", "uh"

**Example Detection:**

```
"So basically, this is like, literally the best thing,
you know, that you can actually get, honestly."
```

→ High density of filler words

## Tips for Better Content

Based on the analysis, here are ways to improve your content:

1. **Reduce Repetitiveness**
   - Use varied vocabulary
   - Avoid repeating the same sentences
   - Use synonyms and different sentence structures

2. **Avoid AI Clichés**
   - Write more naturally and conversationally
   - Avoid overused business jargon
   - Be specific rather than using generic phrases

3. **Skip Clickbait**
   - Use informative, straightforward titles
   - Don't use excessive punctuation
   - Be honest about what content delivers

4. **Add Substance**
   - Ensure content has adequate length and depth
   - Use proper sentence structure
   - Break up long paragraphs

5. **Cut the Fluff**
   - Remove unnecessary filler words
   - Be direct and concise
   - Say what you mean clearly

## Use Cases

### Content Creation

- Review blog posts before publishing
- Check marketing copy for quality issues
- Verify social media content

### Content Curation

- Evaluate third-party content quality
- Screen submissions or guest posts
- Assess competitor content

### Education

- Teach students about content quality
- Demonstrate good vs. bad writing practices
- Analyze AI-generated content

### Research

- Study content quality trends
- Analyze platform-specific content patterns
- Track content degradation over time

## API Usage

For programmatic access to the slop detection algorithm, see the [API Reference](api-reference.md).
