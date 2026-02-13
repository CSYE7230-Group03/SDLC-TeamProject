output "secret_arn" {
  description = "ARN of the Secrets Manager secret for the application config"
  value       = aws_secretsmanager_secret.app_config.arn
}

output "secret_name" {
  description = "Name of the Secrets Manager secret (e.g. replate-ai/dev/config)"
  value       = aws_secretsmanager_secret.app_config.name
}
