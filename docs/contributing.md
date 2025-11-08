# Contributing to Slop Detector

Thank you for your interest in contributing to Slop Detector! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and constructive in all interactions.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm, yarn, pnpm, or bun
- Git
- A code editor (VS Code recommended)

### Fork and Clone

1. **Fork the repository**
   - Visit [github.com/ianlintner/slop_detector](https://github.com/ianlintner/slop_detector)
   - Click the "Fork" button in the top right

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/slop_detector.git
   cd slop_detector
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ianlintner/slop_detector.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Creating a Branch

Always create a new branch for your work:

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or updates

### Making Changes

1. **Make your changes**
   - Write clean, readable code
   - Follow the coding standards
   - Add comments where necessary

2. **Test your changes**
   ```bash
   npm run dev  # Test in development
   npm run build  # Ensure it builds
   npm run lint  # Check for linting errors
   ```

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat: add support for analyzing markdown files
fix: correct slop score calculation for short content
docs: update API reference with new examples
refactor: simplify repetitiveness detection algorithm
```

## Coding Standards

### TypeScript

- Use TypeScript for all new files
- Provide proper type annotations
- Avoid using `any` type
- Use interfaces for object shapes

**Example:**
```typescript
// Good
interface SlopOptions {
  minWords: number;
  includeFluff: boolean;
}

function analyzeWithOptions(content: string, options: SlopOptions): SlopAnalysis {
  // Implementation
}

// Avoid
function analyzeWithOptions(content: any, options: any): any {
  // Implementation
}
```

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons
- Use meaningful variable names
- Keep functions small and focused

**Example:**
```typescript
// Good
function calculateScore(factors: ScoreFactors): number {
  const weights = {
    repetitiveness: 0.25,
    aiGenerated: 0.25,
    clickbait: 0.20,
  };
  
  return Math.round(
    factors.repetitiveness * weights.repetitiveness +
    factors.aiGenerated * weights.aiGenerated +
    factors.clickbait * weights.clickbait
  );
}

// Avoid
function calc(f: any) {
  return Math.round(f.r*.25+f.a*.25+f.c*.2);
}
```

### React Components

- Use functional components with hooks
- Keep components focused on a single responsibility
- Use TypeScript for props
- Extract reusable logic into custom hooks

**Example:**
```typescript
// Good
interface AnalysisResultProps {
  score: number;
  rating: string;
  details: string[];
}

export default function AnalysisResult({ score, rating, details }: AnalysisResultProps) {
  return (
    <div className="results">
      <h2>Score: {score}</h2>
      <p>Rating: {rating}</p>
      <ul>
        {details.map((detail, i) => (
          <li key={i}>{detail}</li>
        ))}
      </ul>
    </div>
  );
}
```

### File Organization

```
slop_detector/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── analyze-youtube/
│   │       └── route.ts
│   ├── components/        # Reusable components (if needed)
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main page
│   └── globals.css        # Global styles
├── lib/                   # Library code
│   ├── slopDetector.ts   # Core algorithm
│   └── utils.ts          # Utility functions (if needed)
├── public/                # Static assets
└── docs/                  # Documentation
```

## Testing

While Slop Detector doesn't currently have a test suite, contributions that add tests are welcome!

### Adding Tests

If you want to add tests:

1. **Install testing dependencies**
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom
   ```

2. **Create test files**
   - Place tests next to the code they test
   - Use `.test.ts` or `.test.tsx` extension
   - Example: `lib/slopDetector.test.ts`

3. **Write tests**
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { analyzeSlopContent } from './slopDetector';

   describe('analyzeSlopContent', () => {
     it('should detect clickbait patterns', () => {
       const content = "You won't believe this shocking trick!";
       const result = analyzeSlopContent(content);
       
       expect(result.factors.clickbait).toBeGreaterThan(0);
       expect(result.details.some(d => d.includes('Clickbait'))).toBe(true);
     });
   });
   ```

### Manual Testing

Always manually test your changes:

1. **Text Analysis**
   - Test with various types of content
   - Check edge cases (very short, very long, special characters)

2. **YouTube Analysis**
   - Test with different video URLs
   - Test error handling (invalid URLs, no captions)

3. **UI/UX**
   - Test in different browsers
   - Test responsive design on mobile
   - Verify accessibility

## Pull Request Process

### Before Submitting

1. **Update your branch**
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Ensure everything works**
   ```bash
   npm run build
   npm run lint
   ```

3. **Update documentation**
   - Update README.md if needed
   - Update API docs if you changed the API
   - Add comments to complex code

### Submitting the PR

1. **Push your changes**
   ```bash
   git push origin your-branch
   ```

2. **Create the Pull Request**
   - Go to your fork on GitHub
   - Click "Pull Request"
   - Select your branch
   - Fill out the PR template

3. **PR Description**
   Include:
   - What changes you made
   - Why you made them
   - How to test the changes
   - Screenshots (for UI changes)
   - Related issue numbers

**Example:**
```markdown
## Description
Added support for detecting markdown-specific slop patterns.

## Changes
- Added markdown pattern detection to slopDetector.ts
- Updated UI to show markdown-specific warnings
- Added documentation for markdown analysis

## Testing
1. Run `npm run dev`
2. Paste markdown content in the text area
3. Verify markdown patterns are detected

## Related Issues
Fixes #123
```

### Review Process

1. **Automated Checks**
   - Build must succeed
   - Linting must pass
   - All checks must be green

2. **Code Review**
   - Maintainers will review your code
   - Address feedback promptly
   - Push additional commits if needed

3. **Approval and Merge**
   - Once approved, a maintainer will merge
   - Your contribution will be in the next release!

## Reporting Issues

### Bug Reports

When reporting bugs, include:

1. **Description**
   - Clear description of the bug
   - Expected behavior vs actual behavior

2. **Steps to Reproduce**
   ```
   1. Go to '...'
   2. Click on '...'
   3. Enter '...'
   4. See error
   ```

3. **Environment**
   - OS: [e.g., macOS, Windows, Linux]
   - Browser: [e.g., Chrome 120, Firefox 121]
   - Node version: [e.g., 18.17.0]

4. **Screenshots/Logs**
   - Include screenshots if applicable
   - Include error messages or console logs

### Feature Requests

When requesting features:

1. **Use Case**
   - Describe the problem you're trying to solve
   - Explain why this feature would be valuable

2. **Proposed Solution**
   - Describe your ideal solution
   - Consider alternatives

3. **Additional Context**
   - Add any other context
   - Include examples or mockups

## Development Tips

### Useful Commands

```bash
# Development
npm run dev           # Start dev server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run linter

# Git
git status           # Check status
git log --oneline    # View commit history
git diff             # See changes
```

### VS Code Extensions

Recommended extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- GitLens

### Debugging

1. **Browser DevTools**
   - Use React DevTools for component debugging
   - Use Network tab for API debugging
   - Use Console for logging

2. **VS Code Debugging**
   - Set breakpoints in your code
   - Use the Debug panel
   - Inspect variables and call stack

## Getting Help

- **Documentation**: Check the docs/ folder
- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Search existing issues before creating new ones
- **Community**: Be patient and respectful when asking for help

## Recognition

Contributors will be:
- Listed in the project README
- Credited in release notes
- Appreciated by the community!

Thank you for contributing to Slop Detector! 🎉
