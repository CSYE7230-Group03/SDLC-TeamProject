terraform {
  required_version = ">= 1.3.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment and configure to use an S3 remote backend.
  # Ensure the bucket and DynamoDB table exist before running terraform init.
  #
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "secrets/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "your-terraform-lock-table"
  #   encrypt        = true
  # }
}

# AWS credentials are read from the environment automatically:
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
# Do not hardcode credentials here.
provider "aws" {
  region = var.aws_region
}

# ---------------------------------------------------------------------------
# Secret entry — creates the named secret in Secrets Manager.
# The actual value is stored separately in the secret version below.
# ---------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "app_config" {
  name        = "replate-ai/${var.environment}/config"
  description = "All application credentials and config for the ${var.environment} environment"

  # Prevent accidental deletion in production.
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "replate-ai"
  }
}

# ---------------------------------------------------------------------------
# Secret version — stores the actual credential values as a JSON blob.
# Terraform marks every sensitive variable as (sensitive value) in plan/apply
# output, so no plaintext ever appears in logs.
# ---------------------------------------------------------------------------
resource "aws_secretsmanager_secret_version" "app_config" {
  secret_id = aws_secretsmanager_secret.app_config.id

  secret_string = jsonencode({
    # Firebase
    FIREBASE_API_KEY             = var.firebase_api_key
    FIREBASE_AUTH_DOMAIN         = var.firebase_auth_domain
    FIREBASE_PROJECT_ID          = var.firebase_project_id
    FIREBASE_STORAGE_BUCKET      = var.firebase_storage_bucket
    FIREBASE_MESSAGING_SENDER_ID = var.firebase_messaging_sender_id
    FIREBASE_APP_ID              = var.firebase_app_id

    # AWS
    AWS_ACCESS_KEY_ID     = var.aws_access_key_id
    AWS_SECRET_ACCESS_KEY = var.aws_secret_access_key
    AWS_S3_BUCKET         = var.aws_s3_bucket
    AWS_REGION            = var.aws_region

    # Third-party APIs
    GOOGLE_VISION_API_KEY = var.google_vision_api_key
    SPOONACULAR_API_KEY   = var.spoonacular_api_key
    OPENAI_API_KEY        = var.openai_api_key
    INSTACART_API_KEY     = var.instacart_api_key

    # App
    NODE_ENV = var.node_env
    PORT     = var.port
  })
}
