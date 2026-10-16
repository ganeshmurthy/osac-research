## Overview

This research folder contains comprehensive API documentation and integration design for incorporating AI Grid MVP capabilities into the OSAC (Open Sovereign AI Cloud) platform. Both systems use gRPC/Protocol Buffers, enabling clean integration with aligned resource patterns.

**Project Context:**

AI Grid MVP is a separate product for AI/ML workload deployment using ACM (Advanced Cluster Management). OSAC is an infrastructure provisioning platform using Ansible/AAP. Post-v1, AI Grid MVP features will be absorbed into OSAC, requiring API unification and integration of ACM-based multi-cluster workload distribution with OSAC's Ansible-based cluster provisioning.

---

## Documents

### 1. osac-grpc-api-reference.md

**Size:** 40K | 871 lines  
**Purpose:** Complete reference of all OSAC gRPC services

**Contents:**
- All 38 OSAC Fulfillment API services
- Private API vs Public API comparison tables
- Service organized by category (Compute, Networking, Storage, IAM, Catalog, System)
- Standard OSAC resource patterns (id/metadata/spec/status)
- HTTP transcoding endpoints for each RPC

**When to read:**
- Need to understand OSAC's existing API surface
- Looking for where AI Grid features fit
- Designing new services following OSAC patterns
- Checking if a capability already exists in OSAC

**Key Findings:**
- 38 services covering full infrastructure stack
- All services follow consistent patterns
- Only 1 fully private service (Hubs)
- 36 Signal RPCs (private-only for controller feedback)
- No AI/ML workload management services

---

### 2. ai-grid-mvp-api-reference.md

**Size:** 21K | 683 lines  
**Purpose:** Complete reference of AI Grid MVP REST APIs (PoC)

**Contents:**
- 5 resource APIs: Health, Clusters, Tenants, Models, Subscriptions
- 17 total REST endpoints
- Request/response structures
- Validation rules and error codes
- Generated Kubernetes resources (LLMInferenceService, MaaSSubscription, etc.)
- ACM Placement and ManifestWorkReplicaSet patterns

**When to read:**
- Need to understand AI Grid MVP's capabilities
- See what's new vs OSAC
- Understand the REST PoC before gRPC translation
- Reference original requirements

**Key Findings:**
- REST is PoC-only; production will use gRPC
- 4 new capabilities not in OSAC:
  1. AI model deployment (multi-location via ACM)
  2. MaaS subscription management (token rate limits)
  3. Embedded OIDC IdP in tenants
  4. ACM-based workload distribution
- Clusters API is enrollment-only (not provisioning)
- Atomic tenant + IdP operations

**Note:** This documents the REST PoC. See `ai-grid-mvp-grpc-api-design.md` for production gRPC design.

---

### 3. ai-grid-mvp-grpc-api-design.md

**Size:** 35K | 1,425 lines  
**Purpose:** Production gRPC API design for AI Grid MVP

**Contents:**
- Complete Protocol Buffer service definitions for all 5 services
- Full message definitions following OSAC patterns
- HTTP transcoding annotations (dual gRPC + REST)
- Validation rules via proto annotations
- Common types (Metadata, State, Condition)
- Code generation commands
- Implementation checklist
- Migration guide from REST to gRPC

**When to read:**
- Ready to implement AI Grid APIs in gRPC
- Need proto definitions to copy into OSAC
- Want to see how REST maps to gRPC
- Planning code generation

**Key Services:**
1. **Health** - Simple backend health check
2. **GridClusters** - ACM cluster enrollment (List/Get/Enroll/Update/Signal + ListLocations)
3. **Tenants** - Tenant + embedded OIDC IdP (Full CRUD + Signal)
4. **AIModels** - Multi-location model deployment (Full CRUD + Signal)
5. **AISubscriptions** - MaaS subscription management (Full CRUD + Signal, extended Get)

**Proto Structure:**
```
osac/aigrid/v1/
├── common/               (Metadata, State, Condition)
├── grid_clusters_service.proto
├── ai_models_service.proto
├── ai_subscriptions_service.proto
└── identity_provider_type.proto
```

---

### 4. ai-grid-osac-integration-design.md

**Size:** 53K | 1,675 lines  
**Purpose:** Comprehensive gRPC-to-gRPC integration design

**Contents:**
- Service-by-service comparison (OSAC vs AI Grid MVP)
- Two integration options for each overlap
- Complete integration architecture diagram
- Controller design with Go code examples
- ACM integration layer (OSAC clusters → ACM registration)
- Proto package structure recommendations
- Database schema (AIModel, AISubscription tables)
- 6-phase implementation roadmap (26 weeks)
- 8 open questions with recommendations

**When to read:**
- Planning the integration project
- Need architecture decisions
- Designing controllers and reconciliation
- Estimating implementation effort
- Resolving technical questions

**Key Design Decisions:**

| Question | Recommendation |
|----------|----------------|
| Clusters integration | **Separate GridClusters service** |
| Tenants/OIDC | **Extend with optional IdP field** |
| New services | **Add AIModels + AISubscriptions** |
| Controller | **New osac-aigrid-controller** |
| ACM integration | **Auto-register OSAC clusters in ACM** |
| Watch strategy | **Shadow CRs in Kubernetes** |

**Implementation Phases:**
1. Proto definitions & ACM setup (4 weeks)
2. GridClusters service (4 weeks)
3. AIModels service (6 weeks)
4. AISubscriptions service (5 weeks)
5. Extended Tenants (3 weeks)
6. Integration & polish (4 weeks)

**Total:** 26 weeks

---

## Document Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                     Project Overview                        │
│                                                             │
│  AI Grid MVP needs to merge into OSAC post-v1 release      │
│  Both systems use gRPC, but different provisioning models   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
         ┌──────────────────────────────────────┐
         │   What does each system have?        │
         └──────────────────────────────────────┘
                  │                    │
                  ▼                    ▼
    ┌──────────────────────┐  ┌─────────────────────────┐
    │ osac-grpc-api-       │  │ ai-grid-mvp-api-        │
    │ reference.md         │  │ reference.md            │
    │                      │  │                         │
    │ • 38 OSAC services   │  │ • 5 REST APIs (PoC)     │
    │ • Infrastructure     │  │ • AI workload focus     │
    │ • Ansible provision  │  │ • ACM distribution      │
    └──────────────────────┘  └─────────────────────────┘
                  │                    │
                  └──────────┬─────────┘
                             ▼
              ┌──────────────────────────────┐
              │  What are the differences?   │
              └──────────────────────────────┘
                             │
                             ▼
              Gap Analysis (in integration design):
              • AI Grid has: Models, Subscriptions, OIDC, ACM
              • OSAC has: Full infrastructure stack
              • Overlap: Clusters (different scopes), Tenants
                             │
                             ▼
         ┌──────────────────────────────────────┐
         │   How do we design the gRPC APIs?    │
         └──────────────────────────────────────┘
                             │
                             ▼
              ┌────────────────────────────────┐
              │ ai-grid-mvp-grpc-api-design.md │
              │                                │
              │ • Proto definitions            │
              │ • 5 services in gRPC           │
              │ • OSAC pattern compliance      │
              │ • Ready to implement           │
              └────────────────────────────────┘
                             │
                             ▼
         ┌──────────────────────────────────────┐
         │   How do we integrate everything?    │
         └──────────────────────────────────────┘
                             │
                             ▼
       ┌──────────────────────────────────────────┐
       │ ai-grid-osac-integration-design.md       │
       │                                          │
       │ • GridClusters: separate service        │
       │ • Tenants: extend with optional IdP     │
       │ • AIModels: new service                 │
       │ • AISubscriptions: new service          │
       │ • osac-aigrid-controller: new component │
       │ • ACM bridge: OSAC clusters → ACM Hub   │
       │ • 26-week roadmap                       │
       └──────────────────────────────────────────┘
```

---

## Reading Guide

### Scenario 1: "I need to understand what OSAC already has"

**Read:** `osac-grpc-api-reference.md`

**Focus on:**
- API Organization section (categories)
- Standard RPC Pattern
- Services relevant to your work

**Skip:** Individual service details unless needed

---

### Scenario 2: "I need to understand AI Grid MVP capabilities"

**Read in order:**
1. `ai-grid-mvp-api-reference.md` (understand requirements)
2. `ai-grid-mvp-grpc-api-design.md` (see gRPC translation)

**Focus on:**
- API Summary table (5 resources)
- Complete API Reference section
- Proto Definition sections (in gRPC design)

---

### Scenario 3: "I need to implement AI Grid integration"

**Read in order:**
1. `osac-grpc-api-reference.md` (understand OSAC patterns)
2. `ai-grid-mvp-grpc-api-design.md` (proto definitions)
3. `ai-grid-osac-integration-design.md` (integration plan)

**Focus on:**
- Service-by-Service Analysis (integration design)
- Proto Design Recommendations
- Controller & Reconciliation Design
- Migration & Rollout Plan

---

### Scenario 4: "I need to make architecture decisions"

**Read:** `ai-grid-osac-integration-design.md`

**Focus on:**
- Service-by-Service Analysis (options A vs B)
- Integration Architecture
- Open Questions & Decisions

**Reference:**
- Other docs for context when needed

---

### Scenario 5: "I need proto definitions to start coding"

**Read:** `ai-grid-mvp-grpc-api-design.md`

**Copy:**
- Proto definitions from each service section
- Common types from Common Types section

**Follow:**
- Proto File Structure recommendation
- Code Generation commands

---

## Key Concepts

### OSAC Resource Pattern

All OSAC resources follow this structure:

```protobuf
message Resource {
  string id = 1;                    // Unique identifier
  Metadata metadata = 2;            // Name, timestamps, version, annotations, labels
  ResourceSpec spec = 3;            // Desired state
  ResourceStatus status = 4;        // Observed state
}
```

**Standard RPCs:**
- `List` - Query with offset/limit/filter/order
- `Get` - Fetch by ID
- `Create` - Create new resource
- `Update` - Patch with FieldMask + optimistic locking
- `Delete` - Remove resource
- `Signal` - Private API only, controller feedback

### Tenant Isolation

All resources use annotations for multi-tenancy:

```protobuf
message Metadata {
  map<string, string> annotations = 6;
  // Required keys:
  //   osac.openshift.io/tenant: <tenant-id>
  //   osac.openshift.io/owner-reference: <owner-id>
}
```

### Optimistic Locking

Updates use version-based locking:

```protobuf
message Metadata {
  int32 version = 5;  // Auto-incremented on each update
}

message UpdateRequest {
  Resource object = 1;
  google.protobuf.FieldMask update_mask = 2;
  bool lock = 3;  // If true, checks object.metadata.version
}
```

### Private vs Public API

- **Private API:** `/api/private/v1/*` - Admin/controller access
- **Public API:** `/api/fulfillment/v1/*` - Tenant-scoped access

Most RPCs available in both. Exceptions:
- All `Signal` RPCs: Private only
- Some admin operations: Private only

---

## Quick Reference

### API Counts

| System | Services | Total RPCs | Private-Only RPCs |
|--------|----------|------------|-------------------|
| OSAC | 38 | ~230 | 38 (all Signals + Hubs service) |
| AI Grid MVP | 5 | ~30 | 5 (all Signals) |
| **Integrated** | **40-41*** | **~260** | **43** |

*40 if Clusters extended, 41 if GridClusters separate

### New Capabilities

AI Grid MVP adds these capabilities to OSAC:

1. **AIModels Service**
   - Multi-location AI model deployment
   - ACM Placement-based cluster selection
   - vLLM/inference runtime configuration
   - Per-location deployment status

2. **AISubscriptions Service**
   - Token-based rate limiting (e.g., 100k tokens/hour)
   - Multi-model subscriptions
   - Auto-generated authorization policies
   - Token usage tracking

3. **GridClusters Service** (optional separate service)
   - ACM cluster enrollment
   - Location-based selection
   - Lightweight vs full cluster lifecycle

4. **Tenants Extension**
   - Embedded OIDC identity provider
   - Atomic tenant + IdP creation
   - HTTPS endpoint validation

### Infrastructure Requirements

**New Components:**
1. ACM Hub cluster (for multi-cluster orchestration)
2. osac-aigrid-controller (watches DB, syncs to ACM)
3. MaaS platform per spoke cluster (vLLM, subscriptions, auth)

**New Integrations:**
1. OSAC → ACM Hub (register provisioned clusters)
2. ACM Hub → Spoke clusters (distribute AI workloads)
3. Metering service → AISubscriptions (token usage)

---

## Next Steps

### For API Design

1. Review `ai-grid-mvp-grpc-api-design.md` proto definitions
2. Decide on open questions in `ai-grid-osac-integration-design.md`
3. Create proto files in OSAC repository
4. Generate code with `buf generate`
5. Review generated OpenAPI specs

### For Implementation

1. Follow 6-phase roadmap in integration design
2. Start with Phase 1: Proto definitions & ACM setup
3. Reference controller code examples
4. Use database schema for migrations
5. Track progress against implementation checklist

### For Architecture

1. Review Service-by-Service Analysis
2. Make decisions on 8 open questions
3. Validate ACM Hub deployment model
4. Confirm namespace strategy
5. Plan controller hosting

---

