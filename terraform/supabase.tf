# =============================================================================
# Supabase Project & Database
# =============================================================================
# Uses the Supabase Management API to create a project and run migrations.
# The Supabase Management API is documented at:
#   https://api.supabase.com/api/v1
#
# Required variables (set in terraform.tfvars or via environment):
#   - supabase_access_token    : Personal access token from https://supabase.com/dashboard/account/tokens
#   - supabase_organization_id : Your Supabase organization ID
# =============================================================================

# ---------------------------------------------------------------------------
# Random database password (generated, stored in state)
# ---------------------------------------------------------------------------
resource "random_password" "supabase_db_password" {
  length  = 32
  special = true
}

# ---------------------------------------------------------------------------
# Create the Supabase project via Management API
# ---------------------------------------------------------------------------
# We use a local-exec provisioner on a null_resource because the Supabase
# Management API is a REST API (no official Terraform provider exists).
# The script:
#   1. Creates the project
#   2. Waits for it to be active
#   3. Extracts the anon key and service_role key
#   4. Outputs them as JSON for Terraform to consume
# ---------------------------------------------------------------------------

locals {
  supabase_api_base_url = "https://api.supabase.com/v1"
  supabase_project_name = "nascar-picks"
  supabase_region       = "us-east-1"
  supabase_db_user      = "postgres"
}

resource "null_resource" "create_supabase_project" {
  triggers = {
    # Re-create if the project name or region changes
    project_name = local.supabase_project_name
    region       = local.supabase_region
  }

  provisioner "local-exec" {
    command = <<-EOT
      #!/bin/bash
      set -e

      API_URL="${local.supabase_api_base_url}"
      ORG_ID="${var.supabase_organization_id}"
      PROJECT_NAME="${local.supabase_project_name}"
      DB_PASS="${random_password.supabase_db_password.result}"
      REGION="${local.supabase_region}"
      TOKEN="${var.supabase_access_token}"

      echo "==> Creating Supabase project: $PROJECT_NAME"

      # Step 1: Create the project
      CREATE_RESPONSE=$(curl -s -X POST "$API_URL/projects" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
          \"name\": \"$PROJECT_NAME\",
          \"organization_id\": \"$ORG_ID\",
          \"region\": \"$REGION\",
          \"db_pass\": \"$DB_PASS\",
          \"plan\": \"free\"
        }")

      echo "Create response: $CREATE_RESPONSE"

      PROJECT_REF=$(echo "$CREATE_RESPONSE" | jq -r '.ref // .id')
      if [ -z "$PROJECT_REF" ] || [ "$PROJECT_REF" = "null" ]; then
        echo "ERROR: Failed to create project. Response: $CREATE_RESPONSE"
        exit 1
      fi

      echo "==> Project ref: $PROJECT_REF"

      # Step 2: Wait for project to be active (poll up to 5 minutes)
      MAX_ATTEMPTS=30
      ATTEMPT=0
      while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        STATUS_RESPONSE=$(curl -s "$API_URL/projects/$PROJECT_REF" \
          -H "Authorization: Bearer $TOKEN")
        STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
        echo "  Attempt $((ATTEMPT+1))/$MAX_ATTEMPTS: status=$STATUS"

        if [ "$STATUS" = "ACTIVE_HEALTHY" ]; then
          echo "==> Project is active and healthy!"
          break
        fi

        sleep 10
        ATTEMPT=$((ATTEMPT+1))
      done

      if [ "$STATUS" != "ACTIVE_HEALTHY" ]; then
        echo "ERROR: Project did not become active within timeout. Last status: $STATUS"
        exit 1
      fi

      # Step 3: Get API keys
      KEYS_RESPONSE=$(curl -s "$API_URL/projects/$PROJECT_REF/api-keys" \
        -H "Authorization: Bearer $TOKEN")

      ANON_KEY=$(echo "$KEYS_RESPONSE" | jq -r '.[] | select(.name=="anon") | .api_key')
      SERVICE_KEY=$(echo "$KEYS_RESPONSE" | jq -r '.[] | select(.name=="service_role") | .api_key')

      # Step 4: Output results as JSON for Terraform to consume
      SUPABASE_URL="https://$PROJECT_REF.supabase.co"

      jq -n \
        --arg url "$SUPABASE_URL" \
        --arg anon_key "$ANON_KEY" \
        --arg service_key "$SERVICE_KEY" \
        --arg project_ref "$PROJECT_REF" \
        '{
          supabase_url: $url,
          supabase_anon_key: $anon_key,
          supabase_service_role_key: $service_key,
          supabase_project_ref: $project_ref
        }' > supabase_output.json

      echo "==> Supabase project created successfully!"
      echo "    URL: $SUPABASE_URL"
      echo "    Project Ref: $PROJECT_REF"
    EOT

    interpreter = ["bash", "-c"]
  }
}

# ---------------------------------------------------------------------------
# Read the output JSON produced by the provisioner
# ---------------------------------------------------------------------------
data "external" "supabase_project" {
  depends_on = [null_resource.create_supabase_project]

  program = ["bash", "-c", "cat supabase_output.json"]
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
output "supabase_project_url" {
  value       = data.external.supabase_project.result.supabase_url
  description = "Supabase project URL"
}

output "supabase_project_ref" {
  value       = data.external.supabase_project.result.supabase_project_ref
  description = "Supabase project reference ID"
}

output "supabase_anon_key" {
  value       = data.external.supabase_project.result.supabase_anon_key
  description = "Supabase anonymous (public) API key"
  sensitive   = true
}

output "supabase_service_role_key" {
  value       = data.external.supabase_project.result.supabase_service_role_key
  description = "Supabase service role (secret) API key"
  sensitive   = true
}

output "supabase_db_password" {
  value       = random_password.supabase_db_password.result
  description = "Supabase database password"
  sensitive   = true
}