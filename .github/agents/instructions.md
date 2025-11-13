# Copilot Agent Instructions for Slop Detector

## Project Overview

Slop Detector is a Next.js application that analyzes content for "slop" - low-effort, repetitive, AI-generated, or spammy characteristics. The application provides a custom slop score (0-100) based on multiple factors.

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Testing**: Jest with React Testing Library
- **Linting**: ESLint with Next.js config
- **Formatting**: Prettier

## Project Structure

```
/app            - Next.js app directory with routes and pages
/lib            - Core business logic and utilities
  - slopDetector.ts    - Main slop detection algorithm
  - aiConsensus.ts     - AI consensus analysis
  - aiProviders.ts     - AI provider integrations
/docs           - MkDocs documentation
/public         - Static assets
```

## Development Guidelines

### Code Quality

1. **Always run tests** before committing: `npm test`
2. **Format code** with Prettier: `npm run format`
3. **Lint code** with ESLint: `npm run lint`
4. **Build project** to verify: `npm run build`

### Testing

- All core logic in `/lib` should have corresponding tests in `/lib/__tests__`
- Use Jest and React Testing Library for testing
- Aim for good test coverage of business logic
- Run `npm run test:coverage` to check coverage

### Code Style

- Use TypeScript for all new code
- Follow existing code patterns and conventions
- Use functional components and hooks for React
- Keep functions focused and single-purpose
- Add JSDoc comments for exported functions

### Making Changes

1. **Small, focused changes**: Make minimal modifications to accomplish the goal
2. **Test changes**: Write or update tests for any modified logic
3. **Format and lint**: Ensure all code passes formatting and linting checks
4. **Build verification**: Confirm the project builds successfully
5. **Documentation**: Update documentation if making user-facing changes

### CI/CD

The project uses GitHub Actions for CI:

- Runs on pushes to `main` and `develop` branches
- Runs on all pull requests
- Checks: linting, formatting, tests, and build

## Core Algorithms

### Slop Detection (`lib/slopDetector.ts`)

The main algorithm analyzes content across 5 dimensions:

1. **Repetitiveness** (25% weight): Detects repeated words and sentences
2. **AI-Generated** (25% weight): Identifies common AI writing patterns
3. **Clickbait** (20% weight): Catches clickbait headlines and excessive punctuation
4. **Low Effort** (15% weight): Detects poor structure and padding
5. **Fluff** (15% weight): Identifies excessive filler words

When modifying detection logic:

- Update corresponding tests
- Consider impact on score weights
- Document changes in algorithm behavior

## Common Tasks

### Adding a New Detection Pattern

1. Add pattern to appropriate constants in `slopDetector.ts`
2. Update the relevant calculation function
3. Add test cases in `lib/__tests__/slopDetector.test.ts`
4. Run tests and ensure they pass
5. Document the new pattern in `/docs/api-reference.md`

### Updating Dependencies

1. Check for security vulnerabilities: `npm audit`
2. Update cautiously: `npm update`
3. Run full test suite: `npm test`
4. Verify build: `npm run build`
5. Test the application: `npm run dev`

### Adding New Features

1. Plan the change - keep it minimal and focused
2. Write tests first (TDD approach preferred)
3. Implement the feature
4. Update documentation
5. Run all checks (lint, format, test, build)
6. Create pull request with clear description

## Important Notes

- The slop detection algorithm is the core of the application - changes require careful consideration
- All changes to scoring logic must include test coverage
- Keep the UI simple and user-friendly
- Maintain compatibility with YouTube transcript fetching
- AI consensus features are optional enhancements

## Questions?

Refer to:

- `/docs` directory for detailed documentation
- `README.md` for setup and usage instructions
- Existing tests for examples of testing patterns
