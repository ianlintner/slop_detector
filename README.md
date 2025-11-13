# 🔍 Slop Detector

A Next.js application that analyzes content for "slop" - low-effort, repetitive, AI-generated, or spammy characteristics. Get a custom slop score that measures how likely content is to be clickbait, hiding the lede, or using dark patterns to generate quick money online.

## Features

- **Text Analysis**: Paste any text content directly to analyze it for slop characteristics
- **YouTube Analysis**: Enter a YouTube URL to analyze video transcripts/captions for slop
- **AI Consensus** (New!): Enrich analysis with multiple AI providers for enhanced accuracy
- **Custom Slop Score**: Get a 0-100 score based on multiple factors:
  - **Repetitiveness**: Detects repeated words, phrases, and sentences
  - **AI-Generated Content**: Identifies common AI writing patterns and phrases
  - **Clickbait**: Catches clickbait headlines and excessive punctuation
  - **Low Effort**: Detects poor structure and padding
  - **Fluff**: Identifies excessive filler words and phrases
- **Detailed Breakdown**: See exactly what issues were detected in the content

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

### Analyzing Text Content

1. Select the "📝 Text Content" tab
2. Paste your content into the text area
3. Click "🔍 Analyze Content"
4. View your slop score and detailed breakdown

### Analyzing YouTube Videos

1. Select the "🎥 YouTube URL" tab
2. Enter a YouTube video URL (the video must have captions/transcripts available)
3. Optionally enable "🤖 AI Consensus Analysis" for enhanced analysis
4. Click "🔍 Analyze Content" or "🤖 Analyze with AI"
5. View the slop analysis of the video's transcript

### Using AI Consensus Analysis

For more accurate and detailed analysis, you can enable AI consensus:

1. Check the "🤖 Enable AI Consensus Analysis" checkbox
2. Click "🤖 Analyze with AI" to get:
   - Blended score combining internal analysis and AI insights
   - Detailed AI reasoning for the assessment
   - Confidence levels for AI predictions
   - Individual provider scores (if using multiple AI models)

See [AI Consensus Documentation](docs/ai-consensus.md) for more details.

**Note**: AI analysis requires API keys for AI providers (OpenAI, Anthropic, etc.). A mock provider is available for testing without API keys.

## Slop Score Ratings

- **0-19**: Minimal Slop - High quality content
- **20-39**: Low Slop - Generally good content with minor issues
- **40-59**: Moderate Slop - Noticeable quality concerns
- **60-79**: High Slop - Significant quality issues
- **80-100**: Extreme Slop - Very low quality, likely spam or clickbait

## Technology Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **youtube-transcript** - Fetching YouTube video transcripts

## Building for Production

```bash
npm run build
npm start
```

## Documentation

Comprehensive documentation is available in the `docs/` folder and can be viewed with MkDocs.

### Viewing Documentation

To view the documentation locally:

1. **Install MkDocs** (one-time setup):
   ```bash
   pip install -r requirements.txt
   # or
   npm run docs:install
   ```

2. **Serve documentation locally**:
   ```bash
   mkdocs serve
   # or
   npm run docs:serve
   ```

3. **Open** [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser

### Building Documentation

To build static documentation:

```bash
mkdocs build
# or
npm run docs:build
```

The built documentation will be in the `site/` directory.

### Documentation Contents

- **[Getting Started](docs/getting-started.md)** - Installation and setup guide
- **[Usage Guide](docs/usage.md)** - How to use the application
- **[AI Consensus](docs/ai-consensus.md)** - Guide to using AI consensus analysis
- **[API Reference](docs/api-reference.md)** - Technical documentation and algorithm details
- **[Deployment](docs/deployment.md)** - Deployment instructions for various platforms
- **[Contributing](docs/contributing.md)** - Contribution guidelines

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

