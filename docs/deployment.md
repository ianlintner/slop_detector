# Deployment Guide

Learn how to deploy Slop Detector to various platforms.

## Deployment Options

Slop Detector is a Next.js application and can be deployed to any platform that supports Node.js applications. The most popular options are:

1. **Vercel** (Recommended) - Official Next.js platform
2. **Netlify** - Popular JAMstack platform
3. **Docker** - Containerized deployment
4. **Self-hosted** - Your own server

## Vercel Deployment

Vercel is the easiest and recommended way to deploy Slop Detector, as it's built by the creators of Next.js.

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ianlintner/slop_detector)

### Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd slop_detector
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy: Yes
   - Which scope: Select your account
   - Link to existing project: No
   - Project name: slop-detector (or your choice)
   - Directory: ./
   - Override settings: No

5. **Production Deployment**
   ```bash
   vercel --prod
   ```

### GitHub Integration

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository

2. **Configure Project**
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: ./
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

3. **Deploy**
   - Click "Deploy"
   - Vercel will automatically deploy on every push to main branch

### Environment Variables

No environment variables are required for basic functionality. If needed:

1. Go to Project Settings → Environment Variables
2. Add your variables
3. Redeploy for changes to take effect

## Netlify Deployment

### Using Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login**
   ```bash
   netlify login
   ```

3. **Initialize**
   ```bash
   netlify init
   ```

4. **Deploy**
   ```bash
   netlify deploy --prod
   ```

### Using Git Integration

1. **Connect Repository**
   - Go to [Netlify Dashboard](https://app.netlify.com/)
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub and select your repository

2. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Functions directory: (leave empty)

3. **Deploy**
   - Click "Deploy site"
   - Netlify will build and deploy automatically

### netlify.toml Configuration

Create a `netlify.toml` file in your project root:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## Docker Deployment

### Dockerfile

Create a `Dockerfile` in your project root:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  slop-detector:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

### Build and Run

```bash
# Build image
docker build -t slop-detector .

# Run container
docker run -p 3000:3000 slop-detector

# Or with Docker Compose
docker-compose up -d
```

### Update next.config.ts for Docker

For standalone output (recommended for Docker):

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

## Self-Hosted Deployment

### Requirements

- Node.js 18 or higher
- npm or yarn
- Process manager (PM2, systemd, etc.)
- Reverse proxy (Nginx, Apache, etc.)

### Using PM2

1. **Install PM2**
   ```bash
   npm install -g pm2
   ```

2. **Build the Application**
   ```bash
   cd slop_detector
   npm install
   npm run build
   ```

3. **Start with PM2**
   ```bash
   pm2 start npm --name "slop-detector" -- start
   ```

4. **Save PM2 Configuration**
   ```bash
   pm2 save
   pm2 startup
   ```

5. **Monitor**
   ```bash
   pm2 status
   pm2 logs slop-detector
   ```

### Nginx Configuration

Create `/etc/nginx/sites-available/slop-detector`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/slop-detector /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Systemd Service

Create `/etc/systemd/system/slop-detector.service`:

```ini
[Unit]
Description=Slop Detector
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/slop_detector
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable slop-detector
sudo systemctl start slop-detector
sudo systemctl status slop-detector
```

## Production Optimizations

### Build Optimization

1. **Enable SWC Minification** (default in Next.js 16)
   ```typescript
   // next.config.ts
   const nextConfig: NextConfig = {
     swcMinify: true,
   };
   ```

2. **Image Optimization**
   - Next.js automatically optimizes images
   - Ensure images are in `public/` directory

3. **Analyze Bundle Size**
   ```bash
   npm install -D @next/bundle-analyzer
   ```

   ```typescript
   // next.config.ts
   const withBundleAnalyzer = require('@next/bundle-analyzer')({
     enabled: process.env.ANALYZE === 'true',
   });

   module.exports = withBundleAnalyzer(nextConfig);
   ```

   Run analysis:
   ```bash
   ANALYZE=true npm run build
   ```

### Performance Monitoring

1. **Vercel Analytics**
   ```bash
   npm install @vercel/analytics
   ```

   ```typescript
   // app/layout.tsx
   import { Analytics } from '@vercel/analytics/react';

   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     );
   }
   ```

2. **Error Monitoring**
   - Sentry
   - LogRocket
   - Bugsnag

### Caching Strategy

1. **Static Assets**
   - Next.js automatically handles static asset caching
   - Configure CDN for optimal performance

2. **API Routes**
   - Implement caching headers for API responses
   - Consider Redis for server-side caching

## Scaling Considerations

### Horizontal Scaling

- Deploy multiple instances behind a load balancer
- Use sticky sessions if storing state server-side
- Consider serverless functions for API routes

### Database (if added)

- Use connection pooling
- Implement read replicas for scaling reads
- Cache frequently accessed data

### CDN Integration

- Cloudflare
- AWS CloudFront
- Fastly

## Monitoring and Maintenance

### Health Checks

Create a health check endpoint:

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

### Logging

- Use structured logging (JSON format)
- Centralize logs (CloudWatch, DataDog, etc.)
- Set up alerts for errors

### Updates

```bash
# Update dependencies
npm update

# Check for outdated packages
npm outdated

# Security audit
npm audit
npm audit fix
```

## Troubleshooting Deployment

### Build Failures

**Error: Out of memory**
```bash
# Increase Node memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

**Error: Module not found**
- Ensure all dependencies are in `package.json`
- Run `npm install` before building

### Runtime Issues

**Port already in use**
```bash
# Change port
PORT=3001 npm start
```

**Environment variables not working**
- Ensure variables are prefixed with `NEXT_PUBLIC_` for client-side access
- Restart server after changing variables

### Performance Issues

- Enable compression (Nginx gzip, Next.js compression)
- Optimize images and assets
- Use CDN for static files
- Enable caching headers

## Rollback Strategy

### Vercel
- Go to Deployments
- Click "..." on previous deployment
- Select "Promote to Production"

### Docker
```bash
# Tag previous version
docker tag slop-detector:latest slop-detector:v1.0

# Rollback
docker stop slop-detector
docker run -p 3000:3000 slop-detector:v1.0
```

### PM2
```bash
pm2 stop slop-detector
# Restore previous code
pm2 start slop-detector
```

## Support

For deployment issues:
- Check [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- Review platform-specific documentation
- Open an issue on GitHub
