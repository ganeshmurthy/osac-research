# AI Grid MVP gRPC API vs OSAC gRPC API - Detailed Field Comparison

**Date:** 2026-10-19  
**Purpose:** Detailed field-level comparison of AI Grid MVP gRPC vs OSAC gRPC APIs  
**Updated:** Fixed AI Grid MVP to match OSAC's List response pattern

---

## Table of Contents

1. [Health Service](#1-health-service-comparison)
2. [GridClusters vs Clusters Service](#2-gridclusters-vs-clusters-service-comparison)
3. [Tenants Service](#3-tenants-service-comparison)
4. [AIModels Service](#4-aimodels-service-comparison)
5. [AISubscriptions Service](#5-aisubscriptions-service-comparison)

---

## 1. Health Service Comparison

### AI Grid MVP - Health Service

**Proto:** `osac/aigrid/v1/health_service.proto`

#### Service Definition
```protobuf
service Health {
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse)
}
```

#### HealthCheckRequest
```protobuf
message HealthCheckRequest {
  // Empty - no fields
}
```

**Fields:** None

---

#### HealthCheckResponse
```protobuf
message HealthCheckResponse {
  HealthStatus status = 1;
  string storage = 2;
  bool auto_commit = 3;
  map<string, string> details = 4;
}

enum HealthStatus {
  HEALTH_STATUS_UNSPECIFIED = 0;
  OK = 1;
  DEGRADED = 2;
  UNAVAILABLE = 3;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `status` | HealthStatus enum | Overall health: OK, DEGRADED, UNAVAILABLE |
| `storage` | string | Backend type: "postgresql", "git", etc. |
| `auto_commit` | bool | Git auto-commit enabled |
| `details` | map<string,string> | Additional diagnostic info |

---

### OSAC - Health Service

**Status:** ❌ **Does not exist**

---

## 2. GridClusters vs Clusters Service Comparison

### AI Grid MVP - GridClusters Service

**Proto:** `osac/aigrid/v1/grid_clusters_service.proto`  
**Package:** `osac.aigrid.v1`

#### Service Definition
```protobuf
service GridClusters {
  rpc List(ListGridClustersRequest) returns (ListGridClustersResponse)
  rpc Get(GetGridClusterRequest) returns (GridCluster)
  rpc Enroll(EnrollGridClusterRequest) returns (GridCluster)
  rpc Update(UpdateGridClusterRequest) returns (GridCluster)
  rpc ListLocations(ListLocationsRequest) returns (ListLocationsResponse)
  rpc Signal(SignalGridClusterRequest) returns (GridCluster)
}
```

---

#### ListGridClustersRequest
```protobuf
message ListGridClustersRequest {
  int32 offset = 1;
  int32 limit = 2;
  string filter = 3;
  string order = 4;
}
```

**Fields:**
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `offset` | int32 | Pagination starting index | `0`, `20`, `40` |
| `limit` | int32 | Max items to return (max 1000) | `20`, `50`, `100` |
| `filter` | string | CEL expression for filtering | `spec.ai_grid_enabled == true` |
| `order` | string | SQL-style sort order | `metadata.name ASC` |

---

#### ListGridClustersResponse
```protobuf
message ListGridClustersResponse {
  int32 size = 1;
  int32 total = 2;
  repeated GridCluster clusters = 3;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `size` | int32 | Actual number of items returned |
| `total` | int32 | Total matching clusters (for pagination) |
| `clusters` | repeated GridCluster | Array of cluster objects |

---

#### GetGridClusterRequest
```protobuf
message GetGridClusterRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Cluster ID (ManagedCluster name) |

---

#### GridCluster (Response for Get)
```protobuf
message GridCluster {
  string id = 1 [(google.api.field_behavior) = IMMUTABLE];
  Metadata metadata = 2;
  GridClusterSpec spec = 3;
  GridClusterStatus status = 4;
}
```

**Fields:**
| Field | Type | Mutability | Description |
|-------|------|------------|-------------|
| `id` | string | Immutable | Unique identifier (ManagedCluster name) |
| `metadata` | Metadata | Mutable | Common metadata fields |
| `spec` | GridClusterSpec | Mutable | Desired state |
| `status` | GridClusterStatus | Server-set | Observed state |

---

#### Metadata (Common Type)
```protobuf
message Metadata {
  string name = 1;
  string description = 2;
  google.protobuf.Timestamp created_at = 3;
  google.protobuf.Timestamp updated_at = 4;
  int32 version = 5;
  map<string, string> annotations = 6;
  map<string, string> labels = 7;
}
```

**Fields:**
| Field | Type | Server-set | Description |
|-------|------|------------|-------------|
| `name` | string | No | Human-readable name (mutable) |
| `description` | string | No | Optional description |
| `created_at` | Timestamp | ✅ Yes | Creation time (immutable) |
| `updated_at` | Timestamp | ✅ Yes | Last update time |
| `version` | int32 | ✅ Yes | Optimistic locking version |
| `annotations` | map<string,string> | No | Tenant isolation (`osac.openshift.io/tenant`) |
| `labels` | map<string,string> | No | User-defined indexed labels |

---

#### GridClusterSpec
```protobuf
message GridClusterSpec {
  string location = 1;
  bool ai_grid_enabled = 2;
  bool provisioned = 3;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `location` | string | Location identifier (e.g., "us-east-1", "site1") |
| `ai_grid_enabled` | bool | AI Grid enrollment flag |
| `provisioned` | bool | Provisioned for AI workloads |

---

#### GridClusterStatus
```protobuf
message GridClusterStatus {
  ClusterState state = 1;
  string provisioning_state = 2;
  repeated Condition conditions = 3;
  google.protobuf.Timestamp last_observed_time = 4;
}

enum ClusterState {
  CLUSTER_STATE_UNSPECIFIED = 0;
  READY = 1;
  OFFLINE = 2;
  UNKNOWN = 3;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `state` | ClusterState enum | Overall state: READY, OFFLINE, UNKNOWN |
| `provisioning_state` | string | Human-readable provisioning description |
| `conditions` | repeated Condition | Kubernetes-style conditions |
| `last_observed_time` | Timestamp | Last ACM observation time |

---

#### Condition (Common Type)
```protobuf
message Condition {
  string type = 1;
  string status = 2;
  string reason = 3;
  string message = 4;
  google.protobuf.Timestamp last_transition_time = 5;
  google.protobuf.Timestamp last_update_time = 6;
}
```

**Fields:**
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `type` | string | Condition type | "Available", "Degraded" |
| `status` | string | Condition status | "True", "False", "Unknown" |
| `reason` | string | Machine-readable reason code | "ClusterOffline" |
| `message` | string | Human-readable message | "Cluster is offline" |
| `last_transition_time` | Timestamp | When status last changed | |
| `last_update_time` | Timestamp | Last observation time | |

---

#### EnrollGridClusterRequest
```protobuf
message EnrollGridClusterRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  bool ai_grid_enabled = 2 [(google.api.field_behavior) = REQUIRED];
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Cluster ID to enroll |
| `ai_grid_enabled` | bool | ✅ Yes | Must be `true` for enrollment |

**Returns:** `GridCluster` (enrolled cluster object)

---

#### UpdateGridClusterRequest
```protobuf
message UpdateGridClusterRequest {
  GridCluster object = 1 [(google.api.field_behavior) = REQUIRED];
  google.protobuf.FieldMask update_mask = 2;
  bool lock = 3;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `object` | GridCluster | ✅ Yes | Updated cluster object |
| `update_mask` | FieldMask | No | Fields to update (partial update) |
| `lock` | bool | No | Enable optimistic locking via `metadata.version` |

**Returns:** `GridCluster` (updated cluster object)

---

#### ListLocationsRequest
```protobuf
message ListLocationsRequest {
  bool eligible_only = 1;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `eligible_only` | bool | Filter to Ready + enabled + provisioned locations only |

---

#### ListLocationsResponse
```protobuf
message ListLocationsResponse {
  repeated string locations = 1;
  map<string, int32> cluster_count = 2;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `locations` | repeated string | Unique location identifiers |
| `cluster_count` | map<string,int32> | Number of clusters per location |

---

#### SignalGridClusterRequest
```protobuf
message SignalGridClusterRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  GridClusterStatus status = 2;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Cluster ID |
| `status` | GridClusterStatus | No | Status update from controller |

**Returns:** `GridCluster` (updated cluster object)

**Visibility:** Private API only (no HTTP binding)

---

### OSAC - Clusters Service

**Proto:** `osac/public/v1/clusters_service.proto`  
**Package:** `osac.public.v1`

#### Service Definition
```protobuf
service Clusters {
  rpc List(ClustersListRequest) returns (ClustersListResponse)
  rpc Get(ClustersGetRequest) returns (ClustersGetResponse)
  rpc Create(ClustersCreateRequest) returns (ClustersCreateResponse)
  rpc Update(ClustersUpdateRequest) returns (ClustersUpdateResponse)
  rpc Delete(ClustersDeleteRequest) returns (ClustersDeleteResponse)
}
```

---

#### ClustersListRequest
```protobuf
message ClustersListRequest {
  optional int32 offset = 1;
  optional int32 limit = 2;
  optional string filter = 3;
  optional string order = 4;
}
```

**Fields:**
| Field | Type | Optional | Description | Example |
|-------|------|----------|-------------|---------|
| `offset` | int32 | ✅ Yes | Pagination starting index (default: 0) | `0`, `20`, `40` |
| `limit` | int32 | ✅ Yes | Max items (default: all) | `20`, `50`, `100` |
| `filter` | string | ✅ Yes | CEL expression | `this.metadata.name.startsWith("my")` |
| `order` | string | ✅ Yes | SQL-style sort | `api_url desc` |

---

#### ClustersListResponse
```protobuf
message ClustersListResponse {
  int32 size = 1;
  int32 total = 2;
  repeated Cluster items = 3;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `size` | int32 | Actual number of items returned |
| `total` | int32 | Total matching items (for pagination) |
| `items` | repeated Cluster | Array of cluster objects |

---

#### ClustersGetRequest
```protobuf
message ClustersGetRequest {
  string id = 1;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Cluster ID |

---

#### ClustersGetResponse
```protobuf
message ClustersGetResponse {
  Cluster object = 1;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `object` | Cluster | The cluster object |

---

#### Cluster (OSAC Type)
```protobuf
message Cluster {
  string id = 1;
  Metadata metadata = 2;
  ClusterSpec spec = 3;
  ClusterStatus status = 4;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `metadata` | Metadata | Common metadata (similar to AI Grid) |
| `spec` | ClusterSpec | Desired state (provisioning config) |
| `status` | ClusterStatus | Observed state |

**Note:** OSAC `ClusterSpec` contains extensive provisioning fields (templates, node_sets, etc.) - different from AI Grid's minimal spec.

---

#### ClustersCreateRequest
```protobuf
message ClustersCreateRequest {
  Cluster object = 1;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `object` | Cluster | ✅ Yes | Cluster to create |

**Returns:** Cluster object

**Note:** AI Grid MVP does NOT have Create - it discovers clusters from ACM.

---

#### ClustersUpdateRequest
```protobuf
message ClustersUpdateRequest {
  Cluster object = 1;
  google.protobuf.FieldMask update_mask = 2;
  bool lock = 3;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `object` | Cluster | ✅ Yes | Updated cluster object |
| `update_mask` | FieldMask | No | Fields to update (partial update) |
| `lock` | bool | No | Enable optimistic locking via `metadata.version` |

**Returns:** Cluster object

✅ **Same pattern as AI Grid MVP**

---

#### ClustersDeleteRequest
```protobuf
message ClustersDeleteRequest {
  string id = 1;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Cluster ID to delete |

**Returns:** Empty response

**Note:** AI Grid MVP does NOT have Delete - clusters are unenrolled, not deleted.

---

### Field-Level Comparison: GridClusters vs Clusters

#### List Request Comparison

| Field | AI Grid MVP `ListGridClustersRequest` | OSAC `ClustersListRequest` | Match? |
|-------|--------------------------------------|----------------------------|--------|
| `offset` | ✅ `int32 offset` | ✅ `optional int32 offset` | ✅ Match |
| `limit` | ✅ `int32 limit` | ✅ `optional int32 limit` | ✅ Match |
| `filter` | ✅ `string filter` | ✅ `optional string filter` | ✅ Match |
| `order` | ✅ `string order` | ✅ `optional string order` | ✅ Match |

**Note:** OSAC uses `optional` keyword, AI Grid MVP doesn't (functionally equivalent in proto3).

---

#### List Response Comparison

| Field | AI Grid MVP `ListGridClustersResponse` | OSAC `ClustersListResponse` | Match? |
|-------|----------------------------------------|-----------------------------|--------|
| `size` | ✅ `int32 size` | ✅ `int32 size` | ✅ **Perfect Match** |
| `total` | ✅ `int32 total` | ✅ `int32 total` | ✅ **Perfect Match** |
| `clusters` / `items` | ✅ `repeated GridCluster clusters` | ✅ `repeated Cluster items` | ✅ Match (different name) |

**✅ AI Grid MVP now matches OSAC's pattern exactly!**

---

#### Resource Type Comparison

| Field | AI Grid MVP `GridCluster` | OSAC `Cluster` | Match? |
|-------|---------------------------|----------------|--------|
| `id` | ✅ `string id` (immutable) | ✅ `string id` | ✅ Match |
| `metadata` | ✅ `Metadata metadata` | ✅ `Metadata metadata` | ✅ Match |
| `spec` | ✅ `GridClusterSpec spec` | ✅ `ClusterSpec spec` | 🟡 Different content |
| `status` | ✅ `GridClusterStatus status` | ✅ `ClusterStatus status` | 🟡 Different content |

---

#### Spec Comparison

| Field | AI Grid MVP `GridClusterSpec` | OSAC `ClusterSpec` | Match? |
|-------|-------------------------------|-------------------|--------|
| `location` | ✅ `string location` | ❌ Missing | **OSAC Missing** |
| `ai_grid_enabled` | ✅ `bool ai_grid_enabled` | ❌ Missing | **OSAC Missing** |
| `provisioned` | ✅ `bool provisioned` | ❌ Missing | **OSAC Missing** |
| Template config | ❌ None | ✅ `ClusterTemplateReference template` | **AI Grid Missing** |
| Node sets | ❌ None | ✅ `repeated NodeSet node_sets` | **AI Grid Missing** |
| Template params | ❌ None | ✅ `map<string, Any> template_parameters` | **AI Grid Missing** |

**Key Difference:** 
- **AI Grid:** Minimal spec for enrollment
- **OSAC:** Extensive spec for provisioning

---

#### RPC Method Comparison

| Method | AI Grid MVP | OSAC | Match? |
|--------|-------------|------|--------|
| `List` | ✅ Yes | ✅ Yes | ✅ Match |
| `Get` | ✅ Yes | ✅ Yes | ✅ Match |
| `Create` | ❌ No (discovers from ACM) | ✅ Yes (provisions new) | ❌ Different model |
| `Update` | ✅ Yes | ✅ Yes | ✅ Match |
| `Delete` | ❌ No (unenroll only) | ✅ Yes (deletes cluster) | ❌ Different model |
| `Enroll` | ✅ Yes | ❌ Missing | **OSAC Missing** |
| `ListLocations` | ✅ Yes | ❌ Missing | **OSAC Missing** |
| `Signal` | ✅ Yes | ❌ Missing | **OSAC Missing** |

---

## 3. Tenants Service Comparison

### AI Grid MVP - Tenants Service

**Proto:** `osac/aigrid/v1/tenants_service.proto`  
**Package:** `osac.aigrid.v1`

#### Service Definition
```protobuf
service Tenants {
  rpc List(ListTenantsRequest) returns (ListTenantsResponse)
  rpc Get(GetTenantRequest) returns (Tenant)
  rpc Create(CreateTenantRequest) returns (Tenant)
  rpc Update(UpdateTenantRequest) returns (Tenant)
  rpc Delete(DeleteTenantRequest) returns (DeleteTenantResponse)
  rpc Signal(SignalTenantRequest) returns (Tenant)
}
```

---

#### ListTenantsRequest
```protobuf
message ListTenantsRequest {
  int32 offset = 1;
  int32 limit = 2;
  string filter = 3;
  string order = 4;
}
```

**Fields:** Same pattern as `ListGridClustersRequest`

---

#### ListTenantsResponse
```protobuf
message ListTenantsResponse {
  int32 size = 1;
  int32 total = 2;
  repeated Tenant tenants = 3;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `size` | int32 | Actual number of items returned |
| `total` | int32 | Total matching tenants |
| `tenants` | repeated Tenant | Array of tenant objects |

---

#### GetTenantRequest
```protobuf
message GetTenantRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Tenant ID |

---

#### Tenant
```protobuf
message Tenant {
  string id = 1 [(google.api.field_behavior) = IMMUTABLE];
  Metadata metadata = 2;
  TenantSpec spec = 3;
  TenantStatus status = 4;
}
```

**Fields:**
| Field | Type | Mutability | Description |
|-------|------|------------|-------------|
| `id` | string | Immutable | Tenant ID (DNS-1123 label, max 63 chars) |
| `metadata` | Metadata | Mutable | Common metadata |
| `spec` | TenantSpec | Mutable | Desired state |
| `status` | TenantStatus | Server-set | Observed state |

---

#### TenantSpec
```protobuf
message TenantSpec {
  repeated string domains = 1;
  IdentityProvider identity_provider = 2;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `domains` | repeated string | Tenant domains (unique across all tenants) |
| `identity_provider` | IdentityProvider | Embedded OIDC IdP configuration |

---

#### IdentityProvider
```protobuf
message IdentityProvider {
  string title = 1;
  string description = 2;
  bool enabled = 3;
  OIDCConfig config = 4;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | IdP display title |
| `description` | string | IdP description |
| `enabled` | bool | IdP enabled/disabled |
| `config` | OIDCConfig | OIDC configuration |

---

#### OIDCConfig
```protobuf
message OIDCConfig {
  string client_id = 1 [(google.api.field_behavior) = REQUIRED];
  SecretReference client_secret_secret = 2 [(google.api.field_behavior) = REQUIRED];
  string issuer = 3 [(google.api.field_behavior) = REQUIRED];
  string authorization_url = 4 [(google.api.field_behavior) = REQUIRED];
  string token_url = 5 [(google.api.field_behavior) = REQUIRED];
  string default_scopes = 6;
  string user_info_url = 7;
  string jwks_url = 8;
  string logout_url = 9;
  bool validate_signature = 10;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client_id` | string | ✅ Yes | OIDC client ID |
| `client_secret_secret` | SecretReference | ✅ Yes | Secret containing client secret |
| `issuer` | string | ✅ Yes | OIDC issuer URL (HTTPS) |
| `authorization_url` | string | ✅ Yes | Authorization endpoint (HTTPS) |
| `token_url` | string | ✅ Yes | Token endpoint (HTTPS) |
| `default_scopes` | string | No | Default scopes (e.g., "openid profile email") |
| `user_info_url` | string | No | UserInfo endpoint |
| `jwks_url` | string | No | JWKS endpoint |
| `logout_url` | string | No | Logout endpoint |
| `validate_signature` | bool | No | Validate token signature (default: true) |

---

#### SecretReference
```protobuf
message SecretReference {
  string name = 1 [(google.api.field_behavior) = REQUIRED];
  string namespace = 2;
  string key = 3;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ Yes | Kubernetes Secret name |
| `namespace` | string | No | Secret namespace (defaults to tenant namespace) |
| `key` | string | No | Secret key (defaults to "clientSecret") |

---

#### TenantStatus
```protobuf
message TenantStatus {
  State state = 1;
  string status_message = 2;
  repeated Condition conditions = 3;
  IdentityProviderStatus identity_provider_status = 4;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `state` | State enum | Overall state |
| `status_message` | string | Human-readable status |
| `conditions` | repeated Condition | Kubernetes-style conditions |
| `identity_provider_status` | IdentityProviderStatus | IdP health check results |

---

#### IdentityProviderStatus
```protobuf
message IdentityProviderStatus {
  bool reachable = 1;
  google.protobuf.Timestamp last_validated_at = 2;
  string validation_error = 3;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `reachable` | bool | IdP connectivity check passed |
| `last_validated_at` | Timestamp | Last successful validation time |
| `validation_error` | string | Error message if validation failed |

---

#### CreateTenantRequest
```protobuf
message CreateTenantRequest {
  Tenant object = 1 [(google.api.field_behavior) = REQUIRED];
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `object` | Tenant | ✅ Yes | Tenant to create (includes IdP) |

**Returns:** Tenant object

---

#### UpdateTenantRequest
```protobuf
message UpdateTenantRequest {
  Tenant object = 1 [(google.api.field_behavior) = REQUIRED];
  google.protobuf.FieldMask update_mask = 2;
  bool lock = 3;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `object` | Tenant | ✅ Yes | Updated tenant object |
| `update_mask` | FieldMask | No | Fields to update |
| `lock` | bool | No | Enable optimistic locking |

**Returns:** Tenant object

---

#### DeleteTenantRequest
```protobuf
message DeleteTenantRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  bool lock = 2;
  int32 version = 3;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Tenant ID to delete |
| `lock` | bool | No | Require version match |
| `version` | int32 | No | Expected version (for locking) |

---

#### DeleteTenantResponse
```protobuf
message DeleteTenantResponse {
  // Empty response
}
```

**Fields:** None (204 No Content in REST)

---

#### SignalTenantRequest
```protobuf
message SignalTenantRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  TenantStatus status = 2;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Tenant ID |
| `status` | TenantStatus | No | Status update from controller |

**Returns:** Tenant object

**Visibility:** Private API only

---

### OSAC - Tenants Service

**Proto:** `osac/public/v1/tenants_service.proto`  
**Package:** `osac.public.v1`

#### Service Definition
```protobuf
service Tenants {
  rpc List(TenantsListRequest) returns (TenantsListResponse)
  rpc Get(TenantsGetRequest) returns (TenantsGetResponse)
  rpc Create(TenantsCreateRequest) returns (TenantsCreateResponse)
  rpc Update(TenantsUpdateRequest) returns (TenantsUpdateResponse)
  rpc Delete(TenantsDeleteRequest) returns (TenantsDeleteResponse)
}
```

---

#### TenantsListRequest
```protobuf
message TenantsListRequest {
  optional int32 offset = 1;
  optional int32 limit = 2;
  optional string filter = 3;
  optional string order = 4;
}
```

**Fields:** Same pattern as OSAC `ClustersListRequest`

---

#### TenantsListResponse
```protobuf
message TenantsListResponse {
  int32 size = 1;
  int32 total = 2;
  repeated Tenant items = 3;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `size` | int32 | Actual number of items returned |
| `total` | int32 | Total matching items |
| `items` | repeated Tenant | Array of tenant objects |

---

#### TenantsGetRequest
```protobuf
message TenantsGetRequest {
  string id = 1;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Tenant ID |

---

#### TenantsGetResponse
```protobuf
message TenantsGetResponse {
  Tenant object = 1;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `object` | Tenant | The tenant object |

---

#### Tenant (OSAC Type)
```protobuf
message Tenant {
  string id = 1;
  Metadata metadata = 2;
  TenantSpec spec = 3;
  TenantStatus status = 4;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `metadata` | Metadata | Common metadata |
| `spec` | TenantSpec | Desired state |
| `status` | TenantStatus | Observed state |

**Note:** Need to check `osac/public/v1/tenant_type.proto` for TenantSpec/TenantStatus field details.

---

#### TenantsCreateRequest
```protobuf
message TenantsCreateRequest {
  Tenant object = 1;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `object` | Tenant | ✅ Yes | Tenant to create |

---

#### TenantsUpdateRequest
```protobuf
message TenantsUpdateRequest {
  Tenant object = 1;
  google.protobuf.FieldMask update_mask = 2;
  bool lock = 3;
}
```

**Fields:** Same pattern as OSAC `ClustersUpdateRequest`

---

#### TenantsDeleteRequest
```protobuf
message TenantsDeleteRequest {
  string id = 1;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Tenant ID to delete |

---

#### TenantsDeleteResponse
```protobuf
message TenantsDeleteResponse {}
```

**Fields:** None

---

### Field-Level Comparison: Tenants

#### List Response Comparison

| Field | AI Grid MVP `ListTenantsResponse` | OSAC `TenantsListResponse` | Match? |
|-------|-----------------------------------|----------------------------|--------|
| `size` | ✅ `int32 size` | ✅ `int32 size` | ✅ **Perfect Match** |
| `total` | ✅ `int32 total` | ✅ `int32 total` | ✅ **Perfect Match** |
| `tenants` / `items` | ✅ `repeated Tenant tenants` | ✅ `repeated Tenant items` | ✅ Match (different name) |

**✅ AI Grid MVP now matches OSAC's pattern!**

---

#### RPC Method Comparison

| Method | AI Grid MVP | OSAC | Match? |
|--------|-------------|------|--------|
| `List` | ✅ Yes | ✅ Yes | ✅ Match |
| `Get` | ✅ Yes | ✅ Yes | ✅ Match |
| `Create` | ✅ Yes | ✅ Yes | ✅ Match |
| `Update` | ✅ Yes | ✅ Yes | ✅ Match |
| `Delete` | ✅ Yes | ✅ Yes | ✅ Match |
| `Signal` | ✅ Yes | ❌ Missing | **OSAC Missing** |

---

#### Request/Response Patterns

✅ **All request/response messages follow the same pattern** (List, Get, Create, Update, Delete)

---

#### TenantSpec Comparison

**⚠️ Need to verify:** Must read `osac/public/v1/tenant_type.proto` to compare:

| Field | AI Grid MVP | OSAC | Status |
|-------|-------------|------|--------|
| `domains` | ✅ `repeated string domains` | ❓ Unknown | **Need to check** |
| `identity_provider` | ✅ `IdentityProvider` (OIDC config) | ❓ Unknown | **Need to check** |

---

## 4. AIModels Service Comparison

### AI Grid MVP - AIModels Service

**Proto:** `osac/aigrid/v1/ai_models_service.proto`  
**Package:** `osac.aigrid.v1`

#### Service Definition
```protobuf
service AIModels {
  rpc List(ListAIModelsRequest) returns (ListAIModelsResponse)
  rpc Get(GetAIModelRequest) returns (AIModel)
  rpc Create(CreateAIModelRequest) returns (AIModel)
  rpc Update(UpdateAIModelRequest) returns (AIModel)
  rpc Delete(DeleteAIModelRequest) returns (DeleteAIModelResponse)
  rpc Signal(SignalAIModelRequest) returns (AIModel)
}
```

---

#### ListAIModelsRequest
```protobuf
message ListAIModelsRequest {
  int32 offset = 1;
  int32 limit = 2;
  string filter = 3;
  string order = 4;
}
```

**Fields:** Same pattern as `ListGridClustersRequest`

**Filter examples:**
- `spec.locations has "us-east-1"`
- `status.state == "READY"`

---

#### ListAIModelsResponse
```protobuf
message ListAIModelsResponse {
  int32 size = 1;
  int32 total = 2;
  repeated AIModel models = 3;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `size` | int32 | Actual number of items returned |
| `total` | int32 | Total matching models |
| `models` | repeated AIModel | Array of model objects |

---

#### GetAIModelRequest
```protobuf
message GetAIModelRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Model deployment ID |

---

#### AIModel
```protobuf
message AIModel {
  string id = 1 [(google.api.field_behavior) = IMMUTABLE];
  Metadata metadata = 2;
  AIModelSpec spec = 3;
  AIModelStatus status = 4;
}
```

**Fields:**
| Field | Type | Mutability | Description |
|-------|------|------------|-------------|
| `id` | string | Immutable | Model deployment ID (DNS-1123 subdomain, max 253 chars) |
| `metadata` | Metadata | Mutable | Common metadata |
| `spec` | AIModelSpec | Mutable | Desired deployment state |
| `status` | AIModelStatus | Server-set | Observed deployment state |

---

#### AIModelSpec
```protobuf
message AIModelSpec {
  string display_name = 1;
  string model_uri = 2 [(google.api.field_behavior) = REQUIRED];
  string model_name = 3 [(google.api.field_behavior) = REQUIRED];
  string runtime_image = 4 [(google.api.field_behavior) = REQUIRED];
  int32 replicas = 5;
  ResourceRequirements resources = 6;
  repeated string runtime_args = 7;
  repeated string locations = 8 [(google.api.field_behavior) = REQUIRED];
}
```

**Fields:**
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `display_name` | string | No | Human-readable name | "Granite 3 8B" |
| `model_uri` | string | ✅ Yes | Model source URI | `hf://ibm-granite/granite-3.0-8b` |
| `model_name` | string | ✅ Yes | Model identifier for MaaS | "ibm-granite/granite-3.0-8b" |
| `runtime_image` | string | ✅ Yes | Container image for inference | `quay.io/rh-aiservices-bu/vllm-openai-ubi9:0.4.2` |
| `replicas` | int32 | No | Replicas per location | `1`, `2`, `3` |
| `resources` | ResourceRequirements | No | Resource allocation per replica | |
| `runtime_args` | repeated string | No | Additional runtime arguments (max 64) | `["--max-model-len", "8192"]` |
| `locations` | repeated string | ✅ Yes | Deployment locations (max 64) | `["site1", "site2"]` |

**Model URI Protocols:**
- `hf://` - Hugging Face
- `oci://` - OCI registry
- `s3://` - S3 bucket
- `pvc://` - Persistent Volume Claim
- `http://` or `https://` - HTTP server

---

#### ResourceRequirements
```protobuf
message ResourceRequirements {
  string cpu = 1;
  string memory = 2;
  int32 gpu_count = 3;
  string gpu_type = 4;
}
```

**Fields:**
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `cpu` | string | CPU request | "2", "2000m", "500m" |
| `memory` | string | Memory request | "4Gi", "512Mi", "16Gi" |
| `gpu_count` | int32 | Number of GPUs (0 = CPU only) | `0`, `1`, `2`, `4` |
| `gpu_type` | string | GPU type/model (optional) | "nvidia-a100", "nvidia-l40s" |

---

#### AIModelStatus
```protobuf
message AIModelStatus {
  State state = 1;
  string status_message = 2;
  repeated Condition conditions = 3;
  repeated LocationDeploymentStatus location_status = 4;
  int32 ready_replicas = 5;
  int32 desired_replicas = 6;
  ModelRegistrationStatus registration_status = 7;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `state` | State enum | Overall deployment state |
| `status_message` | string | Human-readable status |
| `conditions` | repeated Condition | Kubernetes-style conditions |
| `location_status` | repeated LocationDeploymentStatus | Per-location deployment status |
| `ready_replicas` | int32 | Total ready replicas across all locations |
| `desired_replicas` | int32 | Total desired replicas across all locations |
| `registration_status` | ModelRegistrationStatus | MaaS registration status |

---

#### LocationDeploymentStatus
```protobuf
message LocationDeploymentStatus {
  string location = 1;
  string cluster = 2;
  State state = 3;
  int32 ready_replicas = 4;
  int32 desired_replicas = 5;
  google.protobuf.Timestamp last_observed_time = 6;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `location` | string | Location identifier |
| `cluster` | string | Cluster name where deployed |
| `state` | State enum | Deployment state at this location |
| `ready_replicas` | int32 | Ready replicas at this location |
| `desired_replicas` | int32 | Desired replicas at this location |
| `last_observed_time` | Timestamp | Last observation time |

---

#### ModelRegistrationStatus
```protobuf
message ModelRegistrationStatus {
  bool registered = 1;
  string model_ref_name = 2;
  google.protobuf.Timestamp registered_at = 3;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `registered` | bool | Whether model is registered with MaaS |
| `model_ref_name` | string | MaaS model reference name |
| `registered_at` | Timestamp | Registration timestamp |

---

#### CreateAIModelRequest
```protobuf
message CreateAIModelRequest {
  AIModel object = 1 [(google.api.field_behavior) = REQUIRED];
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `object` | AIModel | ✅ Yes | Model deployment to create |

---

#### UpdateAIModelRequest
```protobuf
message UpdateAIModelRequest {
  AIModel object = 1 [(google.api.field_behavior) = REQUIRED];
  google.protobuf.FieldMask update_mask = 2;
  bool lock = 3;
}
```

**Fields:** Same pattern as `UpdateGridClusterRequest`

---

#### DeleteAIModelRequest
```protobuf
message DeleteAIModelRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  bool lock = 2;
  int32 version = 3;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Model deployment ID to delete |
| `lock` | bool | No | Require version match |
| `version` | int32 | No | Expected version (for locking) |

---

#### DeleteAIModelResponse
```protobuf
message DeleteAIModelResponse {
  // Empty response
}
```

**Fields:** None

---

#### SignalAIModelRequest
```protobuf
message SignalAIModelRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  AIModelStatus status = 2;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Model deployment ID |
| `status` | AIModelStatus | No | Status update from controller |

**Returns:** AIModel object

**Visibility:** Private API only

---

### OSAC - AIModels Service

**Status:** ❌ **Does not exist**

No proto service for AI model deployments in OSAC.

---

## 5. AISubscriptions Service Comparison

### AI Grid MVP - AISubscriptions Service

**Proto:** `osac/aigrid/v1/ai_subscriptions_service.proto`  
**Package:** `osac.aigrid.v1`

#### Service Definition
```protobuf
service AISubscriptions {
  rpc List(ListAISubscriptionsRequest) returns (ListAISubscriptionsResponse)
  rpc Get(GetAISubscriptionRequest) returns (AISubscriptionInfo)
  rpc Create(CreateAISubscriptionRequest) returns (AISubscription)
  rpc Update(UpdateAISubscriptionRequest) returns (AISubscription)
  rpc Delete(DeleteAISubscriptionRequest) returns (DeleteAISubscriptionResponse)
  rpc Signal(SignalAISubscriptionRequest) returns (AISubscription)
}
```

**Note:** `Get` returns `AISubscriptionInfo` (extended response with joins), not plain `AISubscription`.

---

#### ListAISubscriptionsRequest
```protobuf
message ListAISubscriptionsRequest {
  int32 offset = 1;
  int32 limit = 2;
  string filter = 3;
  string order = 4;
}
```

**Fields:** Same pattern as `ListGridClustersRequest`

**Filter examples:**
- `spec.owner.groups has "engineering"`
- `spec.priority > 0`

---

#### ListAISubscriptionsResponse
```protobuf
message ListAISubscriptionsResponse {
  int32 size = 1;
  int32 total = 2;
  repeated AISubscription subscriptions = 3;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `size` | int32 | Actual number of items returned |
| `total` | int32 | Total matching subscriptions |
| `subscriptions` | repeated AISubscription | Array of subscription objects |

---

#### GetAISubscriptionRequest
```protobuf
message GetAISubscriptionRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Subscription ID |

**Returns:** `AISubscriptionInfo` (not `AISubscription`)

---

#### AISubscription
```protobuf
message AISubscription {
  string id = 1 [(google.api.field_behavior) = IMMUTABLE];
  Metadata metadata = 2;
  AISubscriptionSpec spec = 3;
  AISubscriptionStatus status = 4;
}
```

**Fields:**
| Field | Type | Mutability | Description |
|-------|------|------------|-------------|
| `id` | string | Immutable | Subscription ID (max 253 chars, max 246 if `create_auth_policy=true`) |
| `metadata` | Metadata | Mutable | Common metadata |
| `spec` | AISubscriptionSpec | Mutable | Desired state |
| `status` | AISubscriptionStatus | Server-set | Observed state |

---

#### AISubscriptionSpec
```protobuf
message AISubscriptionSpec {
  string display_name = 1 [(google.api.field_behavior) = REQUIRED];
  int32 priority = 2;
  Owner owner = 3 [(google.api.field_behavior) = REQUIRED];
  repeated ModelReference model_refs = 4 [(google.api.field_behavior) = REQUIRED];
  bool create_auth_policy = 5;
  MeteringMetadata metering_metadata = 6;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `display_name` | string | ✅ Yes | Human-readable name |
| `priority` | int32 | No | Inference priority (-1,000,000 to +1,000,000, default: 0) |
| `owner` | Owner | ✅ Yes | Subscription owner (groups + users) |
| `model_refs` | repeated ModelReference | ✅ Yes | Model references with rate limits (at least one) |
| `create_auth_policy` | bool | No | Auto-generate MaaSAuthPolicy |
| `metering_metadata` | MeteringMetadata | No | Billing integration metadata |

---

#### Owner
```protobuf
message Owner {
  repeated Group groups = 1 [(google.api.field_behavior) = REQUIRED];
  repeated User users = 2;
}

message Group {
  string name = 1 [(google.api.field_behavior) = REQUIRED];
}

message User {
  string name = 1 [(google.api.field_behavior) = REQUIRED];
}
```

**Owner Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `groups` | repeated Group | ✅ Yes | Owner groups (at least one required) |
| `users` | repeated User | No | Owner users (optional) |

**Group Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ Yes | Group name (e.g., "engineering") |

**User Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ Yes | Username or email |

---

#### ModelReference
```protobuf
message ModelReference {
  string name = 1 [(google.api.field_behavior) = REQUIRED];
  string namespace = 2;
  repeated TokenRateLimit token_rate_limits = 3 [(google.api.field_behavior) = REQUIRED];
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ Yes | Model ID (references AIModel resource) |
| `namespace` | string | No | Model namespace (defaults to subscription namespace) |
| `token_rate_limits` | repeated TokenRateLimit | ✅ Yes | Token rate limits (at least one required) |

---

#### TokenRateLimit
```protobuf
message TokenRateLimit {
  int64 limit = 1 [(google.api.field_behavior) = REQUIRED];
  google.protobuf.Duration window = 2 [(google.api.field_behavior) = REQUIRED];
}
```

**Fields:**
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `limit` | int64 | ✅ Yes | Token limit (1 to 1,000,000,000) | `100000`, `1000000` |
| `window` | Duration | ✅ Yes | Time window | `1h`, `5m`, `30s` |

---

#### MeteringMetadata
```protobuf
message MeteringMetadata {
  string customer_id = 1;
  string subscription_id = 2;
  string cost_center = 3;
  map<string, string> tags = 4;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `customer_id` | string | Customer billing ID |
| `subscription_id` | string | Subscription billing ID |
| `cost_center` | string | Cost center code |
| `tags` | map<string,string> | Additional billing tags |

---

#### AISubscriptionStatus
```protobuf
message AISubscriptionStatus {
  State state = 1;
  string phase = 2;
  string status_message = 3;
  repeated Condition conditions = 4;
  string generated_policy_name = 5;
  TokenUsageStats token_usage = 6;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `state` | State enum | Overall state |
| `phase` | string | Phase description ("Ready", "Pending", etc.) |
| `status_message` | string | Human-readable status |
| `conditions` | repeated Condition | Kubernetes-style conditions |
| `generated_policy_name` | string | Auto-generated policy name (if `create_auth_policy=true`) |
| `token_usage` | TokenUsageStats | Token usage statistics (from metering service) |

---

#### TokenUsageStats
```protobuf
message TokenUsageStats {
  int64 total_tokens = 1;
  map<string, int64> tokens_per_model = 2;
  google.protobuf.Timestamp last_usage_time = 3;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `total_tokens` | int64 | Total tokens consumed (current billing period) |
| `tokens_per_model` | map<string,int64> | Tokens consumed per model |
| `last_usage_time` | Timestamp | Last usage timestamp |

---

#### AISubscriptionInfo (Extended Get Response)
```protobuf
message AISubscriptionInfo {
  AISubscription subscription = 1;
  repeated AIModel models = 2;
  AuthPolicy auth_policy = 3;
  MeteringMetadata metering_metadata = 4;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `subscription` | AISubscription | The subscription object |
| `models` | repeated AIModel | Referenced models (joined from AIModels service) |
| `auth_policy` | AuthPolicy | Auto-generated auth policy (if exists) |
| `metering_metadata` | MeteringMetadata | Metering metadata |

**Note:** This is an extended response that joins related data from other services.

---

#### AuthPolicy
```protobuf
message AuthPolicy {
  string name = 1;
  string namespace = 2;
  repeated string subjects = 3;
  repeated string model_refs = 4;
  bool auto_generated = 5;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Policy name |
| `namespace` | string | Policy namespace |
| `subjects` | repeated string | Subjects (groups/users) |
| `model_refs` | repeated string | Model references |
| `auto_generated` | bool | Auto-generated by subscription (vs. manually created) |

---

#### CreateAISubscriptionRequest
```protobuf
message CreateAISubscriptionRequest {
  AISubscription object = 1 [(google.api.field_behavior) = REQUIRED];
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `object` | AISubscription | ✅ Yes | Subscription to create |

**Returns:** AISubscription object

---

#### UpdateAISubscriptionRequest
```protobuf
message UpdateAISubscriptionRequest {
  AISubscription object = 1 [(google.api.field_behavior) = REQUIRED];
  google.protobuf.FieldMask update_mask = 2;
  bool lock = 3;
}
```

**Fields:** Same pattern as `UpdateGridClusterRequest`

---

#### DeleteAISubscriptionRequest
```protobuf
message DeleteAISubscriptionRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  bool lock = 2;
  int32 version = 3;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Subscription ID to delete |
| `lock` | bool | No | Require version match |
| `version` | int32 | No | Expected version (for locking) |

---

#### DeleteAISubscriptionResponse
```protobuf
message DeleteAISubscriptionResponse {
  // Empty response
}
```

**Fields:** None

---

#### SignalAISubscriptionRequest
```protobuf
message SignalAISubscriptionRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  AISubscriptionStatus status = 2;
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Subscription ID |
| `status` | AISubscriptionStatus | No | Status update from controller |

**Returns:** AISubscription object

**Visibility:** Private API only

---

### OSAC - AISubscriptions Service

**Status:** ❌ **Does not exist**

No proto service for subscriptions in OSAC.

---

## Summary: Overall Coverage

| Service | AI Grid MVP | OSAC | Coverage | Action |
|---------|-------------|------|----------|--------|
| **Health** | ✅ Complete | ❌ Missing | 0% | Create new service |
| **GridClusters / Clusters** | ✅ Complete | ✅ Partial | 60% | Extend existing service |
| **Tenants** | ✅ Complete | ✅ Partial | ~80% | Verify + extend |
| **AIModels** | ✅ Complete | ❌ Missing | 0% | Create new service |
| **AISubscriptions** | ✅ Complete | ❌ Missing | 0% | Create new service |

**Overall Coverage:** ~28%

---

## Key Changes from Original Comparison

### ✅ Fixed: List Response Pattern

**All AI Grid MVP List responses now match OSAC's pattern:**

```protobuf
message ListXXXResponse {
  int32 size = 1;      // ← Now matches OSAC
  int32 total = 2;     // ← Same
  repeated XXX items = 3;  // ← Same
}
```

**Removed gratuitous differences:**
- ❌ Removed `offset` echo field
- ❌ Removed `limit` echo field

**Result:** Perfect alignment with OSAC's established conventions!

---

## Next Steps

1. ✅ **Read `osac/public/v1/tenant_type.proto`** to complete Tenants comparison
2. **Extend Clusters service** with AI Grid fields and RPCs
3. **Extend Tenants service** with Signal RPC (if domains/OIDC already exist)
4. **Create AIModels service** (new)
5. **Create AISubscriptions service** (new)
6. **Create Health service** (new, optional)

---

## References

- **AI Grid MVP gRPC API:** `/home/gmurthy/opensource/ai/osac-research/ai-grid-mvp-grpc-api-reference.md` (UPDATED)
- **OSAC Proto Directory:** `/home/gmurthy/opensource/ai/osac/proto/`
- **OSAC Clusters Service:** `osac/proto/public/osac/public/v1/clusters_service.proto`
- **OSAC Tenants Service:** `osac/proto/public/osac/public/v1/tenants_service.proto`
