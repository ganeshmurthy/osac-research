# AI Grid Backend vs OSAC Clusters gRPC API — Strict Field Comparison

**Purpose:** Compare the gRPC service, request/response messages, resource
messages, and fields for the Cluster APIs in AI Grid Provider Backend and OSAC
Fulfillment.

**Scope:** AI Grid `ai_grid.v1.Clusters` on branch `pr-27` and OSAC public
`osac.public.v1.Clusters` on branch `main`. OSAC private types are referenced
only where they explain fields filtered from the public contract.

**Revisions checked:** AI Grid `f5c124d`; OSAC `2753cc412`.

**Strict comparison rule:** Names are case-sensitive. An exact match requires
the same fully qualified message name and matching field numbers, names,
presence/cardinality, scalar or fully qualified message types, and validation
options. Similar simple names or field layouts are not exact API matches.

---

## Executive summary

| Topic | Summary |
|---|---|
| gRPC service | AI `ai_grid.v1.Clusters`; OSAC `osac.public.v1.Clusters` |
| CRUD methods | Same five simple names; package-qualified RPCs differ |
| Requests/responses | Simple CRUD message names match; FQNs/nested types differ |
| Resource | AI `ManagedCluster`; OSAC `Cluster` |
| Metadata | AI 8 fields; OSAC 11 public fields |
| Spec/status | Different fields and state models |
| Responsibility | Hub resource CRUD vs OSAC cluster fulfillment |

The APIs use similar CRUD patterns but model different resources. AI Grid
manages hub-side ACM/OCM `ManagedCluster` objects; OSAC manages cluster
fulfillment resources and their lifecycle.

## 1. gRPC service and method names

### AI Grid

**Source:** `ai-grid-provider-backend/proto/ai_grid/v1/clusters_service.proto`

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

### OSAC public

**Source:** `osac/proto/public/osac/public/v1/clusters_service.proto`

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

The five method **simple names** match. The fully qualified service/method names
do not: for example, `/ai_grid.v1.Clusters/List` is not
`/osac.public.v1.Clusters/List`. OSAC's private service additionally defines
`Signal`; that method is not in the public Clusters API.

## 2. Request and response message comparison

All shared CRUD request/response **simple message names** match. Their fully
qualified names differ because the packages are `ai_grid.v1` and
`osac.public.v1`.

### `ClustersListRequest`

| Field | AI Grid | OSAC public |
|---|---|---|
| `offset` #1 | optional int32 | optional int32 |
| `limit` #2 | optional int32 | optional int32 |
| `filter` #3 | optional string | optional string |
| `order` #4 | optional string | optional string |

All four field descriptors match by case-sensitive name, number, type, and
presence. Behavior differs: AI Grid currently ignores `filter` and `order`; OSAC
documents CEL filtering and ordering.

### `ClustersListResponse`

| Field | AI Grid | OSAC public |
|---|---|---|
| `size` #1 | int32 | int32 |
| `total` #2 | int32 | int32 |
| `items` #3 | repeated `ai_grid.v1.ManagedCluster` | repeated `osac.public.v1.Cluster` |

`size` and `total` match exactly as fields. `items` does not: its element type is
different in both name and package.

### `ClustersGetRequest`

| Field | AI Grid | OSAC public |
|---|---|---|
| `id` #1 | string | string |

The field descriptor matches. The ID refers to a hub ManagedCluster in AI Grid
and an OSAC Cluster resource in OSAC.

### `ClustersGetResponse`, `ClustersCreateRequest`, `ClustersCreateResponse`, and `ClustersUpdateResponse`

Each message has one field, `object` at field number 1:

| Message | AI Grid field type | OSAC public field type |
|---|---|---|
| `ClustersGetResponse.object` | `ai_grid.v1.ManagedCluster` | `osac.public.v1.Cluster` |
| `ClustersCreateRequest.object` | `ai_grid.v1.ManagedCluster` | `osac.public.v1.Cluster` |
| `ClustersCreateResponse.object` | `ai_grid.v1.ManagedCluster` | `osac.public.v1.Cluster` |
| `ClustersUpdateResponse.object` | `ai_grid.v1.ManagedCluster` | `osac.public.v1.Cluster` |

The field name and number match, but the nested message types do not.

### `ClustersUpdateRequest`

| Field | AI Grid | OSAC public |
|---|---|---|
| `object` #1 | `ai_grid.v1.ManagedCluster` | `osac.public.v1.Cluster` |
| `update_mask` #2 | `google.protobuf.FieldMask` | `google.protobuf.FieldMask` |
| `lock` #3 | bool | bool |

`update_mask` and `lock` match by field descriptor; `object` does not. Lock
semantics differ: AI Grid checks any nonzero metadata version and requires one
when `lock=true`; OSAC's generic update path compares versions when
`lock=true`. OSAC public Update behavior is subject to its public server
implementation.

### `ClustersDeleteRequest` and `ClustersDeleteResponse`

| Message/field | AI Grid | OSAC public |
|---|---|---|
| `ClustersDeleteRequest.id` #1 | string | string |
| `ClustersDeleteResponse` | empty message | empty message |

The ID field and empty response field set match. The request/response message
FQNs and the resource identity do not.

### Strict request/response message verdict

The shared CRUD request/response simple names match case-sensitively. Their
fully qualified names differ because the packages differ.

| Message | Strict result |
|---|---|
| `ClustersListRequest` | Fields match; package FQN and query behavior differ. |
| `ClustersListResponse` | `size`/`total` match; `items` element type differs. |
| `ClustersGetRequest` | `id:string` matches; package FQN and ID meaning differ. |
| `ClustersGetResponse` | `object` nested type differs. |
| `ClustersCreateRequest/Response` | `object` nested type differs. |
| `ClustersUpdateRequest/Response` | `object` type differs; `FieldMask` and `bool` fields match. |
| `ClustersDeleteRequest/Response` | `id`/empty field layouts match; package FQNs differ. |

---

## 3. Top-level resource comparison

### AI Grid `ManagedCluster`

**Source:** `ai-grid-provider-backend/proto/ai_grid/v1/managed_cluster_type.proto`

```protobuf
message ManagedCluster {
  string id = 1;
  Metadata metadata = 2;
  ManagedClusterSpec spec = 3;
  ManagedClusterStatus status = 4;
}
```

### OSAC public `Cluster`

**Source:** `osac/proto/public/osac/public/v1/cluster_type.proto`

```protobuf
message Cluster {
  string id = 1;
  Metadata metadata = 2;
  ClusterSpec spec = 3;
  ClusterStatus status = 4 [(google.api.field_behavior) = OUTPUT_ONLY];
}
```

### Field-by-field

| Field | AI Grid descriptor | OSAC public descriptor |
|---|---|---|
| `id` #1 | string; validated DNS name | string; OSAC Cluster ID |
| `metadata` #2 | `ai_grid.v1.Metadata` | `osac.public.v1.Metadata` |
| `spec` #3 | `ai_grid.v1.ManagedClusterSpec` | `osac.public.v1.ClusterSpec` |
| `status` #4 | `ai_grid.v1.ManagedClusterStatus` | `osac.public.v1.ClusterStatus`; output-only |

The primitive `id` field layout matches, but validation and ID semantics differ.
The nested message types differ by package and name. OSAC additionally marks the
public `status` field output-only; AI Grid has no corresponding field behavior
option.

## 4. Metadata field comparison

AI Grid uses `ai_grid.v1.Metadata`; OSAC uses `osac.public.v1.Metadata`.

| Field number | Field : shared type |
|---:|---|
| 1 | `creation_timestamp`: `google.protobuf.Timestamp` |
| 2 | `deletion_timestamp`: `google.protobuf.Timestamp` |
| 3 | `creator`: `string` |
| 4 | `tenant`: `string` |
| 5 | `name`: `string` |
| 6 | `labels`: `map<string, string>` |
| 7 | `annotations`: `map<string, string>` |
| 8 | `version`: `int32` |

OSAC public Metadata adds:

| Field # | OSAC public field : type |
|---:|---|
| 9 | `project`: string |
| 10 | `display_name`: string |
| 11 | `description`: string |

The Metadata message is not an exact match: its FQN differs and OSAC has extra
fields. OSAC also documents and enforces reserved `admin.osac.openshift.io`
label/annotation behavior on public Create/Update; AI Grid has no equivalent
contract. OSAC private Metadata has a private `finalizers` field at #12, which
is absent from the public Clusters API.

## 5. Spec field comparison

### AI Grid `ManagedClusterSpec`

| Field # | AI Grid field : type | Meaning |
|---:|---|---|
| 1 | `hub_accepts_client`: bool | Hub accepts spoke client. |

### OSAC public `ClusterSpec`

| Field # | OSAC spec field : type | Meaning |
|---:|---|---|
| 1 | `template`: `ClusterTemplateReference` | Template reference. |
| 2 | `template_parameters`: map<string, Any> | Template inputs. `Any` is `google.protobuf.Any`. |
| 3 | `node_sets`: map<string, `ClusterNodeSet`> | Desired node sets. |
| 4 | Reserved | `pull_secret` is reserved. |
| 5 | `ssh_public_key`: optional string | Worker SSH key. |
| 6 | `version`: `ClusterVersionReference` | Desired control-plane version. |
| 7 | `network`: optional `ClusterNetwork` | Network configuration. |
| 8 | `catalog_item`: `ClusterCatalogItemReference` | Catalog provenance/config. |
| 9 | `network_attachment`: `ClusterNetworkAttachment` | Tenant network attachment. |
| 10 | `auto_external_ip_attachment`: optional bool | Auto-create ExternalIP attachments. |
| 11 | `pull_secret_secret`: `SecretLocalReference` | Pull-secret reference. |
| 12 | `add_on_operators`: repeated `AddOnOperatorReference` | Requested add-ons; immutable. |

Only AI Grid spec field #1 exists, and it has no equivalent OSAC field. OSAC's
field #1 is `template`, not `hub_accepts_client`; the two fields are not a match
just because they share field number 1.

## 6. Status field comparison

### AI Grid `ManagedClusterStatus`

| Field # | AI Grid status field : type | Meaning |
|---:|---|---|
| 1 | `available`: bool | ACM Available is true. |
| 2 | `joined`: bool | ACM Joined is true. |
| 3 | `available_condition`: string | Raw Available condition. |
| 4 | `provisioning`: string | AI Grid Policy compliance. |

### OSAC public `ClusterStatus`

Unqualified OSAC message/enum names below are in `osac.public.v1`; `Timestamp`
means `google.protobuf.Timestamp`.

| Field # | OSAC status field : type | Meaning |
|---:|---|---|
| 1 | `state`: `ClusterState` | Overall state. |
| 2 | `conditions`: repeated `ClusterCondition` | Detailed conditions. |
| 3 | `api_url`: string | External API URL. |
| 4 | `console_url`: string | Console URL. |
| 5 | `node_sets`: map<string, `ClusterNodeSet`> | Observed node sets. |
| 6 | `api_endpoint`: string | Internal API endpoint. |
| 7 | `ingress_endpoint`: string | Internal ingress endpoint. |
| 8 | `state_transition_time`: optional `Timestamp` | State transition time. |
| 9 | `kubeconfig_secret`: `SecretLocalReference` | Kubeconfig reference. |
| 10 | `password_secret`: `SecretLocalReference` | Password reference. |
| 11 | Reserved | Reserved. |
| 12 | `add_on_operators`: repeated `AddOnOperatorStatus` | Add-on status. |
| 13 | `observed_cp_version`: string | Output-only control-plane version. |
| 14 | Reserved | Reserved. |
| 15 | `upgrade_history`: repeated `ClusterUpgradeHistoryEntry` | Output-only upgrade history. |
| 16 | `version_transition_time`: optional `Timestamp` | Output-only version transition. |

The status field numbers overlap for #1–#4, but **none of those fields match by
case-sensitive name and type**. OSAC's nested status messages and enums have no
AI Grid equivalents. OSAC `Cluster` also marks the whole public status field
output-only; AI Grid does not declare that field option.

### OSAC-only nested status message fields

- `ClusterCondition`: `type` #1 (`ClusterConditionType`), `status` #2
  (`ConditionStatus`), `last_transition_time` #3 (`Timestamp`), optional string
  `reason` #4, optional string `message` #5.
- `ClusterNodeSet`: reserved #1 (`host_type`); optional int32 `size` #2;
  `baremetal_instance_type` #4 (`BareMetalInstanceTypeReference`), `version` #5
  (`ClusterVersionReference`), output-only string `observed_version` #6.
- `AddOnOperatorStatus`: string `name` #1, `state` #2
  (`AddOnOperatorInstallState`), string `message` #3.
- `ClusterUpgradeHistoryEntry`: `component` #1 (`ClusterUpgradeComponent`),
  string `source_version` #2, string `target_version` #3, `accepted_time` #4
  (`Timestamp`), `last_state_time` #5 (`Timestamp`), `state` #6
  (`ClusterUpgradeState`), string `message` #7.
- `ClusterUpgradeComponent` has a required `target` oneof: `control_plane` #1
  (`google.protobuf.Empty`) or `node_set_id` #2 (string).

These nested message and enum types have no AI Grid equivalents.

## 7. Runtime behavior and compatibility

- **AI Grid:** Uses a Kubernetes dynamic client to CRUD hub `ManagedCluster`
  resources. It does not provision spoke infrastructure. List applies offset and
  limit but ignores filter/order. Update supports selected hub labels,
  annotations, and `spec.hub_accepts_client`; any nonzero submitted version is
  checked, and `lock=true` requires a version.
- **OSAC:** The public Clusters API manages persisted OSAC Cluster resources.
  Public Create is documented as server-side; regular users create through a
  Cluster Order. Fulfillment and the operator reconcile the cluster lifecycle.
  Update uses field masks; OSAC checks versions when `lock=true`.

| Compatibility check | Result |
|---|---|
| Fully qualified service/method names | ❌ Different packages |
| Shared CRUD simple method names | Yes; names match |
| Shared request/response simple names | Yes; package-qualified message types differ |
| Exact request/response messages | ❌ None |
| Exact resource messages | ❌ `ManagedCluster` vs `Cluster` |
| Exact spec/status fields | ❌ Different fields, types, and semantics |
| Drop-in generated-client compatibility | ❌ No |

**Verdict:** Treat these as separate gRPC APIs. Integrating them requires an
adapter that explicitly maps identity, resource fields, lifecycle state, and
update/concurrency behavior.

---

## References

- AI Grid Clusters service: `ai-grid-provider-backend/proto/ai_grid/v1/clusters_service.proto`
- AI Grid ManagedCluster type: `ai-grid-provider-backend/proto/ai_grid/v1/managed_cluster_type.proto`
- AI Grid Metadata: `ai-grid-provider-backend/proto/ai_grid/v1/metadata_type.proto`
- AI Grid Clusters server: `ai-grid-provider-backend/internal/servers/clusters_server.go`
- OSAC public Clusters service: `osac/proto/public/osac/public/v1/clusters_service.proto`
- OSAC public Cluster type: `osac/proto/public/osac/public/v1/cluster_type.proto`
- OSAC public Metadata type: `osac/proto/public/osac/public/v1/metadata_type.proto`
- OSAC private source of truth: `osac/proto/private/osac/private/v1/`
- OSAC Fulfillment generic update behavior: `osac/fulfillment-service/internal/servers/generic_server.go`
