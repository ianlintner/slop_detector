# Azure AKS Deployment Guide - Slop Detector

This guide provides step-by-step instructions for deploying the Slop Detector application to Azure Kubernetes Service (AKS) with Istio service mesh.

## Overview

- **Application**: Slop Detector
- **Subdomain**: `slop.cat-herding.net` (configurable)
- **Container Port**: 3000
- **Base Domain**: `cat-herding.net`
- **Namespace**: `default`

## Prerequisites

Before starting, ensure you have:

- Azure CLI (`az`) authenticated and configured
- `kubectl` configured for your AKS cluster
- Istio installed on AKS with external ingress gateway selector: `istio: aks-istio-ingressgateway-external`
- Azure DNS Zone for `cat-herding.net` exists in your resource group
- Docker image built and pushed to Azure Container Registry (ACR)

## Quick Start

If you're familiar with the process, here's the fast path:

```bash
# Set variables
export SUBDOMAIN="slop"
export RESOURCE_GROUP="<your-resource-group>"
export ACR_NAME="gabby"  # or your ACR name
export IMAGE_TAG="latest"  # or specific version

# 1. Get ingress IP and create DNS record
INGRESS_IP=$(kubectl get svc -n aks-istio-ingress aks-istio-ingressgateway-external -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
az network dns record-set a add-record \
  --resource-group "$RESOURCE_GROUP" \
  --zone-name "cat-herding.net" \
  --record-set-name "$SUBDOMAIN" \
  --ipv4-address "$INGRESS_IP"

# 2. Create TLS certificate secret (see TLS section below)

# 3. Update image tag in deployment.yaml if needed
sed -i '' "s|gabby.azurecr.io/slop-detector:latest|${ACR_NAME}.azurecr.io/slop-detector:${IMAGE_TAG}|" k8s/apps/slop-detector/base/deployment.yaml

# 4. Deploy
kubectl apply -k k8s/apps/slop-detector/base

# 5. Verify
kubectl rollout status deployment/slop-detector -n default
curl https://slop.cat-herding.net
```

## Detailed Deployment Steps

### Step 1: Build and Push Docker Image

First, build the Next.js application and create a Docker image.

**Create Dockerfile** (if not exists):

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Build and push**:

```bash
# Login to ACR
az acr login --name gabby

# Build image
docker build -t gabby.azurecr.io/slop-detector:latest .

# Push to ACR
docker push gabby.azurecr.io/slop-detector:latest

# Optional: Tag with version
docker tag gabby.azurecr.io/slop-detector:latest gabby.azurecr.io/slop-detector:v1.0.0
docker push gabby.azurecr.io/slop-detector:v1.0.0
```

### Step 2: Configure DNS

Create an A record in Azure DNS pointing to the Istio ingress gateway.

```bash
# Get Istio ingress gateway external IP
INGRESS_IP=$(kubectl get svc -n aks-istio-ingress aks-istio-ingressgateway-external -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Ingress IP: $INGRESS_IP"

# Set variables
RESOURCE_GROUP="<your-resource-group>"
DNS_ZONE="cat-herding.net"
SUBDOMAIN="slop"

# Create DNS A record
az network dns record-set a add-record \
  --resource-group "$RESOURCE_GROUP" \
  --zone-name "$DNS_ZONE" \
  --record-set-name "$SUBDOMAIN" \
  --ipv4-address "$INGRESS_IP"

# Verify DNS record
az network dns record-set a show \
  --resource-group "$RESOURCE_GROUP" \
  --zone-name "$DNS_ZONE" \
  --name "$SUBDOMAIN"

# Test DNS resolution (may take 1-5 minutes to propagate)
nslookup slop.cat-herding.net
```

### Step 3: Setup TLS Certificate

You have two options for TLS certificates:

#### Option A: Using cert-manager (Recommended)

If cert-manager is installed with Let's Encrypt:

```yaml
# Save as certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: slop-tls-cert
  namespace: default
spec:
  secretName: slop-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - "slop.cat-herding.net"
```

```bash
# Apply certificate
kubectl apply -f certificate.yaml

# Check certificate status
kubectl get certificate slop-tls-cert -n default
kubectl describe certificate slop-tls-cert -n default

# Wait for certificate to be ready
kubectl wait --for=condition=Ready certificate/slop-tls-cert -n default --timeout=300s
```

#### Option B: Manual Certificate

If you have existing certificate files:

```bash
# Create TLS secret from certificate files
kubectl create secret tls slop-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  --namespace=default

# Verify secret
kubectl get secret slop-tls -n default
```

### Step 4: Configure Application Secrets (Optional)

If you want to use AI consensus features with OpenAI/Anthropic:

```bash
# Create secrets for API keys
kubectl create secret generic slop-detector-secrets \
  --from-literal=openai-api-key="<your-openai-key>" \
  --from-literal=anthropic-api-key="<your-anthropic-key>" \
  --namespace=default

# Verify secret
kubectl get secret slop-detector-secrets -n default
```

Then uncomment the environment variable section in `k8s/apps/slop-detector/base/deployment.yaml`.

### Step 5: Customize Configuration

Review and update the manifests if needed:

**Update subdomain** (if not using `slop.cat-herding.net`):

```bash
# In istio-gateway.yaml and istio-virtualservice.yaml
CUSTOM_SUBDOMAIN="myapp.cat-herding.net"
sed -i '' "s|slop.cat-herding.net|${CUSTOM_SUBDOMAIN}|g" k8s/apps/slop-detector/base/istio-*.yaml
```

**Update image tag**:

```bash
# In deployment.yaml
IMAGE_TAG="v1.0.0"
sed -i '' "s|:latest|:${IMAGE_TAG}|" k8s/apps/slop-detector/base/deployment.yaml
```

### Step 6: Validate Manifests

Before deploying, validate your configuration:

```bash
# Validate kustomize build
kubectl kustomize k8s/apps/slop-detector/base

# Dry-run apply (client-side)
kubectl apply --dry-run=client -k k8s/apps/slop-detector/base

# Dry-run apply (server-side validation)
kubectl apply --dry-run=server -k k8s/apps/slop-detector/base
```

### Step 7: Deploy Application

Deploy the application to your AKS cluster:

```bash
# Apply all manifests
kubectl apply -k k8s/apps/slop-detector/base

# Watch deployment rollout
kubectl rollout status deployment/slop-detector -n default

# Check pod status
kubectl get pods -l app=slop-detector -n default

# Check pod logs
kubectl logs -l app=slop-detector -n default --tail=50 -f
```

### Step 8: Verify Deployment

Verify all resources are created and healthy:

```bash
# Check all resources
kubectl get all -l app=slop-detector -n default

# Check Gateway
kubectl get gateway slop-detector-gateway -n default
kubectl describe gateway slop-detector-gateway -n default

# Check VirtualService
kubectl get virtualservice slop-detector-virtualservice -n default
kubectl describe virtualservice slop-detector-virtualservice -n default

# Check service
kubectl get service slop-detector -n default

# Verify Istio configuration
kubectl logs -n aks-istio-ingress -l istio=aks-istio-ingressgateway-external --tail=50
```

### Step 9: Test Connectivity

Test the application is accessible:

```bash
# Test HTTP (if not redirecting to HTTPS)
curl -v http://slop.cat-herding.net

# Test HTTPS
curl -v https://slop.cat-herding.net

# Test with specific user-agent
curl -H "User-Agent: Mozilla/5.0" https://slop.cat-herding.net

# Test from inside cluster
kubectl run curl-test --image=curlimages/curl:latest --rm -it --restart=Never -- \
  curl -v http://slop-detector.default.svc.cluster.local
```

## Updating the Application

To update the application with a new version:

```bash
# Build and push new image
docker build -t gabby.azurecr.io/slop-detector:v1.1.0 .
docker push gabby.azurecr.io/slop-detector:v1.1.0

# Update deployment image
kubectl set image deployment/slop-detector slop-detector=gabby.azurecr.io/slop-detector:v1.1.0 -n default

# Or update the deployment.yaml and reapply
sed -i '' 's|:latest|:v1.1.0|' k8s/apps/slop-detector/base/deployment.yaml
kubectl apply -k k8s/apps/slop-detector/base

# Watch rollout
kubectl rollout status deployment/slop-detector -n default

# Rollback if needed
kubectl rollout undo deployment/slop-detector -n default
```

## Monitoring and Logs

### View Logs

```bash
# All pods
kubectl logs -l app=slop-detector -n default --tail=100 -f

# Specific pod
kubectl logs <pod-name> -n default --tail=100 -f

# Previous pod instance (if crashed)
kubectl logs <pod-name> -n default --previous
```

### Check Events

```bash
# Recent events
kubectl get events -n default --sort-by='.lastTimestamp' | grep slop-detector

# Watch events in real-time
kubectl get events -n default --watch
```

### Pod Shell Access

```bash
# Get shell in running pod
kubectl exec -it <pod-name> -n default -- sh

# Run commands in pod
kubectl exec <pod-name> -n default -- env
kubectl exec <pod-name> -n default -- df -h
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod details
kubectl describe pod <pod-name> -n default

# Check deployment events
kubectl describe deployment slop-detector -n default

# Check if image can be pulled
kubectl get events -n default | grep -i "pull"

# Verify ACR access
az acr login --name gabby
```

### DNS Not Resolving

```bash
# Check DNS record
az network dns record-set a show \
  --resource-group "$RESOURCE_GROUP" \
  --zone-name "cat-herding.net" \
  --name "slop"

# Test DNS from pod
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup slop.cat-herding.net

# Check external DNS
dig slop.cat-herding.net
```

### Certificate Issues

```bash
# Check certificate secret
kubectl get secret slop-tls -n default
kubectl describe secret slop-tls -n default

# View certificate details
kubectl get secret slop-tls -n default -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout

# Check cert-manager certificate status
kubectl get certificate slop-tls-cert -n default
kubectl describe certificate slop-tls-cert -n default
```

### Istio Routing Issues

```bash
# Check Gateway configuration
kubectl get gateway slop-detector-gateway -n default -o yaml

# Check VirtualService configuration
kubectl get virtualservice slop-detector-virtualservice -n default -o yaml

# Check Istio ingress logs
kubectl logs -n aks-istio-ingress -l istio=aks-istio-ingressgateway-external --tail=100

# Analyze Istio configuration (if istioctl available)
istioctl analyze -n default
```

### Application Not Responding

```bash
# Check if pods are ready
kubectl get pods -l app=slop-detector -n default

# Check service endpoints
kubectl get endpoints slop-detector -n default

# Test internal connectivity
kubectl run curl-test --image=curlimages/curl:latest --rm -it --restart=Never -- \
  curl -v http://slop-detector.default.svc.cluster.local

# Check application logs
kubectl logs -l app=slop-detector -n default --tail=200
```

## Scaling

### Manual Scaling

```bash
# Scale to 3 replicas
kubectl scale deployment slop-detector --replicas=3 -n default

# Verify scaling
kubectl get deployment slop-detector -n default
kubectl get pods -l app=slop-detector -n default
```

### Horizontal Pod Autoscaler (HPA)

Create HPA for automatic scaling:

```yaml
# Save as hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: slop-detector-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: slop-detector
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

```bash
# Apply HPA
kubectl apply -f hpa.yaml

# Check HPA status
kubectl get hpa slop-detector-hpa -n default
kubectl describe hpa slop-detector-hpa -n default
```

## Cleanup

To remove the application:

```bash
# Delete all resources
kubectl delete -k k8s/apps/slop-detector/base

# Delete secrets (if created)
kubectl delete secret slop-detector-secrets -n default
kubectl delete secret slop-tls -n default

# Delete DNS record
az network dns record-set a remove-record \
  --resource-group "$RESOURCE_GROUP" \
  --zone-name "cat-herding.net" \
  --record-set-name "slop" \
  --ipv4-address "$INGRESS_IP"

# Or delete entire record set
az network dns record-set a delete \
  --resource-group "$RESOURCE_GROUP" \
  --zone-name "cat-herding.net" \
  --name "slop" \
  --yes
```

## Security Best Practices

1. **Use specific image tags** instead of `:latest` in production
2. **Store API keys in Kubernetes secrets**, not environment variables in manifests
3. **Enable network policies** to restrict pod-to-pod communication
4. **Use Pod Security Standards** to enforce security policies
5. **Regularly update dependencies** and base images
6. **Enable Istio mTLS** for service-to-service encryption
7. **Configure resource limits** to prevent resource exhaustion
8. **Use Azure Key Vault** for sensitive configuration (via CSI driver)

## Additional Resources

- [Azure AKS Documentation](https://learn.microsoft.com/azure/aks/)
- [Istio Documentation](https://istio.io/latest/docs/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
