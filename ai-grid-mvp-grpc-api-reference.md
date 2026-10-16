# AI Grid MVP gRPC API Design

**Document Version:** 1.0  
**Date:** 2026-10-16  
**Purpose:** Express AI Grid MVP APIs as gRPC/protobuf following OSAC patterns

## Overview

This document translates the REST/JSON APIs from `ai-grid-mvp-rest-api-reference.md`
into production-ready gRPC service definitions following OSAC's protobuf
conventions and standards.

**Conversion Principles:**
- Follow OSAC resource pattern: `id`, `metadata`, `spec`, `status`
- Standard methods: `List`, `Get`, `Create`, `Update`, `Delete`, `Signal`
- HTTP transcoding annotations for REST compatibility
- CEL filtering, FieldMask updates, optimistic locking
- Tenant isolation via `osac.openshift.io/tenant` annotation
- Private API + Public API dual exposure (where applicable)

**Total Services:** 5
- `Health` (system check)
- `GridClusters` (ACM cluster enrollment)
- `Tenants` (with embedded OIDC IdP)
- `AIModels` (multi-location model deployment)
- `AISubscriptions` (MaaS subscription management)

---

## Table of Contents

1. [Common Types](#common-types)
2. [Health Service](#health-service)
3. [GridClusters Service](#gridclusters-service)
4. [Tenants Service](#tenants-service)
5. [AIModels Service](#aimodels-service)
6. [AISubscriptions Service](#aisubscriptions-service)
7. [API Summary Tables](#api-summary-tables)

---

## Common Types

### Metadata Message

Used by all resources for standard metadata fields.

```protobuf
// File: common/metadata.proto
syntax = "proto3";

package osac.aigrid.v1;

import "google/protobuf/timestamp.proto";

message Metadata {
  // Resource name (human-readable, mutable)
  string name = 1;

  // Resource description (optional)
  string description = 2;

  // Creation timestamp (server-set, immutable)
  google.protobuf.Timestamp created_at = 3;

  // Last update timestamp (server-set)
  google.protobuf.Timestamp updated_at = 4;

  // Optimistic locking version (server-managed, auto-incremented)
  int32 version = 5;

  // Annotations for tenant isolation and ownership
  // Required keys:
  //   osac.openshift.io/tenant: <tenant-id>
  //   osac.openshift.io/owner-reference: <owner-id> (where applicable)
  map<string, string> annotations = 6;

  // Resource labels (user-defined, indexed)
  map<string, string> labels = 7;
}
```

### State Enum

```protobuf
// File: common/state.proto
syntax = "proto3";

package osac.aigrid.v1;

enum State {
  STATE_UNSPECIFIED = 0;
  PENDING = 1;
  PROVISIONING = 2;
  READY = 3;
  FAILED = 4;
  DELETING = 5;
  DELETED = 6;
}
```

### Condition Message

```protobuf
// File: common/condition.proto
syntax = "proto3";

package osac.aigrid.v1;

import "google/protobuf/timestamp.proto";

message Condition {
  // Condition type (e.g., "Available", "Degraded")
  string type = 1;

  // Condition status ("True", "False", "Unknown")
  string status = 2;

  // Reason code (machine-readable)
  string reason = 3;

  // Human-readable message
  string message = 4;

  // Last transition time
  google.protobuf.Timestamp last_transition_time = 5;

  // Observation timestamp
  google.protobuf.Timestamp last_update_time = 6;
}
```

---

## Health Service

**Purpose:** Backend health and readiness check

### Proto Definition

```protobuf
// File: osac/aigrid/v1/health_service.proto
syntax = "proto3";

package osac.aigrid.v1;

import "google/api/annotations.proto";

// Health check service for AI Grid backend
service Health {
  // Check backend availability and storage connectivity
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse) {
    option (google.api.http) = {
      get: "/api/health"
    };
  }
}

message HealthCheckRequest {
  // Empty - no parameters needed
}

message HealthCheckResponse {
  // Overall health status
  HealthStatus status = 1;

  // Storage backend type
  string storage = 2;

  // Auto-commit enabled (for Git backend)
  bool auto_commit = 3;

  // Additional diagnostic information
  map<string, string> details = 4;
}

enum HealthStatus {
  HEALTH_STATUS_UNSPECIFIED = 0;
  OK = 1;
  DEGRADED = 2;
  UNAVAILABLE = 3;
}
```

**API Visibility:** Public (no tenant isolation required)

**Example Response:**
```json
{
  "status": "OK",
  "storage": "postgresql",
  "autoCommit": false,
  "details": {
    "database": "connected",
    "acm_hub": "connected"
  }
}
```

---

## GridClusters Service

**Purpose:** ACM Hub cluster inventory and AI Grid enrollment

### Proto Definition

```protobuf
// File: osac/aigrid/v1/grid_clusters_service.proto
syntax = "proto3";

package osac.aigrid.v1;

import "google/api/annotations.proto";
import "google/api/field_behavior.proto";
import "google/protobuf/field_mask.proto";
import "osac/aigrid/v1/common/metadata.proto";

// GridClusters service for ACM cluster enrollment in AI Grid
service GridClusters {
  // List all ACM ManagedClusters
  rpc List(ListGridClustersRequest) returns (ListGridClustersResponse) {
    option (google.api.http) = {
      get: "/api/private/v1/grid_clusters"
      additional_bindings {
        get: "/api/fulfillment/v1/grid_clusters"
      }
    };
  }

  // Get a specific cluster
  rpc Get(GetGridClusterRequest) returns (GridCluster) {
    option (google.api.http) = {
      get: "/api/private/v1/grid_clusters/{id}"
      additional_bindings {
        get: "/api/fulfillment/v1/grid_clusters/{id}"
      }
    };
  }

  // Enroll cluster in AI Grid (adds ai-grid/enabled label)
  rpc Enroll(EnrollGridClusterRequest) returns (GridCluster) {
    option (google.api.http) = {
      post: "/api/private/v1/grid_clusters/{id}:enroll"
      body: "*"
      additional_bindings {
        post: "/api/fulfillment/v1/grid_clusters/{id}:enroll"
        body: "*"
      }
    };
  }

  // Update cluster (limited - enrollment and labels only)
  rpc Update(UpdateGridClusterRequest) returns (GridCluster) {
    option (google.api.http) = {
      patch: "/api/private/v1/grid_clusters/{object.id}"
      body: "object"
      additional_bindings {
        patch: "/api/fulfillment/v1/grid_clusters/{object.id}"
        body: "object"
      }
    };
  }

  // List available deployment locations
  rpc ListLocations(ListLocationsRequest) returns (ListLocationsResponse) {
    option (google.api.http) = {
      get: "/api/private/v1/grid_clusters/locations"
      additional_bindings {
        get: "/api/fulfillment/v1/grid_clusters/locations"
      }
    };
  }

  // Signal (Private API only) - Controller feedback
  rpc Signal(SignalGridClusterRequest) returns (GridCluster) {
    // gRPC only, no HTTP binding
  }
}

message GridCluster {
  // Unique identifier (ManagedCluster name)
  string id = 1 [(google.api.field_behavior) = IMMUTABLE];

  // Standard metadata
  Metadata metadata = 2;

  // Desired state (minimal - mostly labels)
  GridClusterSpec spec = 3;

  // Observed state from ACM
  GridClusterStatus status = 4;
}

message GridClusterSpec {
  // Location identifier (from metadata.labels.location)
  string location = 1;

  // AI Grid enrollment enabled
  bool ai_grid_enabled = 2;

  // Provisioned for AI Grid workloads
  bool provisioned = 3;
}

message GridClusterStatus {
  // Overall cluster state
  ClusterState state = 1;

  // Provisioning state description
  string provisioning_state = 2;

  // Conditions from ACM ManagedCluster
  repeated Condition conditions = 3;

  // Last observed from ACM Hub
  google.protobuf.Timestamp last_observed_time = 4;
}

enum ClusterState {
  CLUSTER_STATE_UNSPECIFIED = 0;
  READY = 1;
  OFFLINE = 2;
  UNKNOWN = 3;
}

message ListGridClustersRequest {
  // Pagination offset
  int32 offset = 1;

  // Page size limit (max 1000)
  int32 limit = 2;

  // CEL filter expression
  // Examples:
  //   spec.ai_grid_enabled == true
  //   status.state == "READY"
  //   spec.location == "us-east-1"
  string filter = 3;

  // SQL-style order (e.g., "metadata.name ASC")
  string order = 4;
}

message ListGridClustersResponse {
  // Clusters matching the query
  repeated GridCluster clusters = 1;

  // Total count (for pagination)
  int32 total = 2;

  // Offset of this page
  int32 offset = 3;

  // Number of items in this page
  int32 limit = 4;
}

message GetGridClusterRequest {
  // Cluster ID (ManagedCluster name)
  string id = 1 [(google.api.field_behavior) = REQUIRED];
}

message EnrollGridClusterRequest {
  // Cluster ID to enroll
  string id = 1 [(google.api.field_behavior) = REQUIRED];

  // Enable AI Grid (must be true for enrollment)
  bool ai_grid_enabled = 2 [(google.api.field_behavior) = REQUIRED];
}

message UpdateGridClusterRequest {
  // Updated cluster object
  GridCluster object = 1 [(google.api.field_behavior) = REQUIRED];

  // Fields to update (FieldMask)
  google.protobuf.FieldMask update_mask = 2;

  // Enable optimistic locking via metadata.version
  bool lock = 3;
}

message ListLocationsRequest {
  // Filter to eligible locations only (Ready + enabled + provisioned)
  bool eligible_only = 1;
}

message ListLocationsResponse {
  // Unique location identifiers from cluster labels
  repeated string locations = 1;

  // Count per location (if useful)
  map<string, int32> cluster_count = 2;
}

message SignalGridClusterRequest {
  // Cluster ID
  string id = 1 [(google.api.field_behavior) = REQUIRED];

  // Status update from controller
  GridClusterStatus status = 2;
}
```

**Key Differences from REST:**
- Dedicated `Enroll` RPC instead of generic PATCH
- CEL filtering on List
- FieldMask for selective updates
- `Signal` RPC for controller feedback
- Optimistic locking via `metadata.version` + `lock` field
- Separate `ListLocations` RPC

---

## Tenants Service

**Purpose:** Tenant onboarding with embedded OIDC identity provider

### Proto Definition

```protobuf
// File: osac/aigrid/v1/tenants_service.proto
syntax = "proto3";

package osac.aigrid.v1;

import "google/api/annotations.proto";
import "google/api/field_behavior.proto";
import "google/protobuf/field_mask.proto";
import "osac/aigrid/v1/common/metadata.proto";
import "osac/aigrid/v1/common/state.proto";
import "osac/aigrid/v1/common/condition.proto";

// Tenants service for AI Grid tenant and IdP management
service Tenants {
  // List all tenants
  rpc List(ListTenantsRequest) returns (ListTenantsResponse) {
    option (google.api.http) = {
      get: "/api/private/v1/tenants"
      additional_bindings {
        get: "/api/fulfillment/v1/tenants"
      }
    };
  }

  // Get tenant details
  rpc Get(GetTenantRequest) returns (Tenant) {
    option (google.api.http) = {
      get: "/api/private/v1/tenants/{id}"
      additional_bindings {
        get: "/api/fulfillment/v1/tenants/{id}"
      }
    };
  }

  // Create tenant + IdP atomically
  rpc Create(CreateTenantRequest) returns (Tenant) {
    option (google.api.http) = {
      post: "/api/private/v1/tenants"
      body: "object"
      additional_bindings {
        post: "/api/fulfillment/v1/tenants"
        body: "object"
      }
    };
  }

  // Update tenant + IdP atomically
  rpc Update(UpdateTenantRequest) returns (Tenant) {
    option (google.api.http) = {
      patch: "/api/private/v1/tenants/{object.id}"
      body: "object"
      additional_bindings {
        patch: "/api/fulfillment/v1/tenants/{object.id}"
        body: "object"
      }
    };
  }

  // Delete tenant + IdP atomically
  rpc Delete(DeleteTenantRequest) returns (DeleteTenantResponse) {
    option (google.api.http) = {
      delete: "/api/private/v1/tenants/{id}"
      additional_bindings {
        delete: "/api/fulfillment/v1/tenants/{id}"
      }
    };
  }

  // Signal (Private API only)
  rpc Signal(SignalTenantRequest) returns (Tenant) {
    // gRPC only, no HTTP binding
  }
}

message Tenant {
  // Unique identifier (DNS-1123 label, max 63 chars)
  string id = 1 [(google.api.field_behavior) = IMMUTABLE];

  // Standard metadata
  Metadata metadata = 2;

  // Desired state
  TenantSpec spec = 3;

  // Observed state
  TenantStatus status = 4;
}

message TenantSpec {
  // Tenant domains (unique across all tenants)
  repeated string domains = 1;

  // Embedded OIDC identity provider configuration
  IdentityProvider identity_provider = 2;
}

message IdentityProvider {
  // IdP display title
  string title = 1;

  // IdP description
  string description = 2;

  // IdP enabled/disabled
  bool enabled = 3;

  // OIDC configuration
  OIDCConfig config = 4;
}

message OIDCConfig {
  // OIDC client ID (required)
  string client_id = 1 [(google.api.field_behavior) = REQUIRED];

  // Reference to Secret containing client secret (required)
  SecretReference client_secret_secret = 2 [(google.api.field_behavior) = REQUIRED];

  // OIDC issuer URL (required, HTTPS)
  string issuer = 3 [(google.api.field_behavior) = REQUIRED];

  // Authorization endpoint (required, HTTPS)
  string authorization_url = 4 [(google.api.field_behavior) = REQUIRED];

  // Token endpoint (required, HTTPS)
  string token_url = 5 [(google.api.field_behavior) = REQUIRED];

  // Default scopes (e.g., "openid profile email")
  string default_scopes = 6;

  // UserInfo endpoint (optional)
  string user_info_url = 7;

  // JWKS endpoint (optional)
  string jwks_url = 8;

  // Logout endpoint (optional)
  string logout_url = 9;

  // Validate token signature (default: true)
  bool validate_signature = 10;
}

message SecretReference {
  // Kubernetes Secret name
  string name = 1 [(google.api.field_behavior) = REQUIRED];

  // Secret namespace (optional, defaults to tenant namespace)
  string namespace = 2;

  // Secret key (optional, defaults to "clientSecret")
  string key = 3;
}

message TenantStatus {
  // Overall state
  State state = 1;

  // Human-readable status message
  string status_message = 2;

  // Conditions
  repeated Condition conditions = 3;

  // IdP configuration status
  IdentityProviderStatus identity_provider_status = 4;
}

message IdentityProviderStatus {
  // IdP connectivity check
  bool reachable = 1;

  // Last successful validation
  google.protobuf.Timestamp last_validated_at = 2;

  // Validation error (if any)
  string validation_error = 3;
}

message ListTenantsRequest {
  int32 offset = 1;
  int32 limit = 2;
  string filter = 3;
  string order = 4;
}

message ListTenantsResponse {
  repeated Tenant tenants = 1;
  int32 total = 2;
  int32 offset = 3;
  int32 limit = 4;
}

message GetTenantRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
}

message CreateTenantRequest {
  Tenant object = 1 [(google.api.field_behavior) = REQUIRED];
}

message UpdateTenantRequest {
  Tenant object = 1 [(google.api.field_behavior) = REQUIRED];
  google.protobuf.FieldMask update_mask = 2;
  bool lock = 3;
}

message DeleteTenantRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  bool lock = 2;
  int32 version = 3;
}

message DeleteTenantResponse {
  // Empty response (204 No Content in REST)
}

message SignalTenantRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  TenantStatus status = 2;
}
```

**Validation Rules (via proto validation annotations):**
- `id`: Lowercase DNS name, max 63 chars, `^[a-z0-9]([-a-z0-9]*[a-z0-9])?$`
- `domains`: Valid DNS names, unique across all tenants
- `issuer`, `authorization_url`, `token_url`: HTTPS URLs

**Atomicity:** Tenant + IdP created/updated/deleted together in one transaction

---

## AIModels Service

**Purpose:** AI model deployment to multiple geographic locations

### Proto Definition

```protobuf
// File: osac/aigrid/v1/ai_models_service.proto
syntax = "proto3";

package osac.aigrid.v1;

import "google/api/annotations.proto";
import "google/api/field_behavior.proto";
import "google/protobuf/field_mask.proto";
import "osac/aigrid/v1/common/metadata.proto";
import "osac/aigrid/v1/common/state.proto";
import "osac/aigrid/v1/common/condition.proto";

// AIModels service for multi-location AI model deployment
service AIModels {
  // List deployed models
  rpc List(ListAIModelsRequest) returns (ListAIModelsResponse) {
    option (google.api.http) = {
      get: "/api/private/v1/ai_models"
      additional_bindings {
        get: "/api/fulfillment/v1/ai_models"
      }
    };
  }

  // Get model details
  rpc Get(GetAIModelRequest) returns (AIModel) {
    option (google.api.http) = {
      get: "/api/private/v1/ai_models/{id}"
      additional_bindings {
        get: "/api/fulfillment/v1/ai_models/{id}"
      }
    };
  }

  // Deploy new model
  rpc Create(CreateAIModelRequest) returns (AIModel) {
    option (google.api.http) = {
      post: "/api/private/v1/ai_models"
      body: "object"
      additional_bindings {
        post: "/api/fulfillment/v1/ai_models"
        body: "object"
      }
    };
  }

  // Update model deployment (locations, replicas, resources)
  rpc Update(UpdateAIModelRequest) returns (AIModel) {
    option (google.api.http) = {
      patch: "/api/private/v1/ai_models/{object.id}"
      body: "object"
      additional_bindings {
        patch: "/api/fulfillment/v1/ai_models/{object.id}"
        body: "object"
      }
    };
  }

  // Delete model deployment
  rpc Delete(DeleteAIModelRequest) returns (DeleteAIModelResponse) {
    option (google.api.http) = {
      delete: "/api/private/v1/ai_models/{id}"
      additional_bindings {
        delete: "/api/fulfillment/v1/ai_models/{id}"
      }
    };
  }

  // Signal (Private API only)
  rpc Signal(SignalAIModelRequest) returns (AIModel) {
    // gRPC only, no HTTP binding
  }
}

message AIModel {
  // Unique identifier (DNS-1123 subdomain, max 253 chars)
  string id = 1 [(google.api.field_behavior) = IMMUTABLE];

  // Standard metadata
  Metadata metadata = 2;

  // Desired state
  AIModelSpec spec = 3;

  // Observed state
  AIModelStatus status = 4;
}

message AIModelSpec {
  // Human-readable display name
  string display_name = 1;

  // Model source URI (e.g., hf://ibm-granite/granite-3.0-8b)
  string model_uri = 2 [(google.api.field_behavior) = REQUIRED];

  // Model identifier for MaaS registration
  string model_name = 3 [(google.api.field_behavior) = REQUIRED];

  // Container image for inference runtime
  string runtime_image = 4 [(google.api.field_behavior) = REQUIRED];

  // Number of replicas per location
  int32 replicas = 5;

  // Resource allocation per replica
  ResourceRequirements resources = 6;

  // Additional runtime arguments
  repeated string runtime_args = 7;

  // Deployment locations (AI Grid site identifiers)
  repeated string locations = 8 [(google.api.field_behavior) = REQUIRED];
}

message ResourceRequirements {
  // CPU request (e.g., "2" or "2000m")
  string cpu = 1;

  // Memory request (e.g., "4Gi")
  string memory = 2;

  // Number of GPUs (0 = CPU only)
  int32 gpu_count = 3;

  // GPU type/model (optional, e.g., "nvidia-a100")
  string gpu_type = 4;
}

message AIModelStatus {
  // Overall deployment state
  State state = 1;

  // Status message
  string status_message = 2;

  // Conditions
  repeated Condition conditions = 3;

  // Per-location deployment status
  repeated LocationDeploymentStatus location_status = 4;

  // Total ready replicas across all locations
  int32 ready_replicas = 5;

  // Total desired replicas across all locations
  int32 desired_replicas = 6;

  // Model registration status
  ModelRegistrationStatus registration_status = 7;
}

message LocationDeploymentStatus {
  // Location identifier
  string location = 1;

  // Cluster name where deployed
  string cluster = 2;

  // Deployment state at this location
  State state = 3;

  // Ready replicas at this location
  int32 ready_replicas = 4;

  // Desired replicas at this location
  int32 desired_replicas = 5;

  // Last observed timestamp
  google.protobuf.Timestamp last_observed_time = 6;
}

message ModelRegistrationStatus {
  // Registered with MaaS
  bool registered = 1;

  // MaaS model reference name
  string model_ref_name = 2;

  // Registration timestamp
  google.protobuf.Timestamp registered_at = 3;
}

message ListAIModelsRequest {
  int32 offset = 1;
  int32 limit = 2;
  string filter = 3;  // e.g., spec.locations has "us-east-1"
  string order = 4;
}

message ListAIModelsResponse {
  repeated AIModel models = 1;
  int32 total = 2;
  int32 offset = 3;
  int32 limit = 4;
}

message GetAIModelRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
}

message CreateAIModelRequest {
  AIModel object = 1 [(google.api.field_behavior) = REQUIRED];
}

message UpdateAIModelRequest {
  AIModel object = 1 [(google.api.field_behavior) = REQUIRED];
  google.protobuf.FieldMask update_mask = 2;
  bool lock = 3;
}

message DeleteAIModelRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  bool lock = 2;
  int32 version = 3;
}

message DeleteAIModelResponse {
  // Empty response
}

message SignalAIModelRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  AIModelStatus status = 2;
}
```

**Validation Rules:**
- `id`: Max 253 chars, `^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$`
- `locations`: At least 1, max 64, each must exist in `/grid_clusters/locations`
- `replicas`: Must be >= 1
- `model_uri`, `model_name`, `runtime_image`: Required, non-empty

**Generated Kubernetes Resources:**
1. `LLMInferenceService` - vLLM deployment
2. `MaaSModelRef` - Model registration
3. ACM `Placement` - Cluster selection
4. ACM `ManifestWorkReplicaSet` - Workload distribution

---

## AISubscriptions Service

**Purpose:** MaaS subscription management with token rate limits

### Proto Definition

```protobuf
// File: osac/aigrid/v1/ai_subscriptions_service.proto
syntax = "proto3";

package osac.aigrid.v1;

import "google/api/annotations.proto";
import "google/api/field_behavior.proto";
import "google/protobuf/field_mask.proto";
import "google/protobuf/duration.proto";
import "osac/aigrid/v1/common/metadata.proto";
import "osac/aigrid/v1/common/state.proto";
import "osac/aigrid/v1/common/condition.proto";

// AISubscriptions service for MaaS subscription management
service AISubscriptions {
  // List subscriptions
  rpc List(ListAISubscriptionsRequest) returns (ListAISubscriptionsResponse) {
    option (google.api.http) = {
      get: "/api/private/v1/ai_subscriptions"
      additional_bindings {
        get: "/api/fulfillment/v1/ai_subscriptions"
      }
    };
  }

  // Get subscription details with joined model/policy information
  rpc Get(GetAISubscriptionRequest) returns (AISubscriptionInfo) {
    option (google.api.http) = {
      get: "/api/private/v1/ai_subscriptions/{id}"
      additional_bindings {
        get: "/api/fulfillment/v1/ai_subscriptions/{id}"
      }
    };
  }

  // Create subscription (optionally with auto-generated auth policy)
  rpc Create(CreateAISubscriptionRequest) returns (AISubscription) {
    option (google.api.http) = {
      post: "/api/private/v1/ai_subscriptions"
      body: "object"
      additional_bindings {
        post: "/api/fulfillment/v1/ai_subscriptions"
        body: "object"
      }
    };
  }

  // Update subscription
  rpc Update(UpdateAISubscriptionRequest) returns (AISubscription) {
    option (google.api.http) = {
      patch: "/api/private/v1/ai_subscriptions/{object.id}"
      body: "object"
      additional_bindings {
        patch: "/api/fulfillment/v1/ai_subscriptions/{object.id}"
        body: "object"
      }
    };
  }

  // Delete subscription (and auto-generated policy if exists)
  rpc Delete(DeleteAISubscriptionRequest) returns (DeleteAISubscriptionResponse) {
    option (google.api.http) = {
      delete: "/api/private/v1/ai_subscriptions/{id}"
      additional_bindings {
        delete: "/api/fulfillment/v1/ai_subscriptions/{id}"
      }
    };
  }

  // Signal (Private API only)
  rpc Signal(SignalAISubscriptionRequest) returns (AISubscription) {
    // gRPC only, no HTTP binding
  }
}

message AISubscription {
  // Unique identifier (max 253 chars, max 246 if create_auth_policy=true)
  string id = 1 [(google.api.field_behavior) = IMMUTABLE];

  // Standard metadata
  Metadata metadata = 2;

  // Desired state
  AISubscriptionSpec spec = 3;

  // Observed state
  AISubscriptionStatus status = 4;
}

message AISubscriptionSpec {
  // Human-readable display name
  string display_name = 1 [(google.api.field_behavior) = REQUIRED];

  // Priority (-1,000,000 to +1,000,000, default: 0)
  int32 priority = 2;

  // Subscription owner
  Owner owner = 3 [(google.api.field_behavior) = REQUIRED];

  // Model references with rate limits
  repeated ModelReference model_refs = 4 [(google.api.field_behavior) = REQUIRED];

  // Auto-generate MaaSAuthPolicy
  bool create_auth_policy = 5;

  // Metering metadata (for billing integration)
  MeteringMetadata metering_metadata = 6;
}

message Owner {
  // Owner groups (at least one required)
  repeated Group groups = 1 [(google.api.field_behavior) = REQUIRED];

  // Owner users (optional)
  repeated User users = 2;
}

message Group {
  // Group name (e.g., "engineering")
  string name = 1 [(google.api.field_behavior) = REQUIRED];
}

message User {
  // Username or email
  string name = 1 [(google.api.field_behavior) = REQUIRED];
}

message ModelReference {
  // Model ID (references AIModel resource)
  string name = 1 [(google.api.field_behavior) = REQUIRED];

  // Model namespace (optional, defaults to subscription namespace)
  string namespace = 2;

  // Token rate limits (at least one required)
  repeated TokenRateLimit token_rate_limits = 3 [(google.api.field_behavior) = REQUIRED];
}

message TokenRateLimit {
  // Token limit (1 to 1,000,000,000)
  int64 limit = 1 [(google.api.field_behavior) = REQUIRED];

  // Time window (e.g., 1h, 5m, 30s)
  google.protobuf.Duration window = 2 [(google.api.field_behavior) = REQUIRED];
}

message MeteringMetadata {
  // Customer billing ID
  string customer_id = 1;

  // Subscription billing ID
  string subscription_id = 2;

  // Cost center
  string cost_center = 3;

  // Additional billing tags
  map<string, string> tags = 4;
}

message AISubscriptionStatus {
  // Overall state
  State state = 1;

  // Phase ("Ready", "Pending", etc.)
  string phase = 2;

  // Status message
  string status_message = 3;

  // Conditions
  repeated Condition conditions = 4;

  // Auto-generated policy name (if create_auth_policy=true)
  string generated_policy_name = 5;

  // Token usage statistics (populated by metering service)
  TokenUsageStats token_usage = 6;
}

message TokenUsageStats {
  // Total tokens consumed (current billing period)
  int64 total_tokens = 1;

  // Tokens consumed per model
  map<string, int64> tokens_per_model = 2;

  // Last usage timestamp
  google.protobuf.Timestamp last_usage_time = 3;
}

// Extended response for Get RPC with joined information
message AISubscriptionInfo {
  // Subscription object
  AISubscription subscription = 1;

  // Referenced models (joined from AIModels)
  repeated AIModel models = 2;

  // Auto-generated auth policy (if exists)
  AuthPolicy auth_policy = 3;

  // Metering metadata
  MeteringMetadata metering_metadata = 4;
}

message AuthPolicy {
  // Policy name
  string name = 1;

  // Policy namespace
  string namespace = 2;

  // Subjects (groups/users)
  repeated string subjects = 3;

  // Model references
  repeated string model_refs = 4;

  // Auto-generated by subscription
  bool auto_generated = 5;
}

message ListAISubscriptionsRequest {
  int32 offset = 1;
  int32 limit = 2;
  string filter = 3;  // e.g., spec.owner.groups has "engineering"
  string order = 4;
}

message ListAISubscriptionsResponse {
  repeated AISubscription subscriptions = 1;
  int32 total = 2;
  int32 offset = 3;
  int32 limit = 4;
}

message GetAISubscriptionRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
}

message CreateAISubscriptionRequest {
  AISubscription object = 1 [(google.api.field_behavior) = REQUIRED];
}

message UpdateAISubscriptionRequest {
  AISubscription object = 1 [(google.api.field_behavior) = REQUIRED];
  google.protobuf.FieldMask update_mask = 2;
  bool lock = 3;
}

message DeleteAISubscriptionRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  bool lock = 2;
  int32 version = 3;
}

message DeleteAISubscriptionResponse {
  // Empty response
}

message SignalAISubscriptionRequest {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  AISubscriptionStatus status = 2;
}
```

**Validation Rules:**
- `id`: Max 253 chars (max 246 if `create_auth_policy=true`)
- `owner.groups`: At least one, non-blank names, warn on `system:authenticated`
- `model_refs`: At least one, unique names
- Each `model_ref`: At least one token rate limit
- `token_rate_limits[].limit`: 1 to 1,000,000,000
- `token_rate_limits[].window`: Valid duration (e.g., 1h, 5m, 30s)

**Generated Kubernetes Resources:**
1. `MaaSSubscription` - Subscription configuration
2. `MaaSAuthPolicy` - Auto-generated (if `create_auth_policy=true`)

---

## API Summary Tables

### Methods by Service

| Service | List | Get | Create | Update | Delete | Signal | Special |
|---------|------|-----|--------|--------|--------|--------|---------|
| Health | - | ✅ Check | - | - | - | - | - |
| GridClusters | ✅ | ✅ | - | ✅ | - | ✅ | Enroll, ListLocations |
| Tenants | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| AIModels | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| AISubscriptions | ✅ | ✅ GetInfo | ✅ | ✅ | ✅ | ✅ | - |

### API Visibility

| Service | Public API | Private API | Notes |
|---------|-----------|-------------|-------|
| Health | ✅ | ✅ | No tenant isolation |
| GridClusters | ✅ All | ✅ All + Signal | Admin visibility only |
| Tenants | ✅ Tenant-scoped | ✅ All tenants + Signal | Tenant isolation enforced |
| AIModels | ✅ Tenant-scoped | ✅ All tenants + Signal | Tenant isolation enforced |
| AISubscriptions | ✅ Tenant-scoped | ✅ All tenants + Signal | Tenant isolation enforced |

### REST vs gRPC Feature Comparison

| Feature | REST (PoC) | gRPC (This Design) |
|---------|-----------|-------------------|
| **Protocol** | HTTP/JSON | gRPC + HTTP transcoding |
| **Schema** | OpenAPI 3.0 | Protocol Buffers |
| **Resource Pattern** | Varied DTOs | id/metadata/spec/status |
| **Filtering** | Client-side | Server-side CEL |
| **Pagination** | None (full lists) | offset/limit/filter/order |
| **Updates** | PUT (full replace) | PATCH with FieldMask |
| **Concurrency** | ETag + If-Match | metadata.version + lock |
| **Validation** | Runtime JSON schema | Proto annotations |
| **Tenant Isolation** | Not implemented | osac.openshift.io/tenant |
| **Controller Feedback** | N/A (Git backend) | Signal RPC (Private) |
| **Atomicity** | Tenant+IdP together | Tenant+IdP together |

---

## Proto File Structure

Recommended file organization:

```
proto/
├── private/
│   └── osac/
│       └── aigrid/
│           └── v1/
│               ├── common/
│               │   ├── metadata.proto
│               │   ├── state.proto
│               │   └── condition.proto
│               ├── health_service.proto
│               ├── grid_clusters_service.proto
│               ├── grid_cluster_type.proto
│               ├── tenants_service.proto
│               ├── tenant_type.proto
│               ├── ai_models_service.proto
│               ├── ai_model_type.proto
│               ├── ai_subscriptions_service.proto
│               └── ai_subscription_type.proto
├── public/
│   └── osac/
│       └── aigrid/
│           └── v1/
│               └── (auto-generated via cleanapi)
└── gen/
    └── (auto-generated Go/Python/etc.)
```

---

## Code Generation

### Generate Go Code

```bash
# From proto/ directory
make generate

# Or manually
buf generate
```

### Generate OpenAPI/Swagger

```bash
# Generate OpenAPI spec from gRPC annotations
buf generate --template buf.gen.openapi.yaml
```

### Run Validation

```bash
# Lint proto files
buf lint

# Breaking change detection
buf breaking --against '.git#branch=main'
```

---

## Implementation Checklist

### Phase 1: Proto Definitions
- [ ] Define common types (Metadata, State, Condition)
- [ ] Define Health service proto
- [ ] Define GridClusters service proto
- [ ] Define Tenants service proto (with embedded IdP)
- [ ] Define AIModels service proto
- [ ] Define AISubscriptions service proto
- [ ] Add HTTP transcoding annotations
- [ ] Add validation annotations
- [ ] Run `buf lint` and fix issues
- [ ] Generate Go code
- [ ] Generate OpenAPI spec

### Phase 2: Service Implementation
- [ ] Implement Health.Check RPC
- [ ] Implement GridClusters service (ACM integration)
- [ ] Implement Tenants service (atomic Tenant+IdP)
- [ ] Implement AIModels service (ACM Placement + ManifestWorkReplicaSet)
- [ ] Implement AISubscriptions service (MaaS integration)
- [ ] Implement Signal RPCs for all services
- [ ] Add CEL filtering support
- [ ] Add FieldMask update support
- [ ] Add optimistic locking (metadata.version)

### Phase 3: Integration
- [ ] Connect to ACM Hub API
- [ ] Integrate with OSAC cluster lifecycle
- [ ] Create LLMInferenceService CRs
- [ ] Create MaaSModelRef CRs
- [ ] Create ACM Placement CRs
- [ ] Create ManifestWorkReplicaSet CRs
- [ ] Create MaaSSubscription CRs
- [ ] Create MaaSAuthPolicy CRs (auto-generated)
- [ ] Implement tenant isolation
- [ ] Implement RBAC authorization

### Phase 4: Testing
- [ ] Unit tests for all RPCs
- [ ] Integration tests (envtest)
- [ ] Contract tests (proto validation)
- [ ] E2E tests (full workflow)
- [ ] Load tests (pagination, filtering)
- [ ] Security tests (tenant isolation, RBAC)

---

## Migration Path from REST to gRPC

### Client Migration

**Before (REST):**
```javascript
// Create model
const response = await fetch('/api/models', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    name: 'granite-3-8b',
    displayName: 'Granite 3 8B',
    modelUri: 'hf://ibm-granite/granite-3.0-8b',
    locations: ['site1', 'site2']
  })
});
```

**After (gRPC via Connect):**
```javascript
import { createPromiseClient } from "@connectrpc/connect";
import { AIModels } from "./gen/osac/aigrid/v1/ai_models_service_connect";

const client = createPromiseClient(AIModels, transport);

const model = await client.create({
  object: {
    id: 'granite-3-8b',
    metadata: {
      name: 'Granite 3 8B',
    },
    spec: {
      displayName: 'Granite 3 8B',
      modelUri: 'hf://ibm-granite/granite-3.0-8b',
      locations: ['site1', 'site2'],
      modelName: 'ibm-granite/granite-3.0-8b',
      runtimeImage: 'quay.io/rh-aiservices-bu/vllm-openai-ubi9:0.4.2',
      replicas: 1,
      resources: {
        cpu: '2',
        memory: '4Gi',
        gpuCount: 0
      }
    }
  }
});
```

### Backward Compatibility

gRPC services with HTTP transcoding annotations provide **REST compatibility**:

```
POST /api/fulfillment/v1/ai_models
Content-Type: application/json

{
  "object": {
    "id": "granite-3-8b",
    "spec": {...}
  }
}
```

Maps to:
```
AIModels.Create(CreateAIModelRequest)
```

---

## Related Documents

- **REST API Reference:** `ai-grid-mvp-rest-api-reference.md`
- **OSAC gRPC API Reference:** `osac-grpc-api-reference.md`
- **Integration Design:** `ai-grid-osac-integration-design.md`

---

**Document Version:** 1.0  
**Last Updated:** 2026-10-16  
**Status:** Design proposal for production gRPC APIs  
**Next Steps:** Review with API, RHOAI/MaaS, ACM, and UI teams
