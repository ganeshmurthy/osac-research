# AI Grid Backend vs OSAC Tenants API — Field-by-Field Comparison

**Purpose:** Compare the Tenant gRPC/REST APIs, Protobuf request/response
messages, resource fields, and runtime behavior in AI Grid Provider Backend and
OSAC Fulfillment.

**Scope:** AI Grid `ai_grid.v1.Tenants` on branch `pr-27` and OSAC public
`osac.public.v1.Tenants` on branch `main`. OSAC's private
`osac.private.v1.Tenants` is included to explain private-only operations and
lifecycle fields. Revisions checked: AI Grid `f5c124d`; OSAC `2753cc412`.

**Strict comparison rule:** An API/message is an exact match only when its
fully qualified name and each field's number, name, presence/cardinality,
scalar or fully qualified message type, and validation options match. Similar
simple names or field layouts are reported as partial matches, not as equivalent
contracts.

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

| Aspect | Summary |
|---|---|
| Service | AI `ai_grid.v1.Tenants`; OSAC `osac.public.v1.Tenants` |
| CRUD | Same five simple method names; service FQNs differ |
| Public writes | AI Grid implements CRUD; OSAC public writes return `UNIMPLEMENTED` |
| Messages | Shared CRUD names match; package/nested type FQNs differ |
| Extra RPC | OSAC private `Signal`; no AI Grid equivalent |
| Tenant ID | Keycloak Organization UUID vs OSAC Tenant ID/name |
| Public Tenant | AI Grid has `status`; OSAC public omits it |
| Spec/status | Domains overlap; OSAC adds a Secret ref and private status |
| Backing | Direct Keycloak CRUD vs persisted OSAC resource + reconciliation |

**Critical distinction:** AI Grid's Tenant is a direct projection and CRUD
surface for a Keycloak Organization in a shared realm. OSAC's Tenant is an OSAC
resource whose private lifecycle reconciles identity-provider state and other
OSAC tenant concerns. Under the strict rule above, shared method names and
similar field layouts do **not** make the Protobuf APIs identical or drop-in
compatible.

---

## Table of Contents

1. [Service and RPC Comparison](#1-service-and-rpc-comparison)
2. [Request and Response Field Comparison](#2-request-and-response-field-comparison)
3. [Tenant Resource Field Comparison](#3-tenant-resource-field-comparison)
4. [Metadata Field Comparison](#4-metadata-field-comparison)
5. [TenantSpec Field Comparison](#5-tenantspec-field-comparison)
6. [TenantStatus Field Comparison](#6-tenantstatus-field-comparison)
7. [Runtime and Lifecycle Differences](#7-runtime-and-lifecycle-differences)
8. [OSAC Tenant Lifecycle, Callers, and Keycloak Model](#8-osac-tenant-lifecycle-callers-and-keycloak-model)
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
}
```

AI Grid implements the five CRUD methods against Keycloak Organizations.

### OSAC public API

**File:** `osac/proto/public/osac/public/v1/tenants_service.proto`

```protobuf
package osac.public.v1;

service Tenants {
  rpc List(TenantsListRequest) returns (TenantsListResponse);
  rpc Get(TenantsGetRequest) returns (TenantsGetResponse);
  // Declared in the public proto; the current public handler returns UNIMPLEMENTED.
  rpc Create(TenantsCreateRequest) returns (TenantsCreateResponse);
  // Declared in the public proto; the current public handler returns UNIMPLEMENTED.
  rpc Delete(TenantsDeleteRequest) returns (TenantsDeleteResponse);
  // Declared in the public proto; the current public handler returns UNIMPLEMENTED.
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

#### OSAC private Tenants RPC inventory

| Private RPC | Request → response; purpose |
|---|---|
| `List` | `TenantsListRequest` → `TenantsListResponse`; list Tenants |
| `Get` | `TenantsGetRequest` → `TenantsGetResponse`; get by ID |
| `Create` | `TenantsCreateRequest` → `TenantsCreateResponse`; create Tenant |
| `Update` | `TenantsUpdateRequest` → `TenantsUpdateResponse`; masked update |
| `Delete` | `TenantsDeleteRequest` → `TenantsDeleteResponse`; start cleanup |
| `Signal` | `TenantsSignalRequest` → `TenantsSignalResponse`; trigger reconcile |

The HTTP annotations map List/Get/Create/Update/Delete under
`/api/private/v1/tenants`; Get/Delete use `{id}`, and Update uses
`{object.id}`. `Signal` has no HTTP mapping.

All six methods are implemented on the private service. The public service
shares the five CRUD declarations, but its current server implements only
List/Get; its Create/Update/Delete methods return `UNIMPLEMENTED`.

### Service comparison summary

| Property | AI Grid | OSAC |
|---|---|---|
| Package | `ai_grid.v1` | Public `osac.public.v1`; private `osac.private.v1` |
| CRUD declared | 5 | 5 per service |
| CRUD implemented | 5 | Public: List/Get; private: all 5 |
| Extra private RPC | — | `Signal` |
| Route prefix | `/api/v1` | Public `/api/fulfillment/v1`; private `/api/private/v1` |

The service and method simple names match for the five CRUD methods, but the
fully qualified service names differ: `ai_grid.v1.Tenants` versus
`osac.public.v1.Tenants`. Consequently, none of their fully qualified gRPC
method names are identical. The OSAC public proto's declaration of
Create/Update/Delete should not be mistaken for runtime support.

---

## 2. Request and Response Field Comparison

### `TenantsListRequest`

| Field | AI Grid | OSAC public |
|---|---|---|
| `offset` #1 | optional int32 | optional int32 |
| `limit` #2 | optional int32 | optional int32 |
| `filter` #3 | optional string; ignored | optional string; CEL |
| `order` #4 | optional string; ignored | optional string; ordering |

At the field-descriptor level, `offset`, `limit`, `filter`, and `order` have
matching numbers, names, types, and optional presence. The containing request
messages still differ in fully qualified name because their packages differ.
AI Grid's List handler applies offset and limit but currently ignores filter and
order. OSAC forwards these values to its generic server for filtering and
ordering (subject to the supported CEL/filter rules).

### `TenantsListResponse`

| Field | AI Grid | OSAC public |
|---|---|---|
| `size` #1 | int32 | int32 |
| `total` #2 | int32 | int32 |
| `items` #3 | repeated `ai_grid.v1.Tenant` | repeated `osac.public.v1.Tenant` |

Fields `size` and `total` match by number/name/type. The `items` field has the
same number/name/repeated cardinality, but its element message type differs:
`ai_grid.v1.Tenant` versus `osac.public.v1.Tenant`. The response message FQNs
also differ, and OSAC public Tenant omits status.

### `TenantsGetRequest`

| Field | AI Grid | OSAC public |
|---|---|---|
| `id` #1 | string; Keycloak UUID | string; OSAC Tenant ID |

### `TenantsGetResponse`

| Field | AI Grid | OSAC public |
|---|---|---|
| `object` #1 | `ai_grid.v1.Tenant` | `osac.public.v1.Tenant` |

### `TenantsCreateRequest`

| Field | AI Grid | OSAC public |
|---|---|---|
| `object` #1 | `ai_grid.v1.Tenant` | `osac.public.v1.Tenant` |

AI Grid Create is implemented and creates a Keycloak Organization. OSAC public
Create is declared in the proto but currently returns `UNIMPLEMENTED`; OSAC
private Create is implemented against the persisted OSAC Tenant resource.

### `TenantsCreateResponse`

| Field | AI Grid | OSAC public |
|---|---|---|
| `object` #1 | `ai_grid.v1.Tenant` | `osac.public.v1.Tenant` |

The OSAC private Create response can include private Tenant status, including
create-time break-glass credentials. That private status is filtered out of the
public Tenant type; public Create itself is not implemented in the current
server.

### `TenantsUpdateRequest`

| Field | AI Grid | OSAC public/private |
|---|---|---|
| `object` #1 | `ai_grid.v1.Tenant` | OSAC Tenant type; FQN differs |
| `update_mask` #2 | `google.protobuf.FieldMask` | `google.protobuf.FieldMask` |
| `lock` #3 | bool; not enforced | bool; private handler enforces when true |

AI Grid's handler selects supported name/domain paths from the field mask. It
does not enforce optimistic locking or compare `metadata.version`. OSAC private
Update applies the mask to a stored Tenant and performs its version check when
`lock=true`. OSAC public Update is currently unimplemented.

### `TenantsUpdateResponse`

| Field | AI Grid | OSAC public |
|---|---|---|
| `object` #1 | `ai_grid.v1.Tenant` | `osac.public.v1.Tenant` |

### `TenantsDeleteRequest`

| Field | AI Grid | OSAC public |
|---|---|---|
| `id` #1 | string; Keycloak UUID | string; OSAC Tenant ID |

### `TenantsDeleteResponse`

Both define an empty response message:

```protobuf
message TenantsDeleteResponse {}
```

Both messages have the same empty field set, but their fully qualified message
names differ by package. Behavior also differs: AI Grid directly deletes the
Keycloak Organization; OSAC public Delete is unimplemented and OSAC private
Delete initiates OSAC cleanup and reconciliation.

---

### Strict request/response message identity verdict

The request/response **simple names** match for the shared CRUD methods, but
the fully qualified message names differ because the packages differ. Fields
that contain a `Tenant` also use different fully qualified nested types.

| Message | Strict result |
|---|---|
| `TenantsListRequest` | Fields 1–4 match; FQN differs; filter/order semantics differ |
| `TenantsListResponse` | `size`/`total` match; `items` Tenant FQN differs |
| `TenantsGetRequest` | `id:string` field matches; message FQN and ID meaning differ |
| `TenantsGetResponse` | `object` Tenant FQN differs |
| `TenantsCreateRequest` | `object` Tenant FQN differs |
| `TenantsCreateResponse` | `object` Tenant FQN differs |
| `TenantsUpdateRequest` | `object` Tenant FQN differs; FieldMask/bool fields match |
| `TenantsUpdateResponse` | `object` Tenant FQN differs |
| `TenantsDeleteRequest` | `id:string` field matches; message FQN and ID meaning differ |
| `TenantsDeleteResponse` | Both empty; message FQN differs |

**Strict result:** No shared request/response message is an exact Protobuf type
match. Even where individual scalar field descriptors match,
package-qualified message names or nested resource message types differ.

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

| Field | AI Grid | OSAC public |
|---|---|---|
| `id` #1 | string; Keycloak UUID | string; OSAC Tenant ID |
| `metadata` #2 | `ai_grid.v1.Metadata` | `osac.public.v1.Metadata` |
| `spec` #3 | `ai_grid.v1.TenantSpec` | `osac.public.v1.TenantSpec` |
| `status` #4 | Empty `ai_grid.v1.TenantStatus` | Absent from public Tenant |

Only the scalar `id` field matches as a field descriptor. `metadata` and `spec`
reference different package-qualified messages; AI Grid also has a public `status`
field that OSAC's public Tenant omits. The Tenant message definitions are not an
exact match. AI Grid IDs are Keycloak Organization UUIDs; OSAC uses its own Tenant
identifier and lifecycle resource.

---

## 4. Metadata Field Comparison

AI Grid uses `ai_grid.v1.Metadata`; OSAC public uses
`osac.public.v1.Metadata`.

### Common fields

| Field # | Field name and shared type |
|---:|---|
| 1 | `creation_timestamp`: `google.protobuf.Timestamp` |
| 2 | `deletion_timestamp`: `google.protobuf.Timestamp` |
| 3 | `creator`: `string` |
| 4 | `tenant`: `string` |
| 5 | `name`: `string` |
| 6 | `labels`: `map<string, string>` |
| 7 | `annotations`: `map<string, string>` |
| 8 | `version`: `int32` |

### OSAC-only public metadata fields

| OSAC-only field # | Type |
|---:|---|
| 9 `project` | string |
| 10 `display_name` | string |
| 11 `description` | string |

OSAC private Metadata also defines `finalizers` at field 12, marked private and
not present in the public API. AI Grid Metadata has eight fields total.

Metadata fields 1–8 match by number, name, and Protobuf type, including the
same `name` validation rule. The Metadata messages are nevertheless not exact
matches: their fully qualified names differ, and OSAC adds fields 9–11. OSAC
also documents and enforces reserved `admin.osac.openshift.io` label and
annotation behavior on public Create/Update; AI Grid has no equivalent contract.
At runtime, AI Grid's Organization mapper primarily populates `metadata.name`,
while OSAC uses Metadata in its persisted tenant-scoped resource model.

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

| Field | AI Grid | OSAC public |
|---|---|---|
| `domains` #1 | repeated string | repeated string; added validation options |
| `break_glass_credentials_secret` #2 | absent | `SecretLocalReference` |

#### `domains` behavior

- **AI Grid:** The server validates that domains are non-empty DNS hostnames,
  contain at least two labels, are not IP addresses, and have no duplicates in
  the submitted list. It passes the domains to the Keycloak Organization API.
- **OSAC:** The proto declares Protovalidate constraints for non-empty values,
  maximum length, DNS hostname syntax, no IP addresses, at least two labels,
  lowercase valid labels, and no duplicates. The proto documentation also says
  domains are globally unique across tenants.

The `domains` fields match by number, name, repeated cardinality, and element
type (`string`), but are not identical field contracts: OSAC adds Protovalidate
options that AI Grid does not declare in the proto. Runtime validation also
differs. OSAC stores domains in the Tenant spec and reconciles them to the
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
has six fields. Its private `TenantConditionType` enum also includes the
storage-onboarding condition at value 4, detailed below:

| Field # | Type / meaning |
|---|---|
| 1 `break_glass_credentials` | `BreakGlassCredentials`; create-time only |
| 2 `state` | `TenantState`; IDP lifecycle |
| 3 `message` | optional string; progress/failure |
| 4 `idp_tenant_name` | string |
| 5 `break_glass_user_id` | string |
| 6 `conditions` | repeated `TenantCondition` |

### OSAC `BreakGlassCredentials`

This private message is nested in `TenantStatus`:

| Field # | Type |
|---|---|
| 1 `username` | string |
| 2 `password` | string; sensitive, one-time response |

The password is cleared from inline status after reconciliation persists a
secret reference. The durable credentials live in the referenced Secret.

### OSAC `TenantState` enum

| Enum value | Meaning |
|---|---|
| 0 `TENANT_STATE_UNSPECIFIED` | Unknown/not initialized |
| 1 `TENANT_STATE_PENDING` | IDP synchronization in progress |
| 2 `TENANT_STATE_SYNCED` | IDP synchronized; compute may still be pending |
| 3 `TENANT_STATE_FAILED` | IDP synchronization failed |

AI Grid defines no equivalent Tenant lifecycle enum or status field.

### OSAC `TenantCondition` fields

| Condition field # | Type |
|---|---|
| 1 `type` | `TenantConditionType` |
| 2 `status` | `ConditionStatus` |
| 3 `last_transition_time` | `google.protobuf.Timestamp` |
| 4 `reason` | optional string |
| 5 `message` | optional string |

### OSAC `TenantConditionType` enum

| Enum value | Meaning |
|---|---|
| 0 `TENANT_CONDITION_TYPE_UNSPECIFIED` | Unspecified |
| 1 `TENANT_CONDITION_TYPE_DEFAULT_NETWORKING_READY` | Default network readiness |
| 2 `TENANT_CONDITION_TYPE_VAULT_READY` | Vault namespace readiness |
| 3 `TENANT_CONDITION_TYPE_COMPUTE_INFRASTRUCTURE_READY` | Compute readiness on hubs |
| 4 `TENANT_CONDITION_TYPE_STORAGE_ONBOARDING_COMPLETE` | Initial storage onboarding milestone |

### OSAC `ConditionStatus` enum

| Enum value | Meaning |
|---|---|
| 0 `CONDITION_STATUS_UNSPECIFIED` | Not specified |
| 1 `CONDITION_STATUS_TRUE` | Condition is true |
| 2 `CONDITION_STATUS_FALSE` | Condition is false |

None of these status fields or enums are exposed by OSAC's public Tenant type.
AI Grid's empty `TenantStatus` is not a reduced equivalent of OSAC's private
status model.

---

## 7. Runtime and Lifecycle Differences

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

## 8. OSAC Tenant Lifecycle, Callers, and Keycloak Model

### Public and private API behavior

The OSAC public Tenants proto declares List/Get/Create/Update/Delete, but the
current public server implements List and Get only. Public Create, Update, and
Delete return gRPC `UNIMPLEMENTED`. The private Tenants service implements the
write operations used for platform administration and reconciliation.

In the current implementation, the first-party Admin UI is one caller of that
private service: its Tenant list uses `osac.private.v1.Tenants`, its create page
calls private Create, and its action menu calls private Delete. The browser uses
the UI's Connect transport/proxy; it does not connect directly to the backend
gRPC listener. The current UI has no Tenant Update action.

“Private” is an API-surface classification, **not a guarantee of network
isolation or backend-only access**. Authentication and authorization still
apply. The Admin UI is authorized to use these operations; an ordinary
Tenant Admin is not thereby granted platform-wide Tenant administration.

### Who calls the private Tenant service?

| Caller | Private Tenant methods |
|---|---|
| OSAC Admin UI | List, Create, Delete |
| Installer dev bootstrap | Create |
| Fulfillment reconcilers | Update status/finalizers |
| OSAC Operator feedback | Signal |
| `osac tenant` CLI | No Tenant CRUD |

Tests also call the private API, but they are not runtime clients.

### Create and onboarding sequence

A private `Tenants.Create` call begins the lifecycle; it does not wait for all
onboarding work to finish:

1. **Validate the request.** `metadata.name` is required. `id` must be empty or
equal to the name; an empty ID is set to the name. `metadata.tenant` must be
empty or equal to the name; an empty value is set to the name. Domains and any
supplied `break_glass_credentials_secret` reference are validated.
2. **Create the OSAC resource.** Fulfillment persists the Tenant record. If no
break-glass Secret reference was supplied, private Create generates credentials
and can return them once in the Create response. They are not available from
later Get/List responses.
3. **Start independent reconciliation paths.** The `tenant` and `onboarding`
reconcilers add their cleanup finalizers before doing external work. Their
progress is asynchronous and may overlap.
4. **Synchronize identity and credentials.** The `tenant` reconciler initializes
private status to `PENDING`, creates/synchronizes a Keycloak Organization with
the Tenant's domains, and creates a break-glass account. It then ensures a Vault
namespace when configured and stores durable credentials in an OSAC Secret. On
successful IDP synchronization it records `SYNCED` and clears the transient
inline password. If there is no supplied Secret reference, the system-generated
credentials are persisted as a Secret and the reference is written back to the
Tenant.
5. **Prepare tenant infrastructure on hubs.** The onboarding reconciler creates
or updates an OSAC Tenant custom resource and a tenant namespace on each
configured hub. The operator watches hub Tenant CR changes and signals
Fulfillment to refresh the authoritative Tenant status.
6. **Reconcile ongoing readiness.** For a `SYNCED` Tenant, Fulfillment updates
domain settings in the IDP, ensures Vault/default networking, and updates
readiness conditions. Compute-infrastructure readiness is observed from hub
Tenant CRs separately. `SYNCED` means IDP synchronization completed; it does
not mean compute infrastructure is ready.

The private `TenantStatus` contains lifecycle state, messages, IDP identity,
and readiness conditions. The public Tenant type has no `status` field, so these
internal lifecycle details are not visible through public Tenant List/Get.

### Update and delete lifecycle

**Update:** Private Update applies the field mask to the stored OSAC Tenant and
supports optimistic locking when `lock=true`. A change to domains is later
reconciled to the Keycloak Organization. Controller-owned status/finalizer
updates also use this private Update API. Public Update currently returns
`UNIMPLEMENTED`.

**Delete:** Private Delete begins asynchronous deletion rather than simply
deleting a Keycloak Organization in the request handler. Cleanup is coordinated
by the lifecycle and onboarding finalizers:

- The lifecycle reconciler removes break-glass Secrets and the auto-created
  root project, waits for remaining projects to be deleted, removes the Vault
  namespace when configured, deletes the Keycloak Organization, and then drops
  its finalizer.
- The onboarding reconciler removes hub Tenant CRs and tenant namespaces, waits
  for Kubernetes finalizers and project archival, and then drops its finalizer.

The OSAC Tenant is fully removed only after both cleanup paths complete. Public
Delete currently returns `UNIMPLEMENTED`.

### Keycloak realm, Organization, group, and IdentityProvider distinctions

- The installer configures a shared Keycloak realm named `osac`; OSAC does not
  create a separate realm for each Tenant.
- Each OSAC Tenant is represented by a Keycloak **Organization** in that shared
  realm. Many Organizations can exist in one realm.
- A Keycloak **Group** is a different concept. The installer uses an `admins`
  group for platform administrators; the UI maps membership in that group (or a
  `cloud-provider-admin` role) to its `admin` role.
- An OSAC **IdentityProvider** resource is tenant-scoped OIDC configuration. It
  is separate from the Keycloak Organization created during Tenant onboarding;
  creating an IdentityProvider is not a prerequisite for viewing or creating a
  platform Tenant.

The realm import defines the platform-admin user and the demo tenant users.
Admin identity values are substituted from deployment-managed Keycloak
credentials; demo-user passwords are set by a password-setup job from the
`default-user-password` key in the `keycloak-admin-credentials` Secret. The
actual values are deployment-specific and are intentionally not reproduced
here. In the local dev fixtures, `tenant1_user` is a tenant user, not a Cloud
Provider Admin, so that account does not see the platform-wide
Administration → Tenants page.

---

## 9. Compatibility Summary and Integration Notes

### Compatibility by layer

| Layer | Strict result |
|---|---|
| Service identity | ❌ Different package/FQN |
| CRUD simple names | 🟡 Same names; different FQ RPC paths |
| Request/response types | ❌ Package and nested Tenant FQNs differ |
| List request fields | 🟡 Descriptors match; query behavior differs |
| List response | ❌ Nested `items` type differs |
| IDs | 🟡 Same string field; different identity |
| Object messages | ❌ Nested Tenant FQNs differ |
| Update | ❌ Object type/lock behavior differs |
| Public Tenant | ❌ AI has status; OSAC public does not |
| Metadata | 🟡 Fields 1–8 match; OSAC adds 9–11 |
| TenantSpec | ❌ OSAC adds validation and Secret reference |
| TenantStatus | ❌ Empty AI status vs private OSAC lifecycle status |
| Private extension | OSAC has private `Signal` |
| Runtime | ❌ Direct Organization CRUD vs OSAC reconciliation |
| Exact API match | ❌ No |

Avoid assigning a compatibility percentage. Under this strict comparison, a
shared simple name or scalar field is not an exact match when its fully qualified
message type, nested type, validation contract, or field descriptor differs.

---

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
6. **Deletion:** Coordinate AI Grid's direct Organization deletion with OSAC's
   asynchronous cleanup and IDP lifecycle.

**Recommendation:** Keep the APIs and resource models separate unless there is a
specific integration requirement. Define identity, ownership, authorization,
status visibility, and delete semantics before connecting their lifecycles.

---

## References

- AI Grid Tenants service: `ai-grid-provider-backend/proto/ai_grid/v1/tenants_service.proto`
- AI Grid Tenant type: `ai-grid-provider-backend/proto/ai_grid/v1/tenant_type.proto`
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
- OSAC UI Tenant API usage: `osac-ui/libs/ui-components/src/components/Tenant/` and `osac-ui/docs/api-query-arch.md`
- OSAC UI role mapping: `osac-ui/apps/app-frontend/src/hooks/oidc-login.tsx`, `shellNav.ts`
- Installer Keycloak realm/password setup: `osac-installer/charts/osac-infra/files/realm.json`, `osac-installer/charts/osac-infra/templates/keycloak/resources.yaml`, and `osac-installer/charts/osac-infra/files/hooks/resolve-realm-secrets.sh`
- Local Tenant bootstrap: `osac-installer/scripts/dev-full/provision-tenant.sh` and `charts/osac-devstack/files/provision-tenant.sh`
- OSAC Operator Tenant feedback: `osac-operator/internal/controller/tenant_feedback_controller.go`
