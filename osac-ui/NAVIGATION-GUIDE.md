# OSAC + AI Grid Navigation Guide

**Date:** 2026-10-17  
**Purpose:** Visual guide to navigating the integrated OSAC and AI Grid UI mockups

---

## Starting Point

Open `index.html` in your browser to see the role selection page:

```
┌─────────────────────────────────────────────────────┐
│          OSAC Control Panel - Role Selection        │
├─────────────────────────────────────────────────────┤
│                                                      │
│   [Platform Admin]  [Tenant Admin]  [Tenant User]   │
│                                                      │
│                  [IDP Manager]                       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Navigation Flow: Platform Administrator

### Path 1: Enroll Clusters into AI Grid

```
index.html
   ↓ Click "Platform Administrator"
admin.html (default view: Tenants table)
   ↓ Click "AI Grid → Grid Clusters" in sidebar
ai-grid-clusters.html
   ↓ Browse OSAC-provisioned clusters
   ↓ Click "Add to AI Grid" on any "Not enrolled" cluster
   ↓ Confirm enrollment dialog
   ✓ Cluster becomes "AI Grid Member"
```

**What you see:**
- Table of all OSAC clusters across all tenants
- Cluster status: Ready / Offline
- AI Grid status: Member / Not enrolled
- Provisioning status
- Location information
- Summary stats at bottom

### Path 2: Deploy an AI Model

```
admin.html
   ↓ Click "AI Grid → Models" in sidebar
ai-grid-models.html (list of deployed models)
   ↓ Click "Deploy Model" button
ai-grid-model-wizard.html
   ↓ Step 1: Select tenant, choose model from subscriptions
   ↓ Step 2: Set replica count, runtime args, resource profile
   ↓ Step 3: Select enrolled clusters for deployment
   ↓ Step 4: Review and confirm
   ✓ Model deployment created, GitOps manifests saved
```

**What you see:**
- Wizard with 4 steps
- Model selection from active subscriptions
- Configuration options
- Location selection (only enrolled clusters shown)
- Review summary before deployment

### Path 3: Manage Subscriptions

```
admin.html
   ↓ Click "AI Grid → Subscriptions" in sidebar
ai-grid-subscriptions.html
   ↓ View all tenant subscriptions
   ↓ Filter by tenant or search by model
   ↓ Click "View" on any subscription to see details
```

**What you see:**
- All subscriptions across all tenants
- Plan types: Starter, Professional, Enterprise, Trial
- 30-day usage and costs
- Summary cards with totals
- Create/Edit/Delete actions

---

## Navigation Flow: Tenant Administrator

### Path 1: Enroll Your Clusters

```
index.html
   ↓ Click "Tenant Administrator"
tenant-admin.html (default view: cluster cards)
   ↓ Click "AI Grid → Grid Enrollment" in sidebar
(Shows tenant-scoped cluster enrollment page)
   ↓ See only clusters belonging to your tenant
   ↓ Enroll clusters into AI Grid
```

**Difference from Platform Admin:**
- Only see your tenant's clusters
- Cannot see other tenants' resources
- Same enrollment workflow

### Path 2: Deploy Models to Your Clusters

```
tenant-admin.html
   ↓ Click "AI Grid → Model Deployments" in sidebar
(Shows tenant-scoped model deployments)
   ↓ See only your tenant's deployed models
   ↓ Click "Deploy Model"
   ↓ Select from your tenant's subscriptions
   ↓ Choose your enrolled clusters as locations
   ✓ Deploy model
```

**Tenant Scoping:**
- Model list shows only your tenant's deployments
- Subscription dropdown shows only your subscriptions
- Location selection shows only your enrolled clusters

### Path 3: Manage Your Subscriptions

```
tenant-admin.html
   ↓ Click "AI Grid → Subscriptions" in sidebar
(Shows tenant-scoped subscriptions)
   ↓ See only your tenant's subscriptions
   ↓ Create new subscription for your tenant
   ↓ View usage and billing for your subscriptions
```

---

## Navigation Flow: Infrastructure + AI Grid

### Example User Journey: End-to-End

**Goal:** Deploy an AI model to production

**Steps:**

1. **Provision Infrastructure (OSAC)**
   ```
   tenant-admin.html → Services → Clusters
      ↓ Click "Request Cluster"
      ↓ Fill cluster wizard (name, version, nodes, region)
      ✓ OSAC provisions via Ansible/AAP
   ```

2. **Enroll Cluster to AI Grid**
   ```
   tenant-admin.html → AI Grid → Grid Enrollment
      ↓ See newly provisioned cluster
      ↓ Click "Add to AI Grid"
      ✓ ACM creates ManagedCluster
   ```

3. **Create Model Subscription**
   ```
   tenant-admin.html → AI Grid → Subscriptions
      ↓ Click "Create Subscription"
      ↓ Choose model (e.g., llama-3-70b)
      ↓ Select plan (Professional)
      ✓ Subscription active
   ```

4. **Deploy Model**
   ```
   tenant-admin.html → AI Grid → Model Deployments
      ↓ Click "Deploy Model"
      ↓ Select model from subscription
      ↓ Configure 6 replicas, medium resource profile
      ↓ Choose enrolled cluster as location
      ✓ Model deploys via ACM
   ```

5. **Monitor Deployment**
   ```
   tenant-admin.html → AI Grid → Model Deployments
      ↓ See model in table
      ↓ Click locations to expand
      ↓ View replica distribution
      ✓ Status: "Saved to Git"
   ```

---

## Key Navigation Patterns

### Sidebar Structure

**Platform Admin (admin.html):**
```
├── Catalog
├── Projects
├── Administration
│   └── Tenants
├── AI Grid ⭐ NEW
│   ├── Grid Clusters
│   ├── Models
│   └── Subscriptions
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

**Tenant Admin (tenant-admin.html):**
```
├── Catalog
├── Services
│   ├── Bare Metal
│   ├── Clusters
│   └── Virtual Machines
├── Projects
├── AI Grid ⭐ NEW
│   ├── Grid Enrollment
│   ├── Model Deployments
│   └── Subscriptions
├── Storage
│   └── Volumes
├── Identity Providers
├── Role Bindings
├── Networking
│   ├── Virtual Networks
│   ├── Security Groups
│   └── External IPs
└── Secrets
```

### Visual Cues

**Status Badges:**
- 🟢 Green = Active, Running, Ready, Provisioned, AI Grid Member
- 🔵 Blue = Saved, Professional plan
- 🟡 Yellow = Trial, Enterprise plan
- 🔴 Red = Offline, Expired
- ⚪ Grey = Unknown, Starter plan

**Page Indicators:**
- Blue underline = Current page in navigation
- Bold text = Primary information
- Grey text = Secondary/metadata

---

## Cross-Page Links

### From OSAC Infrastructure to AI Grid

**Scenario:** After provisioning a cluster

```
tenant-admin.html → Services → Clusters
(Shows cluster card: "production-ocp-1")
   ↓ Notice: "This cluster can be enrolled in AI Grid"
   ↓ Click link/button "Enroll in AI Grid"
   → Navigates to: AI Grid → Grid Enrollment
   → Auto-highlights the new cluster
```

**Implementation Note:** This cross-link is suggested but not yet in mockups. Could be added as info banner or cluster card action.

### From AI Grid Models to Subscriptions

**Scenario:** Model deployment fails due to missing subscription

```
ai-grid-model-wizard.html (Step 1: Model Selection)
(Shows error: "No active subscription for this model")
   ↓ Click link "Create subscription"
   → Navigates to: AI Grid → Subscriptions
   → Opens "Create Subscription" wizard
   → Pre-selects the needed model
```

**Implementation Note:** Error handling with actionable links improves UX.

---

## Breadcrumb Pattern (Future Enhancement)

Not in current mockups, but recommended:

```
OSAC Control Panel / AI Grid / Model Deployments / Deploy Model
                                                         ↑
                                               Currently viewing
```

**Benefits:**
- Shows location in hierarchy
- Click any breadcrumb to navigate back
- Especially useful in wizards

---

## Quick Access Patterns

### Dashboard Cards (Future)

Add to admin.html default view:

```
┌─────────────────────────────────────────────────────┐
│  Infrastructure Summary          AI Grid Summary     │
├──────────────────────────────┬──────────────────────┤
│  23 Clusters                 │  15 AI Grid Members  │
│  145 VMs                     │  12 Model Deployments│
│  8 Bare Metal                │  6 Active Subscript. │
│  4 Tenants                   │  $6,518 Monthly      │
└──────────────────────────────┴──────────────────────┘
```

### Recently Used (Future)

Track user's recent pages and show in sidebar or top bar:

```
Recent: Grid Clusters → Models → Deploy Model
```

---

## Mobile Navigation

Current mockups use responsive sidebar:

**Desktop:**
- Sidebar always visible
- Full navigation tree expanded

**Tablet:**
- Sidebar collapsible via hamburger menu (☰)
- Navigation tree still expanded when open

**Phone:**
- Sidebar hidden by default
- Hamburger menu shows/hides sidebar overlay
- Consider nested sections as accordion

---

## Search and Filters

### Global Search (Future Enhancement)

Add to masthead (top bar):

```
[🔍 Search clusters, models, tenants...]
```

**Search scope:**
- Clusters (name, tenant, location)
- Models (deployment name, model name)
- Subscriptions (name, tenant)
- Tenants (name, domain)

### Per-Page Filters

Already implemented:

**ai-grid-clusters.html:**
- Search by cluster name

**ai-grid-models.html:**
- Filter by name or location

**ai-grid-subscriptions.html:**
- Search by name/model
- Filter dropdown by tenant

---

## Keyboard Shortcuts (Future Enhancement)

Not implemented, but would improve UX:

- `g c` → Go to Clusters
- `g m` → Go to Models
- `g s` → Go to Subscriptions
- `/` → Focus search
- `n` → New (deploy model, create subscription)
- `Esc` → Close modals/wizards

---

## Testing the Mockups

### Quick Test Steps

1. **Open index.html**
   - All 4 role cards should be visible
   - Clicking any card navigates to role-specific page

2. **Test Platform Admin Flow**
   - `admin.html` → Sidebar shows "AI Grid" section
   - Click "Grid Clusters" → Navigate to `ai-grid-clusters.html`
   - Click "Models" → Navigate to `ai-grid-models.html`
   - Click "Subscriptions" → Navigate to `ai-grid-subscriptions.html`

3. **Test Enrollment**
   - On `ai-grid-clusters.html`, find cluster with "Add to AI Grid" button
   - Click button → Confirm dialog appears
   - After confirmation → Status changes to "AI Grid Member"

4. **Test Model Deployment Wizard**
   - On `ai-grid-models.html`, click "Deploy Model"
   - Navigate to `ai-grid-model-wizard.html`
   - Fill Step 1 → Click "Next"
   - Fill Step 2 → Click "Next"
   - Select locations Step 3 → Click "Next"
   - Review Step 4 → Click "Deploy Model"
   - Returns to `ai-grid-models.html` with success message

5. **Test Model Location Expansion**
   - On `ai-grid-models.html`, click "X locations" link in table
   - Expandable row appears showing location details
   - Click again to collapse

6. **Test Subscription Management**
   - On `ai-grid-subscriptions.html`, use search box
   - Filter by typing model name
   - Click "View" on a subscription
   - Click "Delete" on expired subscription → Confirm dialog

---

## Common User Questions

**Q: How do I deploy an AI model?**
A: Platform/Tenant Admin → AI Grid → Models → Deploy Model

**Q: Why can't I select my cluster as a deployment location?**
A: The cluster must first be enrolled in AI Grid. Go to AI Grid → Grid Clusters and click "Add to AI Grid"

**Q: How do I see only my tenant's resources?**
A: Log in as Tenant Admin instead of Platform Admin. Tenant Admins see only their tenant's clusters, models, and subscriptions.

**Q: What's the difference between OSAC "Clusters" and AI Grid "Grid Clusters"?**
A: 
- OSAC Services → Clusters = Provision new OpenShift clusters via Ansible
- AI Grid → Grid Clusters = Enroll existing OSAC clusters into AI Grid for model deployment

**Q: Can I deploy a model before creating a subscription?**
A: No. You must have an active subscription for the model you want to deploy. Go to AI Grid → Subscriptions first.

**Q: What does "Saved to Git" status mean?**
A: The model deployment configuration has been committed to a GitOps repository and ACM is distributing it to the selected clusters.

---

## File Reference

**HTML Files:**
- `index.html` - Role selection landing page
- `admin.html` - Platform Administrator dashboard
- `tenant-admin.html` - Tenant Administrator dashboard
- `tenant-user.html` - Tenant User interface
- `idp-manager.html` - Identity Provider Manager interface
- `ai-grid-clusters.html` - AI Grid cluster enrollment
- `ai-grid-models.html` - Model deployments list
- `ai-grid-subscriptions.html` - Subscription management
- `ai-grid-model-wizard.html` - Deploy model wizard

**Supporting Files:**
- `common.css` - Shared styling
- `common.js` - Shared JavaScript
- `README.md` - Comprehensive documentation
- `NAVIGATION-GUIDE.md` - This file
- `../AI-GRID-INTEGRATION-ANALYSIS.md` - Architecture analysis

---

**Next Steps:**
1. Open `index.html` in your browser
2. Select "Platform Administrator"
3. Explore AI Grid section in sidebar
4. Try enrolling a cluster
5. Deploy a model via the wizard
6. Browse subscriptions

**Feedback:**
- Which navigation flows are confusing?
- Are the AI Grid features clearly separated from OSAC infrastructure?
- Should tenant-scoped views be more visually distinct?
- Any missing cross-links between pages?

---

**Document Owner:** OSAC UI/UX Team  
**Last Updated:** 2026-10-17
