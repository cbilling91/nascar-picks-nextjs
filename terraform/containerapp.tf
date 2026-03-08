resource "azurerm_log_analytics_workspace" "nascar_picks_workspace" {
  name                = "nascar-picks-workspace"
  location            = data.azurerm_resource_group.nascar_picks_rg.location
  resource_group_name = data.azurerm_resource_group.nascar_picks_rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_container_app_environment" "nascar_picks_environment" {
  name                       = "nascar-picks-environment"
  location                   = data.azurerm_resource_group.nascar_picks_rg.location
  resource_group_name        = data.azurerm_resource_group.nascar_picks_rg.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.nascar_picks_workspace.id
}

resource "azurerm_container_app" "nascar_picks_app" {
  name                         = "nascar-picks-app"
  container_app_environment_id = azurerm_container_app_environment.nascar_picks_environment.id
  resource_group_name          = data.azurerm_resource_group.nascar_picks_rg.name
  revision_mode                = "Single"

  secret {
    name  = "supabase-service-role-key"
    value = var.supabase_service_role_key
  }

  template {
    container {
      name   = "nascar-picks"
      image  = "ghcr.io/cbilling91/nascar-picks-nextjs:${var.image_tag}"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "NEXT_PUBLIC_SUPABASE_URL"
        value = var.supabase_url
      }

      env {
        name  = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        value = var.supabase_anon_key
      }

      env {
        name        = "SUPABASE_SERVICE_ROLE_KEY"
        secret_name = "supabase-service-role-key"
      }

      env {
        name  = "NASCAR_API_BASE_URL"
        value = "https://cf.nascar.com"
      }

      env {
        name  = "NEXT_PUBLIC_APP_URL"
        value = "https://app.nascar-picks.com"
      }

    }

    min_replicas = 1
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 3000
    transport                  = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }
}

output "app_url" {
  value = "https://${azurerm_container_app.nascar_picks_app.latest_revision_fqdn}"
}

output "custom_domain_url" {
  value = "https://app.nascar-picks.com"
}
