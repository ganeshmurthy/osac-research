# AI Grid MVP to OSAC gRPC API Integration Design

**Document Version:** 2.0  
**Date:** 2026-10-16  
**Status:** Complete gRPC Integration Design

## Executive Summary

This document provides a comprehensive design for integrating AI Grid MVP's gRPC APIs into OSAC's gRPC fulfillment architecture. Both systems use Protocol Buffers and follow similar resource patterns, making integration straightforward from an API perspective.

**Key Findings:**

1. **API Alignment:** Both systems use gRPC with `id/metadata/spec/status` resource patterns
2. **New Services Required:** 2 completely new services (AIModels, AISubscriptions)
3. **Service Extensions:** 1 existing service extension (Tenants → optional OIDC embedding)
4. **New Integration Layer:** ACM Hub integration for multi-cluster workload distribution
5. **Provisioning Bridge:** OSAC-provisioned clusters → ACM registration → AI Grid availability

**Integration Complexity:** Medium

- **Proto Design:** Low complexity (patterns align)
- **Service Implementation:** Medium complexity (new controllers required)
- **ACM Integration:** High complexity (bridge Ansible → ACM)

---

## Table of Contents

1. [API Comparison Overview](#api-comparison-overview)
2. [Service-by-Service Analysis](#service-by-service-analysis)
3. [Integration Architecture](#integration-architecture)
4. [Proto Design Recommendations](#proto-design-recommendations)
5. [Controller & Reconciliation Design](#controller--reconciliation-design)
6. [ACM Integration Layer](#acm-integration-layer)
7. [Migration & Rollout Plan](#migration--rollout-plan)
8. [Open Questions & Decisions](#open-questions--decisions)

---

## API Comparison Overview

### Service Inventory

| Category | OSAC Services | AI Grid MVP Services | Integration Action |
|----------|---------------|----------------------|-------------------|
| **Cluster Management** | Clusters (full lifecycle) | GridClusters (enrollment only) | Extend or separate |
| **Tenant Management** | Tenants (basic) | Tenants (with OIDC IdP) | Extend existing |
| **AI/ML Workloads** | ❌ None | AIModels, AISubscriptions | **Add new services** |
| **Compute** | ComputeInstances, BareMetalInstances, etc. | ❌ None | Keep existing |
| **Networking** | 8 services | ❌ None | Keep existing |
| **Storage** | 6 services | ❌ None | Keep existing |
| **IAM** | 7 services | ❌ None | Keep existing |
| **Catalog** | 13 services | ❌ None | Keep existing |
| **System** | 4 services | Health (simple check) | Keep existing |

**Total Integration Work:**
- **Add:** 2-3 new services (AIModels, AISubscriptions, optionally GridClusters)
- **Extend:** 1 service (Tenants with optional IdP field)
- **Bridge:** ACM integration layer
- **Keep:** 38 existing OSAC services unchanged

---

## Service-by-Service Analysis

### 1. Clusters vs GridClusters

#### OSAC Clusters Service

```protobuf
service Clusters {
  rpc List(ListClustersRequest) returns (ListClustersResponse);
  rpc Get(GetClusterRequest) returns (Cluster);
  rpc Create(CreateClusterRequest) returns (Cluster);
  rpc Update(UpdateClusterRequest) returns (Cluster);
  rpc Delete(DeleteClusterRequest) returns (DeleteClusterResponse);
  rpc Signal(SignalClusterRequest) returns (Cluster);
}

message Cluster {
  string id = 1;
  Metadata metadata = 2;
  ClusterSpec spec = 3;
  ClusterStatus status = 4;
}

message ClusterSpec {
  string template = 1;              // Ansible template
  map<string, string> template_parameters = 2;
  repeated NodeSet node_sets = 3;   // Bare metal instance types
  // ... other provisioning fields
}

message ClusterStatus {
  State state = 1;                  // PENDING, READY, FAILED
  string api_url = 2;
  string console_url = 3;
  repeated Condition conditions = 4;
}
```

**Purpose:** Full cluster lifecycle (provision → ready → delete via Ansible)

#### AI Grid MVP GridClusters Service

```protobuf
service GridClusters {
  rpc List(ListGridClustersRequest) returns (ListGridClustersResponse);
  rpc Get(GetGridClusterRequest) returns (GridCluster);
  rpc Enroll(EnrollGridClusterRequest) returns (GridCluster);
  rpc Update(UpdateGridClusterRequest) returns (GridCluster);
  rpc ListLocations(ListLocationsRequest) returns (ListLocationsResponse);
  rpc Signal(SignalGridClusterRequest) returns (GridCluster);
}

message GridCluster {
  string id = 1;                    // ManagedCluster name
  Metadata metadata = 2;
  GridClusterSpec spec = 3;
  GridClusterStatus status = 4;
}

message GridClusterSpec {
  string location = 1;              // From ACM label
  bool ai_grid_enabled = 2;         // Enrollment flag
  bool provisioned = 3;             // Ready for AI workloads
}

message GridClusterStatus {
  ClusterState state = 1;           // READY, OFFLINE, UNKNOWN
  string provisioning_state = 2;
  repeated Condition conditions = 3; // From ACM
  google.protobuf.Timestamp last_observed_time = 4;
}
```

**Purpose:** Lightweight enrollment/labeling of **existing** ACM ManagedClusters

#### Key Differences

| Aspect | OSAC Clusters | AI Grid GridClusters |
|--------|---------------|----------------------|
| **Lifecycle** | Full (Create → Delete) | Read-only + Enrollment |
| **Create** | ✅ Provisions new cluster | ❌ Clusters must exist |
| **Delete** | ✅ Deprovisions cluster | ❌ Cannot delete |
| **Provisioning** | Ansible/AAP | ACM (external) |
| **Data Source** | PostgreSQL (fulfillment DB) | ACM Hub API |
| **Purpose** | Infrastructure provisioning | Workload enrollment |

#### Integration Options

**Option A: Extend OSAC Clusters Service**

Add AI Grid fields to existing Cluster resource:

```protobuf
message ClusterSpec {
  // Existing OSAC fields
  string template = 1;
  map<string, string> template_parameters = 2;
  repeated NodeSet node_sets = 3;
  
  // AI Grid fields (optional)
  string location = 10;             // Geographic location
  bool ai_grid_enabled = 11;        // Enrolled in AI Grid
  bool ai_grid_provisioned = 12;    // Ready for AI workloads
}

message ClusterStatus {
  // Existing OSAC fields
  State state = 1;
  string api_url = 2;
  string console_url = 3;
  repeated Condition conditions = 4;
  
  // AI Grid fields (optional)
  string acm_managed_cluster_name = 10;  // Registered in ACM Hub
  google.protobuf.Timestamp acm_last_seen = 11;
}
```

Add new RPC:

```protobuf
service Clusters {
  // ... existing RPCs ...
  
  // Enroll cluster in AI Grid
  rpc Enroll(EnrollClusterRequest) returns (Cluster) {
    option (google.api.http) = {
      post: "/api/private/v1/clusters/{id}:enroll"
      body: "*"
      additional_bindings {
        post: "/api/fulfillment/v1/clusters/{id}:enroll"
        body: "*"
      }
    };
  }
  
  // List eligible AI Grid locations
  rpc ListLocations(ListClusterLocationsRequest) returns (ListClusterLocationsResponse) {
    option (google.api.http) = {
      get: "/api/private/v1/clusters/locations"
      additional_bindings {
        get: "/api/fulfillment/v1/clusters/locations"
      }
    };
  }
}
```

**Pros:**
- Unified cluster API
- Single source of truth
- Simple for users (one cluster resource)

**Cons:**
- Mixes provisioning and enrollment concerns
- ACM fields irrelevant for non-AI-Grid clusters
- Tighter coupling

**Option B: Separate GridClusters Service**

Keep GridClusters as a separate service:

```protobuf
// New service: osac/aigrid/v1/grid_clusters_service.proto
service GridClusters {
  rpc List(ListGridClustersRequest) returns (ListGridClustersResponse);
  rpc Get(GetGridClusterRequest) returns (GridCluster);
  rpc Enroll(EnrollGridClusterRequest) returns (GridCluster);
  rpc Update(UpdateGridClusterRequest) returns (GridCluster);
  rpc ListLocations(ListLocationsRequest) returns (ListLocationsResponse);
  rpc Signal(SignalGridClusterRequest) returns (GridCluster);
}
```

Relate via annotation:

```protobuf
message GridCluster {
  string id = 1;  // ManagedCluster name
  Metadata metadata = 2;
  GridClusterSpec spec = 3;
  GridClusterStatus status = 4;
}

// metadata.annotations:
//   "osac.openshift.io/cluster-id": "<OSAC-cluster-id>"
//   "osac.openshift.io/tenant": "<tenant-id>"
```

**Pros:**
- Clean separation of concerns
- AI Grid features don't pollute core Clusters
- Independent evolution

**Cons:**
- Two cluster concepts (confusing?)
- Relationship management required
- More services to maintain

**Recommendation:** **Option B (Separate Service)**

Rationale:
- OSAC Clusters is about **provisioning infrastructure**
- GridClusters is about **enrolling for workloads**
- Different lifecycles, different data sources
- Option A would create a "god resource" with too many concerns

---

### 2. Tenants Service Comparison

#### OSAC Tenants Service (Current)

```protobuf
service Tenants {
  rpc List(ListTenantsRequest) returns (ListTenantsResponse);
  rpc Get(GetTenantRequest) returns (Tenant);
  rpc Create(CreateTenantRequest) returns (Tenant);
  rpc Update(UpdateTenantRequest) returns (Tenant);
  rpc Delete(DeleteTenantRequest) returns (DeleteTenantResponse);
  rpc Signal(SignalTenantRequest) returns (Tenant);
}

message Tenant {
  string id = 1;
  Metadata metadata = 2;
  TenantSpec spec = 3;
  TenantStatus status = 4;
}

message TenantSpec {
  repeated string domains = 1;
  string organization = 2;
  string contact_email = 3;
  // No OIDC configuration
}
```

#### AI Grid MVP Tenants Service (Proposed)

```protobuf
message TenantSpec {
  repeated string domains = 1;
  string organization = 2;
  string contact_email = 3;
  
  // NEW: Embedded OIDC identity provider (optional)
  IdentityProvider identity_provider = 10;
}

message IdentityProvider {
  string title = 1;
  string description = 2;
  bool enabled = 3;
  OIDCConfig config = 4;
}

message OIDCConfig {
  string client_id = 1;
  SecretReference client_secret_secret = 2;
  string issuer = 3;
  string authorization_url = 4;
  string token_url = 5;
  string default_scopes = 6;
  string user_info_url = 7;
  string jwks_url = 8;
  string logout_url = 9;
  bool validate_signature = 10;
}

message SecretReference {
  string name = 1;
  string namespace = 2;
  string key = 3;
}
```

#### Integration Recommendation

**Extend OSAC Tenants with Optional IdP Field**

```protobuf
// File: osac/private/v1/tenant_type.proto
message TenantSpec {
  // Existing fields
  repeated string domains = 1;
  string organization = 2;
  string contact_email = 3;
  
  // AI Grid extension (optional)
  // When set, creates IdentityProvider atomically with Tenant
  optional IdentityProvider identity_provider = 10;
}
```

**Implementation Notes:**
1. Field is **optional** - backward compatible
2. When `identity_provider` is set:
   - Create validates OIDC config
   - Creates `IdentityProvider` CR + `Secret` atomically
   - Tenant status tracks IdP readiness
3. When `identity_provider` is null:
   - Behaves like current OSAC Tenants
   - Separate IdentityProviders API still available

**Alternative:** Keep OSAC's separate `IdentityProviders` service and have UI orchestrate the two API calls. AI Grid MVP's atomic operation is a convenience, not a hard requirement.

**Recommendation:** **Extend with optional field** for better UX (single-step onboarding)

---

### 3. AIModels Service (New)

**Purpose:** Deploy AI models to multiple geographic locations via ACM

**No OSAC Equivalent** - This is a completely new capability.

#### Proto Design

```protobuf
// File: osac/aigrid/v1/ai_models_service.proto
syntax = "proto3";

package osac.aigrid.v1;

service AIModels {
  rpc List(ListAIModelsRequest) returns (ListAIModelsResponse);
  rpc Get(GetAIModelRequest) returns (AIModel);
  rpc Create(CreateAIModelRequest) returns (AIModel);
  rpc Update(UpdateAIModelRequest) returns (AIModel);
  rpc Delete(DeleteAIModelRequest) returns (DeleteAIModelResponse);
  rpc Signal(SignalAIModelRequest) returns (AIModel);
}

message AIModel {
  string id = 1;
  Metadata metadata = 2;
  AIModelSpec spec = 3;
  AIModelStatus status = 4;
}

message AIModelSpec {
  string display_name = 1;
  string model_uri = 2;              // hf://ibm-granite/granite-3.0-8b
  string model_name = 3;             // For MaaS registration
  string runtime_image = 4;          // vLLM container image
  int32 replicas = 5;
  ResourceRequirements resources = 6;
  repeated string runtime_args = 7;
  repeated string locations = 8;    // AI Grid deployment locations
}

message ResourceRequirements {
  string cpu = 1;                    // "2" or "2000m"
  string memory = 2;                 // "4Gi"
  int32 gpu_count = 3;
  string gpu_type = 4;
}

message AIModelStatus {
  State state = 1;
  string status_message = 2;
  repeated Condition conditions = 3;
  repeated LocationDeploymentStatus location_status = 4;
  int32 ready_replicas = 5;
  int32 desired_replicas = 6;
  ModelRegistrationStatus registration_status = 7;
}

message LocationDeploymentStatus {
  string location = 1;
  string cluster = 2;                // Which cluster in this location
  State state = 3;
  int32 ready_replicas = 4;
  int32 desired_replicas = 5;
  google.protobuf.Timestamp last_observed_time = 6;
}

message ModelRegistrationStatus {
  bool registered = 1;               // Registered with MaaS
  string model_ref_name = 2;
  google.protobuf.Timestamp registered_at = 3;
}
```

#### Created Kubernetes Resources

When an AIModel is created, the controller generates:

```yaml
# 1. LLMInferenceService (vLLM deployment)
apiVersion: serving.kserve.io/v1beta1
kind: LLMInferenceService
metadata:
  name: granite-3-8b
  namespace: maas
spec:
  modelUri: hf://ibm-granite/granite-3.0-8b
  runtimeImage: quay.io/rh-aiservices-bu/vllm-openai-ubi9:0.4.2
  replicas: 1
  resources:
    requests:
      cpu: "2"
      memory: "4Gi"
    limits:
      nvidia.com/gpu: "0"

---
# 2. MaaSModelRef (model registration)
apiVersion: maas.redhat.com/v1alpha1
kind: MaaSModelRef
metadata:
  name: granite-3-8b
  namespace: maas
spec:
  modelName: ibm-granite/granite-3.0-8b

---
# 3. ACM Placement (cluster selection)
apiVersion: cluster.open-cluster-management.io/v1beta1
kind: Placement
metadata:
  name: granite-3-8b
  namespace: maas
spec:
  predicates:
    - requiredClusterSelector:
        labelSelector:
          matchExpressions:
            - key: ai-grid/enabled
              operator: In
              values: ["true"]
            - key: ai-grid/provisioned
              operator: In
              values: ["true"]
            - key: location
              operator: In
              values: ["site1", "site2", "site3"]

---
# 4. ACM ManifestWorkReplicaSet (workload distribution)
apiVersion: work.open-cluster-management.io/v1alpha1
kind: ManifestWorkReplicaSet
metadata:
  name: granite-3-8b
  namespace: maas
spec:
  placementRefs:
    - name: granite-3-8b
  manifestWorkTemplate:
    manifests:
      - <<LLMInferenceService from above>>
```

#### Controller Ownership

**Owner:** New `osac-aigrid-controller` (runs in OSAC management cluster)

**Responsibilities:**
1. Watch AIModel CRs in fulfillment database
2. Create/update/delete ACM Placement + ManifestWorkReplicaSet
3. Create/update/delete MaaSModelRef
4. Aggregate status from ACM ManifestWork reports
5. Signal status back to fulfillment API via Signal RPC

---

### 4. AISubscriptions Service (New)

**Purpose:** Manage MaaS subscriptions with token rate limits

**No OSAC Equivalent** - New capability (closest: Quotas service, but different domain)

#### Proto Design

```protobuf
// File: osac/aigrid/v1/ai_subscriptions_service.proto
syntax = "proto3";

package osac.aigrid.v1;

service AISubscriptions {
  rpc List(ListAISubscriptionsRequest) returns (ListAISubscriptionsResponse);
  rpc Get(GetAISubscriptionRequest) returns (AISubscriptionInfo);  // Note: returns Info
  rpc Create(CreateAISubscriptionRequest) returns (AISubscription);
  rpc Update(UpdateAISubscriptionRequest) returns (AISubscription);
  rpc Delete(DeleteAISubscriptionRequest) returns (DeleteAISubscriptionResponse);
  rpc Signal(SignalAISubscriptionRequest) returns (AISubscription);
}

message AISubscription {
  string id = 1;
  Metadata metadata = 2;
  AISubscriptionSpec spec = 3;
  AISubscriptionStatus status = 4;
}

message AISubscriptionSpec {
  string display_name = 1;
  int32 priority = 2;                // -1,000,000 to +1,000,000
  Owner owner = 3;
  repeated ModelReference model_refs = 4;
  bool create_auth_policy = 5;       // Auto-generate MaaSAuthPolicy
  MeteringMetadata metering_metadata = 6;
}

message Owner {
  repeated Group groups = 1;
  repeated User users = 2;
}

message Group {
  string name = 1;
}

message User {
  string name = 1;
}

message ModelReference {
  string name = 1;                   // References AIModel.id
  string namespace = 2;
  repeated TokenRateLimit token_rate_limits = 3;
}

message TokenRateLimit {
  int64 limit = 1;                   // 1 to 1,000,000,000
  google.protobuf.Duration window = 2;  // 1h, 5m, 30s
}

message MeteringMetadata {
  string customer_id = 1;
  string subscription_id = 2;
  string cost_center = 3;
  map<string, string> tags = 4;
}

message AISubscriptionStatus {
  State state = 1;
  string phase = 2;                  // "Ready", "Pending"
  string status_message = 3;
  repeated Condition conditions = 4;
  string generated_policy_name = 5;  // If create_auth_policy=true
  TokenUsageStats token_usage = 6;
}

message TokenUsageStats {
  int64 total_tokens = 1;
  map<string, int64> tokens_per_model = 2;
  google.protobuf.Timestamp last_usage_time = 3;
}

// Extended response for Get RPC
message AISubscriptionInfo {
  AISubscription subscription = 1;
  repeated AIModel models = 2;       // Joined from AIModels
  AuthPolicy auth_policy = 3;        // Auto-generated policy
  MeteringMetadata metering_metadata = 4;
}

message AuthPolicy {
  string name = 1;
  string namespace = 2;
  repeated string subjects = 3;
  repeated string model_refs = 4;
  bool auto_generated = 5;
}
```

#### Created Kubernetes Resources

```yaml
# 1. MaaSSubscription
apiVersion: maas.redhat.com/v1alpha1
kind: MaaSSubscription
metadata:
  name: engineering-team
  namespace: maas
spec:
  displayName: Engineering Team
  priority: 0
  owner:
    groups:
      - name: engineering
  modelRefs:
    - name: granite-3-8b
      namespace: maas
      tokenRateLimits:
        - limit: 100000
          window: 1h

---
# 2. MaaSAuthPolicy (if create_auth_policy: true)
apiVersion: maas.redhat.com/v1alpha1
kind: MaaSAuthPolicy
metadata:
  name: engineering-team-policy
  namespace: maas
  annotations:
    osac.aigrid.io/auto-generated: "true"
    osac.aigrid.io/subscription: "engineering-team"
spec:
  subjects:
    groups:
      - name: engineering
  modelRefs:
    - name: granite-3-8b
      namespace: maas
```

#### Controller Ownership

**Owner:** Same `osac-aigrid-controller`

**Responsibilities:**
1. Watch AISubscription CRs in fulfillment database
2. Validate model references exist
3. Create/update/delete MaaSSubscription CRs
4. Optionally create/delete MaaSAuthPolicy (if `create_auth_policy=true`)
5. Query metering service for token usage stats
6. Signal status back to fulfillment API

---

## Integration Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         OSAC Platform                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 Fulfillment API (gRPC)                   │  │
│  │                                                          │  │
│  │  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │  │
│  │  │ OSAC Services │  │ AI Grid MVP   │  │ New GridClus│ │  │
│  │  │ (38 existing) │  │ AIModels      │  │ ters Service│ │  │
│  │  │               │  │ AISubscript.  │  │ (optional)  │ │  │
│  │  │ • Clusters    │  │               │  │             │ │  │
│  │  │ • Tenants+IdP │  │               │  │             │ │  │
│  │  │ • VMs/Network │  │               │  │             │ │  │
│  │  └───────────────┘  └───────────────┘  └─────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             │ PostgreSQL                        │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               Fulfillment Database                       │  │
│  │  • Cluster records                                       │  │
│  │  • Tenant records (with optional IdP)                    │  │
│  │  • AIModel records                                       │  │
│  │  • AISubscription records                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             │ Watch                             │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            osac-operator (existing)                      │  │
│  │  • Cluster reconciliation (Ansible/AAP)                  │  │
│  │  • Tenant reconciliation                                 │  │
│  │  • VM reconciliation                                     │  │
│  │  • Network reconciliation                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        osac-aigrid-controller (NEW)                      │  │
│  │  • Watch AIModel CRs in database                         │  │
│  │  • Watch AISubscription CRs in database                  │  │
│  │  • Sync to ACM Hub                                       │  │
│  │  • Create ACM Placement + ManifestWorkReplicaSet         │  │
│  │  • Create MaaSModelRef + MaaSSubscription CRs            │  │
│  │  • Aggregate status from ACM                             │  │
│  │  • Signal RPC back to Fulfillment API                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
      ┌───────────────────────────────────────────────────────┐
      │              ACM Hub Cluster                          │
      │                                                       │
      │  ┌─────────────────────────────────────────────────┐  │
      │  │  ManagedCluster CRs (from OSAC provisioning)    │  │
      │  │    metadata.labels:                             │  │
      │  │      ai-grid/enabled: "true"                    │  │
      │  │      ai-grid/provisioned: "true"                │  │
      │  │      location: "us-east-1"                      │  │
      │  │    annotations:                                 │  │
      │  │      osac.openshift.io/cluster-id: "cluster-123"│  │
      │  └─────────────────────────────────────────────────┘  │
      │                                                       │
      │  ┌─────────────────────────────────────────────────┐  │
      │  │  Placement CRs (per AIModel)                    │  │
      │  │    Selects clusters by labels + locations       │  │
      │  └─────────────────────────────────────────────────┘  │
      │                                                       │
      │  ┌─────────────────────────────────────────────────┐  │
      │  │  ManifestWorkReplicaSet CRs                     │  │
      │  │    Distributes LLMInferenceService to clusters  │  │
      │  └─────────────────────────────────────────────────┘  │
      │                                                       │
      └───────────────────────────────────────────────────────┘
                              │
                              │ Distributes workloads
                              ▼
      ┌───────────────────────────────────────────────────────┐
      │        Spoke Clusters (OSAC-provisioned)              │
      │                                                       │
      │  Site 1            Site 2            Site 3           │
      │  ┌──────────┐     ┌──────────┐     ┌──────────┐      │
      │  │ vLLM Pod │     │ vLLM Pod │     │ vLLM Pod │      │
      │  │ Granite  │     │ Granite  │     │ Granite  │      │
      │  └──────────┘     └──────────┘     └──────────┘      │
      │                                                       │
      │  ┌─────────────────────────────────────────────────┐  │
      │  │ MaaS Platform (per cluster)                     │  │
      │  │  • MaaSSubscription enforcement                 │  │
      │  │  • MaaSAuthPolicy authorization                 │  │
      │  │  • Token rate limiting                          │  │
      │  └─────────────────────────────────────────────────┘  │
      │                                                       │
      └───────────────────────────────────────────────────────┘
```

### Data Flow

#### Model Deployment Flow

1. **User creates AIModel via Fulfillment API**
   ```
   POST /api/fulfillment/v1/ai_models
   {
     "object": {
       "id": "granite-3-8b",
       "spec": {
         "model_uri": "hf://...",
         "locations": ["site1", "site2"]
       }
     }
   }
   ```

2. **Fulfillment API writes to database**
   - AIModel record created with state=PENDING

3. **osac-aigrid-controller watches database**
   - Detects new AIModel
   - Validates locations exist in GridClusters
   - Validates resources

4. **Controller creates ACM resources**
   - Creates Placement CR (select clusters by location)
   - Creates ManifestWorkReplicaSet CR (distribute LLMInferenceService)
   - Creates MaaSModelRef CR (register model)

5. **ACM distributes workloads**
   - Placement evaluates to concrete cluster list
   - ManifestWorkReplicaSet creates ManifestWork per cluster
   - ManifestWork applies LLMInferenceService to spoke cluster

6. **Controller aggregates status**
   - Watches ManifestWork status feedback
   - Calculates ready_replicas, desired_replicas per location
   - Determines overall state (READY when all locations ready)

7. **Controller signals back to API**
   ```
   Signal(SignalAIModelRequest{
     id: "granite-3-8b",
     status: {
       state: READY,
       ready_replicas: 2,
       location_status: [...]
     }
   })
   ```

8. **API updates database**
   - AIModel status updated
   - User sees READY state in UI

---

## Proto Design Recommendations

### Package Structure

```
proto/
├── private/
│   └── osac/
│       ├── private/v1/               # Existing OSAC services
│       │   ├── clusters_service.proto
│       │   ├── tenants_service.proto
│       │   └── ...
│       └── aigrid/v1/                # NEW: AI Grid services
│           ├── common/
│           │   ├── metadata.proto    # Shared metadata type
│           │   ├── state.proto       # Shared state enum
│           │   └── condition.proto   # Shared condition type
│           ├── grid_clusters_service.proto
│           ├── grid_cluster_type.proto
│           ├── ai_models_service.proto
│           ├── ai_model_type.proto
│           ├── ai_subscriptions_service.proto
│           └── ai_subscription_type.proto
├── public/
│   └── osac/
│       ├── public/v1/                # Auto-generated from private
│       └── aigrid/v1/                # Auto-generated from private
└── gen/
    └── (generated Go/Python/etc.)
```

### Common Type Sharing

AI Grid services should reuse OSAC's existing common types where possible:

```protobuf
// Reuse from osac/private/v1/common/
import "osac/private/v1/common/metadata.proto";
import "osac/private/v1/common/state.proto";
import "osac/private/v1/common/condition.proto";

// Or define in osac/aigrid/v1/common/ if AI Grid-specific
```

**Recommendation:** Reuse OSAC common types to maintain consistency.

---

### Extended Tenants Service

**File:** `osac/private/v1/tenants_service.proto` (modify existing)

```protobuf
syntax = "proto3";

package osac.private.v1;

import "osac/private/v1/tenant_type.proto";
import "osac/aigrid/v1/identity_provider_type.proto";  // NEW

service Tenants {
  // Existing RPCs unchanged
  rpc List(ListTenantsRequest) returns (ListTenantsResponse);
  rpc Get(GetTenantRequest) returns (Tenant);
  rpc Create(CreateTenantRequest) returns (Tenant);
  rpc Update(UpdateTenantRequest) returns (Tenant);
  rpc Delete(DeleteTenantRequest) returns (DeleteTenantResponse);
  rpc Signal(SignalTenantRequest) returns (Tenant);
}

// No service changes needed - just extend TenantSpec
```

**File:** `osac/private/v1/tenant_type.proto` (modify existing)

```protobuf
syntax = "proto3";

package osac.private.v1;

import "osac/aigrid/v1/identity_provider_type.proto";

message TenantSpec {
  // Existing fields
  repeated string domains = 1;
  string organization = 2;
  string contact_email = 3;
  
  // NEW: Optional embedded OIDC IdP
  // When set, creates IdentityProvider + Secret atomically with Tenant
  optional osac.aigrid.v1.IdentityProvider identity_provider = 10;
}
```

**File:** `osac/aigrid/v1/identity_provider_type.proto` (new)

```protobuf
syntax = "proto3";

package osac.aigrid.v1;

message IdentityProvider {
  string title = 1;
  string description = 2;
  bool enabled = 3;
  OIDCConfig config = 4;
}

message OIDCConfig {
  string client_id = 1;
  SecretReference client_secret_secret = 2;
  string issuer = 3;
  string authorization_url = 4;
  string token_url = 5;
  string default_scopes = 6;
  string user_info_url = 7;
  string jwks_url = 8;
  string logout_url = 9;
  bool validate_signature = 10;
}

message SecretReference {
  string name = 1;
  string namespace = 2;
  string key = 3;
}
```

**Backward Compatibility:**
- Field is **optional** - old clients can ignore it
- Old Tenant creations (without IdP) work unchanged
- New Tenant creations (with IdP) are atomic

---

## Controller & Reconciliation Design

### New Component: osac-aigrid-controller

**Location:** `osac-operator/controllers/aigrid/`

**Purpose:** Bridge OSAC Fulfillment API ↔ ACM Hub ↔ MaaS Platform

#### Architecture

```go
// pkg/controllers/aigrid/aimodel_controller.go
type AIModelReconciler struct {
  client.Client
  Scheme          *runtime.Scheme
  FulfillmentAPI  fulfillment.Client    // gRPC client to Fulfillment API
  ACMHubClient    acm.Client            // Kubernetes client for ACM Hub
  Recorder        record.EventRecorder
}

func (r *AIModelReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
  // 1. Fetch AIModel from Fulfillment API
  model, err := r.FulfillmentAPI.AIModels().Get(ctx, &aigridv1.GetAIModelRequest{
    Id: req.Name,
  })
  
  // 2. Validate locations exist in GridClusters
  locations, err := r.FulfillmentAPI.GridClusters().ListLocations(ctx, &aigridv1.ListLocationsRequest{
    EligibleOnly: true,
  })
  
  // 3. Create/update ACM Placement
  placement := r.buildPlacement(model)
  err = r.ACMHubClient.Create(ctx, placement)
  
  // 4. Create/update ManifestWorkReplicaSet
  mwrs := r.buildManifestWorkReplicaSet(model, placement)
  err = r.ACMHubClient.Create(ctx, mwrs)
  
  // 5. Create/update MaaSModelRef
  modelRef := r.buildMaaSModelRef(model)
  err = r.ACMHubClient.Create(ctx, modelRef)
  
  // 6. Aggregate status from ACM
  status := r.aggregateStatus(ctx, mwrs)
  
  // 7. Signal status back to Fulfillment API
  _, err = r.FulfillmentAPI.AIModels().Signal(ctx, &aigridv1.SignalAIModelRequest{
    Id:     model.Id,
    Status: status,
  })
  
  return ctrl.Result{}, nil
}

func (r *AIModelReconciler) buildPlacement(model *aigridv1.AIModel) *placementv1beta1.Placement {
  return &placementv1beta1.Placement{
    ObjectMeta: metav1.ObjectMeta{
      Name:      model.Id,
      Namespace: "maas",
    },
    Spec: placementv1beta1.PlacementSpec{
      Predicates: []placementv1beta1.ClusterPredicate{
        {
          RequiredClusterSelector: placementv1beta1.ClusterSelector{
            LabelSelector: &metav1.LabelSelector{
              MatchExpressions: []metav1.LabelSelectorRequirement{
                {Key: "ai-grid/enabled", Operator: metav1.LabelSelectorOpIn, Values: []string{"true"}},
                {Key: "ai-grid/provisioned", Operator: metav1.LabelSelectorOpIn, Values: []string{"true"}},
                {Key: "location", Operator: metav1.LabelSelectorOpIn, Values: model.Spec.Locations},
              },
            },
          },
        },
      },
    },
  }
}

func (r *AIModelReconciler) aggregateStatus(ctx context.Context, mwrs *workv1alpha1.ManifestWorkReplicaSet) *aigridv1.AIModelStatus {
  // Query ManifestWork status for each cluster
  // Aggregate ready_replicas, calculate overall state
  // Build per-location status
  
  status := &aigridv1.AIModelStatus{
    State: aigridv1.State_READY,
    ReadyReplicas: 0,
    DesiredReplicas: 0,
    LocationStatus: []*aigridv1.LocationDeploymentStatus{},
  }
  
  // ... aggregate logic ...
  
  return status
}
```

#### Watch Setup

```go
func (r *AIModelReconciler) SetupWithManager(mgr ctrl.Manager) error {
  return ctrl.NewControllerManagedBy(mgr).
    // Watch Fulfillment database via periodic sync or webhook
    For(&aigridv1.AIModel{}).
    
    // Watch ACM resources for status updates
    Owns(&placementv1beta1.Placement{}).
    Owns(&workv1alpha1.ManifestWorkReplicaSet{}).
    Owns(&maasv1alpha1.MaaSModelRef{}).
    
    Complete(r)
}
```

**Challenge:** OSAC Fulfillment API uses PostgreSQL, not Kubernetes CRs

**Solutions:**

1. **Option A: Database Watch**
   - Controller connects to PostgreSQL
   - Uses LISTEN/NOTIFY for change notifications
   - Polls for changes if LISTEN not available

2. **Option B: Webhook from Fulfillment API**
   - Fulfillment API calls webhook on Create/Update/Delete
   - Controller enqueues reconcile request

3. **Option C: Operator watches custom CRs**
   - Fulfillment API creates shadow CRs in Kubernetes
   - Controller watches those CRs (standard Kubernetes pattern)

**Recommendation:** **Option C (Shadow CRs)** - most Kubernetes-native, reuses existing controller patterns.

---

## ACM Integration Layer

### OSAC Cluster → ACM ManagedCluster Registration

When OSAC provisions a cluster via Ansible and it reaches READY state, the `osac-operator` should register it with ACM Hub.

#### Extension to osac-operator

```go
// pkg/controllers/cluster_controller.go
func (r *ClusterReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
  cluster, err := r.FulfillmentAPI.Clusters().Get(ctx, &osacv1.GetClusterRequest{Id: req.Name})
  
  // Existing reconciliation logic (Ansible provisioning)
  // ...
  
  // NEW: When cluster reaches READY, register with ACM Hub
  if cluster.Status.State == osacv1.State_READY && r.isACMEnabled() {
    err := r.registerWithACM(ctx, cluster)
    if err != nil {
      return ctrl.Result{}, err
    }
  }
  
  return ctrl.Result{}, nil
}

func (r *ClusterReconciler) registerWithACM(ctx context.Context, cluster *osacv1.Cluster) error {
  // Create ManagedCluster CR in ACM Hub
  managedCluster := &clusterv1.ManagedCluster{
    ObjectMeta: metav1.ObjectMeta{
      Name: cluster.Id,
      Labels: map[string]string{
        "location": cluster.Spec.Location,
        "ai-grid/provisioned": "true",  // OSAC-provisioned clusters are ready
      },
      Annotations: map[string]string{
        "osac.openshift.io/cluster-id": cluster.Id,
        "osac.openshift.io/tenant": cluster.Metadata.Annotations["osac.openshift.io/tenant"],
      },
    },
    Spec: clusterv1.ManagedClusterSpec{
      HubAcceptsClient: true,
      ManagedClusterClientConfigs: []clusterv1.ClientConfig{
        {
          URL: cluster.Status.ApiUrl,
          CABundle: []byte(cluster.Status.CaBundle),
        },
      },
    },
  }
  
  return r.ACMHubClient.Create(ctx, managedCluster)
}
```

### AI Grid Enrollment Flow

1. **Cluster created via OSAC Fulfillment API**
   ```
   POST /api/fulfillment/v1/clusters
   {
     "object": {
       "id": "production-cluster-1",
       "spec": {
         "template": "openshift-4.21",
         "location": "us-east-1"
       }
     }
   }
   ```

2. **osac-operator provisions cluster via Ansible**
   - Cluster state: PENDING → PROVISIONING → READY

3. **osac-operator registers with ACM Hub**
   - Creates ManagedCluster CR
   - Labels: `location: us-east-1`, `ai-grid/provisioned: true`
   - **Note:** `ai-grid/enabled` NOT set yet (cluster exists but not enrolled)

4. **User enrolls cluster in AI Grid**
   ```
   POST /api/fulfillment/v1/grid_clusters/{id}:enroll
   {
     "ai_grid_enabled": true
   }
   ```

5. **GridClusters controller updates ACM ManagedCluster**
   - Adds label: `ai-grid/enabled: true`
   - Now visible in `/grid_clusters/locations` for model deployment

6. **Models can now deploy to this location**
   ```
   POST /api/fulfillment/v1/ai_models
   {
     "object": {
       "spec": {
         "locations": ["us-east-1"]  // Matches the cluster
       }
     }
   }
   ```

---

## Migration & Rollout Plan

### Phase 1: Foundation (Weeks 1-4)

**Goal:** Establish proto definitions and ACM integration

**Tasks:**
1. Define AI Grid proto packages
   - `osac/aigrid/v1/grid_clusters_service.proto`
   - `osac/aigrid/v1/ai_models_service.proto`
   - `osac/aigrid/v1/ai_subscriptions_service.proto`
   - Common types in `osac/aigrid/v1/common/`

2. Extend Tenants proto
   - Add `optional IdentityProvider identity_provider` to `TenantSpec`

3. Generate code
   - Run `buf generate`
   - Generate Go, Python, TypeScript clients

4. Set up ACM Hub integration
   - Deploy ACM Hub cluster
   - Configure osac-operator with ACM credentials
   - Test ManagedCluster registration

**Deliverables:**
- Proto definitions committed
- Generated code in `proto/gen/`
- ACM Hub operational
- osac-operator can register clusters with ACM

---

### Phase 2: GridClusters Service (Weeks 5-8)

**Goal:** Enable cluster enrollment and location discovery

**Tasks:**
1. Implement GridClusters service in fulfillment-service
   - Database schema for GridCluster records
   - gRPC service implementation
   - List/Get/Enroll/Update/ListLocations RPCs

2. Implement GridClusters controller
   - Watch GridCluster records
   - Sync to ACM Hub (apply labels to ManagedCluster)
   - Signal status back to fulfillment API

3. Extend osac-operator cluster controller
   - Automatically register READY clusters with ACM
   - Set `ai-grid/provisioned: true` label

4. UI support
   - List enrolled clusters
   - Enroll/unenroll button
   - Show locations for model deployment

**Deliverables:**
- GridClusters API functional
- Clusters automatically registered in ACM when provisioned
- UI can enroll clusters in AI Grid
- Locations API returns eligible clusters

**Testing:**
- Create OSAC cluster → appears in ACM Hub
- Enroll cluster → label applied
- List locations → enrolled cluster's location appears

---

### Phase 3: AIModels Service (Weeks 9-14)

**Goal:** Enable multi-location model deployment

**Tasks:**
1. Implement AIModels service in fulfillment-service
   - Database schema for AIModel records
   - gRPC service implementation
   - List/Get/Create/Update/Delete/Signal RPCs
   - Validation (locations exist, resource limits)

2. Implement AIModels controller (osac-aigrid-controller)
   - Watch AIModel records
   - Create ACM Placement based on spec.locations
   - Create ManifestWorkReplicaSet with LLMInferenceService
   - Create MaaSModelRef
   - Aggregate status from ManifestWork reports
   - Signal status back to fulfillment API

3. UI support
   - Model deployment form (name, URI, locations, resources)
   - Model list with per-location status
   - Delete model

4. Integration with MaaS platform
   - Ensure LLMInferenceService CRD installed in spoke clusters
   - Ensure MaaS operators running in spoke clusters

**Deliverables:**
- AIModels API functional
- Models deploy to selected locations via ACM
- Per-location status visible in UI
- vLLM pods running in spoke clusters

**Testing:**
- Create model → Placement + ManifestWorkReplicaSet created
- ACM distributes LLMInferenceService to spoke clusters
- Model status shows READY when all locations ready
- Delete model → resources cleaned up

---

### Phase 4: AISubscriptions Service (Weeks 15-19)

**Goal:** Enable subscription management with token rate limits

**Tasks:**
1. Implement AISubscriptions service in fulfillment-service
   - Database schema for AISubscription records
   - gRPC service implementation
   - List/Get/Create/Update/Delete/Signal RPCs
   - Validation (model refs exist, rate limits valid)
   - GetInfo RPC (joins models, policies, metering)

2. Implement AISubscriptions controller
   - Watch AISubscription records
   - Create MaaSSubscription CRs
   - Optionally create MaaSAuthPolicy (if `create_auth_policy=true`)
   - Delete auto-generated policies when subscription deleted
   - Query metering service for token usage
   - Signal status back to fulfillment API

3. UI support
   - Subscription creation form
   - Model selection + rate limit configuration
   - Group ownership
   - Token usage dashboard

4. Integration with metering service
   - Query osac-metering for token consumption
   - Display in subscription details

**Deliverables:**
- AISubscriptions API functional
- Subscriptions create MaaS resources
- Auto-generated auth policies work
- Token usage visible in UI

**Testing:**
- Create subscription → MaaSSubscription + MaaSAuthPolicy created
- Update subscription → resources updated
- Delete subscription → auto-generated policy deleted, manual policies preserved
- Token usage reflects actual consumption

---

### Phase 5: Extended Tenants (Weeks 20-22)

**Goal:** Enable atomic tenant + IdP onboarding

**Tasks:**
1. Extend Tenants service implementation
   - Handle `identity_provider` field in Create/Update
   - Create IdentityProvider CR + Secret when set
   - Atomic transaction (both succeed or both fail)
   - Validate OIDC endpoints (optional: connectivity check)

2. Update Tenants controller
   - Watch for Tenants with `identity_provider` set
   - Create OpenShift OAuth IdP configuration
   - Signal IdP status back to API

3. UI support
   - Tenant onboarding wizard
   - OIDC configuration form
   - Test IdP connectivity button

**Deliverables:**
- Tenants API accepts embedded IdP
- Atomic tenant + IdP creation
- IdP status in Tenant resource
- UI onboarding flow

**Testing:**
- Create tenant with IdP → both created atomically
- Update tenant IdP config → changes applied
- Delete tenant → IdP deleted too
- Old-style tenant creation (without IdP) still works

---

### Phase 6: Integration & Polish (Weeks 23-26)

**Goal:** End-to-end workflows, docs, migration

**Tasks:**
1. End-to-end workflows
   - Provision cluster → enroll → deploy model → create subscription → inference
   - Multi-tenant isolation testing
   - Failure scenarios (cluster offline, ACM Hub down)

2. Documentation
   - API reference (auto-generated from protos)
   - User guides (cluster enrollment, model deployment, subscriptions)
   - Operator guides (ACM setup, MaaS platform integration)
   - Architecture docs (update with AI Grid components)

3. Migration tooling (if AI Grid MVP PoC has production data)
   - Migrate Git-backed resources to PostgreSQL
   - Migrate PoC tenants/models/subscriptions to OSAC

4. Monitoring & observability
   - Prometheus metrics (model deployment success rate, token usage)
   - Grafana dashboards
   - AlertManager rules

**Deliverables:**
- Complete end-to-end workflows functional
- Documentation published
- Migration tooling (if needed)
- Monitoring operational

**Testing:**
- Full user journey testing
- Performance testing (100s of models, 1000s of subscriptions)
- Failure recovery testing
- Multi-tenant isolation validation

---

## Open Questions & Decisions

### 1. GridClusters: Extend or Separate?

**Question:** Should AI Grid enrollment be part of the existing Clusters service, or a separate GridClusters service?

**Options:**
- **A:** Extend Clusters service with AI Grid fields
- **B:** Separate GridClusters service

**Current Recommendation:** B (Separate)

**Decision Needed:** Architecture team review

---

### 2. ACM Hub Deployment Model

**Question:** Where does the ACM Hub run?

**Options:**
- **A:** Dedicated ACM Hub cluster (separate from OSAC management cluster)
- **B:** ACM Hub runs in OSAC management cluster
- **C:** Multiple ACM Hubs (one per region)

**Current Recommendation:** A (Dedicated) for clean separation

**Decision Needed:** Infrastructure team

---

### 3. Tenant/OIDC Atomicity

**Question:** Must tenant + IdP creation be atomic, or can UI orchestrate two API calls?

**Options:**
- **A:** Atomic (extend Tenants proto with optional IdP field)
- **B:** Separate (UI calls Tenants API then IdentityProviders API)

**Current Recommendation:** A (Atomic) for better UX

**Decision Needed:** Product/UX review

---

### 4. MaaS Platform Per-Cluster or Hub?

**Question:** Does each spoke cluster run its own MaaS platform, or centralized in ACM Hub?

**Current Understanding:** Per-cluster (based on PoC)

**Decision Needed:** Confirm with RHOAI/MaaS team

---

### 5. Namespace Strategy

**Question:** What namespace(s) for AI Grid resources?

**Options:**
- **A:** Dedicated `ai-grid` namespace in ACM Hub
- **B:** Tenant namespaces (multi-tenant isolation)
- **C:** Single `maas` namespace (like PoC)

**Current Recommendation:** B (Tenant namespaces) for proper isolation

**Decision Needed:** Security/architecture review

---

### 6. Controller Hosting

**Question:** Where does osac-aigrid-controller run?

**Options:**
- **A:** In OSAC management cluster (same as osac-operator)
- **B:** In ACM Hub cluster
- **C:** Separate cluster

**Current Recommendation:** A (OSAC management cluster) - collocated with osac-operator

**Decision Needed:** Infrastructure team

---

### 7. Model Update Support

**Question:** Should AIModels service support Update RPC?

**AI Grid MVP PoC:** No Update (immutable after creation)

**OSAC Pattern:** All services have Update

**Options:**
- **A:** Support Update (align with OSAC pattern)
  - Can change locations, replicas, resources
  - Cannot change model_uri, model_name (immutable)
- **B:** No Update (follow PoC)
  - Delete + recreate to change

**Current Recommendation:** A (Support Update) for OSAC consistency

**Decision Needed:** Product review (is model immutability required?)

---

### 8. Private vs Public API Exposure

**Question:** Which AI Grid RPCs are public vs private?

**Current Recommendation:**
- **Public:** All List/Get/Create/Update/Delete on all services
- **Private:** All Signal RPCs, GridClusters enrollment (admin-only?)

**Decision Needed:** Security team review (should tenants self-enroll clusters?)

---

## Appendix A: Proto Files Checklist

New proto files to create:

```
proto/private/osac/aigrid/v1/
├── common/
│   ├── metadata.proto          ← Reuse osac/private/v1/common if possible
│   ├── state.proto
│   └── condition.proto
├── grid_clusters_service.proto
├── grid_cluster_type.proto
├── ai_models_service.proto
├── ai_model_type.proto
├── ai_subscriptions_service.proto
├── ai_subscription_type.proto
├── identity_provider_type.proto
└── metering_type.proto
```

Modified proto files:

```
proto/private/osac/private/v1/
└── tenant_type.proto           ← Add optional IdentityProvider field
```

---

## Appendix B: Database Schema

### AIModel Table

```sql
CREATE TABLE ai_models (
  id VARCHAR(253) PRIMARY KEY,
  tenant_id VARCHAR(63) NOT NULL REFERENCES tenants(id),
  metadata JSONB NOT NULL,
  spec JSONB NOT NULL,
  status JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_ai_models_tenant ON ai_models(tenant_id);
CREATE INDEX idx_ai_models_state ON ai_models((status->>'state'));
```

### AISubscription Table

```sql
CREATE TABLE ai_subscriptions (
  id VARCHAR(253) PRIMARY KEY,
  tenant_id VARCHAR(63) NOT NULL REFERENCES tenants(id),
  metadata JSONB NOT NULL,
  spec JSONB NOT NULL,
  status JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_ai_subscriptions_tenant ON ai_subscriptions(tenant_id);
CREATE INDEX idx_ai_subscriptions_state ON ai_subscriptions((status->>'state'));
```

### GridCluster Table (if separate service)

```sql
CREATE TABLE grid_clusters (
  id VARCHAR(63) PRIMARY KEY,
  metadata JSONB NOT NULL,
  spec JSONB NOT NULL,
  status JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_grid_clusters_location ON grid_clusters((spec->>'location'));
CREATE INDEX idx_grid_clusters_enabled ON grid_clusters((spec->>'ai_grid_enabled'));
```

---

## Appendix C: Related Documents

- **OSAC gRPC API Reference:** `osac-grpc-api-reference.md`
- **AI Grid MVP gRPC API Design:** `ai-grid-mvp-grpc-api-design.md`
- **AI Grid MVP API Reference (REST PoC):** `ai-grid-mvp-api-reference.md`
- **Gap Analysis:** `ai-grid-api-gap-analysis.md`

---

**Document Version:** 2.0  
**Last Updated:** 2026-10-16  
**Status:** Complete redesign based on gRPC-to-gRPC integration  
**Next Steps:**
1. Architecture review of GridClusters (extend vs separate)
2. Security review of API visibility (public vs private)
3. Infrastructure planning for ACM Hub deployment
4. Proto definitions approval
5. Implementation kickoff (Phase 1)
