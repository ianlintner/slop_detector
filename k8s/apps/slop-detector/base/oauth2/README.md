# OAuth2 Integration for Slop Detector

## Overview

This directory contains the OAuth2 integration configuration for the Slop Detector application deployed on Azure Kubernetes Service (AKS) with Istio service mesh.

## Architecture

The OAuth2 integration uses:
- **Azure Key Vault** to store OAuth2 secrets
- **CSI Secret Store Driver** to mount secrets into pods
- **Istio EnvoyFilter** to apply OAuth2 authentication at the service mesh level
- **Init Container** to render SDS (Secret Discovery Service) configuration dynamically

## Files

### Core Configuration
- `slop-detector-oauth2-patch.yaml` - Kustomize patch that adds OAuth2 support to the base deployment
- `../oauth2-envoyfilter.yaml` - Istio EnvoyFilter for OAuth2 configuration
- `../oauth2-secretproviderclass.yaml` - Azure Key Vault CSI driver configuration
- `../oauth2-configmap.yaml` - ConfigMap for SDS template

### Reference (for comparison)
- `slop-detector-deployment.yaml` - Complete deployment with OAuth2 (reference only, not used in Kustomize)

## Prerequisites

1. **Azure Key Vault** with secrets:
   - `slop-detector-client-secret` - OAuth2 client secret from Azure AD app registration
   - `slop-detector-oauth-hmac-secret` - Random secret for cookie encryption (generate with `openssl rand -base64 32`)

2. **Azure AD App Registration**:
   - Redirect URI: `https://slop.cat-herding.net/oauth2/callback`
   - Note the Client ID and Tenant ID

3. **AKS Cluster** with:
   - Istio service mesh installed
   - Azure Key Vault CSI driver installed
   - Managed identity with Key Vault access

## Setup Instructions

### 1. Configure Azure Key Vault

```bash
# Set variables
KEYVAULT_NAME="your-keyvault-name"
CLIENT_SECRET="your-oauth2-client-secret"
HMAC_SECRET=$(openssl rand -base64 32)

# Create secrets
az keyvault secret set --vault-name $KEYVAULT_NAME \
  --name slop-detector-client-secret --value "$CLIENT_SECRET"

az keyvault secret set --vault-name $KEYVAULT_NAME \
  --name slop-detector-oauth-hmac-secret --value "$HMAC_SECRET"
```

### 2. Update SecretProviderClass

Edit `oauth2-secretproviderclass.yaml`:

```yaml
spec:
  parameters:
    userAssignedIdentityID: "<your-managed-identity-client-id>"
    keyvaultName: "<your-keyvault-name>"
    tenantId: "<your-azure-tenant-id>"
```

### 3. Update EnvoyFilter

Edit `oauth2-envoyfilter.yaml` and replace:
- `{tenant-id}` with your Azure AD tenant ID
- `{client-id}` with your Azure AD app registration client ID

### 4. Deploy

```bash
# From the base directory
kubectl apply -k k8s/apps/slop-detector/base

# Verify deployment
kubectl get pods -l app=slop-detector
kubectl logs -l app=slop-detector -c render-sds-config
```

## How It Works

1. **Init Container**: Reads secrets from Azure Key Vault (mounted via CSI driver) and generates SDS YAML files
2. **SDS Files**: Mounted into the Istio sidecar at `/etc/istio/oauth2/`
3. **EnvoyFilter**: Configures the Istio sidecar to use OAuth2 filter with secrets from SDS
4. **OAuth2 Flow**: 
   - User requests protected resource
   - Envoy redirects to Azure AD login
   - After authentication, user is redirected back with auth code
   - Envoy exchanges code for token
   - Token is stored in encrypted cookie
   - Subsequent requests use the cookie

## Troubleshooting

### Check Init Container Logs
```bash
kubectl logs -l app=slop-detector -c render-sds-config
```

### Verify SDS Files
```bash
kubectl exec -it <pod-name> -c istio-proxy -- ls -la /etc/istio/oauth2/
```

### Check Istio Configuration
```bash
istioctl proxy-config all <pod-name> -o json | jq '.configs[] | select(.name | contains("oauth2"))'
```

### Common Issues

1. **Secrets not mounted**: Check CSI driver installation and managed identity permissions
2. **SDS files not created**: Check init container logs for Python/shell errors
3. **OAuth2 not working**: Verify EnvoyFilter tenant ID, client ID, and redirect URI match Azure AD app registration

## Disabling OAuth2

To disable OAuth2 and deploy without authentication:

1. Remove the patch from `kustomization.yaml`:
   ```yaml
   # Comment out or remove:
   # patchesStrategicMerge:
   #   - oauth2/slop-detector-oauth2-patch.yaml
   ```

2. Remove OAuth2 resources:
   ```yaml
   # Comment out or remove:
   #   - oauth2-secretproviderclass.yaml
   #   - oauth2-configmap.yaml
   #   - oauth2-envoyfilter.yaml
   ```

3. Redeploy:
   ```bash
   kubectl apply -k k8s/apps/slop-detector/base
   ```

## Security Considerations

- Secrets are never stored in Git (only mounted at runtime from Key Vault)
- HMAC secret should be rotated periodically
- OAuth2 tokens are encrypted in cookies using the HMAC secret
- All traffic between Envoy and Azure AD is over HTTPS
- Consider adding network policies to restrict pod-to-pod communication

## References

- [Istio OAuth2 Filter](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/oauth2_filter)
- [Azure Key Vault CSI Driver](https://azure.github.io/secrets-store-csi-driver-provider-azure/)
- [Azure AD OAuth2 Flow](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
