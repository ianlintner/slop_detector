# 🔍 Slop Detector

A Next.js application that analyzes content for "slop" - low-effort, repetitive, AI-generated, or spammy characteristics. Get a custom slop score that measures how likely content is to be clickbait, hiding the lede, or using dark patterns to generate quick money online.

![Slop Detector Interface](https://github.com/user-attachments/assets/41fb8a7a-62c3-4b4a-9f2f-66a09c38f161)

## 📸 Screenshots

### Main Interface - Text Analysis

The primary interface allows you to paste any text content for immediate analysis:

![Text Analysis Interface](https://github.com/user-attachments/assets/41fb8a7a-62c3-4b4a-9f2f-66a09c38f161)

### YouTube URL Analysis

Analyze video transcripts directly from YouTube URLs:

![YouTube Analysis Interface](https://github.com/user-attachments/assets/31caf591-e47f-4e8e-96ba-498404e320b2)

### Analysis Results

Get detailed breakdowns with scores for each factor:

![Analysis Results](https://github.com/user-attachments/assets/702fe16e-3785-4791-a949-54f165347d12)

## ✨ Features

### 📝 Multi-Source Content Analysis

- **Text Analysis**: Paste any text content directly - blog posts, articles, social media, marketing copy
- **YouTube Analysis**: Analyze video transcripts/captions by simply pasting a YouTube URL
- **AI Consensus** (New!): Enrich analysis with multiple AI providers (OpenAI, Anthropic) for enhanced accuracy

### 🎯 Comprehensive Slop Detection

Get a custom **0-100 slop score** based on five key factors:

| Factor                | Weight | What It Detects                                    |
| --------------------- | ------ | -------------------------------------------------- |
| 🔄 **Repetitiveness** | 25%    | Repeated words, phrases, and sentences             |
| 🤖 **AI-Generated**   | 25%    | Common AI writing patterns and overused phrases    |
| 🎣 **Clickbait**      | 20%    | Sensationalist headlines and excessive punctuation |
| 📉 **Low Effort**     | 15%    | Poor structure, padding, and minimal content       |
| 💬 **Fluff**          | 15%    | Excessive filler words and phrases                 |

### 📊 Detailed Analysis Results

- **Visual Score Display**: Color-coded scores from green (high quality) to red (extreme slop)
- **Factor Breakdown**: See individual scores for each detection category
- **Specific Issues**: Get detailed lists of detected problems with examples
- **AI Insights**: When using AI consensus, get reasoning and confidence levels

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 or higher
- **npm**, **yarn**, **pnpm**, or **bun**

### Installation & Running

1. **Clone the repository**

   ```bash
   git clone https://github.com/ianlintner/slop_detector.git
   cd slop_detector
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

That's it! 🎉 You're ready to start analyzing content for slop.

## 📖 Usage

### Analyzing Text Content

1. Select the **"📝 Text Content"** tab
2. Paste or type your content into the text area
3. Click **"🔍 Analyze Content"**
4. Review your results:
   - Overall slop score (0-100)
   - Score rating (Minimal, Low, Moderate, High, or Extreme)
   - Individual factor scores
   - Detailed list of detected issues

### Analyzing YouTube Videos

1. Select the **"🎥 YouTube URL"** tab
2. Paste a YouTube video URL (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`)
3. **Note**: The video must have captions/transcripts available
4. Click **"🔍 Analyze Content"**
5. View the slop analysis of the video's transcript

### Using AI Consensus (Optional)

For more accurate analysis using multiple AI models:

1. Check **"🤖 Enable AI Consensus Analysis"**
2. Click **"🤖 Analyze with AI"**
3. Get enhanced results with:
   - Blended score (internal + AI consensus)
   - AI reasoning and insights
   - Confidence levels
   - Individual provider scores

**Note**: AI analysis requires API keys (OpenAI, Anthropic). A mock provider is available for testing.

See the [AI Consensus Documentation](docs/ai-consensus.md) for setup and configuration details.

## 📊 Slop Score Ratings

The slop score ranges from 0 to 100, with higher scores indicating lower quality content:

| Score Range | Rating               | Description                             | Color  |
| ----------- | -------------------- | --------------------------------------- | ------ |
| 0-19        | 🟢 **Minimal Slop**  | High quality, well-crafted content      | Green  |
| 20-39       | 🔵 **Low Slop**      | Generally good with minor issues        | Blue   |
| 40-59       | 🟡 **Moderate Slop** | Noticeable quality concerns             | Yellow |
| 60-79       | 🟠 **High Slop**     | Significant quality issues              | Orange |
| 80-100      | 🔴 **Extreme Slop**  | Very low quality, likely spam/clickbait | Red    |

### Example Analysis

**Input Text:**

```
You won't believe this shocking revelation! In today's digital age,
it's important to note that this revolutionary solution will literally
change everything.
```

**Results:**

- Overall Score: **39/100** (Low Slop)
- AI-Generated: 75/100 (phrases like "in today's digital age", "it's important to note")
- Clickbait: 50/100 (patterns like "You won't believe", "shocking")
- Fluff: 25/100 (filler word "literally")

## 🏗️ Architecture & Technology

### Tech Stack

- **[Next.js 16](https://nextjs.org/)** - React framework with App Router for optimal performance
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development for reliability
- **[Tailwind CSS](https://tailwindcss.com/)** - Modern, utility-first styling
- **[youtube-transcript](https://www.npmjs.com/package/youtube-transcript)** - YouTube caption fetching
- **[Jest](https://jestjs.io/)** - Comprehensive testing framework
- **[ESLint](https://eslint.org/)** & **[Prettier](https://prettier.io/)** - Code quality tools

### Project Structure

```
slop_detector/
├── app/                    # Next.js app directory (App Router)
│   ├── api/               # API routes
│   │   ├── analyze-youtube/  # YouTube analysis endpoint
│   │   └── ai-analyze/       # AI consensus endpoint
│   ├── layout.tsx         # Root layout with metadata
│   ├── page.tsx           # Main application page
│   └── globals.css        # Global styles and Tailwind
├── lib/                   # Core business logic
│   ├── slopDetector.ts   # Main slop detection algorithm
│   ├── aiConsensus.ts    # AI consensus system
│   ├── aiProviders.ts    # AI provider implementations
│   └── __tests__/        # Unit tests
├── docs/                  # MkDocs documentation
│   ├── index.md          # Documentation home
│   ├── getting-started.md
│   ├── usage.md
│   ├── ai-consensus.md
│   ├── api-reference.md
│   ├── deployment.md
│   └── contributing.md
├── public/                # Static assets
├── .github/
│   └── workflows/        # CI/CD pipelines
└── mkdocs.yml            # Documentation configuration
```

### How It Works

1. **Content Input**: User provides text or YouTube URL
2. **Analysis Engine**: Core algorithm evaluates content using pattern matching
3. **Scoring System**: Weighted average of five detection factors
4. **AI Enhancement** (Optional): Multiple AI providers analyze and enrich results
5. **Result Display**: Visual presentation with detailed breakdown

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                          │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  📝 Text Input   │         │  🎥 YouTube URL  │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
└───────────┼──────────────────────────┼────────────────────┘
            │                          │
            ▼                          ▼
    ┌───────────────┐        ┌──────────────────┐
    │  Text Content │        │ Fetch Transcript │
    └───────┬───────┘        └────────┬─────────┘
            │                         │
            └────────┬────────────────┘
                     ▼
         ┌───────────────────────┐
         │  Slop Detector Engine │
         │  (lib/slopDetector.ts)│
         └───────────┬───────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │Repetition│  │AI Phrases│  │Clickbait│  ... (5 factors)
   │ Score   │  │  Score   │  │  Score  │
   └────┬────┘  └────┬────┘  └────┬────┘
        │            │            │
        └────────────┼────────────┘
                     ▼
          ┌────────────────────┐
          │  Weighted Average  │
          │   Slop Score       │
          └─────────┬──────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────┐      ┌──────────────────┐
│Internal Score│      │  Optional: AI    │
│   (0-100)   │      │  Consensus (API) │
└──────┬───────┘      └────────┬─────────┘
       │                       │
       └───────────┬───────────┘
                   ▼
         ┌──────────────────┐
         │  Blended Score   │
         │  Final Analysis  │
         └────────┬─────────┘
                  ▼
         ┌─────────────────┐
         │  Display Results│
         │  • Score        │
         │  • Factors      │
         │  • Details      │
         └─────────────────┘
```

## 🔧 Development

### Local Development Setup

```bash
# Clone and install
git clone https://github.com/ianlintner/slop_detector.git
cd slop_detector
npm install

# Start development server with hot reload
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your changes in real-time.

### Code Quality & Testing

The project includes comprehensive automated checks:

```bash
# Run linter
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check

# Run all tests
npm test

# Run tests in watch mode (for active development)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Building for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

## 📚 Documentation

Comprehensive documentation is available using MkDocs with Material theme.

### 📖 Available Documentation

- **[Getting Started](docs/getting-started.md)** - Installation, setup, and quick start guide
- **[Usage Guide](docs/usage.md)** - Detailed instructions for analyzing content
- **[AI Consensus](docs/ai-consensus.md)** - Guide to AI-enhanced analysis
- **[API Reference](docs/api-reference.md)** - Technical documentation and algorithm details
- **[Deployment](docs/deployment.md)** - Deploy to Vercel, Netlify, Docker, or self-hosted
- **[Contributing](docs/contributing.md)** - Contribution guidelines and development workflow

### 🌐 Viewing Documentation Locally

To view the full documentation site locally:

1. **Install MkDocs** (one-time setup):

   ```bash
   pip install -r requirements.txt
   # or
   npm run docs:install
   ```

2. **Serve documentation**:

   ```bash
   mkdocs serve
   # or
   npm run docs:serve
   ```

3. **Open** [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser

The documentation site includes:

- 📱 Responsive design for mobile and desktop
- 🌓 Light/dark mode toggle
- 🔍 Full-text search
- 📝 Syntax highlighting for code examples
- 📑 Easy navigation between sections

### 📦 Building Documentation

To build static documentation files:

```bash
mkdocs build
# or
npm run docs:build
```

The built documentation will be in the `site/` directory, ready for deployment.

### 🚀 Deploying Documentation

Deploy documentation to GitHub Pages:

```bash
mkdocs gh-deploy
# or
npm run docs:deploy
```

## 🚀 Deployment

Slop Detector can be deployed to various platforms. The easiest options are:

### Azure AKS with Istio (Production)

Enterprise-grade Kubernetes deployment with optional OAuth2 authentication:

```bash
# Deploy to Azure AKS
kubectl apply -k k8s/apps/slop-detector/base
```

- 📖 [Azure Deployment Guide](docs/azure-deployment.md)
- 🔐 [OAuth2 Quick Reference](OAUTH2.md) - Azure AD authentication setup

### Vercel (Quick Start)

Deploy with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ianlintner/slop_detector)

Or use the Vercel CLI:

```bash
npm install -g vercel
vercel
```

### Other Deployment Options

- **Netlify** - JAMstack platform with Git integration
- **Docker** - Containerized deployment for any environment
- **Self-hosted** - Deploy to your own server with PM2/systemd

See the [Deployment Guide](docs/deployment.md) for detailed instructions for each platform.

## 🤝 Contributing

We welcome contributions! Whether it's:

- 🐛 Bug reports and fixes
- ✨ New features and enhancements
- 📖 Documentation improvements
- 🧪 Test coverage improvements

See our [Contributing Guide](docs/contributing.md) for details on:

- Development workflow
- Coding standards
- Pull request process
- Testing requirements

## 🔒 Continuous Integration

The project uses **GitHub Actions** for automated quality checks:

- ✅ **Linting** - ESLint for code quality
- ✅ **Formatting** - Prettier for consistent style
- ✅ **Testing** - Jest for unit and integration tests
- ✅ **Building** - Ensures production build succeeds
- ✅ **Documentation** - Validates MkDocs documentation builds successfully
- ✅ **Coverage** - Code coverage reporting with Codecov

All checks must pass before merging pull requests.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) by Vercel
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Documentation powered by [MkDocs Material](https://squidfunk.github.io/mkdocs-material/)

## 📞 Support & Contact

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/ianlintner/slop_detector/issues)
- 💬 [Discussions](https://github.com/ianlintner/slop_detector/discussions)

---

Made with ❤️ by the Slop Detector community
