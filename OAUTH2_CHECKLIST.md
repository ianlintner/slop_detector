# OAuth2 Deployment Checklist

Use this checklist before deploying Slop Detector with OAuth2 authentication.

## ✅ Pre-Deployment Checklist

### 1. Azure Active Directory Setup

- [ ] Azure AD App Registration created
  ```bash
  az ad app create --display-name "slop-detector" \
    --sign-in-audience "AzureADMyOrg" \
    --web-redirect-uris "https://slop.cat-herding.net/oauth2/callback"
  ```
- [ ] Application (Client) ID recorded
- [ ] Client secret created and recorded
- [ ] Tenant ID recorded
- [ ] Redirect URI matches your domain (`https://slop.cat-herding.net/oauth2/callback`)

### 2. Azure Key Vault Setup

- [ ] Azure Key Vault exists and is accessible
- [ ] Managed Identity has permissions to read Key Vault secrets
- [ ] Client secret stored in Key Vault
  ```bash
  az keyvault secret set --vault-name <vault> \
    --name slop-detector-client-secret --value "<secret>"
  ```
- [ ] HMAC secret generated and stored
  ```bash
  HMAC_SECRET=$(openssl rand -base64 32)
  az keyvault secret set --vault-name <vault> \
    --name slop-detector-oauth-hmac-secret --value "$HMAC_SECRET"
  ```

### 3. Kubernetes Cluster Requirements

- [ ] AKS cluster is running
- [ ] `kubectl` is configured and connected to the cluster
- [ ] Istio is installed (`kubectl get namespace aks-istio-ingress`)
- [ ] CSI Secret Store Driver is installed (`kubectl get csidriver secrets-store.csi.k8s.io`)
- [ ] Managed Identity is configured for the cluster
- [ ] ACR access is configured (`kubectl get secret acr-secret`)

### 4. Configuration Files

- [ ] `oauth2-secretproviderclass.yaml` updated:
  - [ ] `userAssignedIdentityID` set
  - [ ] `keyvaultName` set
  - [ ] `tenantId` set
  
- [ ] `oauth2-envoyfilter.yaml` updated:
  - [ ] `{tenant-id}` replaced with actual tenant ID
  - [ ] `{client-id}` replaced with actual client ID
  
- [ ] `kustomization.yaml` includes:
  - [ ] OAuth2 resources listed
  - [ ] OAuth2 patch enabled in `patchesStrategicMerge`

### 5. Validation

- [ ] Run validation script: `./scripts/validate-oauth2.sh`
- [ ] All validation checks pass (no red ✗ marks)
- [ ] Kustomize builds without errors: `kubectl kustomize k8s/apps/slop-detector/base`

### 6. DNS and TLS

- [ ] DNS A record points to Istio ingress IP
  ```bash
  INGRESS_IP=$(kubectl get svc -n aks-istio-ingress \
    aks-istio-ingressgateway-external -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
  ```
- [ ] TLS certificate exists: `kubectl get secret slop-tls`
- [ ] Certificate matches domain (`slop.cat-herding.net`)

## 🚀 Deployment Steps

### 1. Dry Run (Optional but Recommended)
```bash
kubectl apply -k k8s/apps/slop-detector/base --dry-run=client
```

### 2. Deploy
```bash
kubectl apply -k k8s/apps/slop-detector/base
```

### 3. Verify Deployment
```bash
# Check pod status
kubectl get pods -l app=slop-detector

# Check init container logs
kubectl logs -l app=slop-detector -c render-sds-config

# Check main container
kubectl logs -l app=slop-detector -c slop-detector --tail=50

# Check Istio sidecar
kubectl logs -l app=slop-detector -c istio-proxy --tail=50
```

### 4. Verify OAuth2 Configuration
```bash
# Check if SDS files were created
kubectl exec -it $(kubectl get pod -l app=slop-detector -o jsonpath='{.items[0].metadata.name}') \
  -c istio-proxy -- ls -la /etc/istio/oauth2/

# Expected output:
# slop-detector-oauth-token.yaml
# slop-detector-oauth-hmac.yaml
```

### 5. Test Authentication

- [ ] Open browser to `https://slop.cat-herding.net`
- [ ] Verify redirect to Azure AD login page
- [ ] Login with Azure AD credentials
- [ ] Verify redirect back to application
- [ ] Verify application loads correctly
- [ ] Close browser and reopen - should not require re-login (cookie works)

## 🔍 Post-Deployment Verification

### Health Checks
```bash
# Check readiness
kubectl get pods -l app=slop-detector

# Check service endpoints
kubectl get endpoints slop-detector

# Test health endpoint (from within cluster)
kubectl run curl --image=curlimages/curl -i --tty --rm --restart=Never -- \
  curl -v http://slop-detector.default.svc.cluster.local/health
```

### OAuth2 Flow Testing

- [ ] Test with incognito/private browser window
- [ ] Test logout flow: `https://slop.cat-herding.net/oauth2/signout`
- [ ] Test with different user accounts
- [ ] Verify user info in logs (if applicable)

### Monitoring

- [ ] Check Istio telemetry
  ```bash
  kubectl logs -l app=slop-detector -c istio-proxy | grep oauth2
  ```
- [ ] Check Application Insights (if configured)
- [ ] Monitor authentication failures in logs

## 🐛 Troubleshooting Checklist

If OAuth2 is not working:

- [ ] Check init container completed successfully
- [ ] Verify secrets exist in Key Vault
- [ ] Verify managed identity has Key Vault permissions
- [ ] Check SDS files were created in Istio proxy
- [ ] Verify tenant ID and client ID in EnvoyFilter
- [ ] Check redirect URI matches Azure AD app registration
- [ ] Verify DNS resolves correctly
- [ ] Verify TLS certificate is valid
- [ ] Check Istio logs for errors
- [ ] Review Azure AD sign-in logs for failures

## 📋 Rollback Procedure

If you need to disable OAuth2:

1. Edit `kustomization.yaml`
2. Comment out OAuth2 resources and patch:
   ```yaml
   # patchesStrategicMerge:
   #   - oauth2/slop-detector-oauth2-patch.yaml
   # 
   # resources:
   #   - oauth2-secretproviderclass.yaml
   #   - oauth2-configmap.yaml
   #   - oauth2-envoyfilter.yaml
   ```
3. Redeploy:
   ```bash
   kubectl apply -k k8s/apps/slop-detector/base
   ```
4. Verify pods restart without OAuth2

## 📞 Support Resources

- 📖 [Full OAuth2 Documentation](../k8s/apps/slop-detector/base/oauth2/README.md)
- 🏗️ [Architecture Diagrams](../docs/oauth2-architecture.md)
- 🔧 [Validation Script](../scripts/validate-oauth2.sh)
- 📘 [Azure Deployment Guide](../docs/azure-deployment.md)
- 🔐 [OAuth2 Quick Reference](../OAUTH2.md)

## ✨ Success Criteria

You've successfully deployed with OAuth2 when:

- ✅ Pods are running and ready
- ✅ Init container completes without errors
- ✅ SDS files exist in Istio sidecar
- ✅ Browser redirects to Azure AD login
- ✅ After login, redirects back to app
- ✅ Subsequent requests don't require login
- ✅ Health endpoint responds correctly
- ✅ No errors in pod logs

---

**Last Updated**: December 2024
**Kubernetes Version**: 1.28+
**Istio Version**: 1.19+
