# OAuth2 Authentication Quick Reference

## 🎯 What is this?

OAuth2 authentication for Slop Detector using Azure AD, implemented at the Istio service mesh level (no application code changes needed).

## 📁 Files Overview

```
k8s/apps/slop-detector/base/
├── oauth2/
│   ├── README.md                           # Full OAuth2 documentation
│   ├── slop-detector-deployment.yaml       # Reference: complete deployment with OAuth2
│   └── slop-detector-oauth2-patch.yaml     # Kustomize patch (applied to base deployment)
├── oauth2-secretproviderclass.yaml         # Azure Key Vault integration
├── oauth2-configmap.yaml                   # SDS template ConfigMap
├── oauth2-envoyfilter.yaml                 # Istio OAuth2 filter configuration
└── kustomization.yaml                      # Orchestrates all resources
```

## 🚀 Quick Setup (5 Steps)

### 1. Create Azure AD App

```bash
az ad app create --display-name "slop-detector" \
  --sign-in-audience "AzureADMyOrg" \
  --web-redirect-uris "https://slop.cat-herding.net/oauth2/callback"

# Save the Application (client) ID
APP_ID="<client-id-from-output>"

# Create client secret
CLIENT_SECRET=$(az ad app credential reset --id $APP_ID --query password -o tsv)
```

### 2. Store Secrets in Key Vault

```bash
KEYVAULT_NAME="<your-keyvault>"
HMAC_SECRET=$(openssl rand -base64 32)

az keyvault secret set --vault-name $KEYVAULT_NAME \
  --name slop-detector-client-secret --value "$CLIENT_SECRET"

az keyvault secret set --vault-name $KEYVAULT_NAME \
  --name slop-detector-oauth-hmac-secret --value "$HMAC_SECRET"
```

### 3. Configure SecretProviderClass

Edit [`k8s/apps/slop-detector/base/oauth2-secretproviderclass.yaml`](k8s/apps/slop-detector/base/oauth2-secretproviderclass.yaml):

```yaml
spec:
  parameters:
    userAssignedIdentityID: "<managed-identity-client-id>"
    keyvaultName: "<your-keyvault>"
    tenantId: "<azure-tenant-id>"
```

### 4. Configure EnvoyFilter

Edit [`k8s/apps/slop-detector/base/oauth2-envoyfilter.yaml`](k8s/apps/slop-detector/base/oauth2-envoyfilter.yaml):

Replace:
- `{tenant-id}` → Your Azure tenant ID
- `{client-id}` → Your Azure AD app client ID

### 5. Validate & Deploy

```bash
# Validate configuration
./scripts/validate-oauth2.sh

# Deploy
kubectl apply -k k8s/apps/slop-detector/base

# Verify
kubectl get pods -l app=slop-detector
kubectl logs -l app=slop-detector -c render-sds-config
```

## 🧪 Test Authentication

1. Visit: `https://slop.cat-herding.net`
2. You'll be redirected to Azure AD login
3. After login, you'll be redirected back to the app
4. Subsequent requests use an encrypted cookie (no re-login needed)

## ❌ Disable OAuth2

Edit [`k8s/apps/slop-detector/base/kustomization.yaml`](k8s/apps/slop-detector/base/kustomization.yaml):

```yaml
# Comment out these lines:
# patchesStrategicMerge:
#   - oauth2/slop-detector-oauth2-patch.yaml

# And these resources:
#   - oauth2-secretproviderclass.yaml
#   - oauth2-configmap.yaml
#   - oauth2-envoyfilter.yaml
```

Then redeploy:
```bash
kubectl apply -k k8s/apps/slop-detector/base
```

## 🔍 Troubleshooting

### Check Init Container Logs
```bash
kubectl logs -l app=slop-detector -c render-sds-config
```

### Verify SDS Files in Sidecar
```bash
kubectl exec -it <pod-name> -c istio-proxy -- ls -la /etc/istio/oauth2/
```

### Check Envoy OAuth2 Config
```bash
istioctl proxy-config all <pod-name> -o json | jq '.configs[] | select(.name | contains("oauth2"))'
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Secrets not mounted | Check CSI driver & managed identity permissions |
| SDS files not created | Check init container logs |
| OAuth2 redirect fails | Verify tenant ID, client ID, redirect URI match Azure AD app |
| 401 Unauthorized | Check EnvoyFilter configuration and Istio logs |

## 📚 Documentation

- **Full OAuth2 Setup**: [`k8s/apps/slop-detector/base/oauth2/README.md`](k8s/apps/slop-detector/base/oauth2/README.md)
- **Azure Deployment**: [`docs/azure-deployment.md`](docs/azure-deployment.md)
- **Validation Script**: [`scripts/validate-oauth2.sh`](scripts/validate-oauth2.sh)

## 🔐 Security Notes

- Secrets never stored in Git (only in Azure Key Vault)
- HMAC secret encrypts OAuth2 session cookies
- All communication over HTTPS
- Rotate secrets regularly (recommended: every 90 days)

## 🆘 Need Help?

1. Run validation script: `./scripts/validate-oauth2.sh`
2. Check full docs: [`k8s/apps/slop-detector/base/oauth2/README.md`](k8s/apps/slop-detector/base/oauth2/README.md)
3. Review Istio logs: `kubectl logs -l app=slop-detector -c istio-proxy`
