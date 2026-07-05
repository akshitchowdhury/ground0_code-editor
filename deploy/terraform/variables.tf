variable "project" {
  description = "Short name used for resource names and the SSM parameter path (/<project>/...)."
  type        = string
  default     = "forge"
}

variable "region" {
  description = "AWS region. us-east-1 is cheapest and keeps everything in one place."
  type        = string
  default     = "us-east-1"
}

variable "root_domain" {
  description = "The domain you registered (the Route53 hosted zone), e.g. myforge.dev."
  type        = string
}

variable "app_subdomain" {
  description = "Subdomain to serve the app on. Empty string = serve on the apex (root_domain itself)."
  type        = string
  default     = ""
}

variable "instance_type" {
  description = "EC2 instance type. t3.micro is free-tier eligible (750 hrs/mo for 12 months)."
  type        = string
  default     = "t3.micro"
}

variable "db_instance_class" {
  description = "RDS instance class. db.t4g.micro is free-tier eligible."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_engine_version" {
  description = "Postgres major version for RDS."
  type        = string
  default     = "16"
}

variable "db_allocated_storage" {
  description = "RDS storage in GB. Free tier includes 20 GB."
  type        = number
  default     = 20
}

variable "ssh_allowed_cidr" {
  description = "CIDR allowed to SSH (port 22). Leave null to disable SSH entirely — use SSM Session Manager instead (enabled by default). Example: \"203.0.113.4/32\"."
  type        = string
  default     = null
}

variable "key_name" {
  description = "Name of an existing EC2 key pair for SSH. Optional — only needed if you set ssh_allowed_cidr and want key-based SSH."
  type        = string
  default     = null
}

# OAuth client IDs are not secret, so they live in tfvars. The matching
# *secrets* are set out-of-band in SSM (see README) so they never touch state.
variable "google_client_id" {
  description = "Google OAuth client ID (optional). Leave empty to disable Google sign-in."
  type        = string
  default     = ""
}

variable "github_client_id" {
  description = "GitHub OAuth client ID (optional). Leave empty to disable GitHub sign-in."
  type        = string
  default     = ""
}
