variable "image_tag" {
  type    = string
  default = "latest"
}

# ---------------------------------------------------------------------------
# CockroachDB Cloud credentials
# ---------------------------------------------------------------------------
variable "cockroachdb_api_key" {
  type        = string
  sensitive   = true
  description = "CockroachDB Cloud API key from https://cockroachlabs.cloud"
}