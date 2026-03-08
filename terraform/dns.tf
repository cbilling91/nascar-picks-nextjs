# Reference the existing DNS zone — does not recreate it
data "azurerm_dns_zone" "nascar_picks" {
  name                = "nascar-picks.com"
  resource_group_name = "rg-nascar-terraform"
}

locals {
  domain_name        = "app.nascar-picks.com"
  environment_domain = replace(azurerm_container_app.nascar_picks_app.latest_revision_fqdn, split(".", azurerm_container_app.nascar_picks_app.latest_revision_fqdn)[0], azurerm_container_app.nascar_picks_app.name)
}

# CNAME: app.nascar-picks.com → ACA environment domain (stable, not revision-specific)
resource "azurerm_dns_cname_record" "app" {
  name                = "app"
  zone_name           = data.azurerm_dns_zone.nascar_picks.name
  resource_group_name = data.azurerm_dns_zone.nascar_picks.resource_group_name
  ttl                 = 300
  record              = local.environment_domain
}

# TXT verification record required for custom domain binding on ACA
resource "azurerm_dns_txt_record" "app_verification" {
  name                = "asuid.app"
  zone_name           = data.azurerm_dns_zone.nascar_picks.name
  resource_group_name = data.azurerm_dns_zone.nascar_picks.resource_group_name
  ttl                 = 300

  record {
    value = azurerm_container_app.nascar_picks_app.custom_domain_verification_id
  }
}

# Bind the custom domain to the container app (cert binding managed separately via azapi)
resource "azurerm_container_app_custom_domain" "app" {
  name                     = local.domain_name
  container_app_id         = azurerm_container_app.nascar_picks_app.id
  certificate_binding_type = "Disabled"

  depends_on = [
    azurerm_dns_txt_record.app_verification,
    azurerm_dns_cname_record.app,
  ]

  lifecycle {
    ignore_changes = [certificate_binding_type]
  }
}
