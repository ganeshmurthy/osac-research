# OSAC gRPC API Reference

**Document Version:** 1.1  
**Date:** 2026-10-16  
**OSAC Commit:** `db1faeb588343d0c8ab60ba02bdc28e0b5610adb`

## Overview

This document provides a comprehensive reference of all gRPC services and RPC methods available in OSAC's Fulfillment API, showing both **Private** and **Public** API endpoints.

**Total Services:** 38  
**Proto Source:** `proto/private/osac/private/v1/` (editable source)  
**Generated Code:** `proto/gen/osac/private/v1/` (Private API) and `proto/gen/osac/public/v1/` (Public API subset)

---

## API Visibility Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Public | Available in both Private and Public APIs |
| 🔒 Private | Only available in Private API (admins/controllers) |
| ❌ Not exposed | Not available in the specified API |

---

## API Organization

Services are organized into the following categories:

1. [Compute Resources](#compute-resources) (7 services)
2. [Networking Resources](#networking-resources) (8 services)
3. [Identity & Access Management](#identity--access-management) (7 services)
4. [Catalog & Configuration](#catalog--configuration) (13 services)
5. [System Services](#system-services) (4 services)

---

## Standard RPC Pattern

Most OSAC services follow this standard CRUD pattern:

| RPC Method | HTTP Method | Private API Endpoint | Public API Endpoint | Visibility |
|------------|-------------|---------------------|---------------------|------------|
| `List` | GET | `/api/private/v1/{resources}` | `/api/fulfillment/v1/{resources}` | ✅ Public |
| `Get` | GET | `/api/private/v1/{resources}/{id}` | `/api/fulfillment/v1/{resources}/{id}` | ✅ Public |
| `Create` | POST | `/api/private/v1/{resources}` | `/api/fulfillment/v1/{resources}` | ✅ Public |
| `Update` | PATCH | `/api/private/v1/{resources}/{id}` | `/api/fulfillment/v1/{resources}/{id}` | ✅ Public* |
| `Delete` | DELETE | `/api/private/v1/{resources}/{id}` | `/api/fulfillment/v1/{resources}/{id}` | ✅ Public |
| `Signal` | gRPC only | Available in Private API | ❌ Not exposed | 🔒 Private |

**Notes:**
- All `List` methods support: `offset`, `limit`, `filter` (CEL expressions), `order` (SQL-style ORDER BY)
- All `Update` methods support: `update_mask` (FieldMask), `lock` (optimistic locking via `metadata.version`)
- `Signal` RPC is private-only, used by controllers to send status feedback to the API
- *Some resources restrict `Update` to private API only (noted in service tables below)

---

## Compute Resources

### 1. Clusters

**Service:** `Clusters`  
**Proto:** `clusters_service.proto`  
**Purpose:** Manage OpenShift/Kubernetes cluster lifecycle

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/clusters` | `/api/fulfillment/v1/clusters` | ✅ Public |
| Get | GET | `/api/private/v1/clusters/{id}` | `/api/fulfillment/v1/clusters/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/clusters` | `/api/fulfillment/v1/clusters` | ✅ Public |
| Update | PATCH | `/api/private/v1/clusters/{id}` | `/api/fulfillment/v1/clusters/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/clusters/{id}` | `/api/fulfillment/v1/clusters/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

**Key Fields:**
- Spec: `template`, `template_parameters`, `node_sets` (bare metal instance types + size)
- Status: `state` (PENDING, READY, FAILED), `api_url`, `console_url`, `conditions`

---

### 2. ComputeInstances

**Service:** `ComputeInstances`  
**Proto:** `compute_instances_service.proto`  
**Purpose:** Manage VM instances

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/compute_instances` | `/api/fulfillment/v1/compute_instances` | ✅ Public |
| Get | GET | `/api/private/v1/compute_instances/{id}` | `/api/fulfillment/v1/compute_instances/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/compute_instances` | `/api/fulfillment/v1/compute_instances` | ✅ Public |
| Update | PATCH | `/api/private/v1/compute_instances/{id}` | `/api/fulfillment/v1/compute_instances/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/compute_instances/{id}` | `/api/fulfillment/v1/compute_instances/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

**Key Fields:**
- Spec: `template`, `boot_disk`, `additional_disks`, `network_attachments`, `run_strategy`, `user_data`
- Spec: `restart_requested_at` (timestamp signal for restart)
- Status: `state`, `internal_ip_address`, `conditions`

---

### 3. BareMetalInstances

**Service:** `BareMetalInstances`  
**Proto:** `baremetal_instances_service.proto`  
**Purpose:** Manage bare metal server instances

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/baremetal_instances` | `/api/fulfillment/v1/baremetal_instances` | ✅ Public |
| Get | GET | `/api/private/v1/baremetal_instances/{id}` | `/api/fulfillment/v1/baremetal_instances/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/baremetal_instances` | `/api/fulfillment/v1/baremetal_instances` | ✅ Public |
| Update | PATCH | `/api/private/v1/baremetal_instances/{id}` | `/api/fulfillment/v1/baremetal_instances/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/baremetal_instances/{id}` | `/api/fulfillment/v1/baremetal_instances/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 4. Volumes

**Service:** `Volumes`  
**Proto:** `volumes_service.proto`  
**Purpose:** Manage persistent storage volumes

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/volumes` | `/api/fulfillment/v1/volumes` | ✅ Public |
| Get | GET | `/api/private/v1/volumes/{id}` | `/api/fulfillment/v1/volumes/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/volumes` | `/api/fulfillment/v1/volumes` | ✅ Public |
| Update | PATCH | `/api/private/v1/volumes/{id}` | `/api/fulfillment/v1/volumes/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/volumes/{id}` | `/api/fulfillment/v1/volumes/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

**Key Fields:**
- Spec: `size_gib`, `storage_tier`, `volume_mode` (FILESYSTEM/BLOCK)
- Status: `state` (PENDING, AVAILABLE, IN_USE, FAILED)

---

### 5. DiskImages

**Service:** `DiskImages`  
**Proto:** `disk_images_service.proto`  
**Purpose:** Manage OS disk images for VM boot

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/disk_images` | `/api/fulfillment/v1/disk_images` | ✅ Public |
| Get | GET | `/api/private/v1/disk_images/{id}` | `/api/fulfillment/v1/disk_images/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/disk_images` | `/api/fulfillment/v1/disk_images` | ✅ Public |
| Update | PATCH | `/api/private/v1/disk_images/{id}` | `/api/fulfillment/v1/disk_images/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/disk_images/{id}` | `/api/fulfillment/v1/disk_images/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 6. InstanceTypes

**Service:** `InstanceTypes`  
**Proto:** `instance_types_service.proto`  
**Purpose:** Define VM instance type flavors (CPU, memory, GPU)

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/instance_types` | `/api/fulfillment/v1/instance_types` | ✅ Public |
| Get | GET | `/api/private/v1/instance_types/{id}` | `/api/fulfillment/v1/instance_types/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/instance_types` | `/api/fulfillment/v1/instance_types` | ✅ Public |
| Update | PATCH | `/api/private/v1/instance_types/{id}` | `/api/fulfillment/v1/instance_types/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/instance_types/{id}` | `/api/fulfillment/v1/instance_types/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 7. BareMetalInstanceTypes

**Service:** `BareMetalInstanceTypes`  
**Proto:** `baremetal_instance_types_service.proto`  
**Purpose:** Define bare metal hardware types

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/baremetal_instance_types` | `/api/fulfillment/v1/baremetal_instance_types` | ✅ Public |
| Get | GET | `/api/private/v1/baremetal_instance_types/{id}` | `/api/fulfillment/v1/baremetal_instance_types/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/baremetal_instance_types` | `/api/fulfillment/v1/baremetal_instance_types` | ✅ Public |
| Update | PATCH | `/api/private/v1/baremetal_instance_types/{id}` | `/api/fulfillment/v1/baremetal_instance_types/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/baremetal_instance_types/{id}` | `/api/fulfillment/v1/baremetal_instance_types/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

## Networking Resources

### 8. VirtualNetworks

**Service:** `VirtualNetworks`  
**Proto:** `virtual_networks_service.proto`  
**Purpose:** Manage virtual networks (VPCs)

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/virtual_networks` | `/api/fulfillment/v1/virtual_networks` | ✅ Public |
| Get | GET | `/api/private/v1/virtual_networks/{id}` | `/api/fulfillment/v1/virtual_networks/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/virtual_networks` | `/api/fulfillment/v1/virtual_networks` | ✅ Public |
| Update | PATCH | `/api/private/v1/virtual_networks/{id}` | ❌ Not exposed | 🔒 Private |
| Delete | DELETE | `/api/private/v1/virtual_networks/{id}` | `/api/fulfillment/v1/virtual_networks/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

**Note:** Update method is private-only (controllers can update, but regular users cannot)

---

### 9. Subnets

**Service:** `Subnets`  
**Proto:** `subnets_service.proto`  
**Purpose:** Manage subnets within virtual networks

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/subnets` | `/api/fulfillment/v1/subnets` | ✅ Public |
| Get | GET | `/api/private/v1/subnets/{id}` | `/api/fulfillment/v1/subnets/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/subnets` | `/api/fulfillment/v1/subnets` | ✅ Public |
| Update | PATCH | `/api/private/v1/subnets/{id}` | `/api/fulfillment/v1/subnets/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/subnets/{id}` | `/api/fulfillment/v1/subnets/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

**Key Fields:**
- Spec: `virtual_network` (reference), `ipv4_cidr`, `network_class`

---

### 10. SecurityGroups

**Service:** `SecurityGroups`  
**Proto:** `security_groups_service.proto`  
**Purpose:** Manage firewall security groups

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/security_groups` | `/api/fulfillment/v1/security_groups` | ✅ Public |
| Get | GET | `/api/private/v1/security_groups/{id}` | `/api/fulfillment/v1/security_groups/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/security_groups` | `/api/fulfillment/v1/security_groups` | ✅ Public |
| Update | PATCH | `/api/private/v1/security_groups/{id}` | `/api/fulfillment/v1/security_groups/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/security_groups/{id}` | `/api/fulfillment/v1/security_groups/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 11. ExternalIPs

**Service:** `ExternalIPs`  
**Proto:** `external_ips_service.proto`  
**Purpose:** Manage public IP addresses

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/external_ips` | `/api/fulfillment/v1/external_ips` | ✅ Public |
| Get | GET | `/api/private/v1/external_ips/{id}` | `/api/fulfillment/v1/external_ips/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/external_ips` | `/api/fulfillment/v1/external_ips` | ✅ Public |
| Update | PATCH | `/api/private/v1/external_ips/{id}` | `/api/fulfillment/v1/external_ips/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/external_ips/{id}` | `/api/fulfillment/v1/external_ips/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 12. ExternalIPPools

**Service:** `ExternalIPPools`  
**Proto:** `external_ip_pools_service.proto`  
**Purpose:** Manage pools of public IP addresses

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/external_ip_pools` | `/api/fulfillment/v1/external_ip_pools` | ✅ Public |
| Get | GET | `/api/private/v1/external_ip_pools/{id}` | `/api/fulfillment/v1/external_ip_pools/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/external_ip_pools` | `/api/fulfillment/v1/external_ip_pools` | ✅ Public |
| Update | PATCH | `/api/private/v1/external_ip_pools/{id}` | `/api/fulfillment/v1/external_ip_pools/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/external_ip_pools/{id}` | `/api/fulfillment/v1/external_ip_pools/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 13. ExternalIPAttachments

**Service:** `ExternalIPAttachments`  
**Proto:** `external_ip_attachments_service.proto`  
**Purpose:** Attach public IPs to compute instances

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/external_ip_attachments` | `/api/fulfillment/v1/external_ip_attachments` | ✅ Public |
| Get | GET | `/api/private/v1/external_ip_attachments/{id}` | `/api/fulfillment/v1/external_ip_attachments/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/external_ip_attachments` | `/api/fulfillment/v1/external_ip_attachments` | ✅ Public |
| Delete | DELETE | `/api/private/v1/external_ip_attachments/{id}` | `/api/fulfillment/v1/external_ip_attachments/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

**Note:** No Update method (attachment is immutable once created)

---

### 14. NATGateways

**Service:** `NATGateways`  
**Proto:** `nat_gateways_service.proto`  
**Purpose:** Manage NAT gateways for outbound connectivity

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/nat_gateways` | `/api/fulfillment/v1/nat_gateways` | ✅ Public |
| Get | GET | `/api/private/v1/nat_gateways/{id}` | `/api/fulfillment/v1/nat_gateways/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/nat_gateways` | `/api/fulfillment/v1/nat_gateways` | ✅ Public |
| Update | PATCH | `/api/private/v1/nat_gateways/{id}` | `/api/fulfillment/v1/nat_gateways/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/nat_gateways/{id}` | `/api/fulfillment/v1/nat_gateways/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 15. FabricDomains

**Service:** `FabricDomains`  
**Proto:** `fabric_domains_service.proto`  
**Purpose:** Manage network fabric domains

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/fabric_domains` | `/api/fulfillment/v1/fabric_domains` | ✅ Public |
| Get | GET | `/api/private/v1/fabric_domains/{id}` | `/api/fulfillment/v1/fabric_domains/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/fabric_domains` | `/api/fulfillment/v1/fabric_domains` | ✅ Public |
| Update | PATCH | `/api/private/v1/fabric_domains/{id}` | `/api/fulfillment/v1/fabric_domains/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/fabric_domains/{id}` | `/api/fulfillment/v1/fabric_domains/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 16. NetworkClasses

**Service:** `NetworkClasses`  
**Proto:** `network_classes_service.proto`  
**Purpose:** Define network service classes

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/network_classes` | `/api/fulfillment/v1/network_classes` | ✅ Public |
| Get | GET | `/api/private/v1/network_classes/{id}` | `/api/fulfillment/v1/network_classes/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/network_classes` | `/api/fulfillment/v1/network_classes` | ✅ Public |
| Update | PATCH | `/api/private/v1/network_classes/{id}` | `/api/fulfillment/v1/network_classes/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/network_classes/{id}` | `/api/fulfillment/v1/network_classes/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

## Identity & Access Management

### 17. Tenants

**Service:** `Tenants`  
**Proto:** `tenants_service.proto`  
**Purpose:** Manage multi-tenant organizations

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/tenants` | `/api/fulfillment/v1/tenants` | ✅ Public |
| Get | GET | `/api/private/v1/tenants/{id}` | `/api/fulfillment/v1/tenants/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/tenants` | `/api/fulfillment/v1/tenants` | ✅ Public |
| Update | PATCH | `/api/private/v1/tenants/{id}` | `/api/fulfillment/v1/tenants/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/tenants/{id}` | `/api/fulfillment/v1/tenants/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

**Key Fields:**
- Spec: `domains` (DNS domains for tenant)
- Status: `state`, `namespace`, `conditions`

---

### 18. Users

**Service:** `Users`  
**Proto:** `users_service.proto`  
**Purpose:** Manage user accounts

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/users` | `/api/fulfillment/v1/users` | ✅ Public |
| Get | GET | `/api/private/v1/users/{id}` | `/api/fulfillment/v1/users/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/users` | `/api/fulfillment/v1/users` | ✅ Public |
| Update | PATCH | `/api/private/v1/users/{id}` | `/api/fulfillment/v1/users/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/users/{id}` | `/api/fulfillment/v1/users/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 19. Projects

**Service:** `Projects`  
**Proto:** `projects_service.proto`  
**Purpose:** Manage hierarchical project structure

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/projects` | `/api/fulfillment/v1/projects` | ✅ Public |
| Get | GET | `/api/private/v1/projects/{id}` | `/api/fulfillment/v1/projects/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/projects` | `/api/fulfillment/v1/projects` | ✅ Public |
| Update | PATCH | `/api/private/v1/projects/{id}` | `/api/fulfillment/v1/projects/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/projects/{id}` | `/api/fulfillment/v1/projects/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

**Key Fields:**
- Supports hierarchical projects (project can have parent project)
- Filter example: `this.metadata.project == ""` (top-level projects)

---

### 20. ProjectMemberships

**Service:** `ProjectMemberships`  
**Proto:** `project_memberships_service.proto`  
**Purpose:** Manage user membership in projects

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/project_memberships` | `/api/fulfillment/v1/project_memberships` | ✅ Public |
| Get | GET | `/api/private/v1/project_memberships/{id}` | `/api/fulfillment/v1/project_memberships/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/project_memberships` | `/api/fulfillment/v1/project_memberships` | ✅ Public |
| Update | PATCH | `/api/private/v1/project_memberships/{id}` | `/api/fulfillment/v1/project_memberships/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/project_memberships/{id}` | `/api/fulfillment/v1/project_memberships/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 21. Roles

**Service:** `Roles`  
**Proto:** `roles_service.proto`  
**Purpose:** Define RBAC roles

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/roles` | `/api/fulfillment/v1/roles` | ✅ Public |
| Get | GET | `/api/private/v1/roles/{id}` | `/api/fulfillment/v1/roles/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/roles` | `/api/fulfillment/v1/roles` | ✅ Public |
| Update | PATCH | `/api/private/v1/roles/{id}` | `/api/fulfillment/v1/roles/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/roles/{id}` | `/api/fulfillment/v1/roles/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 22. RoleBindings

**Service:** `RoleBindings`  
**Proto:** `role_bindings_service.proto`  
**Purpose:** Bind roles to users/groups

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/role_bindings` | `/api/fulfillment/v1/role_bindings` | ✅ Public |
| Get | GET | `/api/private/v1/role_bindings/{id}` | `/api/fulfillment/v1/role_bindings/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/role_bindings` | `/api/fulfillment/v1/role_bindings` | ✅ Public |
| Update | PATCH | `/api/private/v1/role_bindings/{id}` | `/api/fulfillment/v1/role_bindings/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/role_bindings/{id}` | `/api/fulfillment/v1/role_bindings/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 23. IdentityProviders

**Service:** `IdentityProviders`  
**Proto:** `identity_providers_service.proto`  
**Purpose:** Configure external identity providers (OIDC, LDAP)

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/identity_providers` | `/api/fulfillment/v1/identity_providers` | ✅ Public |
| Get | GET | `/api/private/v1/identity_providers/{id}` | `/api/fulfillment/v1/identity_providers/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/identity_providers` | `/api/fulfillment/v1/identity_providers` | ✅ Public |
| Update | PATCH | `/api/private/v1/identity_providers/{id}` | `/api/fulfillment/v1/identity_providers/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/identity_providers/{id}` | `/api/fulfillment/v1/identity_providers/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

**Key Fields:**
- Spec: `type` (OIDC, LDAP), `config` (provider-specific)
- For OIDC: `issuer`, `client_id`, `client_secret_secret`

---

### 24. SelfSubjectAccessReview

**Service:** `SelfSubjectAccessReview`  
**Proto:** `self_subject_access_review_service.proto`  
**Purpose:** Check current user's permissions

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| Create | POST | `/api/private/v1/self_subject_access_reviews` | `/api/fulfillment/v1/self_subject_access_reviews` | ✅ Public |

**Note:** Only Create method (permission check operation, not a persisted resource)

---

## Catalog & Configuration

### 25. ClusterCatalogItems

**Service:** `ClusterCatalogItems`  
**Proto:** `cluster_catalog_items_service.proto`  
**Purpose:** Manage cluster catalog offerings

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/cluster_catalog_items` | `/api/fulfillment/v1/cluster_catalog_items` | ✅ Public |
| Get | GET | `/api/private/v1/cluster_catalog_items/{id}` | `/api/fulfillment/v1/cluster_catalog_items/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/cluster_catalog_items` | `/api/fulfillment/v1/cluster_catalog_items` | ✅ Public |
| Update | PATCH | `/api/private/v1/cluster_catalog_items/{id}` | `/api/fulfillment/v1/cluster_catalog_items/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/cluster_catalog_items/{id}` | `/api/fulfillment/v1/cluster_catalog_items/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 26. ClusterTemplates

**Service:** `ClusterTemplates`  
**Proto:** `cluster_templates_service.proto`  
**Purpose:** Define cluster templates

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/cluster_templates` | `/api/fulfillment/v1/cluster_templates` | ✅ Public |
| Get | GET | `/api/private/v1/cluster_templates/{id}` | `/api/fulfillment/v1/cluster_templates/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/cluster_templates` | `/api/fulfillment/v1/cluster_templates` | ✅ Public |
| Update | PATCH | `/api/private/v1/cluster_templates/{id}` | `/api/fulfillment/v1/cluster_templates/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/cluster_templates/{id}` | `/api/fulfillment/v1/cluster_templates/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 27. ClusterVersions

**Service:** `ClusterVersions`  
**Proto:** `cluster_versions_service.proto`  
**Purpose:** Manage available cluster versions (OCP 4.21, etc.)

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/cluster_versions` | `/api/fulfillment/v1/cluster_versions` | ✅ Public |
| Get | GET | `/api/private/v1/cluster_versions/{id}` | `/api/fulfillment/v1/cluster_versions/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/cluster_versions` | `/api/fulfillment/v1/cluster_versions` | ✅ Public |
| Update | PATCH | `/api/private/v1/cluster_versions/{id}` | `/api/fulfillment/v1/cluster_versions/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/cluster_versions/{id}` | `/api/fulfillment/v1/cluster_versions/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 28. ComputeInstanceCatalogItems

**Service:** `ComputeInstanceCatalogItems`  
**Proto:** `compute_instance_catalog_items_service.proto`  
**Purpose:** VM catalog offerings

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/compute_instance_catalog_items` | `/api/fulfillment/v1/compute_instance_catalog_items` | ✅ Public |
| Get | GET | `/api/private/v1/compute_instance_catalog_items/{id}` | `/api/fulfillment/v1/compute_instance_catalog_items/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/compute_instance_catalog_items` | `/api/fulfillment/v1/compute_instance_catalog_items` | ✅ Public |
| Update | PATCH | `/api/private/v1/compute_instance_catalog_items/{id}` | `/api/fulfillment/v1/compute_instance_catalog_items/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/compute_instance_catalog_items/{id}` | `/api/fulfillment/v1/compute_instance_catalog_items/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 29. ComputeInstanceTemplates

**Service:** `ComputeInstanceTemplates`  
**Proto:** `compute_instance_templates_service.proto`  
**Purpose:** Define VM templates

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/compute_instance_templates` | `/api/fulfillment/v1/compute_instance_templates` | ✅ Public |
| Get | GET | `/api/private/v1/compute_instance_templates/{id}` | `/api/fulfillment/v1/compute_instance_templates/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/compute_instance_templates` | `/api/fulfillment/v1/compute_instance_templates` | ✅ Public |
| Update | PATCH | `/api/private/v1/compute_instance_templates/{id}` | `/api/fulfillment/v1/compute_instance_templates/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/compute_instance_templates/{id}` | `/api/fulfillment/v1/compute_instance_templates/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 30. BareMetalInstanceCatalogItems

**Service:** `BareMetalInstanceCatalogItems`  
**Proto:** `baremetal_instance_catalog_items_service.proto`  
**Purpose:** Bare metal catalog offerings

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/baremetal_instance_catalog_items` | `/api/fulfillment/v1/baremetal_instance_catalog_items` | ✅ Public |
| Get | GET | `/api/private/v1/baremetal_instance_catalog_items/{id}` | `/api/fulfillment/v1/baremetal_instance_catalog_items/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/baremetal_instance_catalog_items` | `/api/fulfillment/v1/baremetal_instance_catalog_items` | ✅ Public |
| Update | PATCH | `/api/private/v1/baremetal_instance_catalog_items/{id}` | `/api/fulfillment/v1/baremetal_instance_catalog_items/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/baremetal_instance_catalog_items/{id}` | `/api/fulfillment/v1/baremetal_instance_catalog_items/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 31. BareMetalInstanceTemplates

**Service:** `BareMetalInstanceTemplates`  
**Proto:** `baremetal_instance_templates_service.proto`  
**Purpose:** Bare metal templates

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/baremetal_instance_templates` | `/api/fulfillment/v1/baremetal_instance_templates` | ✅ Public |
| Get | GET | `/api/private/v1/baremetal_instance_templates/{id}` | `/api/fulfillment/v1/baremetal_instance_templates/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/baremetal_instance_templates` | `/api/fulfillment/v1/baremetal_instance_templates` | ✅ Public |
| Update | PATCH | `/api/private/v1/baremetal_instance_templates/{id}` | `/api/fulfillment/v1/baremetal_instance_templates/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/baremetal_instance_templates/{id}` | `/api/fulfillment/v1/baremetal_instance_templates/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 32. AddOnOperators

**Service:** `AddOnOperators`  
**Proto:** `add_on_operators_service.proto`  
**Purpose:** Manage cluster add-ons (monitoring, logging, etc.)

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/add_on_operators` | `/api/fulfillment/v1/add_on_operators` | ✅ Public |
| Get | GET | `/api/private/v1/add_on_operators/{id}` | `/api/fulfillment/v1/add_on_operators/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/add_on_operators` | `/api/fulfillment/v1/add_on_operators` | ✅ Public |
| Update | PATCH | `/api/private/v1/add_on_operators/{id}` | `/api/fulfillment/v1/add_on_operators/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/add_on_operators/{id}` | `/api/fulfillment/v1/add_on_operators/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 33. StorageBackends

**Service:** `StorageBackends`  
**Proto:** `storage_backends_service.proto`  
**Purpose:** Configure storage backends (Ceph, NFS, etc.)

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/storage_backends` | `/api/fulfillment/v1/storage_backends` | ✅ Public |
| Get | GET | `/api/private/v1/storage_backends/{id}` | `/api/fulfillment/v1/storage_backends/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/storage_backends` | `/api/fulfillment/v1/storage_backends` | ✅ Public |
| Update | PATCH | `/api/private/v1/storage_backends/{id}` | `/api/fulfillment/v1/storage_backends/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/storage_backends/{id}` | `/api/fulfillment/v1/storage_backends/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

### 34. StorageTiers

**Service:** `StorageTiers`  
**Proto:** `storage_tiers_service.proto`  
**Purpose:** Define storage service tiers (fast SSD, cheap HDD, etc.)

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/storage_tiers` | `/api/fulfillment/v1/storage_tiers` | ✅ Public |
| Get | GET | `/api/private/v1/storage_tiers/{id}` | `/api/fulfillment/v1/storage_tiers/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/storage_tiers` | `/api/fulfillment/v1/storage_tiers` | ✅ Public |
| Update | PATCH | `/api/private/v1/storage_tiers/{id}` | `/api/fulfillment/v1/storage_tiers/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/storage_tiers/{id}` | `/api/fulfillment/v1/storage_tiers/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

---

## System Services

### 35. Capabilities

**Service:** `Capabilities`  
**Proto:** `capabilities_service.proto`  
**Purpose:** Query server capabilities and configuration

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| Get | GET | `/api/private/v1/capabilities` | `/api/fulfillment/v1/capabilities` | ✅ Public |

**Returns:**
- `authn` (authentication capabilities, JWKS URLs, token issuers)
- `enabled_services` (CAAS, VMAAS, BMAAS, MAAS)

**Note:** Only Get method (singleton resource, not a collection)

---

### 36. Events

**Service:** `Events`  
**Proto:** `events_service.proto`  
**Purpose:** Audit log and event stream

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/events` | `/api/fulfillment/v1/events` | ✅ Public |
| Get | GET | `/api/private/v1/events/{id}` | `/api/fulfillment/v1/events/{id}` | ✅ Public |

**Note:** Read-only service (no Create/Update/Delete/Signal)

---

### 37. Hubs

**Service:** `Hubs`  
**Proto:** `hubs_service.proto`  
**Purpose:** Manage management cluster hubs

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/hubs` | ❌ Not exposed | 🔒 Private |
| Get | GET | `/api/private/v1/hubs/{id}` | ❌ Not exposed | 🔒 Private |
| Create | POST | `/api/private/v1/hubs` | ❌ Not exposed | 🔒 Private |
| Update | PATCH | `/api/private/v1/hubs/{id}` | ❌ Not exposed | 🔒 Private |
| Delete | DELETE | `/api/private/v1/hubs/{id}` | ❌ Not exposed | 🔒 Private |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

**Note:** **Entire service is private-only** (not exposed to public API)

---

### 38. Secrets

**Service:** `Secrets`  
**Proto:** `secrets_service.proto`  
**Purpose:** Manage secrets (credentials, certificates)

| RPC | HTTP | Private API | Public API | Visibility |
|-----|------|-------------|------------|------------|
| List | GET | `/api/private/v1/secrets` | `/api/fulfillment/v1/secrets` | ✅ Public |
| Get | GET | `/api/private/v1/secrets/{id}` | `/api/fulfillment/v1/secrets/{id}` | ✅ Public |
| Create | POST | `/api/private/v1/secrets` | `/api/fulfillment/v1/secrets` | ✅ Public |
| Update | PATCH | `/api/private/v1/secrets/{id}` | `/api/fulfillment/v1/secrets/{id}` | ✅ Public |
| Delete | DELETE | `/api/private/v1/secrets/{id}` | `/api/fulfillment/v1/secrets/{id}` | ✅ Public |
| Signal | gRPC | Available | ❌ Not exposed | 🔒 Private |

**Note:** Secret values are **write-only** (not returned in Get/List responses)

---

## Summary Tables

### Services by Category

| Category | Service Count | All Public? |
|----------|--------------|-------------|
| Compute Resources | 7 | ✅ Yes |
| Networking | 8 | ✅ Yes (except VirtualNetworks.Update) |
| Identity & Access | 7 | ✅ Yes |
| Catalog & Configuration | 13 | ✅ Yes |
| System | 4 | ⚠️ Mixed (Hubs is entirely private) |
| **Total** | **38** | **37 have public access** |

### Private-Only Services

| Service | Why Private? |
|---------|--------------|
| **Hubs** | Internal management cluster configuration |

### Private-Only Methods

| Service | Method | Why Private? |
|---------|--------|--------------|
| **VirtualNetworks** | Update | Users can create/delete but not modify |
| **All Services** | Signal | Controller feedback mechanism |

### Method Distribution

| Method | Total Services | Public | Private-Only |
|--------|---------------|--------|--------------|
| List | 37 | 36 | 1 (Hubs) |
| Get | 37 | 36 | 1 (Hubs) |
| Create | 37 | 36 | 1 (Hubs) |
| Update | 35 | 33 | 2 (Hubs, VirtualNetworks) |
| Delete | 36 | 35 | 1 (Hubs) |
| Signal | 36 | 0 | 36 (all) |

---

## Common Request Parameters

### List Requests

All List methods support these optional parameters:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `offset` | int32 | Pagination offset | `0` |
| `limit` | int32 | Max results to return | `50` |
| `filter` | string | CEL expression | `this.metadata.name.startsWith("prod")` |
| `order` | string | SQL-style ORDER BY | `metadata.created_at desc` |

**CEL Filter Examples:**
```
# Clusters in READY state
this.status.state == "CLUSTER_STATE_READY"

# VMs created in last 7 days
this.metadata.created_at > now - duration("168h")

# Resources with label
this.metadata.labels["env"] == "production"

# Top-level projects (no parent)
this.metadata.project == ""
```

### Update Requests

All Update methods support:

| Parameter | Type | Description |
|-----------|------|-------------|
| `object` | Message | Updated resource with modified fields |
| `update_mask` | FieldMask | Specific fields to update |
| `lock` | bool | Enable optimistic locking (checks version) |

**Optimistic Locking:**
When `lock: true`, the server verifies that `object.metadata.version` matches the current stored version before applying the update. If versions don't match, the update is rejected with `FAILED_PRECONDITION` error.

---

## Authentication & Authorization

### Authentication

All APIs require authentication via:
- **JWT bearer token** in `Authorization: Bearer <token>` header
- Token obtained from configured OIDC identity provider
- Token must include valid tenant claim for tenant-scoped resources

### Authorization

OSAC enforces:
- **Tenant isolation** via `osac.openshift.io/tenant` annotation
- **RBAC** via Roles and RoleBindings
- **Project hierarchy** for organizational structure
- Users can only access resources in their tenant(s)

### Service Tiers

Check enabled service tiers via Capabilities API:
- **CAAS** (Container as a Service) - Clusters
- **VMAAS** (VM as a Service) - ComputeInstances
- **BMAAS** (Bare Metal as a Service) - BareMetalInstances
- **MAAS** (Metal as a Service) - Future

---

## Document References

- **Proto Source:** `proto/private/osac/private/v1/` (editable)
- **Public Proto:** `proto/public/osac/public/v1/` (auto-generated)
- **Generated Go:** `proto/gen/osac/{private,public}/v1/`
- **API Guidelines:** `fulfillment-service/docs/API.md`
- **OSAC Standards:** `/home/gmurthy/opensource/ai/osac-service-standards/README.md`
- **Architecture:** `docs/ARCHITECTURE.md`
- **Integration Design:** `ai-grid-osac-integration-design.md`

---

**Document Version:** 1.1  
**Last Updated:** 2026-10-16  
**Maintainer:** OSAC Architecture Team  
**Related:** This document extracted from `proto/private/osac/private/v1/` proto definitions
