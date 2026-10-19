# OSAC UI Mockups

Interactive HTML mockups of the OSAC Control Panel user interface.

## Overview

These mockups allow you to explore the OSAC UI without deploying the actual application. All pages are standalone HTML files with clickable navigation and fake data.

## Files Created

### Main Pages
- **index.html** - Landing page with role selection
- **admin.html** - Platform Administrator interface
- **tenant-admin.html** - Tenant Administrator interface
- **tenant-user.html** - Tenant User interface
- **idp-manager.html** - Identity Provider Manager interface

### AI Grid Pages (NEW)
- **ai-grid-clusters.html** - AI Grid cluster enrollment and management
- **ai-grid-models.html** - Model deployments (MaaS)
- **ai-grid-subscriptions.html** - Subscription management
- **ai-grid-model-wizard.html** - Multi-step model deployment wizard

### Supporting Files
- **common.css** - Shared styling (PatternFly-based)
- **common.js** - Shared JavaScript functions

## How to Use

1. Open `index.html` in your web browser:
   ```bash
   open ~/opensource/ai/osac-research/osac-ui/index.html
   # or
   firefox ~/opensource/ai/osac-research/osac-ui/index.html
   # or
   google-chrome ~/opensource/ai/osac-research/osac-ui/index.html
   ```

2. Click on a role card to explore that interface

3. Navigate through pages using the sidebar menu

4. Click buttons and links to see interactions (most show alert dialogs)

## Role Capabilities

### Platform Administrator (admin.html)
**Navigation:**
- Catalog
- Projects
- Administration → Tenants
- **AI Grid → Grid Clusters, Models, Subscriptions** ⭐ NEW
- Storage → Storage Backends, Storage Tiers
- Infrastructure → Instance Types, External IP Pools, Bare Metal Types, Disk Images
- Networking → Virtual Networks, Security Groups
- Secrets

**Key Features:**
- Manage all tenants
- **Enroll OSAC clusters into AI Grid** ⭐ NEW
- **Deploy and manage AI models across tenants** ⭐ NEW
- **View all tenant subscriptions** ⭐ NEW
- Configure infrastructure resources
- Set up storage backends and tiers
- Define instance types
- Manage global catalog

---

### Tenant Administrator (tenant-admin.html)
**Navigation:**
- Catalog
- Services → Bare Metal, Clusters, Virtual Machines
- Projects
- **AI Grid → Grid Enrollment, Model Deployments, Subscriptions** ⭐ NEW
- Storage → Volumes
- Identity Providers
- Role Bindings
- Networking → Virtual Networks, Security Groups, External IPs
- Secrets

**Key Features:**
- Deploy and manage tenant resources
- **Enroll tenant's clusters into AI Grid** ⭐ NEW
- **Deploy AI models to enrolled clusters** ⭐ NEW
- **Manage tenant's MaaS subscriptions** ⭐ NEW
- Configure identity providers (OIDC)
- Manage user access via role bindings
- Create and manage clusters, VMs, bare metal
- Configure networking

---

### Tenant User (tenant-user.html)
**Navigation:**
- Catalog
- Services → Bare Metal, Clusters, Virtual Machines
- Networking → Virtual Networks, Security Groups, External IPs
- Secrets

**Key Features:**
- Browse service catalog
- Deploy resources from catalog
- View and manage own resources
- Basic network configuration

---

### Identity Provider Manager (idp-manager.html)
**Navigation:**
- Identity Providers
- Role Bindings
- Secrets

**Key Features:**
- Configure OIDC/SAML/LDAP identity providers
- Test identity provider connections
- Manage role bindings for users and groups
- Manage secrets used by identity providers

## Features Demonstrated

### ✅ Implemented
- Role-based navigation
- Responsive sidebar
- Data tables with sample data
- Catalog cards
- Status badges
- Empty states
- Info cards
- Button interactions (alerts)
- Page switching within each role

### 📋 Mockup Only (Not Functional)
- Form submissions
- Real data loading
- API calls
- User authentication
- Resource creation/deletion
- Console access
- File uploads

## Fake Data

All data shown in the mockups is fake/sample data for demonstration purposes:

**Sample Tenants:**
- acme-corp (ACME Corporation)
- globex-inc (Globex Inc)
- initech (Initech Solutions)
- waynetech (Wayne Technologies)

**Sample Resources:**
- OpenShift clusters (production-ocp-1, staging-ocp-1, dev-ocp-1)
- Virtual machines (web-server-01, app-server-01, etc.)
- Bare metal servers
- Storage volumes
- Virtual networks
- Security groups

## Styling

- **Design System:** PatternFly 5
- **CDN:** https://cdn.jsdelivr.net/npm/@patternfly/patternfly@5.2.0/patternfly.min.css
- **Color Scheme:** OSAC branding (Red Hat inspired)
- **Responsive:** Mobile-friendly sidebar

## AI Grid Integration ⭐ NEW

### What's New
The mockups now include **AI Grid MVP pages** based on `ai-grid-cloud-provider-poc`:

**Grid Clusters Page:**
- List all OSAC-provisioned clusters
- Show AI Grid enrollment status (Member / Not enrolled)
- Enroll clusters with "Add to AI Grid" button
- View cluster locations, status, and provisioning readiness
- Summary stats (total clusters, enrolled members, ready to enroll)

**Models Page:**
- List all AI model deployments across tenants
- Deploy new models via multi-step wizard
- View deployment locations (expandable rows)
- Show replica count and deployment status
- Filter by name or location
- Delete deployments

**Model Deployment Wizard:**
- Step 1: Select tenant, model (from subscriptions), deployment name
- Step 2: Configure replicas, runtime args, resource profile
- Step 3: Select deployment locations (enrolled AI Grid clusters)
- Step 4: Review and deploy

**Subscriptions Page:**
- List all MaaS subscriptions across tenants
- View subscription plans (Starter, Professional, Enterprise)
- Show 30-day usage and costs
- Filter by tenant
- Create, edit, view, and delete subscriptions
- Trial subscription support

### Integration Architecture
**Option B (Hybrid Approach):**
- OSAC provisions infrastructure (clusters, VMs, bare metal) via Ansible/AAP
- AI Grid enrolls OSAC clusters into ACM as ManagedClusters
- AI Grid distributes model workloads via ACM
- Single UI combines both infrastructure (OSAC) and AI workload (AI Grid) management

See `/home/gmurthy/opensource/ai/osac-research/AI-GRID-INTEGRATION-ANALYSIS.md` for complete analysis.

## Technical Notes

- No build process required - pure HTML/CSS/JS
- PatternFly loaded via CDN (requires internet connection)
- JavaScript uses vanilla JS (no frameworks)
- All navigation is client-side
- Pages are independent (can be opened directly)

## Browser Compatibility

- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge

## File Size

Total: ~80KB (all files combined)
- HTML files: ~60KB
- CSS: ~15KB
- JS: ~2KB

---

**Created:** 2026-10-17  
**Purpose:** UI/UX exploration and AI Grid MVP integration planning  
**Based on:** OSAC UI repository structure and navigation patterns
