# Deployment Guide

> **Security gate:** The routes include paid provider calls and are not ready for anonymous public traffic. Use the [restricted ACA plan](azure-container-apps-plan.md) and [security controls](security.md) before enabling external access. Examples below describe hosting mechanics, not an approval to deploy openly.

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

The text-only demo can run without credentials. Screenshot analysis needs a server-only `OPENROUTER_API_KEY`, `SCREENSHOT_ACCESS_TOKENS`, and `SCREENSHOT_DAILY_SPEND_CAP_USD`; never use `NEXT_PUBLIC_` for secrets. See [Security](security.md) and the [restricted ACA plan](azure-container-apps-plan.md) before external exposure.

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

The repository now contains a tested multi-stage [Dockerfile](https://github.com/ianlintner/slop_detector/blob/main/Dockerfile) and `.dockerignore`. `next.config.ts` emits a standalone server, and the runtime image includes static assets, runs as non-root, and expects keys **only at runtime**. Node 22 is pinned for the image; do not use the former Node 18 example with Next.js 16.

### Local build and smoke

Build from the repository root with Docker or Podman. Bind the preview to loopback and use **synthetic-only** credentials; do not give this local image a real provider key unless performing a separately authorized smoke.

```bash
podman build -t slop-detector:local .
podman run --rm --name slop-detector-local -p 127.0.0.1:3190:3000 \
  -e OPENROUTER_API_KEY=synthetic-disabled \
  -e SCREENSHOT_ACCESS_TOKENS=smoke:synthetic-token-12345678901234567890 \
  -e SCREENSHOT_DAILY_SPEND_CAP_USD=0.01 slop-detector:local
```

In another shell, verify `GET /api/health` and `/` return 200, static assets under `/_next/static/` return 200, and a POST to `/api/screenshot` without a bearer token returns 401. A tokened malformed image should return 415 without calling OpenRouter. Do not pass a real image to the synthetic key.

This is **packaging**, not a public deployment. The `Container image` workflow builds and smoke-tests this Dockerfile on PRs, then publishes `ghcr.io/ianlintner/slop_detector:sha-<full-main-commit>` only after a merge to `main`; no `latest` tag is published. Verify its actual GHCR push job and digest before deploying that exact image. The in-memory limits reset across restarts and are not a durable spend cap. Before external ingress, follow the [restricted ACA plan](azure-container-apps-plan.md): dedicated provider-limited key, full-app Entra authentication, secrets via Key Vault identity, scale 0–1, and an explicit staging verification/rollback gate. The existing `/api/ai-analyze` and `/api/youtube` routes also need the preview access gate. A Container Apps health probe can target `/api/health` without exposing provider state.

## Self-Hosted Deployment

### Requirements

- Node.js 20.9 or higher
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

The real `app/api/health/route.ts` returns `{ "status": "ok" }` with `Cache-Control: no-store`; it is a process readiness check, not proof that OpenRouter or authentication is configured. The container `HEALTHCHECK` and ACA HTTP probe use this route.

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
