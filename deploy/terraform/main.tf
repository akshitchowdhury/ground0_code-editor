provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Use the account's default VPC + subnets to stay simple and free (no NAT
# gateway, no custom networking to pay for).
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Latest Canonical Ubuntu 24.04 LTS AMI (amd64) for the region, via SSM.
data "aws_ssm_parameter" "ubuntu" {
  name = "/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id"
}

locals {
  name       = var.project
  app_domain = var.app_subdomain == "" ? var.root_domain : "${var.app_subdomain}.${var.root_domain}"
  ssm_path   = "/${var.project}"
}
