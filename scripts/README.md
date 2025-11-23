# Azure AKS Deployment Scripts

This directory contains helper scripts for deploying Slop Detector to Azure AKS.

## Scripts

### deploy.sh

Main deployment script that orchestrates the entire deployment process.

```bash
# Deploy with defaults (slop.cat-herding.net)
./scripts/deploy.sh

# Deploy with custom subdomain
./scripts/deploy.sh --subdomain myapp

# Deploy with specific image tag
./scripts/deploy.sh --tag v1.0.0

# Full custom deployment
./scripts/deploy.sh \
  --subdomain myapp \
  --tag v1.0.0 \
  --resource-group my-rg \
  --namespace production
```

### build-and-push.sh

Builds Docker image and pushes to Azure Container Registry.

```bash
# Build and push with latest tag
./scripts/build-and-push.sh

# Build and push with specific tag
./scripts/build-and-push.sh --tag v1.0.0

# Build without pushing
./scripts/build-and-push.sh --no-push
```

### rollback.sh

Rolls back to previous deployment version.

```bash
# Rollback to previous version
./scripts/rollback.sh

# Rollback to specific revision
./scripts/rollback.sh --revision 3
```

## Usage

Make scripts executable:

```bash
chmod +x scripts/*.sh
```

See individual scripts for detailed usage information.
