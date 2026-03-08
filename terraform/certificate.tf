# Step 1 is handled by azurerm_container_app_custom_domain in dns.tf (Disabled binding)

# Step 2: Create the managed certificate (HTTP domain control validation)
resource "azapi_resource" "nascar_picks_certificate" {
  type      = "Microsoft.App/managedEnvironments/managedCertificates@2023-05-02-preview"
  name      = local.domain_name
  location  = data.azurerm_resource_group.nascar_picks_rg.location
  parent_id = azurerm_container_app_environment.nascar_picks_environment.id

  body = {
    properties = {
      domainControlValidation = "HTTP"
      subjectName             = local.domain_name
    }
  }

  depends_on = [
    azurerm_container_app_custom_domain.app,
  ]
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
