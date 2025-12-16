#!/bin/bash
# OAuth2 Integration Validation Script
# This script validates the OAuth2 configuration before deployment

set -e

echo "🔍 Validating OAuth2 Integration Setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0
warnings=0

# Function to check if a value is set
check_value() {
    local name="$1"
    local value="$2"
    local required="$3"
    
    if [ -z "$value" ] || [ "$value" == "<your-"* ] || [ "$value" == "{"* ]; then
        if [ "$required" == "true" ]; then
            echo -e "${RED}✗${NC} $name: Not configured (REQUIRED)"
            ((errors++))
        else
            echo -e "${YELLOW}⚠${NC} $name: Not configured (optional)"
            ((warnings++))
        fi
        return 1
    else
        echo -e "${GREEN}✓${NC} $name: Configured"
        return 0
    fi
}

echo "📋 Checking configuration files..."
echo ""

# Check if Kustomization includes OAuth2
echo "1. Checking kustomization.yaml..."
if grep -q "oauth2/slop-detector-oauth2-patch.yaml" k8s/apps/slop-detector/base/kustomization.yaml; then
    echo -e "${GREEN}✓${NC} OAuth2 patch is enabled in kustomization"
else
    echo -e "${YELLOW}⚠${NC} OAuth2 patch is not enabled in kustomization"
    echo "   To enable: Add 'oauth2/slop-detector-oauth2-patch.yaml' to patchesStrategicMerge"
    ((warnings++))
fi
echo ""

# Check SecretProviderClass
echo "2. Checking oauth2-secretproviderclass.yaml..."
if [ -f "k8s/apps/slop-detector/base/oauth2-secretproviderclass.yaml" ]; then
    IDENTITY_ID=$(grep "userAssignedIdentityID:" k8s/apps/slop-detector/base/oauth2-secretproviderclass.yaml | awk '{print $2}' | tr -d '"')
    KEYVAULT_NAME=$(grep "keyvaultName:" k8s/apps/slop-detector/base/oauth2-secretproviderclass.yaml | awk '{print $2}' | tr -d '"')
    TENANT_ID=$(grep "tenantId:" k8s/apps/slop-detector/base/oauth2-secretproviderclass.yaml | awk '{print $2}' | tr -d '"')
    
    check_value "  Managed Identity ID" "$IDENTITY_ID" "true"
    check_value "  Key Vault Name" "$KEYVAULT_NAME" "true"
    check_value "  Tenant ID" "$TENANT_ID" "true"
else
    echo -e "${RED}✗${NC} oauth2-secretproviderclass.yaml not found"
    ((errors++))
fi
echo ""

# Check EnvoyFilter
echo "3. Checking oauth2-envoyfilter.yaml..."
if [ -f "k8s/apps/slop-detector/base/oauth2-envoyfilter.yaml" ]; then
    if grep -q "{tenant-id}" k8s/apps/slop-detector/base/oauth2-envoyfilter.yaml; then
        echo -e "${RED}✗${NC} Tenant ID placeholder not replaced in EnvoyFilter"
        ((errors++))
    else
        echo -e "${GREEN}✓${NC} Tenant ID configured in EnvoyFilter"
    fi
    
    if grep -q "{client-id}" k8s/apps/slop-detector/base/oauth2-envoyfilter.yaml; then
        echo -e "${RED}✗${NC} Client ID placeholder not replaced in EnvoyFilter"
        ((errors++))
    else
        echo -e "${GREEN}✓${NC} Client ID configured in EnvoyFilter"
    fi
else
    echo -e "${RED}✗${NC} oauth2-envoyfilter.yaml not found"
    ((errors++))
fi
echo ""

# Check if kubectl is available
echo "4. Checking Kubernetes connectivity..."
if command -v kubectl &> /dev/null; then
    if kubectl cluster-info &> /dev/null; then
        echo -e "${GREEN}✓${NC} kubectl is configured and connected"
        
        # Check if CSI driver is installed
        if kubectl get csidriver secrets-store.csi.k8s.io &> /dev/null; then
            echo -e "${GREEN}✓${NC} Secrets Store CSI Driver is installed"
        else
            echo -e "${RED}✗${NC} Secrets Store CSI Driver is NOT installed"
            echo "   Install: https://azure.github.io/secrets-store-csi-driver-provider-azure/docs/getting-started/installation/"
            ((errors++))
        fi
        
        # Check if Istio is installed
        if kubectl get namespace aks-istio-ingress &> /dev/null; then
            echo -e "${GREEN}✓${NC} Istio is installed"
        else
            echo -e "${RED}✗${NC} Istio is NOT installed"
            ((errors++))
        fi
    else
        echo -e "${YELLOW}⚠${NC} kubectl is not connected to a cluster"
        ((warnings++))
    fi
else
    echo -e "${YELLOW}⚠${NC} kubectl is not installed or not in PATH"
    ((warnings++))
fi
echo ""

# Check Azure Key Vault (if az CLI is available)
echo "5. Checking Azure Key Vault..."
if command -v az &> /dev/null; then
    if az account show &> /dev/null; then
        if [ ! -z "$KEYVAULT_NAME" ] && [ "$KEYVAULT_NAME" != '""' ]; then
            if az keyvault show --name "$KEYVAULT_NAME" &> /dev/null; then
                echo -e "${GREEN}✓${NC} Key Vault '$KEYVAULT_NAME' exists"
                
                # Check if secrets exist
                if az keyvault secret show --vault-name "$KEYVAULT_NAME" --name "slop-detector-client-secret" &> /dev/null; then
                    echo -e "${GREEN}✓${NC} Secret 'slop-detector-client-secret' exists"
                else
                    echo -e "${RED}✗${NC} Secret 'slop-detector-client-secret' not found"
                    ((errors++))
                fi
                
                if az keyvault secret show --vault-name "$KEYVAULT_NAME" --name "slop-detector-oauth-hmac-secret" &> /dev/null; then
                    echo -e "${GREEN}✓${NC} Secret 'slop-detector-oauth-hmac-secret' exists"
                else
                    echo -e "${RED}✗${NC} Secret 'slop-detector-oauth-hmac-secret' not found"
                    ((errors++))
                fi
            else
                echo -e "${RED}✗${NC} Key Vault '$KEYVAULT_NAME' not found or no access"
                ((errors++))
            fi
        else
            echo -e "${YELLOW}⚠${NC} Key Vault name not configured, skipping secret checks"
            ((warnings++))
        fi
    else
        echo -e "${YELLOW}⚠${NC} Azure CLI is not authenticated"
        ((warnings++))
    fi
else
    echo -e "${YELLOW}⚠${NC} Azure CLI is not installed or not in PATH"
    ((warnings++))
fi
echo ""

# Check Kustomize validity
echo "6. Validating Kustomize configuration..."
if command -v kubectl &> /dev/null; then
    if kubectl kustomize k8s/apps/slop-detector/base &> /dev/null; then
        echo -e "${GREEN}✓${NC} Kustomize configuration is valid"
    else
        echo -e "${RED}✗${NC} Kustomize configuration has errors"
        echo "   Run: kubectl kustomize k8s/apps/slop-detector/base"
        ((errors++))
    fi
else
    echo -e "${YELLOW}⚠${NC} Cannot validate Kustomize (kubectl not available)"
    ((warnings++))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "  You can proceed with deployment."
    exit 0
elif [ $errors -eq 0 ]; then
    echo -e "${YELLOW}⚠ $warnings warning(s)${NC}"
    echo "  Review warnings before deployment."
    exit 0
else
    echo -e "${RED}✗ $errors error(s)${NC}"
    if [ $warnings -gt 0 ]; then
        echo -e "${YELLOW}⚠ $warnings warning(s)${NC}"
    fi
    echo ""
    echo "Please fix the errors before deploying."
    echo "See k8s/apps/slop-detector/base/oauth2/README.md for setup instructions."
    exit 1
fi
