# DevAshura Forge — AWS deploy (free-tier-friendly).
# Single EC2 (Caddy + Go under systemd) + RDS Postgres + Route53.
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Local state by default. For a real project, move this to an encrypted S3
  # backend + DynamoDB lock — state contains the generated DB password.
  # backend "s3" { ... }
}
