# All backend env vars live in SSM Parameter Store under /<project>/. The
# instance renders them into the systemd EnvironmentFile on every deploy, so
# changing config = update the param + re-run the deploy (no instance rebuild).
#
# Anything left at the sentinel "__UNSET__" is filtered out by the deploy
# script, so the Go server treats it as absent and uses its offline fallback.

locals {
  # Secrets you provide out-of-band via `aws ssm put-parameter --overwrite`.
  secret_params = [
    "GEMINI_API_KEY",
    "GROQ_API_KEY",
    "ANTHROPIC_API_KEY",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "GITHUB_OAUTH_CLIENT_SECRET",
    "RESEND_API_KEY",
  ]

  # Non-secret config derived from your inputs / the domain.
  config_params = {
    GO_PORT             = "4100"
    SESSION_COOKIE_NAME = "g0_session"
    SESSION_TTL_HOURS   = "720"
    FRONTEND_URL        = "https://${local.app_domain}"

    GOOGLE_OAUTH_REDIRECT_URL = "https://${local.app_domain}/api/auth/oauth/google/callback"
    GITHUB_OAUTH_REDIRECT_URL = "https://${local.app_domain}/api/auth/oauth/github/callback"

    GOOGLE_OAUTH_CLIENT_ID = var.google_client_id != "" ? var.google_client_id : "__UNSET__"
    GITHUB_OAUTH_CLIENT_ID = var.github_client_id != "" ? var.github_client_id : "__UNSET__"
  }
}

resource "aws_ssm_parameter" "secret" {
  for_each = toset(local.secret_params)
  name     = "${local.ssm_path}/${each.value}"
  type     = "SecureString"
  value    = "__UNSET__"

  # Terraform only seeds the placeholder; you set the real value out-of-band.
  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "config" {
  for_each = local.config_params
  name     = "${local.ssm_path}/${each.key}"
  type     = "String"
  value    = each.value
}

# Composed from the RDS endpoint + generated password. sslmode=require encrypts
# the connection (RDS presents an Amazon-signed cert).
resource "aws_ssm_parameter" "database_url" {
  name  = "${local.ssm_path}/DATABASE_URL"
  type  = "SecureString"
  value = "postgres://${aws_db_instance.main.username}:${random_password.db.result}@${aws_db_instance.main.address}:5432/${aws_db_instance.main.db_name}?sslmode=require"
}
