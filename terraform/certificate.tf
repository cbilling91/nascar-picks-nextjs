# Step 1: Create the managed certificate (CNAME domain control validation)
# CNAME validation uses the existing DNS CNAME record — no prior Disabled binding required
resource "azapi_resource" "nascar_picks_certificate" {
  type      = "Microsoft.App/managedEnvironments/managedCertificates@2023-05-02-preview"
  name      = local.domain_name
  location  = data.azurerm_resource_group.nascar_picks_rg.location
  parent_id = azurerm_container_app_environment.nascar_picks_environment.id

  body = {
    properties = {
      domainControlValidation = "CNAME"
      subjectName             = local.domain_name
    }
  }

  depends_on = [
    azurerm_dns_cname_record.app,
    azurerm_dns_txt_record.app_verification,
  ]

  lifecycle {
    ignore_changes = [body]
  }
}

# Step 3: Re-bind the hostname with the managed certificate (SniEnabled)
resource "azapi_resource_action" "nascar_picks_custom_domain" {
  type        = "Microsoft.App/containerApps@2023-05-02-preview"
  resource_id = azurerm_container_app.nascar_picks_app.id
  method      = "PATCH"

  body = {
    properties = {
      configuration = {
        ingress = {
          customDomains = [
            {
              name          = local.domain_name
              bindingType   = "SniEnabled"
              certificateId = azapi_resource.nascar_picks_certificate.id
            }
          ]
        }
      }
    }
  }

  depends_on = [
    azapi_resource.nascar_picks_certificate,
  ]
}
