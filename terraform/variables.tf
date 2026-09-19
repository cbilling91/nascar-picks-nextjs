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

# ---------------------------------------------------------------------------
# Supabase (existing project, managed outside Terraform)
# ---------------------------------------------------------------------------
variable "supabase_url" {
  type        = string
  description = "Supabase project URL"
}

variable "supabase_anon_key" {
  type        = string
  sensitive   = true
  description = "Supabase anonymous (public) API key"
}

variable "supabase_service_role_key" {
  type        = string
  sensitive   = true
  description = "Supabase service role (secret) API key"
}