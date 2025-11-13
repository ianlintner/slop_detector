# Getting Started

This guide will help you set up and run Slop Detector on your local machine.

![Application Interface](https://github.com/user-attachments/assets/41fb8a7a-62c3-4b4a-9f2f-66a09c38f161)

## What You'll Learn

- ✅ How to install and run Slop Detector locally
- ✅ Understanding the project structure
- ✅ Configuring the application
- ✅ Verifying your installation
- ✅ Troubleshooting common issues

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js) or **yarn**, **pnpm**, or **bun**
- A modern web browser (Chrome, Firefox, Safari, or Edge)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ianlintner/slop_detector.git
cd slop_detector
```

### 2. Install Dependencies

Using npm:

```bash
npm install
```

Or using yarn:

```bash
yarn install
```

Or using pnpm:

```bash
pnpm install
```

Or using bun:

```bash
bun install
```

!!! info "Installation Time"
The installation process typically takes 1-2 minutes depending on your internet connection.

## Running the Application

### Development Server

Start the development server:

```bash
npm run dev
```

Or with your preferred package manager:

```bash
yarn dev
# or
pnpm dev
# or
bun dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

!!! tip "Hot Reload"
The development server includes hot reload, so changes you make to the code will automatically reflect in your browser.

### Production Build

To create an optimized production build:

```bash
npm run build
```

Then start the production server:

```bash
npm start
```

## Project Structure

```
slop_detector/
├── app/                  # Next.js app directory
│   ├── api/             # API routes
│   ├── layout.tsx       # Root layout component
│   ├── page.tsx         # Home page
│   └── globals.css      # Global styles
├── lib/                 # Library code
│   └── slopDetector.ts  # Core slop detection algorithm
├── public/              # Static assets
├── docs/                # Documentation (this documentation)
├── next.config.ts       # Next.js configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Project dependencies
└── README.md            # Project README
```

## Configuration

### Environment Variables

Slop Detector doesn't require any environment variables for basic functionality. However, if you need to configure specific settings, you can create a `.env.local` file in the root directory:

```bash
# Example .env.local
# Add any environment variables here
```

### Next.js Configuration

The Next.js configuration is stored in `next.config.ts`. The default configuration works for most use cases:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

## Verifying Installation

To verify that everything is working correctly:

1. Start the development server: `npm run dev`
2. Open [http://localhost:3000](http://localhost:3000) in your browser
3. You should see the Slop Detector interface with two tabs: "Text Content" and "YouTube URL"
4. Try analyzing some sample text to ensure the application is working

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, Next.js will automatically try the next available port. You can also specify a different port:

```bash
npm run dev -- -p 3001
```

### Installation Errors

If you encounter errors during installation:

1. Delete `node_modules` folder and `package-lock.json` (or equivalent lock file)
2. Clear npm cache: `npm cache clean --force`
3. Reinstall dependencies: `npm install`

### Module Not Found Errors

If you see "Module not found" errors:

1. Ensure all dependencies are installed: `npm install`
2. Restart the development server
3. Clear the Next.js cache: `rm -rf .next`

## Next Steps

Now that you have Slop Detector running, check out:

- [Usage Guide](usage.md) - Learn how to analyze content
- [API Reference](api-reference.md) - Understand the detection algorithm
- [Deployment](deployment.md) - Deploy your own instance
