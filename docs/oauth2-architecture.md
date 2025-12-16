# OAuth2 Integration Architecture

## 📁 File Structure

```
k8s/apps/slop-detector/base/
│
├── 🔧 Core Kubernetes Resources
│   ├── deployment.yaml              # Base deployment (modified for Istio)
│   ├── service.yaml                 # ClusterIP service
│   ├── istio-gateway.yaml           # Istio Gateway for ingress
│   ├── istio-virtualservice.yaml    # Istio routing rules
│   └── certificate.yaml             # TLS certificate
│
├── 🔐 OAuth2 Resources (NEW)
│   ├── oauth2-secretproviderclass.yaml    # Azure Key Vault CSI driver
│   ├── oauth2-configmap.yaml              # SDS template
│   ├── oauth2-envoyfilter.yaml            # Istio OAuth2 filter
│   └── kustomization.yaml                 # Orchestrates everything
│
└── 📂 oauth2/ (Reference & Patch)
    ├── README.md                           # Complete setup guide
    ├── slop-detector-deployment.yaml       # Reference: full deployment
    └── slop-detector-oauth2-patch.yaml     # Kustomize patch (applied)
```

## 🔄 OAuth2 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User accesses https://slop.cat-herding.net                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Istio Gateway receives request                               │
│    └─> Routes to slop-detector service (VirtualService)         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Envoy Sidecar (with OAuth2 filter)                           │
│    ├─> No valid token? → Redirect to Azure AD                   │
│    └─> Valid token? → Forward to app                            │
└────────────┬───────────────────────────────┬────────────────────┘
             │                               │
     No Token│                               │Valid Token
             ▼                               ▼
┌──────────────────────────┐    ┌─────────────────────────────────┐
│ 4a. Azure AD Login Page  │    │ 4b. Next.js App (Port 3000)     │
│     (Microsoft Login)     │    │     ├─> Processes request       │
└──────────┬───────────────┘    │     └─> Returns response        │
           │                     └─────────────────────────────────┘
           │ User authenticates
           ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. Azure AD redirects back with auth code                        │
│    → https://slop.cat-herding.net/oauth2/callback?code=...       │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Envoy exchanges code for token                               │
│    ├─> POST to Azure AD token endpoint                          │
│    ├─> Validates token                                           │
│    └─> Creates encrypted session cookie                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. User redirected to original URL with cookie                  │
│    → Subsequent requests use cookie (no re-authentication)      │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Secret Management Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ Azure Key Vault                                                   │
│ ├─ slop-detector-client-secret (OAuth2 client secret)            │
│ └─ slop-detector-oauth-hmac-secret (Cookie encryption)           │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ CSI Secret Store Driver
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Pod Volume: /mnt/secrets-store/                                   │
│ ├─ slop-detector-client-secret                                   │
│ └─ slop-detector-oauth-hmac-secret                               │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ Init Container reads secrets
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Init Container: render-sds-config                                │
│ ├─ Reads secrets from /mnt/secrets-store/                        │
│ ├─ Generates SDS YAML files:                                     │
│ │  ├─ slop-detector-oauth-token.yaml                             │
│ │  └─ slop-detector-oauth-hmac.yaml                              │
│ └─ Writes to /etc/istio/oauth2/                                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ Volume shared with sidecar
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Istio Proxy Sidecar: /etc/istio/oauth2/                          │
│ ├─ Reads SDS files                                               │
│ ├─ Loads secrets into Envoy filter                               │
│ └─ Uses for OAuth2 flow:                                         │
│    ├─ Client secret → Token exchange                             │
│    └─ HMAC secret → Cookie encryption                            │
└──────────────────────────────────────────────────────────────────┘
```

## 🎯 Component Interactions

```
┌────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                            │
└────────────────┬───────────────────────────────────────────────┘
                 │ HTTPS
                 ▼
┌────────────────────────────────────────────────────────────────┐
│              Istio Ingress Gateway                              │
│              (aks-istio-ingressgateway-external)                │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│                    VirtualService                               │
│              Routes: slop.cat-herding.net → Service             │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│                  Kubernetes Service                             │
│              slop-detector:80 → Pod:3000                        │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│                          POD                                    │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Init Container: render-sds-config                     │     │
│  │ └─> Generates SDS files from Key Vault secrets       │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌─────────────────────┐    ┌──────────────────────────┐     │
│  │ Istio Proxy Sidecar │    │ slop-detector Container  │     │
│  │                     │    │                          │     │
│  │ ┌─────────────────┐ │    │ Next.js App (Port 3000)  │     │
│  │ │ EnvoyFilter     │ │    │ ├─ API Routes            │     │
│  │ │ ├─ OAuth2 Filter│─┼────┤ ├─ Static Assets         │     │
│  │ │ ├─ SDS Secrets  │ │    │ └─ Server Logic          │     │
│  │ │ └─ Token Store  │ │    │                          │     │
│  │ └─────────────────┘ │    └──────────────────────────┘     │
│  │                     │                                       │
│  │ Volumes:            │    Volumes:                          │
│  │ ├─ /etc/istio/oauth2│    ├─ /mnt/secrets-store            │
│  │ └─ rendered-sds     │    └─ rendered-sds                   │
│  └─────────────────────┘                                       │
└────────────────────────────────────────────────────────────────┘
```

## 🎨 Kustomize Application Flow

```
kubectl apply -k k8s/apps/slop-detector/base/
                    │
                    ▼
        ┌───────────────────────┐
        │  kustomization.yaml   │
        │  Orchestrates build   │
        └───────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐      ┌──────────────────┐
│ Base         │      │ OAuth2           │
│ Resources    │      │ Resources        │
├──────────────┤      ├──────────────────┤
│ deployment   │      │ secretprovider   │
│ service      │      │ configmap        │
│ gateway      │      │ envoyfilter      │
│ virtualsvce  │      └──────────────────┘
│ certificate  │               │
└──────┬───────┘               │
       │                       │
       └───────────┬───────────┘
                   │
                   │ Apply strategic merge
                   ▼
        ┌──────────────────────┐
        │ oauth2-patch.yaml    │
        │ Modifies deployment: │
        │ ├─ Init container    │
        │ ├─ Volumes           │
        │ └─ Annotations       │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Final Manifests      │
        │ Applied to cluster   │
        └──────────────────────┘
```

## 🔑 Key Design Decisions

1. **Kustomize over Helm**: Simpler, more transparent, easier to debug
2. **Strategic Merge Patch**: Modifies base deployment without duplication
3. **Init Container**: Dynamic secret rendering at pod start
4. **Istio EnvoyFilter**: Service mesh-level authentication (no app changes)
5. **Azure Key Vault**: Centralized secret management with CSI driver
6. **SDS (Secret Discovery Service)**: Dynamic secret injection into Envoy

## ✅ Advantages of This Architecture

- ✨ **Zero Application Changes**: OAuth2 handled at mesh level
- 🔒 **Secure**: Secrets in Key Vault, not in Git
- 🎯 **Modular**: Easy to enable/disable via Kustomize
- 🚀 **Production-Ready**: Azure AD integration
- 📦 **Clean**: Base deployment remains simple
- 🔧 **Maintainable**: Clear separation of concerns
