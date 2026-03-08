terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "3.104.0"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 1.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-nascar-terraform"
    storage_account_name = "tfstatenascarpicks"
    container_name       = "tfstate"
    key                  = "nascar-picks.tfstate"
    use_oidc             = true
  }
}

provider "azurerm" {
  features {}
  use_oidc = true
}

provider "azapi" {
  use_oidc = true
}
