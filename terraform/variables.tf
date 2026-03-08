variable "image_tag" {
  type    = string
  default = "latest"
}

variable "supabase_url" {
  type = string
}

variable "supabase_anon_key" {
  type = string
}

variable "supabase_service_role_key" {
  type      = string
  sensitive = true
}
