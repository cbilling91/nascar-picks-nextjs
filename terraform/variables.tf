variable "image_tag" {
  type    = string
  default = "latest"
}

# ---------------------------------------------------------------------------
# Database connection (existing CockroachDB Cloud cluster, nascar_picks DB)
# ---------------------------------------------------------------------------
variable "database_url" {
  type        = string
  sensitive   = true
  description = "Connection string for the existing CockroachDB cluster (nascar_picks database)"
}
