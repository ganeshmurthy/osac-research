# OSAC MaaS Implementation Status

**Date:** 2026-10-19  
**Analysis:** Current state of MaaS in OSAC

---

## Summary: Two Different MaaS Implementations

### 1. Cluster Provisioning with MaaS (EXISTS ✅)
**Ansible role** `ocp_4_20_ai_maas` provisions OpenShift clusters with Red Hat OpenShift AI 3.5 + MaaS pre-installed.

### 2. fulfillment-service MaaS Proxy (NOT IMPLEMENTED ❌)
**Liat's proposal** for cluster-scoped MaaS management APIs in fulfillment-service does not exist yet.

---

## Evidence from Codebase

### 1. Service Flags (EXISTS)

**File:** `fulfillment-service/internal/services/flags.go`

```go
type Flags struct {
    CaaS  bool
    VMaaS bool
    BMaaS bool
    MaaS  bool  // ← Flag exists!
}

func RegisterFlags(flags *pflag.FlagSet) *Flags {
    // ...
    flags.BoolVar(&f.MaaS, "enable-maas", false,
        "Enable the MaaS (Metal as a Service) endpoints.")
    return f
}

func (f *Flags) Validate() error {
    if f.MaaS && !f.CaaS {
        return fmt.Errorf("MaaS requires CaaS")  // ← Validation exists
    }
    return nil
}
```

**Status:** ✅ Flag infrastructure exists

---

### 2. Service Tier Enum (EXISTS)

**File:** `proto/private/osac/private/v1/capabilities_service.proto`

```protobuf
enum ServiceTier {
  SERVICE_TIER_UNSPECIFIED = 0;
  SERVICE_TIER_CAAS = 1;
  SERVICE_TIER_VMAAS = 2;
  SERVICE_TIER_BMAAS = 3;
  SERVICE_TIER_MAAS = 4;  // ← Enum value exists!
}
```

**Status:** ✅ Proto enum defined

---

### 3. gRPC Service Prefixes (MISSING)

**File:** `fulfillment-service/internal/cmd/service/start/grpcserver/unknown_service_handler.go`

```go
var disabledServicePrefixes = map[string][]string{
    "CaaS": {
        "/osac.public.v1.Clusters/",
        "/osac.private.v1.Clusters/",
        // ... more cluster endpoints
    },
    "VMaaS": {
        "/osac.public.v1.ComputeInstances/",
        "/osac.private.v1.ComputeInstances/",
        // ... more VM endpoints
    },
    "BMaaS": {
        "/osac.public.v1.BareMetalInstances/",
        "/osac.private.v1.BareMetalInstances/",
        // ... more bare metal endpoints
    },
    // "MaaS": { ... }  ← NO MaaS ENTRY!
}
```

**Status:** ❌ No gRPC service prefix mappings for MaaS

---

### 4. Proto Service Definitions (MISSING)

**Searched:** `proto/private/osac/private/v1/` and `proto/public/`

**Found:**
- ✅ `clusters_service.proto`
- ✅ `compute_instances_service.proto`
- ✅ `baremetal_instances_service.proto`
- ❌ NO `models_service.proto`
- ❌ NO `subscriptions_service.proto`
- ❌ NO `maas_service.proto`

**Status:** ❌ No MaaS proto service definitions exist

---

### 5. Server Implementations (MISSING)

**Searched:** `fulfillment-service/internal/servers/`

**Found:**
- ✅ `clusters_server.go` / `private_clusters_server.go`
- ✅ `compute_instances_server.go` / `private_compute_instances_server.go`
- ✅ `baremetal_instances_server.go` / `private_baremetal_instances_server.go`
- ❌ NO `models_server.go`
- ❌ NO `subscriptions_server.go`

**Status:** ❌ No MaaS server implementations exist

---

## What Liat's Proposal Means

Liat suggested cluster-scoped MaaS proxy routes:

```
GET    /api/fulfillment/v1/clusters/{cluster_id}/maas/models
POST   /api/fulfillment/v1/clusters/{cluster_id}/maas/models
DELETE /api/fulfillment/v1/clusters/{cluster_id}/maas/models/{name}

GET    /api/fulfillment/v1/clusters/{cluster_id}/maas/subscriptions
POST   /api/fulfillment/v1/clusters/{cluster_id}/maas/subscriptions
...
```

**This is NEW WORK** - these endpoints don't exist in OSAC yet.

---

## Implementation Plan

### Phase 1: Proto Definitions

**Create new proto files:**

```
proto/private/osac/private/v1/
├── models_service.proto          ← NEW
├── model_type.proto              ← NEW
├── subscriptions_service.proto   ← NEW
├── subscription_type.proto       ← NEW
├── maas_keys_service.proto       ← NEW (for API keys)
└── maas_key_type.proto           ← NEW
```

**Define gRPC services:**

```protobuf
// models_service.proto
service Models {
  rpc List(ModelsListRequest) returns (ModelsListResponse) {
    option (google.api.http) = {
      get: "/api/private/v1/clusters/{cluster_id}/maas/models"
    };
  }
  
  rpc Create(ModelsCreateRequest) returns (ModelsCreateResponse) {
    option (google.api.http) = {
      post: "/api/private/v1/clusters/{cluster_id}/maas/models"
      body: "*"
    };
  }
  
  rpc Delete(ModelsDeleteRequest) returns (ModelsDeleteResponse) {
    option (google.api.http) = {
      delete: "/api/private/v1/clusters/{cluster_id}/maas/models/{name}"
    };
  }
}
```

---

### Phase 2: Fulfillment Service Proxy

**Create proxy server:**

```
fulfillment-service/internal/servers/
├── models_server.go              ← NEW (proxy)
├── private_models_server.go      ← NEW (proxy)
├── subscriptions_server.go       ← NEW (proxy)
├── private_subscriptions_server.go ← NEW (proxy)
```

**Proxy implementation pattern:**

```go
// private_models_server.go
func (s *PrivateModelsServer) List(
    ctx context.Context,
    req *pb.ModelsListRequest,
) (*pb.ModelsListResponse, error) {
    // 1. Validate cluster exists and user has access
    cluster, err := s.validateClusterAccess(ctx, req.ClusterId)
    if err != nil {
        return nil, err
    }
    
    // 2. Proxy to backend (AI Grid MVP or OSAC native)
    if s.config.MaaSBackend == "ai_grid_mvp" {
        return s.aiGridClient.ListModels(ctx, req.ClusterId)
    } else if s.config.MaaSBackend == "osac_native" {
        return s.ansibleMaaS.ListModels(ctx, cluster)
    }
    
    return nil, status.Error(codes.Unimplemented, "MaaS backend not configured")
}
```

---

### Phase 3: Backend Implementation

**Option A: AI Grid MVP Backend (Temporary)**

```go
// internal/maas/aigrid/client.go
type AIGridClient struct {
    baseURL string
    httpClient *http.Client
}

func (c *AIGridClient) ListModels(ctx context.Context, clusterID string) (*pb.ModelsListResponse, error) {
    // Call ai-grid-cloud-provider-poc REST API
    resp, err := c.httpClient.Get(fmt.Sprintf("%s/api/clusters/%s/models", c.baseURL, clusterID))
    // ... convert response to proto
}
```

**Option B: OSAC Native Backend (Final)**

```go
// internal/maas/ansible/models.go
type AnsibleMaaSProvider struct {
    ansibleRunner *ansible.Runner
}

func (p *AnsibleMaaSProvider) ListModels(ctx context.Context, cluster *Cluster) (*pb.ModelsListResponse, error) {
    // Run Ansible playbook to query model deployments
    playbook := "list-models.yml"
    vars := map[string]interface{}{
        "cluster_name": cluster.Name,
        "cluster_kubeconfig": cluster.Kubeconfig,
    }
    
    result, err := p.ansibleRunner.Run(ctx, playbook, vars)
    // ... convert result to proto
}
```

---

### Phase 4: Update Service Handlers

**Register MaaS services:**

```go
// fulfillment-service/internal/cmd/service/start/grpcserver/register_servers.go

func registerServers(grpcServer *grpc.Server, deps *Dependencies) error {
    // ... existing CaaS, VMaaS, BMaaS registrations ...
    
    if deps.Services.MaaS {
        // Register MaaS services
        pb.RegisterModelsServer(grpcServer, servers.NewModelsServer(deps))
        pb.RegisterSubscriptionsServer(grpcServer, servers.NewSubscriptionsServer(deps))
        pb.RegisterMaaSKeysServer(grpcServer, servers.NewMaaSKeysServer(deps))
    }
    
    return nil
}
```

**Add MaaS service prefixes:**

```go
// unknown_service_handler.go
var disabledServicePrefixes = map[string][]string{
    "CaaS": { /* ... */ },
    "VMaaS": { /* ... */ },
    "BMaaS": { /* ... */ },
    "MaaS": {  // ← ADD THIS
        "/osac.public.v1.Models/",
        "/osac.public.v1.Subscriptions/",
        "/osac.public.v1.MaaSKeys/",
        "/osac.private.v1.Models/",
        "/osac.private.v1.Subscriptions/",
        "/osac.private.v1.MaaSKeys/",
    },
}
```

---

## The Answer to Your Question

> Does OSAC fulfillment-service act as a MaaS proxy?

**NO, not currently.**

BUT:

1. ✅ The infrastructure exists (flags, service tier enum)
2. ✅ The pattern is well-established (CaaS, VMaaS, BMaaS all work this way)
3. ❌ The actual MaaS services are not implemented yet
4. 🎯 **Liat's proposal is the implementation plan**

---

## Timeline Estimate

Assuming AI Grid MVP protos as the contract:

**Week 1-2:** Proto definitions
- Define Models, Subscriptions, Keys services
- Generate Go code

**Week 3-4:** Proxy implementation
- Create server stubs
- Implement cluster-scoped routing
- Add authorization checks

**Week 5-6:** AI Grid MVP backend (temporary)
- HTTP client to ai-grid-cloud-provider-poc
- Proto ↔ REST translation

**Week 7-10:** OSAC native backend (final)
- Ansible playbook implementation
- Replace AI Grid MVP backend

**Total:** ~10 weeks to full OSAC-native MaaS

---

## Key Architectural Points

### 1. Cluster-Scoped Design ✅
```
/api/fulfillment/v1/clusters/{cluster_id}/maas/*
```
This is the RIGHT design because:
- Models are deployed TO clusters
- Subscriptions authorize cluster access
- Keys authenticate clusters

### 2. Proxy Pattern ✅
```
UI → fulfillment-service → MaaS backend
```
This allows:
- Backend swapping (AI Grid MVP → OSAC native)
- Tenant isolation enforcement
- Unified API surface

### 3. No MaaS Prefix Overlap ✅
MaaS services are separate from CaaS/VMaaS/BMaaS, so:
- Can be enabled/disabled independently
- No conflicts with existing endpoints

---

## Recommendation

**Start with AI Grid MVP contract, implement in OSAC:**

1. Copy AI Grid MVP proto definitions to OSAC proto repo
2. Generate Go code
3. Implement fulfillment-service proxy servers
4. Point at AI Grid MVP backend initially
5. Replace with Ansible implementation later

This gives us:
- ✅ Proven API design (validated by AI Grid MVP)
- ✅ Gradual migration path
- ✅ No big-bang rewrite
- ✅ Backend flexibility

---

**Status:** Ready to implement, not currently implemented.

---

## Appendix: Existing MaaS Cluster Provisioning

**Location:** `osac-aap/collections/ansible_collections/osac/templates/roles/ocp_4_20_ai_maas/`

**Template:** `ocp-4-20-ai-maas` (OpenShift 4.21 with RHOAI 3.5 + MaaS)

**What it installs on the cluster:**
- Red Hat OpenShift AI 3.5 operators
- MaaS governance layer (auth, rate limiting, API keys)
- Per-tenant gateways (multi-tenant support)
- Observability stack (COO + OTel)
- Optional external model access

**Key parameter:**
```yaml
enable_maas: true  # default - installs MaaS governance layer
```

**Architecture:**
```
User requests cluster with ocp-4-20-ai-maas template
    ↓
OSAC provisions OpenShift 4.21 cluster
    ↓
Ansible role: ocp_4_20_ai_maas
    ↓
    • Install RHOAI operators
    • Configure MaaS governance (enable_maas: true)
    • Create per-tenant gateways
    • Configure OIDC (optional)
    • Install observability
    ↓
Cluster ready with MaaS running locally
```

**This is DIFFERENT from Liat's proposal:**
- This installs MaaS ON the cluster (cluster-local)
- Liat's proposal is centralized MaaS management FROM fulfillment-service

**They are complementary:**
1. Ansible role provisions cluster with MaaS installed
2. fulfillment-service APIs manage models/subscriptions on those clusters
