# AI Grid Backend vs OSAC Clusters gRPC API — Field-by-Field Comparison

**Purpose:** Compare the gRPC service definitions, Protobuf messages, resource
fields, and relevant server behavior for Clusters in AI Grid Provider Backend
and OSAC Fulfillment.

**Scope:** AI Grid's `ai_grid.v1.Clusters` service versus OSAC's public
`osac.public.v1.Clusters` service. The comparison covers gRPC service descriptors,
request/response Protobuf schemas, resource fields, and gRPC handler behavior.

**Sources checked:**

- AI Grid protos: `ai-grid-provider-backend/proto/ai_grid/v1/`
- AI Grid implementation: `ai-grid-provider-backend/internal/servers/clusters_server.go`
- OSAC public protos: `osac/proto/public/osac/public/v1/`
- OSAC proto source of truth: `osac/proto/private/osac/private/v1/`
- OSAC Cluster server: `osac/fulfillment-service/internal/servers/clusters_server.go`
- OSAC generic update behavior: `osac/fulfillment-service/internal/servers/generic_server.go`

OSAC public protos are generated from private protos. Runtime notes reflect the
implementation checked for this document and may change independently of the
proto contracts.

---

## Executive Summary

| Aspect | AI Grid Backend | OSAC | Match? |
|---|---|---|---|
| Fully qualified gRPC service | `ai_grid.v1.Clusters` | `osac.public.v1.Clusters` | ❌ Different |
| Standard RPCs | List, Get, Create, Update, Delete | List, Get, Create, Update, Delete | ✅ Same method names |
| List request fields | offset, limit, filter, order | offset, limit, filter, order | 🟡 Same schema; filter/order behavior differs |
| List response | size, total, items | size, total, items | 🟡 Same pattern; item types differ |
| Resource | `ManagedCluster` | `Cluster` | ❌ Different type and purpose |
| Top-level resource shape | id, metadata, spec, status | id, metadata, spec, status | ✅ Same pattern |
| Metadata | 8 fields | 11 public fields | 🟡 First 8 fields match; OSAC adds 3 |
| Spec | 1 ACM hub-acceptance field | 11 provisioning fields | ❌ Different |
| Status | 4 ACM/policy state fields | 14 lifecycle fields | ❌ Different |
| Provisioning responsibility | Manages hub `ManagedCluster` resources; does not provision spoke infrastructure | Manages OSAC cluster fulfillment lifecycle | ❌ Different |
| Drop-in gRPC compatibility | No | No | ❌ Different service and resource contracts |

**Bottom line:** The method names and high-level CRUD message pattern are
similar, but these are separate gRPC contracts. Their fully qualified service
names, resource types, specs, statuses, and server behavior differ.

---

## Table of Contents

1. [gRPC Service and Method Comparison](#1-grpc-service-and-method-comparison)
2. [Request and Response Field Comparison](#2-request-and-response-field-comparison)
3. [Top-Level Resource Comparison](#3-top-level-resource-comparison)
4. [Metadata Field Comparison](#4-metadata-field-comparison)
5. [Spec Field Comparison](#5-spec-field-comparison)
6. [Status Field Comparison](#6-status-field-comparison)
7. [gRPC Compatibility and Runtime Semantics](#7-grpc-compatibility-and-runtime-semantics)
8. [Summary](#8-summary)

---

## 1. gRPC Service and Method Comparison

### AI Grid Backend

**File:** `ai-grid-provider-backend/proto/ai_grid/v1/clusters_service.proto`

```protobuf
package ai_grid.v1;

service Clusters {
  rpc List(ClustersListRequest) returns (ClustersListResponse);
  rpc Get(ClustersGetRequest) returns (ClustersGetResponse);
  rpc Create(ClustersCreateRequest) returns (ClustersCreateResponse);
  rpc Update(ClustersUpdateRequest) returns (ClustersUpdateResponse);
  rpc Delete(ClustersDeleteRequest) returns (ClustersDeleteResponse);
}
```

### OSAC public API

**File:** `osac/proto/public/osac/public/v1/clusters_service.proto`

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

### Method comparison

| Method | AI Grid signature | OSAC signature | Match? |
|---|---|---|---|
| `List` | `List(ClustersListRequest) returns (ClustersListResponse)` | Same message names, OSAC package | 🟡 Names/pattern match; request behavior and item type differ |
| `Get` | `Get(ClustersGetRequest) returns (ClustersGetResponse)` | Same message names, OSAC package | 🟡 Wrapper pattern matches; resource type differs |
| `Create` | `Create(ClustersCreateRequest) returns (ClustersCreateResponse)` | Same message names, OSAC package | 🟡 Wrapper pattern matches; create semantics differ |
| `Update` | `Update(ClustersUpdateRequest) returns (ClustersUpdateResponse)` | Same message names, OSAC package | 🟡 Shape matches; lock and update semantics differ |
| `Delete` | `Delete(ClustersDeleteRequest) returns (ClustersDeleteResponse)` | Same message names, OSAC package | 🟡 Request/response shape matches; deletion target and lifecycle differ |

The method names are the same, but gRPC identifies a method by its fully
qualified service name and method name. For example:

- AI Grid: `ai_grid.v1.Clusters/List`
- OSAC: `osac.public.v1.Clusters/List`

A client generated for one service cannot call the other merely because both
services are named `Clusters`.

---

## 2. Request and Response Field Comparison

### `ClustersListRequest`

| Field | AI Grid | OSAC | Match? |
|---|---|---|---|
| `offset` = 1 | `optional int32` | `optional int32` | ✅ Same field number and type |
| `limit` = 2 | `optional int32` | `optional int32` | ✅ Same field number and type |
| `filter` = 3 | `optional string`; CEL not evaluated | `optional string`; CEL filter documented | 🟡 Same schema, different support |
| `order` = 4 | `optional string`; not evaluated | `optional string`; ordering documented | 🟡 Same schema, different support |

AI Grid's Clusters server applies offset and limit but currently does not
interpret filter or order. OSAC documents CEL filtering and ordering and passes
the request through its fulfillment list implementation. Identical Protobuf
fields therefore do not imply identical query behavior.

### `ClustersListResponse`

| Field | AI Grid | OSAC | Match? |
|---|---|---|---|
| `size` = 1 | `int32` | `int32` | ✅ Same |
| `total` = 2 | `int32` | `int32` | ✅ Same |
| `items` = 3 | `repeated ManagedCluster` | `repeated Cluster` | 🟡 Same pattern, different item type |

### `ClustersGetRequest`

| Field | AI Grid | OSAC | Match? |
|---|---|---|---|
| `id` = 1 | `string`; hub `ManagedCluster` ID/name | `string`; OSAC Cluster ID | 🟡 Same scalar field, different resource identity |

### `ClustersGetResponse`

| Field | AI Grid | OSAC | Match? |
|---|---|---|---|
| `object` = 1 | `ManagedCluster` | `Cluster` | 🟡 Same response wrapper, different resource type |

### `ClustersCreateRequest`

| Field | AI Grid | OSAC | Match? |
|---|---|---|---|
| `object` = 1 | `ManagedCluster` | `Cluster` | 🟡 Same wrapper, different resource and create purpose |

### `ClustersCreateResponse`

| Field | AI Grid | OSAC | Match? |
|---|---|---|---|
| `object` = 1 | `ManagedCluster` | `Cluster` | 🟡 Same wrapper, different resource type |

### `ClustersUpdateRequest`

| Field | AI Grid | OSAC | Match? |
|---|---|---|---|
| `object` = 1 | `ManagedCluster` | `Cluster` | 🟡 Different resource type |
| `update_mask` = 2 | `google.protobuf.FieldMask` | `google.protobuf.FieldMask` | ✅ Same type and field number |
| `lock` = 3 | `bool`; nonzero version is checked even if false; true requires version | `bool`; private generic server compares versions when true | 🟡 Same field, different behavior |

AI Grid's handler updates selected hub-managed fields (labels, annotations, and
`spec.hub_accepts_client`). Its version check and Kubernetes patch precondition
apply when the request carries a nonzero metadata version; `lock=true` requires
that version. OSAC's generic update implementation performs its optimistic-lock
comparison when `lock=true` and applies the field mask to the stored Cluster.

### `ClustersUpdateResponse`

| Field | AI Grid | OSAC | Match? |
|---|---|---|---|
| `object` = 1 | `ManagedCluster` | `Cluster` | 🟡 Same wrapper, different resource type |

### `ClustersDeleteRequest`

| Field | AI Grid | OSAC | Match? |
|---|---|---|---|
| `id` = 1 | `string`; hub `ManagedCluster` ID/name | `string`; OSAC Cluster ID | 🟡 Same scalar field, different resource identity |

### `ClustersDeleteResponse`

Both response messages are empty:

```protobuf
message ClustersDeleteResponse {}
```

The Protobuf message shape matches. The operation semantics differ: AI Grid
deletes a hub `ManagedCluster` resource, while OSAC deletes an OSAC-managed
Cluster and coordinates its fulfillment lifecycle.

---

## 3. Top-Level Resource Comparison

### AI Grid `ManagedCluster`

**File:** `ai-grid-provider-backend/proto/ai_grid/v1/managed_cluster_type.proto`

```protobuf
message ManagedCluster {
  string id = 1;
  Metadata metadata = 2;
  ManagedClusterSpec spec = 3;
  ManagedClusterStatus status = 4;
}
```

### OSAC `Cluster`

**File:** `osac/proto/public/osac/public/v1/cluster_type.proto`

```protobuf
message Cluster {
  string id = 1;
  Metadata metadata = 2;
  ClusterSpec spec = 3;
  ClusterStatus status = 4;
}
```

### Top-level field-by-field comparison

| Field | AI Grid | OSAC | Match? |
|---|---|---|---|
| `id` = 1 | `string`; for hub CRs equals `metadata.name` | `string`; identifies an OSAC Cluster resource | ✅ Same primitive type; semantics differ |
| `metadata` = 2 | `ai_grid.v1.Metadata` | `osac.public.v1.Metadata` | 🟡 Common fields overlap; OSAC has additional public fields |
| `spec` = 3 | `ManagedClusterSpec` | `ClusterSpec` | ❌ Different fields and purpose |
| `status` = 4 | `ManagedClusterStatus` | `ClusterStatus` | ❌ Different fields and lifecycle model |

Both follow the `id`/`metadata`/`spec`/`status` convention. The shared
structure is not a shared resource definition.

---

## 4. Metadata Field Comparison

AI Grid uses `ai_grid.v1.Metadata`; OSAC's public Cluster uses
`osac.public.v1.Metadata`.

### Common metadata fields

| Field number | Field | AI Grid type | OSAC public type | Match? |
|---:|---|---|---|---|
| 1 | `creation_timestamp` | `google.protobuf.Timestamp` | `google.protobuf.Timestamp` | ✅ |
| 2 | `deletion_timestamp` | `google.protobuf.Timestamp` | `google.protobuf.Timestamp` | ✅ |
| 3 | `creator` | `string` | `string` | ✅ |
| 4 | `tenant` | `string` | `string` | ✅ |
| 5 | `name` | `string` | `string` | ✅ Same field number/type and RFC 1123 validation |
| 6 | `labels` | `map<string, string>` | `map<string, string>` | ✅ |
| 7 | `annotations` | `map<string, string>` | `map<string, string>` | ✅ |
| 8 | `version` | `int32` | `int32` | ✅ |

### OSAC-only public metadata fields

| Field number | Field | Type | AI Grid equivalent? |
|---:|---|---|---|
| 9 | `project` | `string` | ❌ None |
| 10 | `display_name` | `string` | ❌ None |
| 11 | `description` | `string` | ❌ None |

OSAC private Metadata also contains a private `finalizers` field at field 12; it
is not part of the public Clusters gRPC resource. AI Grid Metadata has eight
fields.

The first eight metadata fields match structurally, but metadata behavior and
server population can still differ between the Kubernetes-backed AI Grid
resource and OSAC's persisted fulfillment resource.

---

## 5. Spec Field Comparison

### AI Grid `ManagedClusterSpec`

**Purpose:** Desired state for a hub-side ACM `ManagedCluster`.

| Field number | Field | Type | Meaning |
|---:|---|---|---|
| 1 | `hub_accepts_client` | `bool` | Whether the hub accepts the spoke cluster client. |

**Active field count:** 1

### OSAC `ClusterSpec`

**Purpose:** Desired configuration for OSAC Cluster fulfillment.

| Field number | Field | Type | Meaning |
|---:|---|---|---|
| 1 | `template` | `ClusterTemplateReference` | Cluster template reference. |
| 2 | `template_parameters` | `map<string, google.protobuf.Any>` | Template parameter values. |
| 3 | `node_sets` | `map<string, ClusterNodeSet>` | Desired cluster node sets. |
| 4 | Reserved | — | Previously reserved field; not in use. |
| 5 | `ssh_public_key` | `optional string` | SSH key installed on worker nodes. |
| 6 | `version` | `ClusterVersionReference` | Desired control-plane version. |
| 7 | `network` | `optional ClusterNetwork` | Cluster network configuration. |
| 8 | `catalog_item` | `ClusterCatalogItemReference` | Catalog item provenance/configuration. |
| 9 | `network_attachment` | `ClusterNetworkAttachment` | Tenant network attachment. |
| 10 | `auto_external_ip_attachment` | `optional bool` | Whether to create ExternalIP attachments automatically. |
| 11 | `pull_secret_secret` | `SecretLocalReference` | Reference to the pull-secret resource. |
| 12 | `add_on_operators` | `repeated AddOnOperatorReference` | Requested add-on operators. |

**Active field count:** 11 (field 4 is reserved).

### Spec summary

| Comparison | Result |
|---|---|
| Shared field numbers with equivalent meaning | None |
| AI Grid fields | One ACM hub acceptance flag |
| OSAC fields | Template, parameters, node sets, version, networking, catalog, credentials, and add-ons |
| Can one spec be passed to the other service as-is? | No |

---

## 6. Status Field Comparison

### AI Grid `ManagedClusterStatus`

| Field number | Field | Type | Meaning |
|---:|---|---|---|
| 1 | `available` | `bool` | True when ACM `Available` condition is true. |
| 2 | `joined` | `bool` | True when ACM `Joined` condition is true. |
| 3 | `available_condition` | `string` | Raw ACM Available condition (`True`, `False`, `Unknown`, or empty). |
| 4 | `provisioning` | `string` | AI Grid-ready Policy compliance: `Compliant`, `NonCompliant`, `Pending`, or empty when unavailable/not covered. |

**Active field count:** 4

The `provisioning` field is derived from ACM Policy status. It reports a policy
observation; it does not mean the AI Grid backend provisions cluster
infrastructure.

### OSAC `ClusterStatus`

| Field number | Field | Type | Meaning |
|---:|---|---|---|
| 1 | `state` | `ClusterState` enum | Overall Cluster state. |
| 2 | `conditions` | `repeated ClusterCondition` | Detailed state conditions. |
| 3 | `api_url` | `string` | External API URL. |
| 4 | `console_url` | `string` | Cluster console URL. |
| 5 | `node_sets` | `map<string, ClusterNodeSet>` | Observed node-set state. |
| 6 | `api_endpoint` | `string` | Internal API endpoint. |
| 7 | `ingress_endpoint` | `string` | Internal ingress endpoint. |
| 8 | `state_transition_time` | `optional google.protobuf.Timestamp` | Time of state transition. |
| 9 | `kubeconfig_secret` | `SecretLocalReference` | Kubeconfig Secret reference. |
| 10 | `password_secret` | `SecretLocalReference` | Password Secret reference. |
| 11 | Reserved | — | Not in use. |
| 12 | `add_on_operators` | `repeated AddOnOperatorStatus` | Add-on installation state. |
| 13 | `observed_cp_version` | `string` | Observed control-plane version; output-only. |
| 14 | Reserved | — | Not in use. |
| 15 | `upgrade_history` | `repeated ClusterUpgradeHistoryEntry` | Upgrade history; output-only. |
| 16 | `version_transition_time` | `optional google.protobuf.Timestamp` | Version-change timestamp; output-only. |

**Active field count:** 14 (fields 11 and 14 are reserved).

### Status comparison summary

| Comparison | AI Grid | OSAC |
|---|---|---|
| Primary state model | ACM Available/Joined conditions and Policy compliance | OSAC Cluster state and conditions |
| Access information | Not represented | API/console URLs and internal endpoints |
| Credentials | Not represented in this status | Secret references for kubeconfig/password |
| Node sets/add-ons/upgrades | Not represented | Represented in status |
| Direct field mapping | None | None |

---

## 7. gRPC Compatibility and Runtime Semantics

### Protobuf and gRPC compatibility

The APIs are not drop-in compatible, even though their method and message names
look alike:

1. The fully qualified service names differ: `ai_grid.v1.Clusters` versus
   `osac.public.v1.Clusters`.
2. Request/response fields that contain a resource use different Protobuf
   message types (`ManagedCluster` versus `Cluster`).
3. The resource specs and statuses have different fields and meanings.
4. The same scalar `id` field refers to different resource identities.
5. Similar request shape does not guarantee the same list, lock, or lifecycle
   semantics.

### AI Grid server behavior

AI Grid's Clusters server uses a Kubernetes dynamic client for hub
`ManagedCluster` objects. It can list/get/create/update/delete those resources.
It does not provision spoke-cluster infrastructure. List applies offset/limit;
filter/order are not evaluated. Update supports selected hub labels,
annotations, and `hub_accepts_client` changes. A nonzero submitted version is
checked for staleness; `lock=true` requires a version.

### OSAC gRPC behavior

OSAC's public Clusters service manages OSAC Cluster fulfillment resources. The
proto documents Create as a server-side operation; regular users create
clusters indirectly through a Cluster Order. OSAC's lifecycle/status model
includes provisioning configuration and observed cluster state. Its generic
update server applies field masks and checks versions when `lock=true`.

---

## 8. Summary

### What matches structurally

1. Both gRPC services are named `Clusters` and define List/Get/Create/Update/Delete.
2. List requests use `offset`, `limit`, `filter`, and `order` at matching field
   numbers and types.
3. List responses use `size`, `total`, and `items`.
4. Get/Create/Update use an `object` wrapper; Delete uses an ID and an empty
   response.
5. Both resources use the high-level `id`, `metadata`, `spec`, `status` shape.
6. The first eight public Metadata fields have matching numbers and types.

### What differs

1. Protobuf package and fully qualified gRPC service name.
2. Resource type (`ManagedCluster` vs `Cluster`) and ID semantics.
3. List filter/order implementation.
4. Update lock behavior and mutable fields.
5. Metadata field count (8 vs 11 public fields).
6. Spec contents (ACM hub acceptance vs full OSAC cluster configuration).
7. Status contents (ACM/Policy state vs OSAC lifecycle and cluster details).
8. Responsibility (hub resource CRUD vs OSAC cluster fulfillment).

### Integration recommendation

Treat the APIs as separate gRPC contracts. If they need to interoperate, define a
translation/integration layer with explicit identity mapping, lifecycle
ownership, status mapping, and error/concurrency behavior. Do not reuse generated
clients or pass resource messages between the services without that adaptation.

---

## References

- AI Grid Clusters service: `ai-grid-provider-backend/proto/ai_grid/v1/clusters_service.proto`
- AI Grid ManagedCluster type: `ai-grid-provider-backend/proto/ai_grid/v1/managed_cluster_type.proto`
- AI Grid Metadata: `ai-grid-provider-backend/proto/ai_grid/v1/metadata_type.proto`
- AI Grid Clusters server: `ai-grid-provider-backend/internal/servers/clusters_server.go`
- OSAC public Clusters service: `osac/proto/public/osac/public/v1/clusters_service.proto`
- OSAC public Cluster type: `osac/proto/public/osac/public/v1/cluster_type.proto`
- OSAC public Metadata type: `osac/proto/public/osac/public/v1/metadata_type.proto`
- OSAC private proto source: `osac/proto/private/osac/private/v1/`
- OSAC generic update behavior: `osac/fulfillment-service/internal/servers/generic_server.go`
