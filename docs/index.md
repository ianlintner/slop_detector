# Slop Detector

Welcome to the **Slop Detector** documentation! 🔍

## Overview

Slop Detector is a Next.js application that analyzes content for "slop" - low-effort, repetitive, AI-generated, or spammy characteristics. Get a custom slop score that measures how likely content is to be clickbait, hiding the lede, or using dark patterns to generate quick money online.

## What is "Slop"?

"Slop" refers to content that exhibits one or more of these characteristics:

- **Low Quality**: Minimal effort put into creating the content
- **Repetitive**: Excessive repetition of words, phrases, or sentences
- **AI-Generated**: Contains common AI writing patterns and overused phrases
- **Clickbait**: Uses sensationalist headlines and psychological tricks
- **Fluff**: Filled with unnecessary filler words and phrases

## Key Features

### 📝 Text Analysis
Paste any text content directly to analyze it for slop characteristics. Perfect for:
- Blog posts and articles
- Social media content
- Marketing copy
- Product descriptions

### 🎥 YouTube Analysis
Enter a YouTube URL to analyze video transcripts/captions for slop. Great for:
- Video content quality assessment
- Educational content verification
- Marketing video analysis

### 📊 Custom Slop Score
Get a comprehensive 0-100 score based on multiple factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Repetitiveness** | 25% | Detects repeated words, phrases, and sentences |
| **AI-Generated** | 25% | Identifies common AI writing patterns and phrases |
| **Clickbait** | 20% | Catches clickbait headlines and excessive punctuation |
| **Low Effort** | 15% | Detects poor structure and padding |
| **Fluff** | 15% | Identifies excessive filler words and phrases |

### 🔍 Detailed Breakdown
See exactly what issues were detected in the content with specific examples and counts.

## Score Ratings

- **0-19**: 🟢 **Minimal Slop** - High quality content
- **20-39**: 🔵 **Low Slop** - Generally good content with minor issues
- **40-59**: 🟡 **Moderate Slop** - Noticeable quality concerns
- **60-79**: 🟠 **High Slop** - Significant quality issues
- **80-100**: 🔴 **Extreme Slop** - Very low quality, likely spam or clickbait

## Technology Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **youtube-transcript** - Fetching YouTube video transcripts

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

For detailed instructions, see the [Getting Started](getting-started.md) guide.

## Documentation

- [Getting Started](getting-started.md) - Installation and setup
- [Usage](usage.md) - How to use the application
- [API Reference](api-reference.md) - Technical details and algorithm
- [Deployment](deployment.md) - Deployment instructions
- [Contributing](contributing.md) - How to contribute

## License

This project is open source and available under the MIT License.
