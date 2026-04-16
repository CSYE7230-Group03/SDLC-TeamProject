# Terraform — Secrets Manager

Provisions all application credentials as a single JSON secret in **AWS Secrets Manager** under the path `replate-ai/{environment}/config`.

No plaintext values ever appear in source control. Secrets are supplied at apply time via `terraform.tfvars` (local) or `TF_VAR_*` environment variables (CI/CD).

---

## Prerequisites

| Tool | Version |
|------|---------|
| Terraform | >= 1.3.0 |
| AWS CLI | >= 2.x |
| AWS credentials | IAM permissions for `secretsmanager:*` |

---

## Local usage

### 1. Initialise

```bash
cd infra/terraform/secrets
terraform init
```

### 2. Create your tfvars file

```bash
cp terraform.tfvars.example terraform.tfvars
```

Open `terraform.tfvars` and fill in every value. This file is listed in `.gitignore` and **must never be committed**.

### 3. Plan

```bash
terraform plan
```

All sensitive variables will appear as `(sensitive value)` in the output — no plaintext is logged.

### 4. Apply

```bash
terraform apply
```

Type `yes` when prompted. The secret `replate-ai/dev/config` will be created in AWS Secrets Manager.

### 5. Verify

```bash
# View outputs (ARN and name only — no secret values)
terraform output

# Retrieve the stored secret via the AWS CLI
aws secretsmanager get-secret-value \
  --secret-id replate-ai/dev/config \
  --query SecretString \
  --output text | jq .
```

---

## CI/CD usage (no tfvars file)

Export each variable as a `TF_VAR_` environment variable before running Terraform. Most CI platforms (GitHub Actions, CircleCI) support encrypted secret stores for this purpose.

```bash
export TF_VAR_firebase_api_key="$FIREBASE_API_KEY"
export TF_VAR_firebase_auth_domain="$FIREBASE_AUTH_DOMAIN"
export TF_VAR_firebase_project_id="$FIREBASE_PROJECT_ID"
export TF_VAR_firebase_storage_bucket="$FIREBASE_STORAGE_BUCKET"
export TF_VAR_firebase_messaging_sender_id="$FIREBASE_MESSAGING_SENDER_ID"
export TF_VAR_firebase_app_id="$FIREBASE_APP_ID"

export TF_VAR_aws_access_key_id="$APP_AWS_ACCESS_KEY_ID"
export TF_VAR_aws_secret_access_key="$APP_AWS_SECRET_ACCESS_KEY"
export TF_VAR_aws_s3_bucket="$AWS_S3_BUCKET"

export TF_VAR_google_vision_api_key="$GOOGLE_VISION_API_KEY"
export TF_VAR_spoonacular_api_key="$SPOONACULAR_API_KEY"
export TF_VAR_openai_api_key="$OPENAI_API_KEY"
export TF_VAR_instacart_api_key="$INSTACART_API_KEY"

export TF_VAR_environment="prod"
export TF_VAR_node_env="production"

terraform init
terraform apply -auto-approve
```

> **Note:** The `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` environment variables used by Terraform itself (to authenticate to AWS) are separate from the application credentials stored as `TF_VAR_aws_access_key_id` / `TF_VAR_aws_secret_access_key`.

---

## Deploying to a different environment

Pass the `environment` variable to create a parallel secret path:

```bash
terraform apply -var="environment=prod"
# Creates: replate-ai/prod/config
```

---

## Remote state (optional)

Uncomment and configure the `backend "s3"` block in `main.tf` to store Terraform state remotely. This is recommended for shared team or CI/CD workflows.

---

## Files

| File | Purpose |
|------|---------|
| `main.tf` | Provider, `aws_secretsmanager_secret`, `aws_secretsmanager_secret_version` |
| `variables.tf` | All variable declarations; credentials are `sensitive = true` |
| `outputs.tf` | Outputs only the secret ARN and name — never plaintext values |
| `terraform.tfvars.example` | Copy to `terraform.tfvars` and fill in real values |
| `terraform.tfvars` | **Local only — never commit. Listed in .gitignore.** |
