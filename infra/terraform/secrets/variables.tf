variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region where Secrets Manager resources are created"
  type        = string
  default     = "us-east-1"
}

variable "node_env" {
  description = "Node.js runtime environment (development, production)"
  type        = string
  default     = "development"
}

variable "port" {
  description = "Application server port"
  type        = string
  default     = "5050"
}

# ---------------------------------------------------------------------------
# Firebase
# ---------------------------------------------------------------------------

variable "firebase_api_key" {
  description = "Firebase Web API key"
  type        = string
  sensitive   = true
}

variable "firebase_auth_domain" {
  description = "Firebase Auth domain (e.g. project-id.firebaseapp.com)"
  type        = string
  sensitive   = true
}

variable "firebase_project_id" {
  description = "Firebase project ID"
  type        = string
  sensitive   = true
}

variable "firebase_storage_bucket" {
  description = "Firebase Storage bucket (e.g. project-id.appspot.com)"
  type        = string
  sensitive   = true
}

variable "firebase_messaging_sender_id" {
  description = "Firebase Cloud Messaging sender ID"
  type        = string
  sensitive   = true
}

variable "firebase_app_id" {
  description = "Firebase App ID"
  type        = string
  sensitive   = true
}

# ---------------------------------------------------------------------------
# AWS
# ---------------------------------------------------------------------------

variable "aws_access_key_id" {
  description = "AWS access key ID used by the application (not the Terraform caller)"
  type        = string
  sensitive   = true
}

variable "aws_secret_access_key" {
  description = "AWS secret access key used by the application (not the Terraform caller)"
  type        = string
  sensitive   = true
}

variable "aws_s3_bucket" {
  description = "Name of the S3 bucket used by the application"
  type        = string
  sensitive   = true
}

# ---------------------------------------------------------------------------
# Third-party APIs
# ---------------------------------------------------------------------------

variable "google_vision_api_key" {
  description = "Google Cloud Vision API key"
  type        = string
  sensitive   = true
}

variable "spoonacular_api_key" {
  description = "Spoonacular food API key"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "instacart_api_key" {
  description = "Instacart Developer Platform API key"
  type        = string
  sensitive   = true
}
