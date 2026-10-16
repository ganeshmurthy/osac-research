# AI Grid MVP API Reference

**Document Version:** 1.0  
**Date:** 2026-10-16  
**Repository:** `ai-grid-cloud-provider-poc`  
**Commit:** `043dc940b1b4d102ae86d82e01bff841ec481ad0`

## Overview

This document provides a comprehensive reference of all APIs in the AI Grid MVP Proof of Concept.

**Important:** This PoC uses REST/JSON for rapid prototyping. **The production AI Grid MVP will use gRPC** following OSAC's patterns and standards.

**Total API Resources:** 5  
**API Style (PoC):** REST + OpenAPI 3.0  
**API Style (Production):** gRPC + Protocol Buffers (same as OSAC)  
**OpenAPI Spec:** `docs/openapi.json`  
**Backend Implementation:** `backend/*.mjs`

---

## API Summary

| Resource | Endpoints | Purpose |
|----------|-----------|---------|
| **Health** | 1 | Backend health check |
| **Clusters** | 2 | ACM cluster inventory & AI Grid enrollment |
| **Tenants** | 5 | Tenant onboarding with OIDC IdP |
| **Models** | 4 | AI model deployment to AI Grid locations |
| **Subscriptions** | 5 | MaaS subscription management |
| **Total** | **17** | |

---

## Complete API Reference

### 1. Health API

**Purpose:** Check backend availability

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/api/health` | Check Git storage availability | None | `{status, storage, autoCommit}` |

**Response Codes:**
- `200` - Repository is available
- `503` - Repository unavailable or locked
- `500` - HTTP transport failure

**Example Response:**
```json
{
  "status": "ok",
  "storage": "git",
  "autoCommit": false
}
```

---

### 2. Clusters API

**Purpose:** ACM Hub cluster inventory and AI Grid enrollment

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/clusters` | List all ACM ManagedClusters | None | Array of GridCluster |
| PATCH | `/api/clusters/{name}` | Enroll cluster in AI Grid | `{aiGridEnabled: true}` | Updated GridCluster |

**Data Source:**
- Git ManagedCluster CRs (default)
- Live ACM Hub (when configured with `ACM_HUB_URL`)

**Resource Shape - GridCluster:**
```json
{
  "name": "site1",
  "location": "site1",
  "status": "Ready|Offline|Unknown",
  "aiGridEnabled": true,
  "provisioned": true,
  "provisioningState": "Provisioned|Provisioning|Not provisioned"
}
```

**Field Descriptions:**
- `name` - ManagedCluster name
- `location` - From `metadata.labels.location`
- `status` - From ACM `ManagedClusterConditionAvailable` condition
- `aiGridEnabled` - From `metadata.labels["ai-grid/enabled"]` label
- `provisioned` - From `metadata.labels["ai-grid/provisioned"]` label
- `provisioningState` - Derived from status + labels

**Enrollment:**
- Only accepts `{"aiGridEnabled": true}` in request body
- Applies JSON merge patch to add `ai-grid/enabled: "true"` label
- Idempotent operation
- Works on both Ready and Offline clusters

**Response Codes:**
- `200` - Success
- `400` - Malformed cluster name or request
- `404` - Cluster not found
- `409` - Conflict (retry after refresh)
- `503` - Hub unavailable or Git unavailable

---

### 3. Tenants API

**Purpose:** Tenant onboarding with embedded OIDC identity provider configuration

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/tenants` | List all tenants | None | Array of Tenant |
| POST | `/api/tenants` | Create tenant + IdP | TenantInput | Tenant |
| GET | `/api/tenants/{name}` | Get tenant details | None | Tenant |
| PUT | `/api/tenants/{name}` | Update tenant + IdP | TenantInput | Tenant |
| DELETE | `/api/tenants/{name}` | Delete tenant + IdP | None | 204 No Content |

**Resource Shape - Tenant:**
```json
{
  "name": "tenant1",
  "domains": ["tenant1.example.com"],
  "identityProvider": {
    "title": "Tenant 1 SSO",
    "description": "Tenant 1 identity provider",
    "enabled": true,
    "config": {
      "clientId": "tenant1-client",
      "clientSecretSecret": {
        "name": "tenant1-oidc-secret"
      },
      "issuer": "https://idp.example.com/realms/tenant1",
      "authorizationUrl": "https://idp.example.com/authorize",
      "tokenUrl": "https://idp.example.com/token",
      "defaultScopes": "openid profile email",
      "userInfoUrl": "",
      "jwksUrl": "",
      "logoutUrl": "",
      "validateSignature": true
    }
  }
}
```

**Validation Rules:**
- `name` - Lowercase DNS name, max 63 characters, `^[a-z0-9]([-a-z0-9]*[a-z0-9])?$`
- `domains` - Array of valid DNS names, unique across all tenants
- `identityProvider.config.clientId` - Required
- `identityProvider.config.clientSecretSecret.name` - Required (references Kubernetes Secret)
- `identityProvider.config.issuer` - Required HTTPS URL
- `identityProvider.config.authorizationUrl` - Required HTTPS URL
- `identityProvider.config.tokenUrl` - Required HTTPS URL

**Atomicity:**
- Tenant and IdentityProvider created/updated/deleted together in one transaction
- No partial state - both succeed or both fail

**Concurrency Control:**
- Update/Delete require `If-Match` header with quoted ETag from Get response
- Missing `If-Match` → 428 (Precondition Required)
- Stale `If-Match` → 412 (Precondition Failed)

**Response Codes:**
- `200` - Success (Update)
- `201` - Created (Create) - includes `Location` and `ETag` headers
- `204` - No Content (Delete)
- `400` - Malformed JSON
- `404` - Tenant not found
- `409` - Duplicate name or domain conflict
- `412` - Stale revision
- `413` - Request body exceeds 1 MiB
- `415` - Content-Type must be application/json
- `422` - Invalid tenant or OIDC configuration
- `428` - Missing If-Match
- `503` - Repository unavailable

**Storage:**
- Git: `tenants/<namespace>/<name>.json`
- Kind: `Tenant`
- API Version: `osac.portal/v1alpha1`

---

### 4. Models API

**Purpose:** AI model deployment with ACM-based multi-cluster placement

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/models` | List deployed models | None | Array of ManagedModel |
| POST | `/api/models` | Deploy model to locations | CreateModel | ManagedModel |
| GET | `/api/models/{name}` | Get model details | None | ManagedModel |
| DELETE | `/api/models/{name}` | Delete model + deployment | None | 204 No Content |
| GET | `/api/locations` | List deployment locations | None | Array of location strings |

**Resource Shape - ManagedModel:**
```json
{
  "name": "granite-3-8b",
  "displayName": "Granite 3 8B",
  "description": "Granite model deployment",
  "modelUri": "hf://ibm-granite/granite-3.0-8b",
  "modelName": "ibm-granite/granite-3.0-8b",
  "runtimeImage": "quay.io/rh-aiservices-bu/vllm-openai-ubi9:0.4.2",
  "replicas": 1,
  "cpu": "2",
  "memory": "4Gi",
  "gpuCount": 0,
  "runtimeArgs": [],
  "locations": ["site1", "site2", "site3"]
}
```

**Field Descriptions:**
- `name` - Unique model deployment name (DNS-1123 label)
- `displayName` - Human-readable name
- `modelUri` - Model source URI (Hugging Face, S3, etc.)
- `modelName` - Model identifier for MaaS registration
- `runtimeImage` - Container image for vLLM/inference server
- `replicas` - Number of replicas per location
- `cpu` - CPU request (e.g., "2" or "2000m")
- `memory` - Memory request (e.g., "4Gi")
- `gpuCount` - Number of GPUs per replica
- `runtimeArgs` - Additional runtime arguments
- `locations` - AI Grid locations to deploy to

**Validation Rules:**
- `name` - Max 253 characters, `^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$`
- `locations` - At least 1 location, max 64 locations
- `locations` - Each location must be in `/api/locations` response
- `replicas` - Must be >= 1
- `modelUri`, `modelName`, `runtimeImage` - Required, non-empty

**Created Resources:**
When a model is created, the following CRs are written to Git (PoC) or created in Kubernetes (production):

1. **LLMInferenceService** - vLLM deployment configuration
2. **MaaSModelRef** - Model registration for subscriptions
3. **ACM Placement** - Cluster selector based on labels + locations
4. **ACM ManifestWorkReplicaSet** - Workload distribution to selected clusters

**Locations API:**
- Returns unique location labels from Ready, provisioned AI Grid clusters
- Filters: `ai-grid/enabled: "true"` AND `ai-grid/provisioned: "true"` AND `status: Ready`
- Updates dynamically as clusters are enrolled/provisioned

**Response Codes:**
- `200` - Success (List, Get)
- `201` - Created (Create) - includes `Location` and `ETag` headers
- `204` - No Content (Delete)
- `400` - Malformed JSON or identity
- `404` - Model not found
- `405` - Unsupported method
- `409` - Duplicate name or Git conflict
- `412` - Stale revision
- `413` - Request body exceeds 1 MiB
- `415` - Content-Type must be application/json
- `422` - Invalid deployment configuration or invalid locations
- `428` - Missing If-Match (Delete)
- `503` - Repository unavailable

**Storage:**
- Git: Multiple CRs under `models/` and `placements/`
- Namespace: Configured backend default (not in API payloads)

---

### 5. Subscriptions API

**Purpose:** MaaS subscription management with token rate limits and authorization policies

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/subscriptions` | List subscriptions | None | Array of Subscription |
| POST | `/api/subscriptions` | Create subscription | CreateSubscription | MutationResult |
| GET | `/api/subscriptions/{name}` | Get subscription details | None | SubscriptionInfo |
| PUT | `/api/subscriptions/{name}` | Update subscription | UpdateSubscription | MutationResult |
| DELETE | `/api/subscriptions/{name}` | Delete subscription | None | 204 No Content |

**Resource Shape - Subscription:**
```json
{
  "name": "engineering-team",
  "displayName": "Engineering Team",
  "description": "Engineering team subscription",
  "priority": 0,
  "owner": {
    "groups": [
      {"name": "engineering"}
    ]
  },
  "modelRefs": [
    {
      "name": "granite-3-8b",
      "tokenRateLimits": [
        {
          "limit": 100000,
          "window": "1h"
        }
      ]
    }
  ],
  "createAuthPolicy": true,
  "status": {
    "phase": "Ready",
    "statusMessage": "Subscription active"
  }
}
```

**SubscriptionInfo Response (GET /subscriptions/{name}):**
```json
{
  "subscription": {...},
  "modelRefs": [...],
  "authPolicies": [...],
  "meteringMetadata": {...}
}
```

**Field Descriptions:**
- `name` - Unique subscription name (max 253 chars, max 246 if createAuthPolicy=true)
- `displayName` - Human-readable name (required, non-blank)
- `description` - Optional description
- `priority` - Integer -1,000,000 to 1,000,000 (default 0)
- `owner.groups` - At least one group required, non-blank names
- `modelRefs` - At least one model reference required
- `modelRefs[].name` - References a deployed model
- `modelRefs[].tokenRateLimits` - At least one limit required per model
- `createAuthPolicy` - Auto-generate MaaSAuthPolicy (default: true in UI)

**Token Rate Limits:**
- `limit` - Integer 1 to 1,000,000,000 tokens
- `window` - Compact duration format: `"1h"`, `"5m"`, `"30s"`
- At least one limit required per model
- Existing limits preserved until explicitly edited

**Validation Rules:**
- `name` - Lowercase alphanumerics/hyphens, start/end with alphanumeric, max 253 chars
- If `createAuthPolicy: true` - max 246 chars (leaves room for `-policy` suffix)
- `owner.groups` - At least one, warn on `system:authenticated`
- `modelRefs` - At least one unique model name
- Each model - at least one token rate limit

**Authorization Policy:**
- If `createAuthPolicy: true`, creates `MaaSAuthPolicy` named `{subscription-name}-policy`
- Automatically deleted when subscription is deleted
- Leftover policy from previous PoC version is replaced
- Independently managed policies (different name) are preserved

**Concurrency Control:**
- Update/Delete require `If-Match` header with quoted ETag
- Missing `If-Match` → 428
- Stale `If-Match` → 409 or 412

**Response Codes:**
- `200` - Success (List, Update)
- `201` - Created (Create) - includes `Location` and `ETag` headers
- `204` - No Content (Delete)
- `400` - Malformed JSON or invalid name
- `404` - Subscription not found
- `409` - Duplicate name, dirty repository, or conflict
- `412` - Stale revision
- `413` - Request body exceeds 1 MiB
- `415` - Content-Type must be application/json
- `422` - Invalid subscription configuration
- `428` - Missing If-Match
- `503` - Repository unavailable

**Storage:**
- Git: `subscriptions/<namespace>/<name>.json` (MaaSSubscription CR)
- Git: `policies/<namespace>/<name>-policy.json` (MaaSAuthPolicy CR, if auto-generated)

---

## Request/Response Patterns

### Pagination

**PoC:** No server-side pagination. All List operations return complete collections.

**Production (gRPC):** Will support `offset`, `limit`, `filter` (CEL), `order` (SQL-style)

### Filtering

**PoC:** Client-side filtering on keyword over name, displayName, description

**Production (gRPC):** Server-side CEL expression filtering

### Optimistic Locking

**PoC Mechanism:**
```
1. GET /resource/{name}
   Response includes: ETag: "abc123"

2. PUT /resource/{name}
   Request must include: If-Match: "abc123"

3. Server validates ETag matches current revision
   - Match: Update succeeds
   - Mismatch: 412 Precondition Failed
   - Missing: 428 Precondition Required
```

**Production (gRPC):**
```protobuf
message Resource {
  Metadata metadata = 2;
}

message Metadata {
  int32 version = N;  // Auto-incremented
}

message UpdateRequest {
  Resource object = 1;
  bool lock = 3;  // If true, checks object.metadata.version
}
```

### Error Responses

All errors return JSON:

```json
{
  "code": "validation|not_found|conflict|unauthorized|forbidden|unavailable|invalid_response",
  "message": "User-safe error message",
  "fieldErrors": {
    "fieldName": "Field-specific error message"
  }
}
```

**Error Code Mapping:**

| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 400 | validation | Malformed request |
| 401 | unauthorized | Authentication required |
| 403 | forbidden | Permission denied |
| 404 | not_found | Resource or route not found |
| 409 | conflict | Name conflict or concurrent modification |
| 412 | conflict | Stale revision (If-Match mismatch) |
| 413 | validation | Request too large (>1 MiB) |
| 415 | validation | Wrong Content-Type |
| 422 | validation | Invalid configuration |
| 428 | conflict | If-Match required but missing |
| 503 | unavailable | Repository/backend unavailable |
| 500 | unavailable | Internal server error |

---

## API Comparison: PoC vs Production

| Feature | PoC (REST) | Production (gRPC) |
|---------|-----------|-------------------|
| **Protocol** | HTTP/JSON | gRPC + REST transcoding |
| **Schema** | OpenAPI 3.0 | Protocol Buffers |
| **Resources** | 5 types | Same 5 types (as new OSAC services) |
| **Endpoints** | 17 REST endpoints | ~30 gRPC methods |
| **Concurrency** | ETag/If-Match | metadata.version + lock field |
| **Filtering** | Client-side | Server-side CEL expressions |
| **Pagination** | None (full lists) | offset/limit/filter/order |
| **Validation** | Runtime JSON schema | Proto validation annotations |
| **Storage** | Git (PoC) | PostgreSQL database |
| **Resource Shape** | Varied DTOs | id/metadata/spec/status pattern |
| **Standard Methods** | Varies by resource | List/Get/Create/Update/Delete/Signal |

---

## Kubernetes Resources Created

When models/subscriptions are created, the backend generates these Kubernetes CRs:

### Model Deployment

```yaml
# LLMInferenceService - vLLM deployment
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
```

```yaml
# MaaSModelRef - Registration for subscriptions
apiVersion: maas.redhat.com/v1alpha1
kind: MaaSModelRef
metadata:
  name: granite-3-8b
  namespace: maas
spec:
  modelName: ibm-granite/granite-3.0-8b
```

```yaml
# ACM Placement - Cluster selection
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
```

```yaml
# ACM ManifestWorkReplicaSet - Workload distribution
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

### Subscription + Policy

```yaml
# MaaSSubscription
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
```

```yaml
# MaaSAuthPolicy (if createAuthPolicy: true)
apiVersion: maas.redhat.com/v1alpha1
kind: MaaSAuthPolicy
metadata:
  name: engineering-team-policy
  namespace: maas
spec:
  subjects:
    groups:
      - name: engineering
  modelRefs:
    - name: granite-3-8b
      namespace: maas
```

---

## Configuration

### Environment Variables

**ACM Hub Connection:**
- `ACM_HUB_URL` - HTTPS Kubernetes API origin (e.g., `https://api.hub.example.com:6443`)
- `ACM_HUB_TOKEN_FILE` - Path to bearer token file
- `ACM_HUB_TOKEN` - Bearer token value (if not using file)
- `ACM_HUB_CA_FILE` - Path to Hub CA PEM file (if needed)

**Git Backend:**
- `MAAS_GIT_DIR` - Git repository path (default: `data/maas-git`)
- `MAAS_GIT_SEED` - Enable sample seeding (default: true)

**Namespace:**
- Configured in backend, not exposed in API payloads
- Default: `maas`

---

## RBAC Requirements

If using live ACM Hub, the backend service account needs:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ai-grid-portal
rules:
  - apiGroups: [cluster.open-cluster-management.io]
    resources: [managedclusters]
    verbs: [list, patch]
```

---

## API Documentation Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/docs` | Interactive Swagger UI |
| `/api/openapi.json` | Downloadable OpenAPI 3.0 spec |

---

## Quick Reference

### Resources Summary

| Resource | Endpoints | Create | Read | Update | Delete | Special Operations |
|----------|-----------|--------|------|--------|--------|-------------------|
| Health | 1 | - | ✅ | - | - | Status check |
| Clusters | 2 | - | ✅ | ⚠️ | - | Enrollment (PATCH) |
| Tenants | 5 | ✅ | ✅ | ✅ | ✅ | Atomic with IdP |
| Models | 4 + 1 | ✅ | ✅ | - | ✅ | Locations query |
| Subscriptions | 5 | ✅ | ✅ | ✅ | ✅ | Info endpoint |

Legend:
- ✅ Full support
- ⚠️ Limited (enrollment only, not full update)
- - Not applicable

### Methods by Resource

| Resource | GET List | GET Detail | POST Create | PUT/PATCH Update | DELETE |
|----------|----------|------------|-------------|------------------|--------|
| Clusters | ✅ List all | - | - | ✅ Enroll (PATCH) | - |
| Tenants | ✅ List all | ✅ Get one | ✅ Create | ✅ Update (PUT) | ✅ Delete |
| Models | ✅ List all | ✅ Get one | ✅ Create | - | ✅ Delete |
| Subscriptions | ✅ List all | ✅ GetInfo | ✅ Create | ✅ Update (PUT) | ✅ Delete |
| Locations | ✅ List | - | - | - | - |

---

## Document References

- **Repository:** `/home/gmurthy/opensource/ai/ai-grid-cloud-provider-poc`
- **OpenAPI Spec:** `docs/openapi.json`
- **Backend Code:** `backend/api.mjs`, `backend/models.mjs`, `backend/tenants.mjs`, `backend/clusters.mjs`
- **UI Components:** `src/` (React/TypeScript/PatternFly)
- **Documentation:** `docs/*.md`

**Related OSAC Documents:**
- OSAC gRPC API Reference: `osac-grpc-api-reference.md`
- AI Grid Integration Design: `ai-grid-osac-integration-design.md`

---

**Document Version:** 1.0  
**Last Updated:** 2026-10-16  
**Maintainer:** AI Grid MVP Team  
**Note:** PoC uses REST; production will use gRPC following OSAC standards
