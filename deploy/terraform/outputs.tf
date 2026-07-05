output "app_url" {
  description = "Where the app will be served once DNS + the first deploy are done."
  value       = "https://${local.app_domain}"
}

output "route53_name_servers" {
  description = "Set these as your domain's name servers (registrar or Route53 → Registered domains)."
  value       = aws_route53_zone.main.name_servers
}

output "server_ip" {
  description = "Elastic IP of the app instance."
  value       = aws_eip.app.public_ip
}

output "instance_id" {
  description = "EC2 instance id (used by the deploy script and SSM Session Manager)."
  value       = aws_instance.app.id
}

output "artifacts_bucket" {
  description = "S3 bucket the deploy script pushes the binary + SPA to."
  value       = aws_s3_bucket.artifacts.bucket
}

output "rds_endpoint" {
  description = "RDS Postgres endpoint (private — only the app instance can reach it)."
  value       = aws_db_instance.main.address
}

output "ssm_path" {
  description = "SSM Parameter Store path holding all backend env vars."
  value       = local.ssm_path
}

output "region" {
  value = var.region
}
