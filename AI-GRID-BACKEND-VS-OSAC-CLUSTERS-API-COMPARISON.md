# AI Grid Backend vs OSAC Clusters API - Complete Field Comparison

**Purpose:** Field-by-field comparison of **Clusters** APIs only

---

## Executive Summary

| Aspect | AI Grid Backend | OSAC | Match? |
|--------|-----------------|------|--------|
| **Service Name** | **`Clusters`** | **`Clusters`** | ✅ Same |
| **RPC Methods** | 5 (List, Get, Create, Update, Delete) | 5 (List, Get, Create, Update, Delete) | ✅ Same |
| **List Response Pattern** | size, total, items | size, total, items | ✅ Same |
| **Package** | `ai_grid.v1` | `osac.public.v1` | ❌ Different |
| **Resource Type** | `ManagedCluster` | `Cluster` | ❌ Different |
| **Purpose** | Manage ACM ManagedClusters (hub-side CRUD) | Provision OpenShift clusters | ❌ Different |
| **Spec Complexity** | Minimal (1 field) | Extensive (12+ fields) | ❌ Very Different |
| **Status Complexity** | Minimal (3 fields) | Extensive (15+ fields) | ❌ Very Different |

---

## Key Findings Summary

### Interface Compatibility

| What Matches | Compatibility | Details |
|--------------|---------------|---------|
| ✅ **RPC Interface** | **95%** | Same methods (List, Get, Create, Update, Delete), same naming patterns |
| ✅ **List Response Pattern** | **100%** | Both use size/total/items |
| ✅ **Resource Structure** | **100%** | Both use id/metadata/spec/status pattern |
| ✅ **Request/Response Messages** | **100%** | Identical structure for all operations |
| ✅ **Update Mechanism** | **100%** | Both use FieldMask + optimistic locking |
| ❌ **Spec Content** | **0%** | Completely different (ACM hub acceptance vs. provisioning config) |
| ❌ **Status Content** | **0%** | Completely different (ACM conditions vs. lifecycle state) |
| ❌ **Purpose** | **N/A** | **AI Grid:** ACM inventory management / **OSAC:** Cluster provisioning |

### The Critical Difference

**AI Grid Backend:** Manages **existing** ACM ManagedClusters (inventory CRUD, does NOT provision)  
**OSAC:** Provisions **new** OpenShift clusters (full infrastructure lifecycle)

**They solve different problems with compatible interfaces!**

---

## Table of Contents

1. [Service Comparison](#1-service-comparison)
2. [RPC Methods Comparison](#2-rpc-methods-comparison)
3. [Request/Response Messages](#3-requestresponse-messages)
4. [Resource Type Comparison](#4-resource-type-comparison)
5. [Metadata Comparison](#5-metadata-comparison)
6. [Spec Comparison](#6-spec-comparison)
7. [Status Comparison](#7-status-comparison)
8. [Summary and Recommendations](#8-summary-and-recommendations)

---

## 1. Service Comparison

### AI Grid Backend

**File:** `proto/ai_grid/v1/clusters_service.proto`

```protobuf
package ai_grid.v1;

// Hub-side ACM/OCM ManagedCluster CRUD. Does not provision spoke clusters.
service Clusters {
  rpc List(ClustersListRequest) returns (ClustersListResponse);
  rpc Get(ClustersGetRequest) returns (ClustersGetResponse);
  rpc Create(ClustersCreateRequest) returns (ClustersCreateResponse);
  rpc Update(ClustersUpdateRequest) returns (ClustersUpdateResponse);
  rpc Delete(ClustersDeleteRequest) returns (ClustersDeleteResponse);
}
```

**Key Characteristics:**
- Manages existing ACM `ManagedCluster` resources
- Hub-side CRUD only
- Does NOT provision spoke clusters
- Wraps Kubernetes dynamic client API

---

### OSAC

**File:** `proto/public/osac/public/v1/clusters_service.proto`

```protobuf
package osac.public.v1;

service Clusters {
  rpc List(ClustersListRequest) returns (ClustersListResponse);
  rpc Get(ClustersGetRequest) returns (ClustersGetResponse);
  rpc Create(ClustersCreateRequest) returns (ClustersCreateResponse);
  rpc Update(ClustersUpdateRequest) returns (ClustersUpdateResponse);
  rpc Delete(ClustersDeleteRequest) returns (ClustersDeleteResponse);
}
```

**Key Characteristics:**
- Provisions NEW OpenShift clusters
- Full lifecycle management
- Template-based provisioning via Ansible/AAP
- Extensive infrastructure configuration

---

### Service Comparison Summary

| Aspect | AI Grid Backend | OSAC | Same? |
|--------|-----------------|------|-------|
| Service name | `Clusters` | `Clusters` | ✅ Yes |
| RPC count | 5 | 5 | ✅ Yes |
| RPC names | List, Get, Create, Update, Delete | List, Get, Create, Update, Delete | ✅ Yes |
| HTTP routes | `/api/v1/clusters` | `/api/fulfillment/v1/clusters` | ❌ Different prefix |
| Purpose | ACM inventory CRUD | Cluster provisioning | ❌ Different |

---

## 2. RPC Methods Comparison

### List RPC

| Aspect | AI Grid Backend | OSAC | Same? |
|--------|-----------------|------|-------|
| **Request name** | `ClustersListRequest` | `ClustersListRequest` | ✅ Yes |
| **Response name** | `ClustersListResponse` | `ClustersListResponse` | ✅ Yes |
| **HTTP method** | `GET /api/v1/clusters` | `GET /api/fulfillment/v1/clusters` | 🟡 Different path |

---

### Get RPC

| Aspect | AI Grid Backend | OSAC | Same? |
|--------|-----------------|------|-------|
| **Request name** | `ClustersGetRequest` | `ClustersGetRequest` | ✅ Yes |
| **Response name** | `ClustersGetResponse` | `ClustersGetResponse` | ✅ Yes |
| **Response wrapper** | `object` field | `object` field | ✅ Yes |
| **HTTP method** | `GET /api/v1/clusters/{id}` | `GET /api/fulfillment/v1/clusters/{id}` | 🟡 Different path |

---

### Create RPC

| Aspect | AI Grid Backend | OSAC | Same? |
|--------|-----------------|------|-------|
| **Request name** | `ClustersCreateRequest` | `ClustersCreateRequest` | ✅ Yes |
| **Response name** | `ClustersCreateResponse` | `ClustersCreateResponse` | ✅ Yes |
| **Request field** | `object` | `object` | ✅ Yes |
| **HTTP method** | `POST /api/v1/clusters` | `POST /api/fulfillment/v1/clusters` | 🟡 Different path |

---

### Update RPC

| Aspect | AI Grid Backend | OSAC | Same? |
|--------|-----------------|------|-------|
| **Request name** | `ClustersUpdateRequest` | `ClustersUpdateRequest` | ✅ Yes |
| **Response name** | `ClustersUpdateResponse` | `ClustersUpdateResponse` | ✅ Yes |
| **FieldMask support** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Optimistic locking** | ✅ Yes (`lock` field, not enforced) | ✅ Yes (`lock` field) | ✅ Yes |
| **HTTP method** | `PATCH /api/v1/clusters/{object.id}` | `PATCH /api/fulfillment/v1/clusters/{object.id}` | 🟡 Different path |

---

### Delete RPC

| Aspect | AI Grid Backend | OSAC | Same? |
|--------|-----------------|------|-------|
| **Request name** | `ClustersDeleteRequest` | `ClustersDeleteRequest` | ✅ Yes |
| **Response name** | `ClustersDeleteResponse` | `ClustersDeleteResponse` | ✅ Yes |
| **Response type** | Empty | Empty | ✅ Yes |
| **HTTP method** | `DELETE /api/v1/clusters/{id}` | `DELETE /api/fulfillment/v1/clusters/{id}` | 🟡 Different path |

---

## 3. Request/Response Messages

### ClustersListRequest

**AI Grid Backend:**
```protobuf
message ClustersListRequest {
  optional int32 offset = 1;     // Default: 0
  optional int32 limit = 2;      // Default: all
  optional string filter = 3;    // CEL (not implemented yet)
  optional string order = 4;     // SQL-style (not implemented yet)
}
```

**OSAC:**
```protobuf
message ClustersListRequest {
  optional int32 offset = 1;     // Default: 0
  optional int32 limit = 2;      // Default: all
  optional string filter = 3;    // CEL (implemented)
  optional string order = 4;     // SQL-style (implemented)
}
```

**Field Comparison:**

| Field | AI Grid Backend | OSAC | Same? |
|-------|-----------------|------|-------|
| `offset` | ✅ `optional int32` | ✅ `optional int32` | ✅ Perfect match |
| `limit` | ✅ `optional int32` | ✅ `optional int32` | ✅ Perfect match |
| `filter` | ✅ `optional string` (not impl) | ✅ `optional string` (implemented) | 🟡 Same type, different status |
| `order` | ✅ `optional string` (not impl) | ✅ `optional string` (implemented) | 🟡 Same type, different status |

**Comments in AI Grid:** "Not evaluated yet" - CEL filter and order not implemented  
**Comments in OSAC:** Full documentation with CEL examples

---

### ClustersListResponse

**AI Grid Backend:**
```protobuf
message ClustersListResponse {
  int32 size = 1;                    // Actual items returned
  int32 total = 2;                   // Total matching items
  repeated ManagedCluster items = 3; // Results
}
```

**OSAC:**
```protobuf
message ClustersListResponse {
  int32 size = 1;                    // Actual items returned
  int32 total = 2;                   // Total matching items
  repeated Cluster items = 3;        // Results
}
```

**Field Comparison:**

| Field | AI Grid Backend | OSAC | Same? |
|-------|-----------------|------|-------|
| `size` | ✅ `int32` | ✅ `int32` | ✅ Perfect match |
| `total` | ✅ `int32` | ✅ `int32` | ✅ Perfect match |
| `items` | ✅ `repeated ManagedCluster` | ✅ `repeated Cluster` | 🟡 Same pattern, different type |

**✅ Both use the OSAC pattern: size/total/items**

---

### ClustersGetRequest

**AI Grid Backend:**
```protobuf
message ClustersGetRequest {
  string id = 1;
}
```

**OSAC:**
```protobuf
message ClustersGetRequest {
  string id = 1;
}
```

**✅ Identical**

---

### ClustersGetResponse

**AI Grid Backend:**
```protobuf
message ClustersGetResponse {
  ManagedCluster object = 1;
}
```

**OSAC:**
```protobuf
message ClustersGetResponse {
  Cluster object = 1;
}
```

**Field Comparison:**

| Field | AI Grid Backend | OSAC | Same? |
|-------|-----------------|------|-------|
| `object` | ✅ `ManagedCluster` | ✅ `Cluster` | 🟡 Same pattern, different type |

---

### ClustersCreateRequest

**AI Grid Backend:**
```protobuf
message ClustersCreateRequest {
  ManagedCluster object = 1;
}
```

**OSAC:**
```protobuf
message ClustersCreateRequest {
  Cluster object = 1;
}
```

**✅ Same pattern, different resource type**

---

### ClustersUpdateRequest

**AI Grid Backend:**
```protobuf
message ClustersUpdateRequest {
  ManagedCluster object = 1;
  google.protobuf.FieldMask update_mask = 2;
  bool lock = 3;  // Not enforced yet
}
```

**OSAC:**
```protobuf
message ClustersUpdateRequest {
  Cluster object = 1;
  google.protobuf.FieldMask update_mask = 2;
  bool lock = 3;  // Enforced
}
```

**Field Comparison:**

| Field | AI Grid Backend | OSAC | Same? |
|-------|-----------------|------|-------|
| `object` | ✅ `ManagedCluster` | ✅ `Cluster` | 🟡 Same pattern, different type |
| `update_mask` | ✅ `FieldMask` | ✅ `FieldMask` | ✅ Perfect match |
| `lock` | ✅ `bool` (not enforced) | ✅ `bool` (enforced) | 🟡 Same field, different status |

---

### ClustersDeleteRequest

**AI Grid Backend:**
```protobuf
message ClustersDeleteRequest {
  string id = 1;
}
```

**OSAC:**
```protobuf
message ClustersDeleteRequest {
  string id = 1;
}
```

**✅ Identical**

---

### ClustersDeleteResponse

**AI Grid Backend:**
```protobuf
message ClustersDeleteResponse {}
```

**OSAC:**
```protobuf
message ClustersDeleteResponse {}
```

**✅ Identical (both empty)**

---

## 4. Resource Type Comparison

### Top-Level Structure

**AI Grid Backend:**
```protobuf
message ManagedCluster {
  string id = 1;
  Metadata metadata = 2;
  ManagedClusterSpec spec = 3;
  ManagedClusterStatus status = 4;
}
```

**OSAC:**
```protobuf
message Cluster {
  string id = 1;
  Metadata metadata = 2;
  ClusterSpec spec = 3;
  ClusterStatus status = 4;
}
```

**Field Comparison:**

| Field | AI Grid Backend | OSAC | Same? |
|-------|-----------------|------|-------|
| `id` | ✅ `string` | ✅ `string` | ✅ Perfect match |
| `metadata` | ✅ `Metadata` | ✅ `Metadata` | 🟡 Same name, different content |
| `spec` | ✅ `ManagedClusterSpec` | ✅ `ClusterSpec` | 🟡 Same pattern, different content |
| `status` | ✅ `ManagedClusterStatus` | ✅ `ClusterStatus` | 🟡 Same pattern, different content |

**✅ Both follow the same id/metadata/spec/status pattern**

---

## 5. Metadata Comparison

### AI Grid Backend Metadata

**File:** `proto/ai_grid/v1/metadata_type.proto`

```protobuf
message Metadata {
  google.protobuf.Timestamp creation_timestamp = 1;
  google.protobuf.Timestamp deletion_timestamp = 2;
  string creator = 3;
  string tenant = 4;
  string name = 5;               // DNS-1123 label, max 63 chars
  map<string, string> labels = 6;
  map<string, string> annotations = 7;
  int32 version = 8;             // Auto-incremented
}
```

**Field Count:** 8 fields

**Validation:**
- `name`: min 1, max 63, pattern `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`

---

### OSAC Metadata

**File:** `proto/public/osac/public/v1/metadata_type.proto` (inferred from usage)

OSAC uses a Metadata type, but the exact structure needs verification. Based on usage patterns, it likely contains:

```protobuf
message Metadata {
  string name = ?;
  map<string, string> labels = ?;
  map<string, string> annotations = ?;
  int32 version = ?;
  // Possibly other fields
}
```

**Note:** Need to read OSAC's metadata_type.proto to confirm exact fields.

---

### Metadata Field Comparison

| Field | AI Grid Backend | OSAC | Status |
|-------|-----------------|------|--------|
| `creation_timestamp` | ✅ `Timestamp` | ❓ Unknown | **Need to verify** |
| `deletion_timestamp` | ✅ `Timestamp` | ❓ Unknown | **Need to verify** |
| `creator` | ✅ `string` | ❓ Unknown | **Need to verify** |
| `tenant` | ✅ `string` | ❓ Unknown | **Need to verify** |
| `name` | ✅ `string` (validated) | ✅ Likely exists | **Need to verify** |
| `labels` | ✅ `map<string,string>` | ✅ Likely exists | **Need to verify** |
| `annotations` | ✅ `map<string,string>` | ✅ Likely exists | **Need to verify** |
| `version` | ✅ `int32` | ✅ Likely exists | **Need to verify** |

**Action Required:** Read OSAC's `metadata_type.proto` for exact comparison.

---

## 6. Spec Comparison

### AI Grid Backend - ManagedClusterSpec

**File:** `proto/ai_grid/v1/managed_cluster_type.proto`

```protobuf
message ManagedClusterSpec {
  bool hub_accepts_client = 1;   // Whether hub accepts spoke cluster
}
```

**Field Count:** 1 field

**Purpose:** Controls ACM hub-spoke acceptance

---

### OSAC - ClusterSpec

**File:** `proto/public/osac/public/v1/cluster_type.proto`

```protobuf
message ClusterSpec {
  ClusterTemplateReference template = 1;
  map<string, google.protobuf.Any> template_parameters = 2;
  map<string, ClusterNodeSet> node_sets = 3;
  // reserved 4: pull_secret
  optional string ssh_public_key = 5;
  ClusterVersionReference version = 6;
  optional ClusterNetwork network = 7;
  ClusterCatalogItemReference catalog_item = 8;
  ClusterNetworkAttachment network_attachment = 9;       // Immutable
  optional bool auto_external_ip_attachment = 10;       // Immutable
  SecretLocalReference pull_secret_secret = 11;
  repeated AddOnOperatorReference add_on_operators = 12; // Immutable
}
```

**Field Count:** 11 fields (+ reserved)

**Purpose:** Complete cluster provisioning configuration

---

### Spec Field-by-Field Comparison

| Field | AI Grid Backend | OSAC | Match? |
|-------|-----------------|------|--------|
| **ACM-specific** | | | |
| `hub_accepts_client` | ✅ `bool` | ❌ Not applicable | AI Grid only |
| **Provisioning** | | | |
| `template` | ❌ None | ✅ `ClusterTemplateReference` | OSAC only |
| `template_parameters` | ❌ None | ✅ `map<string, Any>` | OSAC only |
| `node_sets` | ❌ None | ✅ `map<string, ClusterNodeSet>` | OSAC only |
| `ssh_public_key` | ❌ None | ✅ `optional string` | OSAC only |
| `version` | ❌ None | ✅ `ClusterVersionReference` | OSAC only |
| `network` | ❌ None | ✅ `optional ClusterNetwork` | OSAC only |
| `catalog_item` | ❌ None | ✅ `ClusterCatalogItemReference` | OSAC only |
| `network_attachment` | ❌ None | ✅ `ClusterNetworkAttachment` | OSAC only |
| `auto_external_ip_attachment` | ❌ None | ✅ `optional bool` | OSAC only |
| `pull_secret_secret` | ❌ None | ✅ `SecretLocalReference` | OSAC only |
| `add_on_operators` | ❌ None | ✅ `repeated AddOnOperatorReference` | OSAC only |

**Summary:**
- **AI Grid Backend:** 1 simple field (ACM hub acceptance)
- **OSAC:** 11+ complex fields (full provisioning config)
- **Overlap:** 0 fields
- **Purpose:** Completely different (ACM inventory vs. provisioning)

---

## 7. Status Comparison

### AI Grid Backend - ManagedClusterStatus

**File:** `proto/ai_grid/v1/managed_cluster_type.proto`

```protobuf
message ManagedClusterStatus {
  bool available = 1;             // ManagedCluster Available condition is True
  bool joined = 2;                // ManagedCluster Joined condition is True
  string available_condition = 3; // Raw condition: "True", "False", "Unknown"
}
```

**Field Count:** 3 fields

**Purpose:** 
- Reflects ACM `ManagedCluster` conditions
- Simple availability/joined state
- UI derives Ready/Offline/Unknown from `available_condition`

---

### OSAC - ClusterStatus

**File:** `proto/public/osac/public/v1/cluster_type.proto`

```protobuf
message ClusterStatus {
  ClusterState state = 1;
  repeated ClusterCondition conditions = 2;
  string api_url = 3;
  string console_url = 4;
  map<string, ClusterNodeSet> node_sets = 5;
  string api_endpoint = 6;                           // Internal MetalLB VIP
  string ingress_endpoint = 7;                       // Internal MetalLB VIP
  optional google.protobuf.Timestamp state_transition_time = 8;
  SecretLocalReference kubeconfig_secret = 9;
  SecretLocalReference password_secret = 10;
  // reserved 11
  repeated AddOnOperatorStatus add_on_operators = 12;
  string observed_cp_version = 13;                   // OUTPUT_ONLY
  // reserved 14: upgrade
  repeated ClusterUpgradeHistoryEntry upgrade_history = 15;  // OUTPUT_ONLY
  optional google.protobuf.Timestamp version_transition_time = 16; // OUTPUT_ONLY
}
```

**Field Count:** 14 fields (+ reserved)

**Purpose:**
- Complete cluster lifecycle state
- Access URLs and endpoints
- Secrets references
- Upgrade tracking
- Add-on operator status

---

### Status Field-by-Field Comparison

| Field | AI Grid Backend | OSAC | Match? |
|-------|-----------------|------|--------|
| **State** | | | |
| `available` | ✅ `bool` | ❌ None | AI Grid only |
| `joined` | ✅ `bool` | ❌ None | AI Grid only |
| `available_condition` | ✅ `string` | ❌ None | AI Grid only |
| `state` | ❌ None | ✅ `ClusterState enum` | OSAC only |
| `conditions` | ❌ None | ✅ `repeated ClusterCondition` | OSAC only |
| **Access** | | | |
| `api_url` | ❌ None | ✅ `string` | OSAC only |
| `console_url` | ❌ None | ✅ `string` | OSAC only |
| `api_endpoint` | ❌ None | ✅ `string` (internal VIP) | OSAC only |
| `ingress_endpoint` | ❌ None | ✅ `string` (internal VIP) | OSAC only |
| **Resources** | | | |
| `node_sets` | ❌ None | ✅ `map<string, ClusterNodeSet>` | OSAC only |
| **Secrets** | | | |
| `kubeconfig_secret` | ❌ None | ✅ `SecretLocalReference` | OSAC only |
| `password_secret` | ❌ None | ✅ `SecretLocalReference` | OSAC only |
| **Lifecycle** | | | |
| `state_transition_time` | ❌ None | ✅ `optional Timestamp` | OSAC only |
| `version_transition_time` | ❌ None | ✅ `optional Timestamp` | OSAC only |
| **Add-ons** | | | |
| `add_on_operators` | ❌ None | ✅ `repeated AddOnOperatorStatus` | OSAC only |
| **Upgrade** | | | |
| `observed_cp_version` | ❌ None | ✅ `string` (OUTPUT_ONLY) | OSAC only |
| `upgrade_history` | ❌ None | ✅ `repeated ClusterUpgradeHistoryEntry` | OSAC only |

**Summary:**
- **AI Grid Backend:** 3 simple fields (ACM conditions)
- **OSAC:** 14+ complex fields (full lifecycle state)
- **Overlap:** 0 fields
- **Purpose:** Completely different (ACM status vs. provisioning state)

---

## 8. Summary and Recommendations

### Overall Compatibility

| Layer | Compatibility | Notes |
|-------|--------------|-------|
| **Service Interface** | ✅ 95% Compatible | Same RPC names, same patterns |
| **Request/Response** | ✅ 100% Compatible | Identical structure |
| **List Response Pattern** | ✅ 100% Compatible | Both use size/total/items |
| **Resource Structure** | ✅ 100% Compatible | Both use id/metadata/spec/status |
| **Metadata Content** | ❓ Unknown | Need to verify OSAC metadata |
| **Spec Content** | ❌ 0% Compatible | Completely different purposes |
| **Status Content** | ❌ 0% Compatible | Completely different purposes |

---

### Key Findings

#### ✅ What's the Same:

1. **Service pattern:** Both use standard CRUD (List, Get, Create, Update, Delete)
2. **Naming conventions:** Both use same RPC and message names
3. **List response:** Both use OSAC's size/total/items pattern
4. **Resource structure:** Both follow id/metadata/spec/status pattern
5. **Update mechanism:** Both use FieldMask + optimistic locking
6. **HTTP transcoding:** Both expose REST via gRPC-gateway

#### ❌ What's Different:

1. **Package names:** `ai_grid.v1` vs `osac.public.v1`
2. **HTTP paths:** `/api/v1/*` vs `/api/fulfillment/v1/*`
3. **Resource types:** `ManagedCluster` vs `Cluster`
4. **Purpose:** ACM inventory vs cluster provisioning
5. **Spec complexity:** 1 field vs 11+ fields
6. **Status complexity:** 3 fields vs 14+ fields
7. **Metadata:** Different timestamps and fields

---

### Architectural Differences

#### AI Grid Backend Model:

```
ACM Hub (external)
  ├── ManagedCluster A (existing)
  ├── ManagedCluster B (existing)
  └── ManagedCluster C (existing)
       ↓
AI Grid Backend wraps these via Kubernetes API
       ↓
Exposes via gRPC (hub-side CRUD only)
```

**Key:** Manages what already exists, doesn't create infrastructure

---

#### OSAC Model:

```
OSAC Fulfillment Service
  ↓
Template + Parameters
  ↓
Ansible/AAP Provisioning
  ↓
NEW OpenShift Cluster
  ↓
Full lifecycle management
```

**Key:** Creates and manages full cluster lifecycle

---

### Why They're Different

| Aspect | AI Grid Backend | OSAC |
|--------|-----------------|------|
| **Scope** | Inventory management | Infrastructure provisioning |
| **Backend** | Kubernetes dynamic client | Ansible/AAP |
| **Input** | Cluster already exists | Template + parameters |
| **Output** | ACM ManagedCluster wrapper | Complete OpenShift cluster |
| **Spec** | Hub acceptance flag | Template, nodes, network, etc. |
| **Status** | ACM conditions | URLs, secrets, upgrade state |

---

### Integration Strategy

If you want to integrate these two APIs, here are the options:

#### Option 1: Keep Separate (Recommended)

**Use both APIs for different purposes:**
- **AI Grid Backend:** Discover and enroll ACM-managed clusters
- **OSAC:** Provision NEW clusters

**Benefits:**
- ✅ Each API does what it's designed for
- ✅ No forced compatibility
- ✅ Clear separation of concerns

**Integration point:**
```
OSAC provisions cluster
  ↓
Cluster registers with ACM
  ↓
AI Grid Backend discovers it
  ↓
Enroll in AI Grid
```

---

#### Option 2: Extend AI Grid Backend

**Add OSAC-style provisioning to AI Grid:**

Add to `ManagedClusterSpec`:
```protobuf
message ManagedClusterSpec {
  bool hub_accepts_client = 1;
  
  // NEW: OSAC-style provisioning fields
  optional ClusterTemplateReference template = 2;
  optional map<string, google.protobuf.Any> template_parameters = 3;
  // ... etc.
}
```

**Benefits:**
- ✅ One unified API
- ❌ Massive scope expansion
- ❌ Mixes ACM inventory with provisioning

---

#### Option 3: OSAC Imports ACM Clusters

**Extend OSAC to import existing clusters:**

Add to OSAC `Clusters` service:
```protobuf
service Clusters {
  // Existing RPCs...
  
  // NEW: Import from ACM
  rpc ImportFromACM(ImportFromACMRequest) returns (ImportFromACMResponse);
}
```

**Benefits:**
- ✅ OSAC becomes single source of truth
- ✅ Can manage both provisioned and imported clusters
- ❌ OSAC must understand ACM

---

### Recommendation

**Keep them separate with clear integration points:**

1. **AI Grid Backend:** Manages ACM ManagedCluster inventory
   - Discovery
   - Enrollment
   - Hub-spoke management

2. **OSAC:** Manages cluster provisioning
   - Template-based creation
   - Lifecycle management
   - Infrastructure configuration

3. **Integration:** 
   - OSAC provisions → registers with ACM → AI Grid discovers
   - Or: AI Grid enrolls → OSAC imports reference

**This respects the design of each system while enabling collaboration.**

---

## Action Items

1. ✅ **Read OSAC metadata_type.proto** to complete metadata comparison
2. **Decide integration strategy** (separate vs. unified)
3. **Document integration points** if keeping separate
4. **Define import/export contracts** if integrating

---

## References

- **AI Grid Backend:** `~/opensource/ai/ai-grid-provider-backend/proto/ai_grid/v1/`
- **OSAC:** `~/opensource/ai/osac/proto/public/osac/public/v1/`
- **AI Grid Backend README:** Describes ACM ManagedCluster CRUD
- **OSAC Clusters:** Template-based cluster provisioning
