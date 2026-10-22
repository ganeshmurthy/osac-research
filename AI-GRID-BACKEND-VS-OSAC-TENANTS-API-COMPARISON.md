# AI Grid Backend vs OSAC Tenants API — Field-by-Field Comparison

**Purpose:** Compare the Tenant gRPC/REST APIs, message fields, resource types,
and runtime behavior in AI Grid Provider Backend and OSAC Fulfillment.

**Scope:** The AI Grid `ai_grid.v1.Tenants` service and the OSAC public
`osac.public.v1.Tenants` service. OSAC's private `osac.private.v1.Tenants`
service is included where it is necessary to explain actual Tenant lifecycle
operations and private-only fields.

**Sources checked:**

- AI Grid proto: `ai-grid-provider-backend/proto/ai_grid/v1/`
- AI Grid server: `ai-grid-provider-backend/internal/servers/tenants_server.go`
- OSAC public protos: `osac/proto/public/osac/public/v1/`
- OSAC private proto source: `osac/proto/private/osac/private/v1/`
- OSAC servers: `osac/fulfillment-service/internal/servers/`
- OSAC lifecycle controllers: `osac/fulfillment-service/internal/controllers/`

OSAC public protos are generated from private protos. Runtime notes reflect the
implementation checked for this document and can change independently of the
proto contracts.

---

## Executive Summary

| Aspect | AI Grid Backend | OSAC | Match? |
|---|---|---|---|
| Service | `ai_grid.v1.Tenants` | `osac.public.v1.Tenants` (public), `osac.private.v1.Tenants` (private) | ❌ Different service identities |
| Standard RPCs in proto | List, Get, Create, Update, Delete | List, Get, Create, Update, Delete | ✅ Same names |
| Public CRUD implementation | All five standard CRUD methods implemented | Public List/Get implemented; public Create/Update/Delete return `UNIMPLEMENTED` | ❌ Different behavior |
| Additional RPC | `ListMembers` | Private-only `Signal`; no Tenants `ListMembers` | ❌ Different |
| REST prefix | `/api/v1/tenants` | `/api/fulfillment/v1/tenants` public; `/api/private/v1/tenants` private | ❌ Different |
| Tenant ID | Keycloak Organization UUID | OSAC Tenant ID; private Create sets it to `metadata.name` | ❌ Different identity |
| Top-level public resource | `id`, `metadata`, `spec`, `status` | `id`, `metadata`, `spec`; status is private | ❌ Different shape |
| Spec | `domains` | `domains`, `break_glass_credentials_secret` | 🟡 Partial overlap |
| Status | Empty `TenantStatus` | Rich private lifecycle status, omitted from public API | ❌ Different |
| Backing model | Direct Keycloak Organization CRUD | Persisted OSAC Tenant plus asynchronous lifecycle reconciliation | ❌ Different |

**Critical distinction:** AI Grid's Tenant is a direct projection and CRUD
surface for a Keycloak Organization in a shared realm. OSAC's Tenant is an OSAC
resource whose private lifecycle reconciles identity-provider state and other
OSAC tenant concerns. Despite shared terminology and a `domains` field, the
APIs are not drop-in compatible.

---

## Table of Contents

1. [Service and RPC Comparison](#1-service-and-rpc-comparison)
2. [Request and Response Field Comparison](#2-request-and-response-field-comparison)
3. [Tenant Resource Field Comparison](#3-tenant-resource-field-comparison)
4. [Metadata Field Comparison](#4-metadata-field-comparison)
5. [TenantSpec Field Comparison](#5-tenantspec-field-comparison)
6. [TenantStatus Field Comparison](#6-tenantstatus-field-comparison)
7. [AI Grid ListMembers Field Comparison](#7-ai-grid-listmembers-field-comparison)
8. [Runtime and Lifecycle Differences](#8-runtime-and-lifecycle-differences)
9. [Compatibility Summary and Integration Notes](#9-compatibility-summary-and-integration-notes)

---

## 1. Service and RPC Comparison

### AI Grid Backend

**File:** `ai-grid-provider-backend/proto/ai_grid/v1/tenants_service.proto`

```protobuf
package ai_grid.v1;

service Tenants {
  rpc List(TenantsListRequest) returns (TenantsListResponse);
  rpc Get(TenantsGetRequest) returns (TenantsGetResponse);
  rpc Create(TenantsCreateRequest) returns (TenantsCreateResponse);
  rpc Update(TenantsUpdateRequest) returns (TenantsUpdateResponse);
  rpc Delete(TenantsDeleteRequest) returns (TenantsDeleteResponse);
  rpc ListMembers(TenantsListMembersRequest) returns (TenantsListMembersResponse);
}
```

AI Grid implements the five CRUD methods against Keycloak Organizations and
implements `ListMembers` as a read-only member projection.

### OSAC public API

**File:** `osac/proto/public/osac/public/v1/tenants_service.proto`

```protobuf
package osac.public.v1;

service Tenants {
  rpc List(TenantsListRequest) returns (TenantsListResponse);
  rpc Get(TenantsGetRequest) returns (TenantsGetResponse);
  rpc Create(TenantsCreateRequest) returns (TenantsCreateResponse);
  rpc Delete(TenantsDeleteRequest) returns (TenantsDeleteResponse);
  rpc Update(TenantsUpdateRequest) returns (TenantsUpdateResponse);
}
```

The proto declares all five standard CRUD methods. In the current public server,
only List and Get are implemented. Tests verify that public Create, Update, and
Delete return gRPC `UNIMPLEMENTED`.

### OSAC private API

**Source:** `osac/proto/private/osac/private/v1/tenants_service.proto`

The private service has the CRUD operations and a private `Signal` RPC used to
notify reconciliation. Its REST route prefix is `/api/private/v1/`. `Signal` is
a private gRPC method and has no HTTP route in the proto.

### Service comparison summary

| Aspect | AI Grid | OSAC public | OSAC private |
|---|---|---|---|
| Protobuf package | `ai_grid.v1` | `osac.public.v1` | `osac.private.v1` |
| Service name | `Tenants` | `Tenants` | `Tenants` |
| CRUD RPCs declared | 5 | 5 | 5 |
| CRUD RPCs implemented | 5 | List/Get only | 5 |
| Other RPCs | `ListMembers` | None | `Signal` |
| HTTP collection | `/api/v1/tenants` | `/api/fulfillment/v1/tenants` | `/api/private/v1/tenants` |

The service names are textually the same, but fully qualified gRPC names differ.
The OSAC public proto's declaration of Create/Update/Delete should not be
mistaken for runtime support.

---

## 2. Request and Response Field Comparison

### `TenantsListRequest`

| Field | AI Grid | OSAC public | Comparison |
|---|---|---|---|
| `offset` = 1 | `optional int32` | `optional int32` | ✅ Same field/type |
| `limit` = 2 | `optional int32` | `optional int32` | ✅ Same field/type |
| `filter` = 3 | `optional string`; CEL not evaluated | `optional string`; CEL filter documented | 🟡 Same type, different support |
| `order` = 4 | `optional string`; not evaluated | `optional string`; ordering documented | 🟡 Same type, different support |

AI Grid's List handler applies offset and limit but currently ignores filter and
order. OSAC forwards these values to its generic server for filtering and
ordering (subject to the supported CEL/filter rules).

### `TenantsListResponse`

| Field | AI Grid | OSAC public | Comparison |
|---|---|---|---|
| `size` = 1 | `int32` | `int32` | ✅ Same |
| `total` = 2 | `int32` | `int32` | ✅ Same |
| `items` = 3 | `repeated ai_grid.v1.Tenant` | `repeated osac.public.v1.Tenant` | 🟡 Same pattern, different type and shape |

Both use `size`/`total`/`items`; the item resources differ, and OSAC public
Tenant omits status.

### `TenantsGetRequest`

| Field | AI Grid | OSAC public | Comparison |
|---|---|---|---|
| `id` = 1 | `string`; Keycloak Organization ID/UUID | `string`; OSAC Tenant resource ID | 🟡 Same wire field, different identity meaning |

### `TenantsGetResponse`

| Field | AI Grid | OSAC public | Comparison |
|---|---|---|---|
| `object` = 1 | `ai_grid.v1.Tenant` | `osac.public.v1.Tenant` | 🟡 Same wrapper, different resource |

### `TenantsCreateRequest`

| Field | AI Grid | OSAC public | Comparison |
|---|---|---|---|
| `object` = 1 | `ai_grid.v1.Tenant` | `osac.public.v1.Tenant` | 🟡 Same wrapper, different fields and create semantics |

AI Grid Create is implemented and creates a Keycloak Organization. OSAC public
Create is declared in the proto but currently returns `UNIMPLEMENTED`; OSAC
private Create is implemented against the persisted OSAC Tenant resource.

### `TenantsCreateResponse`

| Field | AI Grid | OSAC public | Comparison |
|---|---|---|---|
| `object` = 1 | `ai_grid.v1.Tenant` | `osac.public.v1.Tenant` | 🟡 Same wrapper, different resource |

The OSAC private Create response can include private Tenant status, including
create-time break-glass credentials. That private status is filtered out of the
public Tenant type; public Create itself is not implemented in the current
server.

### `TenantsUpdateRequest`

| Field | AI Grid | OSAC public/private | Comparison |
|---|---|---|---|
| `object` = 1 | `ai_grid.v1.Tenant` | corresponding OSAC Tenant type | 🟡 Different resource types |
| `update_mask` = 2 | `google.protobuf.FieldMask` | `google.protobuf.FieldMask` | ✅ Same type and field number |
| `lock` = 3 | `bool`; documented and implemented as not enforced | `bool`; OSAC private generic server checks versions when true | 🟡 Same field, different behavior |

AI Grid's handler selects supported name/domain paths from the field mask. It
does not enforce optimistic locking or compare `metadata.version`. OSAC private
Update applies the mask to a stored Tenant and performs its version check when
`lock=true`. OSAC public Update is currently unimplemented.

### `TenantsUpdateResponse`

| Field | AI Grid | OSAC public | Comparison |
|---|---|---|---|
| `object` = 1 | `ai_grid.v1.Tenant` | `osac.public.v1.Tenant` | 🟡 Same wrapper, different resource |

### `TenantsDeleteRequest`

| Field | AI Grid | OSAC public | Comparison |
|---|---|---|---|
| `id` = 1 | `string`; Keycloak Organization UUID | `string`; OSAC Tenant ID | 🟡 Same field/type, different identity and deletion target |

### `TenantsDeleteResponse`

Both define an empty response message:

```protobuf
message TenantsDeleteResponse {}
```

The message shapes match. Behavior does not: AI Grid directly deletes the
Keycloak Organization; OSAC public Delete is unimplemented and OSAC private
Delete initiates OSAC cleanup and reconciliation.

---

## 3. Tenant Resource Field Comparison

### AI Grid `Tenant`

**File:** `ai-grid-provider-backend/proto/ai_grid/v1/tenant_type.proto`

```protobuf
message Tenant {
  string id = 1;
  Metadata metadata = 2;
  TenantSpec spec = 3;
  TenantStatus status = 4;
}
```

### OSAC public `Tenant`

**File:** `osac/proto/public/osac/public/v1/tenant_type.proto`

```protobuf
message Tenant {
  string id = 1;
  Metadata metadata = 2;
  TenantSpec spec = 3;
}
```

OSAC private Tenant has `TenantStatus status = 4`, but field 4 is marked
private and omitted from the generated public type.

### Top-level field-by-field comparison

| Field | AI Grid | OSAC public | Match? |
|---|---|---|---|
| `id` = 1 | `string`; Keycloak Organization UUID | `string`; OSAC resource ID (private Create sets it to the name) | ❌ Meaning differs |
| `metadata` = 2 | `ai_grid.v1.Metadata` | `osac.public.v1.Metadata` | 🟡 Same common fields, OSAC adds fields |
| `spec` = 3 | `ai_grid.v1.TenantSpec` | `osac.public.v1.TenantSpec` | 🟡 `domains` overlaps; OSAC has another field |
| `status` = 4 | `ai_grid.v1.TenantStatus`, empty message | Not in public type; private type has private `osac.private.v1.TenantStatus` | ❌ Public shape differs |

The familiar `id`/`metadata`/`spec` shape does not make the message definitions
interchangeable. In particular, AI Grid ID is assigned by Keycloak, while OSAC
uses its own tenant identifier and lifecycle resource.

---

## 4. Metadata Field Comparison

AI Grid uses `ai_grid.v1.Metadata`; OSAC public uses
`osac.public.v1.Metadata`.

### Common fields

| Field number | Field | AI Grid type | OSAC public type | Match? |
|---:|---|---|---|---|
| 1 | `creation_timestamp` | `google.protobuf.Timestamp` | `google.protobuf.Timestamp` | ✅ |
| 2 | `deletion_timestamp` | `google.protobuf.Timestamp` | `google.protobuf.Timestamp` | ✅ |
| 3 | `creator` | `string` | `string` | ✅ |
| 4 | `tenant` | `string` | `string` | ✅ |
| 5 | `name` | `string` | `string` | ✅ Same type/number; same RFC 1123 rule |
| 6 | `labels` | `map<string, string>` | `map<string, string>` | ✅ |
| 7 | `annotations` | `map<string, string>` | `map<string, string>` | ✅ |
| 8 | `version` | `int32` | `int32` | ✅ |

### OSAC-only public metadata fields

| Field number | Field | Type | AI Grid equivalent? |
|---:|---|---|---|
| 9 | `project` | `string` | ❌ None |
| 10 | `display_name` | `string` | ❌ None |
| 11 | `description` | `string` | ❌ None |

OSAC private Metadata also defines `finalizers` at field 12, marked private and
not present in the public API. AI Grid Metadata has eight fields total.

Although fields 1–8 match structurally, AI Grid's Organization mapper primarily
populates `metadata.name`. OSAC uses Metadata as part of a persisted,
tenant-scoped resource model. Matching definitions do not imply matching
population or semantics for every field.

---

## 5. `TenantSpec` Field Comparison

### AI Grid `TenantSpec`

```protobuf
message TenantSpec {
  repeated string domains = 1;
}
```

### OSAC public `TenantSpec`

```protobuf
message TenantSpec {
  repeated string domains = 1;
  SecretLocalReference break_glass_credentials_secret = 2;
}
```

### Field-by-field comparison

| Field | AI Grid | OSAC public | Match? |
|---|---|---|---|
| `domains` = 1 | `repeated string`; lowercase DNS hostnames | `repeated string`; lowercase DNS hostnames, with proto validation | 🟡 Same field/type, validation and lifecycle differ |
| `break_glass_credentials_secret` = 2 | Not defined | `SecretLocalReference` | ❌ OSAC only |

#### `domains` behavior

- **AI Grid:** The server validates that domains are non-empty DNS hostnames,
  contain at least two labels, are not IP addresses, and have no duplicates in
  the submitted list. It passes the domains to the Keycloak Organization API.
- **OSAC:** The proto declares Protovalidate constraints for non-empty values,
  maximum length, DNS hostname syntax, no IP addresses, at least two labels,
  lowercase valid labels, and no duplicates. The proto documentation also says
  domains are globally unique across tenants.

The same field name/type does not mean the same validation mechanism or
lifecycle. OSAC stores domains in the Tenant spec and reconciles them to the
identity provider; AI Grid directly maps them to a Keycloak Organization.

#### OSAC `break_glass_credentials_secret`

This field refers to a Secret containing break-glass account credentials. It
may be provided by the caller or populated by OSAC after it creates and stores
the credentials. AI Grid has no corresponding field.

---

## 6. `TenantStatus` Field Comparison

### AI Grid `TenantStatus`

```protobuf
message TenantStatus {}
```

AI Grid includes an empty status message at field 4 of its Tenant resource. It
has **zero status fields**.

### OSAC private `TenantStatus`

OSAC private TenantStatus is private and omitted from the public Tenant API. It
has six fields:

| Field number | Field | Type | Description |
|---:|---|---|---|
| 1 | `break_glass_credentials` | `BreakGlassCredentials` | Private create-time credentials; not persisted in Tenant status and omitted by Get/List. |
| 2 | `state` | `TenantState` enum | IDP lifecycle state. |
| 3 | `message` | `optional string` | Human-readable progress/failure details. |
| 4 | `idp_tenant_name` | `string` | Name of the tenant created in the IDP. |
| 5 | `break_glass_user_id` | `string` | IDP user ID of the break-glass account. |
| 6 | `conditions` | `repeated TenantCondition` | Detailed subsystem readiness. |

### OSAC `BreakGlassCredentials`

This private message is nested in `TenantStatus`:

| Field number | Field | Type |
|---:|---|---|
| 1 | `username` | `string` |
| 2 | `password` | `string` (sensitive; returned only during account creation) |

The password is cleared from inline status after reconciliation persists a
secret reference. The durable credentials live in the referenced Secret.

### OSAC `TenantState` enum

| Number | Enum value | Meaning |
|---:|---|---|
| 0 | `TENANT_STATE_UNSPECIFIED` | Unknown or not initialized. |
| 1 | `TENANT_STATE_PENDING` | Tenant is being synchronized to the IDP; not ready for users. |
| 2 | `TENANT_STATE_SYNCED` | IDP tenant and break-glass account are synchronized. Does not imply compute readiness. |
| 3 | `TENANT_STATE_FAILED` | IDP synchronization failed; status message explains the failure. |

AI Grid defines no equivalent Tenant lifecycle enum or status field.

### OSAC `TenantCondition` fields

| Field number | Field | Type |
|---:|---|---|
| 1 | `type` | `TenantConditionType` |
| 2 | `status` | `ConditionStatus` |
| 3 | `last_transition_time` | `google.protobuf.Timestamp` |
| 4 | `reason` | `optional string` |
| 5 | `message` | `optional string` |

### OSAC `TenantConditionType` enum

| Number | Enum value | Readiness represented |
|---:|---|---|
| 0 | `TENANT_CONDITION_TYPE_UNSPECIFIED` | Unspecified condition. |
| 1 | `TENANT_CONDITION_TYPE_DEFAULT_NETWORKING_READY` | Default virtual network, subnets, security group, and NAT gateway readiness. |
| 2 | `TENANT_CONDITION_TYPE_VAULT_READY` | Tenant Vault namespace readiness. |
| 3 | `TENANT_CONDITION_TYPE_COMPUTE_INFRASTRUCTURE_READY` | Compute infrastructure readiness across known hubs. |

### OSAC `ConditionStatus` enum

| Number | Enum value | Meaning |
|---:|---|---|
| 0 | `CONDITION_STATUS_UNSPECIFIED` | Status not specified. |
| 1 | `CONDITION_STATUS_TRUE` | The condition is true. |
| 2 | `CONDITION_STATUS_FALSE` | The condition is false. |

None of these status fields or enums are exposed by OSAC's public Tenant type.
AI Grid's empty `TenantStatus` is not a reduced equivalent of OSAC's private
status model.

---

## 7. AI Grid `ListMembers` Field Comparison

OSAC's Tenants service does not define a `ListMembers` RPC. AI Grid defines the
following additional messages and method.

### `TenantsListMembersRequest`

| Field | AI Grid | OSAC Tenants equivalent? |
|---|---|---|
| `id` = 1 | `string`; Keycloak Organization ID | ❌ No matching RPC |
| `offset` = 2 | `optional int32` | ❌ No matching RPC |
| `limit` = 3 | `optional int32` | ❌ No matching RPC |

### `TenantsListMembersResponse`

| Field | AI Grid | OSAC Tenants equivalent? |
|---|---|---|
| `size` = 1 | `int32` | ❌ No matching RPC |
| `total` = 2 | `int32` | ❌ No matching RPC |
| `items` = 3 | `repeated TenantMember` | ❌ No matching RPC |

### AI Grid `TenantMember`

| Field number | Field | Type | Meaning |
|---:|---|---|---|
| 1 | `id` | `string` | Keycloak user UUID. |
| 2 | `username` | `string` | Login username. |
| 3 | `email` | `string` | Email, when present. |
| 4 | `first_name` | `string` | Given name. |
| 5 | `last_name` | `string` | Family name. |
| 6 | `enabled` | `bool` | Whether the Keycloak user is enabled. |

This is a read projection, not full user or membership management. The absence
of a `ListMembers` RPC in OSAC's Tenants service does not imply that OSAC has no
other user or identity-provider APIs.

---

## 8. Runtime and Lifecycle Differences

### AI Grid behavior

- Manages Keycloak Organizations in one shared platform realm; it does not
  create a Keycloak realm per tenant.
- Tenant `id` is the Keycloak Organization UUID. `metadata.name` maps to the
  Organization name; Create initially sets its alias to the same value.
- Create, Update, and Delete operate directly on Keycloak Organizations.
- Update supports name and domains. The Keycloak alias is left unchanged on
  update because it is immutable in this integration.
- `lock` is declared but not enforced by the Tenant handler.
- List offset/limit are applied; List filter/order are not currently evaluated.
- ListMembers fetches the Organization's members and applies pagination to the
  returned projection.
- The AI Grid README states that API request authentication and authorization
  are out of scope for its current MVP; gRPC and REST endpoints are open.

### OSAC behavior

- Tenant is an OSAC persisted resource. Private Create requires
  `metadata.name`; its ID must be empty or equal to the name, and an empty ID is
  set to the name.
- Public List/Get are implemented with the public/private mapper. The public
  object omits private Tenant status.
- Public Create/Update/Delete are declared in proto but currently return
  `UNIMPLEMENTED`.
- Private Create/Update/Delete manage the persisted resource. Reconciliation
  asynchronously handles IDP synchronization, break-glass credentials, Vault,
  hub tenant resources/namespaces, default networking, and readiness.
- Private Update supports field masks and checks versions when `lock=true`.
- Private Delete coordinates lifecycle cleanup rather than issuing a direct
  Keycloak Organization delete from the public Tenant handler.
- The fulfillment service applies its authentication, authorization, and tenant
  visibility model to the public API.

---

## 9. Compatibility Summary and Integration Notes

### Compatibility by layer

| Layer | Compatibility | Notes |
|---|---|---|
| CRUD names | Similar | Same standard operation names in the proto. |
| Public CRUD availability | ❌ Different | AI Grid implements all standard CRUD; OSAC public only implements List/Get. |
| List request fields | 🟡 Similar fields | Same field names/numbers/types; AI Grid ignores filter/order. |
| List response | 🟡 Similar pattern | `size`, `total`, `items`; item types differ. |
| Get/Delete IDs | 🟡 Same scalar shape | Both use string IDs, but identity namespaces differ. |
| Top-level Tenant | ❌ Different | AI Grid public type has status field; OSAC public type does not. |
| Metadata fields | 🟡 Partial match | First eight fields match; OSAC public adds project/display name/description. |
| Spec fields | 🟡 Partial overlap | `domains` matches in shape; OSAC adds break-glass Secret reference. |
| Status | ❌ Not equivalent | AI Grid status empty; OSAC status is private and lifecycle-rich. |
| Members | ❌ AI Grid-only method | AI Grid exposes read-only `ListMembers`; no OSAC Tenants RPC equivalent. |
| Tenant identity | ❌ Different | Keycloak UUID vs OSAC Tenant ID/name. |
| Lifecycle | ❌ Different | Direct Organization CRUD vs persisted resource with reconciliation. |
| Drop-in compatibility | ❌ No | Package, messages, IDs, supported methods, fields, auth, and semantics differ. |

Avoid assigning a compatibility percentage. The shared resource name and CRUD
pattern do not capture the public/private implementation gap or the identity
and lifecycle differences.

### Integration considerations

If these APIs need to work together, explicitly define:

1. **Identity mapping:** How a Keycloak Organization UUID maps to an OSAC Tenant
   ID/name.
2. **Source of truth:** Whether AI Grid, OSAC, or another provisioning workflow
   owns Organization creation and updates.
3. **Domain ownership:** How domain uniqueness and update propagation work.
4. **Mutation route:** OSAC public Tenant writes are currently unimplemented;
   define the supported private/control-plane path rather than assuming public
   CRUD.
5. **Lifecycle/status mapping:** Whether OSAC private lifecycle state needs a
   safe public projection for AI Grid consumers.
6. **Member access:** Whether AI Grid's read-only `ListMembers` is required and
   which authenticated service is permitted to call it.
7. **Deletion:** Coordinate AI Grid's direct Organization deletion with OSAC's
   asynchronous cleanup and IDP lifecycle.

**Recommendation:** Keep the APIs and resource models separate unless there is a
specific integration requirement. Define identity, ownership, authorization,
status visibility, and delete semantics before connecting their lifecycles.

---

## References

- AI Grid Tenants service: `ai-grid-provider-backend/proto/ai_grid/v1/tenants_service.proto`
- AI Grid Tenant and TenantMember types: `ai-grid-provider-backend/proto/ai_grid/v1/tenant_type.proto`
- AI Grid Metadata: `ai-grid-provider-backend/proto/ai_grid/v1/metadata_type.proto`
- AI Grid Tenant implementation: `ai-grid-provider-backend/internal/servers/tenants_server.go`
- AI Grid Keycloak and auth scope: `ai-grid-provider-backend/README.md`
- OSAC public Tenants service/type: `osac/proto/public/osac/public/v1/tenants_service.proto`, `tenant_type.proto`
- OSAC private Tenants service/type: `osac/proto/private/osac/private/v1/tenants_service.proto`, `tenant_type.proto`
- OSAC private break-glass and condition types: `osac/proto/private/osac/private/v1/break_glass_credentials_type.proto`, `condition_status_type.proto`
- OSAC public Tenants server and behavior tests: `osac/fulfillment-service/internal/servers/tenants_server.go`, `tenants_server_test.go`
- OSAC private Tenant server: `osac/fulfillment-service/internal/servers/private_tenants_server.go`
- OSAC Tenant lifecycle controllers: `osac/fulfillment-service/internal/controllers/tenant/`, `onboarding/`
- OSAC authentication and tenant mapping: `osac/fulfillment-service/docs/AUTH.md`
