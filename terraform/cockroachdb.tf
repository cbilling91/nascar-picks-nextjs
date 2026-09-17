# =============================================================================
# CockroachDB Serverless Cluster
# =============================================================================
# Uses the official CockroachDB Terraform provider.
# Docs: https://registry.terraform.io/providers/cockroachdb/cockroach/latest
#
# Required variables:
#   - cockroachdb_api_key  : API key from CockroachDB Cloud console
# =============================================================================

# ---------------------------------------------------------------------------
# Random database password (generated, stored in state)
# ---------------------------------------------------------------------------
resource "random_password" "cockroachdb_password" {
  length  = 32
  special = true
}

# ---------------------------------------------------------------------------
# CockroachDB Serverless cluster
# ---------------------------------------------------------------------------
resource "cockroach_cluster" "nascar_picks" {
  name           = "nascar-picks"
  cloud_provider = "GCP"
  serverless = {
    usage_limits = {
      request_units = 0 # $0 = free tier, scales to zero when idle
    }
  }
  regions = [
    {
      name = "us-east1"
    }
  ]
}

# ---------------------------------------------------------------------------
# Database user (application user, not the default admin)
# ---------------------------------------------------------------------------
resource "cockroach_sql_user" "app_user" {
  cluster_id = cockroach_cluster.nascar_picks.id
  name       = "nascar_app"
  password   = random_password.cockroachdb_password.result
}

# ---------------------------------------------------------------------------
# Allow IP connections (for migrations and local dev)
# ---------------------------------------------------------------------------
resource "cockroach_allow_list" "allow_list" {
  cluster_id = cockroach_cluster.nascar_picks.id
  cidr_ip    = "0.0.0.0/0" # CockroachDB requires auth, so this is safe
  cidr_mask  = 0
  ui         = true
  sql        = true
}

# ---------------------------------------------------------------------------
# Connection string as a local for use in other resources
# ---------------------------------------------------------------------------
locals {
  cockroachdb_connection_string = format(
    "postgresql://%s:%s@%s:%d/%s?sslmode=verify-full",
    cockroach_sql_user.app_user.name,
    random_password.cockroachdb_password.result,
    cockroach_cluster.nascar_picks.serverless[0].sql_dns,
    26257,
    "defaultdb"
  )
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
output "cockroachdb_cluster_id" {
  value       = cockroach_cluster.nascar_picks.id
  description = "CockroachDB cluster ID"
}

output "cockroachdb_connection_string" {
  value       = local.cockroachdb_connection_string
  description = "CockroachDB connection string for the application"
  sensitive   = true
}

output "cockroachdb_password" {
  value       = random_password.cockroachdb_password.result
  description = "CockroachDB application user password"
  sensitive   = true
}