# AI Grid MVP Integration Analysis

**Date:** 2026-10-17  
**Purpose:** Document AI Grid MVP UI pages from ai-grid-cloud-provider-poc and show how they integrate into OSAC Control Panel

---

## AI Grid MVP Pages Found

Based on `ai-grid-cloud-provider-poc/src/app/App.tsx`, the AI Grid MVP has **4 main sections**:

### 1. Clusters Page (`/clusters`)
**Component:** `ClustersPage.tsx`  
**Purpose:** AI Grid cluster enrollment and management

**Features:**
- List all managed clusters
- Show cluster status (Ready, Offline, etc.)
- Display AI Grid membership status (Member / Not enrolled)
- Show provisioning readiness
- "Add to AI Grid" action button for enrollment
- Location information
- Search/filter clusters
- Refresh functionality

**Table Columns:**
- Cluster (name)
- Location
- Status (Ready/Offline with colored labels)
- AI Grid (Member/Not enrolled)
- Provisioning (status label)
- Action (Add to AI Grid button)

---

### 2. Tenants Page (`/tenants`)
**Component:** `TenantListPage.tsx`  
**Purpose:** Multi-tenant management with OIDC configuration

**Features:**
- List all tenants
- Create new tenant wizard
- Edit existing tenants
- Delete tenants
- View tenant details
- Search tenants by name
- OIDC identity provider configuration per tenant

**Table Columns:**
- Tenant (name, clickable to details)
- Status (label)
- Primary domain
- Identity provider (title + issuer URL)
- Registered (timestamp)
- Actions (Edit, Delete)

**Sub-pages:**
- `/tenants/create` - TenantWizardPage (create wizard)
- `/tenants/:tenantName/edit` - TenantWizardPage (edit wizard)
- `/tenants/view/:tenantName` - TenantDetailsPage (full details)

---

### 3. Models Page (`/models`)
**Component:** `ModelsPage.tsx`  
**Purpose:** Model deployment management (Models as a Service)

**Features:**
- List all model deployments
- Deploy new models
- Delete model deployments
- View deployment locations (expandable rows)
- Filter by name or location
- Show replica count
- Display model status (Saved, Saved to Git, Registered)

**Table Columns:**
- Model deployment name (+ description)
- Model (model name)
- Replica count
- Locations (expandable compound cell)
- Last saved (timestamp)
- Status (label: Saved/Saved to Git/Registered)
- Actions (Delete)

**Expanded Row:**
- Shows detailed location placement information
- Uses `ExpandedLocationsPanel` component

**Sub-pages:**
- `/models/deploy` - ModelWizard (deploy new model)

---

### 4. Subscriptions Page (`/subscriptions`)
**Component:** `SubscriptionsTab.tsx`  
**Purpose:** Manage subscriptions to MaaS models

**Features:**
- List all subscriptions
- Create new subscriptions
- Edit existing subscriptions
- View subscription details
- Delete subscriptions

**Sub-pages:**
- `/subscriptions/create` - CreateSubscriptionPage
- `/subscriptions/edit/:subscriptionName` - EditSubscriptionPage
- `/subscriptions/view/:subscriptionName` - ViewSubscriptionPage

---

## Integration Strategy: Option B (Hybrid Approach)

### Current OSAC Control Panel Navigation
The OSAC UI mockups I created have this structure:

**Platform Admin:**
- Catalog
- Projects
- Administration → Tenants
- Storage → Storage Backends, Storage Tiers
- Infrastructure → Instance Types, IP Pools, Bare Metal Types, Disk Images
- Networking → Virtual Networks, Security Groups
- Secrets

**Tenant Admin:**
- Catalog
- Services → Bare Metal, Clusters, VMs
- Projects
- Storage → Volumes
- Identity Providers
- Role Bindings
- Networking
- Secrets

**Tenant User:**
- Catalog
- Services → Bare Metal, Clusters, VMs
- Networking
- Secrets

**IDP Manager:**
- Identity Providers
- Role Bindings
- Secrets

---

## Proposed Integration Mapping

### Platform Administrator View
Add new **"AI Grid"** section:

```
Navigation Structure:
├── Catalog
├── Projects
├── Administration
│   └── Tenants (existing OSAC tenant management)
├── AI Grid ⭐ NEW
│   ├── Grid Clusters (enrollment/membership)
│   ├── Models (deployments)
│   └── Subscriptions (MaaS)
├── Storage
│   ├── Storage Backends
│   └── Storage Tiers
├── Infrastructure
│   ├── Instance Types
│   ├── External IP Pools
│   ├── Bare Metal Types
│   └── Disk Images
├── Networking
│   ├── Virtual Networks
│   └── Security Groups
└── Secrets
```

**Why separate "AI Grid" section?**
- Clear separation between infrastructure provisioning (OSAC core) and AI workload management (AI Grid MVP)
- Follows Option B: OSAC handles provisioning, AI Grid handles workload distribution
- Platform admins can see all AI Grid activity across all tenants

---

### Tenant Administrator View
Add AI Grid features under existing sections + new section:

```
Navigation Structure:
├── Catalog
├── Services
│   ├── Bare Metal
│   ├── Clusters (existing)
│   └── Virtual Machines
├── AI Grid ⭐ NEW (tenant-scoped)
│   ├── Grid Enrollment (enroll tenant's clusters)
│   ├── Model Deployments (tenant's models)
│   └── Subscriptions (tenant's subscriptions)
├── Projects
├── Storage
│   └── Volumes
├── Identity Providers (OSAC + AI Grid tenant config merge)
├── Role Bindings
├── Networking
└── Secrets
```

**Integration Notes:**
- **Identity Providers:** AI Grid tenant OIDC config merges with existing OSAC IDP management
- **Grid Enrollment:** Tenant admins enroll their OSAC-provisioned clusters into AI Grid
- **Model Deployments:** Deploy AI models to their enrolled clusters
- **Subscriptions:** Subscribe to MaaS offerings

---

### Tenant User View
Limited AI Grid access:

```
Navigation Structure:
├── Catalog
│   └── (Add AI model catalog items) ⭐
├── Services
│   ├── Bare Metal
│   ├── Clusters
│   └── Virtual Machines
├── AI Models ⭐ NEW (read-only or deploy-only)
│   └── My Deployments
├── Networking
└── Secrets
```

**Permissions:**
- View deployed models
- Deploy models (if authorized)
- Cannot manage subscriptions (tenant admin only)

---

## Key Integration Points

### 1. Tenant Management Convergence
**Challenge:** Both OSAC and AI Grid have tenant concepts

**Solution:**
- OSAC Tenant = Infrastructure boundary (quotas, resources, billing)
- AI Grid Tenant = OIDC realm for model access control
- **Recommendation:** Single tenant entity with dual concerns
  - OSAC side: Resource quotas, infrastructure limits
  - AI Grid side: OIDC configuration, model subscription access

### 2. Cluster Enrollment Flow
**User Journey:**
1. Platform Admin or Tenant Admin provisions OpenShift cluster via OSAC (existing flow)
2. Cluster appears in OSAC "Services → Clusters"
3. **NEW:** Cluster also appears in "AI Grid → Grid Clusters" as "Not enrolled"
4. Admin clicks "Add to AI Grid" → ACM enrolls cluster as ManagedCluster
5. Cluster status changes to "Member"
6. Cluster becomes available for model deployment

**Implementation:**
- OSAC operator creates OpenShift cluster via AAP
- AI Grid control plane detects new cluster (watch OSAC fulfillment status)
- Shows cluster in "Grid Clusters" page with enrollment option
- Enrollment creates ACM ManagedCluster resource

### 3. Model Deployment to OSAC Clusters
**User Journey:**
1. Tenant Admin navigates to "AI Grid → Model Deployments"
2. Clicks "Deploy model"
3. ModelWizard shows:
   - Model selection (from subscription catalog)
   - Target locations (enrolled OSAC clusters)
   - Replica count
   - Runtime arguments
4. Deployment creates GitOps manifests
5. ACM distributes to selected clusters

### 4. Catalog Integration
**Current OSAC Catalog Items:**
- OpenShift Cluster
- RHEL VM
- Bare Metal Server
- Persistent Volume
- Virtual Network
- Ubuntu Server

**New AI Grid Catalog Items:**
- 🤖 AI Model Deployment (new category)
- 🧠 Model Subscription (new category)

---

## UI Components Comparison

### Shared UI Framework
Both projects use:
- **PatternFly** (React component library)
- **React Router** for navigation
- **TypeScript**
- Similar table/form patterns

### ai-grid-cloud-provider-poc Uses:
- `ApplicationsPage` wrapper component
- `Table` with sortable columns
- `EmptyState` patterns
- `SimpleMenuActions` for row actions
- `DeleteModal` for confirmations
- Expandable table rows for location details
- Search/filter toolbars

### OSAC UI Uses:
- Similar PatternFly components
- Role-based navigation via `shellNav.ts`
- Multi-step wizards for resource creation
- Form validation
- Real-time status updates

**Compatibility:** High - both use same component library and patterns

---

## Data Flow: Option B Architecture

```
User Request (AI Grid Feature)
    ↓
AI Grid Control Plane UI (integrated into OSAC UI)
    ↓
AI Grid REST API (from ai-grid-cloud-provider-poc backend)
    ↓
ACM Hub (for cluster management & workload distribution)
    ↓
OSAC-Provisioned OpenShift Clusters (enrolled as ManagedClusters)
    ↓
Model Serving Runtime (on enrolled clusters)
```

**OSAC Role in Option B:**
- ✅ Provision OpenShift clusters (Ansible/AAP)
- ✅ Manage infrastructure (VMs, networking, storage)
- ✅ Handle tenant resource quotas
- ❌ Does NOT manage AI workload distribution (ACM does this)

**AI Grid Role in Option B:**
- ✅ Enroll OSAC clusters into ACM
- ✅ Distribute AI model deployments
- ✅ Manage model subscriptions
- ✅ Handle MaaS governance
- ❌ Does NOT provision infrastructure (OSAC does this)

---

## Implementation Phases

### Phase 1: Basic Integration (MVP)
**Goal:** Embedded AI Grid pages in OSAC UI

**Tasks:**
1. Add "AI Grid" navigation section to Platform Admin view
2. Embed ai-grid-cloud-provider-poc pages:
   - Clusters → Grid Clusters
   - Models → Model Deployments
   - Subscriptions → Subscriptions
3. Tenant management remains separate (OSAC tenants ≠ AI Grid tenants initially)
4. Manual cluster enrollment flow

**Deliverable:** Platform admins can enroll clusters and deploy models via OSAC UI

---

### Phase 2: Tenant Convergence
**Goal:** Unified tenant model

**Tasks:**
1. Merge tenant creation wizards (OSAC + AI Grid)
2. Single tenant entity with:
   - OSAC resource quotas
   - AI Grid OIDC configuration
3. Tenant admins see unified view:
   - Infrastructure resources (OSAC)
   - AI Grid enrollments and deployments
4. Role-based access for AI Grid features

**Deliverable:** Tenant admins manage both infrastructure and AI features

---

### Phase 3: Catalog Integration
**Goal:** Unified service catalog

**Tasks:**
1. Add AI model deployment to OSAC catalog
2. Subscription-based catalog items
3. Dependency handling (must have enrolled cluster before deploying model)
4. Catalog RBAC (who can deploy what models)

**Deliverable:** Users browse unified catalog for infrastructure + AI services

---

### Phase 4: Automation
**Goal:** Auto-enrollment and intelligent placement

**Tasks:**
1. Auto-enroll new OSAC clusters to AI Grid (optional setting)
2. Intelligent model placement based on:
   - Cluster capacity
   - Geographic location
   - Cost optimization
3. Cluster health monitoring
4. Auto-scaling model replicas

**Deliverable:** Self-service AI Grid with minimal manual intervention

---

## API Integration Points

### ai-grid-cloud-provider-poc Backend APIs
(From earlier analysis)

**Available REST APIs:**
- `GET /api/health` - Health check
- `GET /api/clusters` - List clusters
- `POST /api/clusters/:name/enroll` - Enroll cluster to AI Grid
- `GET /api/tenants` - List tenants
- `POST /api/tenants` - Create tenant with OIDC
- `GET /api/models` - List model deployments
- `POST /api/models` - Deploy model
- `DELETE /api/models/:name` - Delete deployment
- `GET /api/subscriptions` - List subscriptions
- `POST /api/subscriptions` - Create subscription

### OSAC Fulfillment API
(From OSAC mono-repo)

**Existing gRPC/REST APIs:**
- Cluster provisioning (CaaS)
- VM provisioning (VMaaS)
- Bare metal provisioning (BMaaS)
- Storage volume management
- Network configuration

### Integration Pattern
**Approach:** AI Grid UI calls AI Grid backend, OSAC UI calls OSAC fulfillment API

```
OSAC UI Component (React)
    ↓
    ├─→ OSAC Fulfillment API (infrastructure)
    └─→ AI Grid Backend API (AI workloads)
```

**No direct coupling** - frontend calls appropriate backend based on feature

---

## UI Mockup Extension Plan

### Current Mockups Created
✅ `index.html` - Role selection landing page  
✅ `admin.html` - Platform Administrator interface  
✅ `tenant-admin.html` - Tenant Administrator interface  
✅ `tenant-user.html` - Tenant User interface  
✅ `idp-manager.html` - Identity Provider Manager interface  
✅ `common.css` - Shared styling  
✅ `common.js` - Shared JavaScript  

### Proposed AI Grid Mockup Pages
📋 `ai-grid-clusters.html` - Grid cluster enrollment page  
📋 `ai-grid-models.html` - Model deployments page  
📋 `ai-grid-subscriptions.html` - Subscriptions page  
📋 `ai-grid-model-wizard.html` - Deploy model wizard  
📋 `ai-grid-tenants.html` - AI Grid tenant management (merged with OSAC tenant page)  

### Integration into Existing Mockups
Update existing HTML files to add AI Grid navigation sections:
- `admin.html` - Add "AI Grid" section with Grid Clusters, Models, Subscriptions
- `tenant-admin.html` - Add tenant-scoped AI Grid section
- `tenant-user.html` - Add "My AI Models" view

---

## Open Questions

1. **Tenant Model:** Should AI Grid tenants be 1:1 with OSAC tenants, or can one OSAC tenant have multiple AI Grid tenant configurations?
   - **Recommendation:** 1:1 mapping for MVP simplicity

2. **Cluster Ownership:** Can a cluster be enrolled in AI Grid by multiple tenants?
   - **Recommendation:** No - cluster belongs to single tenant (matches OSAC multi-tenancy model)

3. **Model Catalog Source:** Where do model catalog items come from?
   - **Options:** 
     - Red Hat Model Catalog
     - Custom tenant uploads
     - Third-party marketplaces
   - **Recommendation:** Start with Red Hat catalog, add custom uploads later

4. **RBAC Granularity:** Do we need model-level RBAC or is tenant-level sufficient?
   - **Recommendation:** Tenant-level for MVP, add model-level permissions later

5. **Billing Integration:** How do AI Grid usage and OSAC infrastructure costs combine?
   - **Recommendation:** Separate metering streams, unified invoice

---

## Success Criteria

### MVP Success
- ✅ Platform admin can enroll OSAC clusters into AI Grid via OSAC UI
- ✅ Platform admin can deploy models to enrolled clusters
- ✅ Models successfully distribute to multiple clusters
- ✅ Tenant isolation maintained (tenant A cannot see tenant B's models)
- ✅ UI navigation is intuitive (users don't get lost between OSAC and AI Grid features)

### Full Integration Success
- ✅ Single tenant management interface (infrastructure + AI Grid)
- ✅ Unified catalog (VMs, clusters, AI models all browsable together)
- ✅ Auto-enrollment of new clusters
- ✅ Model subscriptions with usage metering
- ✅ Role-based access for all AI Grid features
- ✅ Consistent UX between OSAC infrastructure and AI Grid features

---

## Next Steps

1. **Create AI Grid UI mockups** - Extend the HTML mockups with AI Grid pages
2. **Design tenant convergence** - How to merge OSAC + AI Grid tenant models
3. **API gateway design** - Single entry point for OSAC + AI Grid APIs
4. **Navigation UX testing** - Ensure users understand OSAC vs AI Grid features
5. **Role permission matrix** - Document exactly what each role can do in AI Grid

---

**Document Owner:** OSAC AI Grid Integration Team  
**Last Updated:** 2026-10-17  
**Status:** Draft - Analysis Complete
