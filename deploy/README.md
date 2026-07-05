# Deploying DevAshura FΦrge to AWS (Terraform)

Free-tier-friendly, single-region deployment:

```
                         Route53 (your domain)
                                 │
                                 ▼
        ┌──────────────────────────────────────────┐
        │  EC2 t3.micro (Ubuntu 24.04)              │
        │                                            │
        │   Caddy :443  ──/api/*──►  Go API :4100   │
        │     │  (auto HTTPS)         (systemd)      │
        │     └──►  /var/www/forge  (built SPA)      │
        └───────────────────────┬────────────────────┘
                                 │ 5432 (private)
                                 ▼
                    RDS Postgres db.t4g.micro
```

- **One EC2 box** runs the Go binary under `systemd` with **Caddy** in front for
  automatic HTTPS. Caddy also serves the built React SPA, so the frontend and
  `/api` are **same-origin** — your session-cookie auth works with no CORS setup.
- **RDS Postgres** holds accounts, progress, and exam history.
- **SSM Parameter Store** holds all backend env vars (secrets encrypted). Secrets
  never touch Terraform state.
- **S3** stages the built binary + SPA; the box pulls them on each deploy.
- No Redis (the Go server's in-process cache covers a single instance).

## What's free vs not

| Resource | Free tier | After 12 months / credits |
|---|---|---|
| EC2 t3.micro (750 hrs/mo) | ✅ | ~$8/mo |
| RDS db.t4g.micro + 20 GB | ✅ | ~$13/mo |
| S3 / SSM / Route53 queries | ✅ (negligible) | pennies |
| Route53 hosted zone | ❌ | **$0.50/mo** |
| Domain registration | ❌ | ~$12/yr |

Data **egress** past 100 GB/mo bills, but demo traffic won't get near it.

---

## Prerequisites

- An **AWS account** with the AWS CLI configured (`aws configure`) — the IAM user
  needs permissions to create EC2/RDS/IAM/S3/SSM/Route53 resources and to call
  `ssm:SendCommand`.
- **Terraform** ≥ 1.5, **Go** 1.26+, **Node** 18+ on your PATH.
- A **domain** (register it in Route53 → *Registered domains*, or anywhere).

---

## One-time setup

### 1. Configure

```bash
cd deploy/terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars: set root_domain (and app_subdomain / OAuth client IDs)
```

### 2. Provision the infrastructure

```bash
terraform init
terraform apply
```

RDS takes ~5–10 minutes. When it finishes, note the outputs:

```bash
terraform output
```

### 3. Point your domain at Route53

Take `route53_name_servers` from the output and set them as your domain's name
servers (Route53 → *Registered domains* → your domain → *Edit name servers*, or
at your external registrar). DNS propagation can take a few minutes to a few
hours. Caddy will issue the HTTPS cert automatically once the domain resolves to
the server.

### 4. Set your real secrets in SSM

Terraform seeded placeholders; fill in the ones you have (skip any you don't —
the app falls back gracefully). Replace `<REGION>` with your region:

```bash
aws ssm put-parameter --overwrite --type SecureString --region <REGION> \
  --name /forge/GEMINI_API_KEY --value 'AQ...'

aws ssm put-parameter --overwrite --type SecureString --region <REGION> \
  --name /forge/GROQ_API_KEY --value 'gsk_...'

# Only if you enabled OAuth (client IDs go in terraform.tfvars):
aws ssm put-parameter --overwrite --type SecureString --region <REGION> \
  --name /forge/GOOGLE_OAUTH_CLIENT_SECRET --value '...'
aws ssm put-parameter --overwrite --type SecureString --region <REGION> \
  --name /forge/GITHUB_OAUTH_CLIENT_SECRET --value '...'

# Optional: password-reset emails (otherwise reset links log to the server).
aws ssm put-parameter --overwrite --type SecureString --region <REGION> \
  --name /forge/RESEND_API_KEY --value 're_...'
```

Parameters already managed for you: `DATABASE_URL`, `FRONTEND_URL`, the OAuth
redirect URLs, `GO_PORT`, and the session settings.

### 5. Build and deploy the app

From the **repo root**:

```powershell
# Windows (PowerShell)
.\deploy\build-and-push.ps1
```
```bash
# macOS / Linux / Git Bash
./deploy/build-and-push.sh
```

This builds the SPA + a static Linux Go binary, uploads them to S3, and tells the
instance (via SSM Run Command) to pull and restart. Visit `app_url`.

### 6. Wire up OAuth redirect URLs (if using OAuth)

In your Google Cloud / GitHub OAuth app settings, set the callback URL to match
your domain:

- Google: `https://<your-domain>/api/auth/oauth/google/callback`
  (and add `https://<your-domain>` to Authorized JavaScript origins)
- GitHub: `https://<your-domain>/api/auth/oauth/github/callback`

Email/password + guest login work without any of this.

---

## Day-2 operations

**Redeploy after code changes** — just rerun the build script:
```bash
./deploy/build-and-push.sh
```

**Change a config value** (e.g. session TTL): update the SSM param, then redeploy
(or trigger just an env refresh):
```bash
aws ssm put-parameter --overwrite --type String --region <REGION> \
  --name /forge/SESSION_TTL_HOURS --value '168'
aws ssm send-command --instance-ids <INSTANCE_ID> \
  --document-name AWS-RunShellScript \
  --parameters commands='/usr/local/bin/forge-deploy' --region <REGION>
```

**Shell into the box** (no SSH key needed — via Session Manager):
```bash
aws ssm start-session --target <INSTANCE_ID> --region <REGION>
```

**Logs:**
```bash
sudo journalctl -u forge -f          # Go API
sudo journalctl -u caddy -f          # Caddy / HTTPS
sudo cat /var/log/forge-userdata.log # first-boot provisioning
```

**Health check:** `https://<your-domain>/api/health` →
`{"ok":true,"db":"postgres","ai":true,...}`.

**Tear it all down:**
```bash
cd deploy/terraform
terraform destroy
```

---

## Notes & caveats

- **State holds the DB password.** Local `terraform.tfstate` is gitignored. For a
  team, switch to an encrypted S3 backend (stub in `versions.tf`).
- **First boot before the first build:** the site returns 404 and the API isn't
  up until step 5 pushes artifacts. That's expected.
- **`sslmode=require`** encrypts the DB connection but doesn't verify the RDS CA.
  For full verification, bundle the Amazon RDS CA and switch to `verify-full`.
- **Single instance = brief downtime** on redeploy (systemd restart, ~1s) and no
  HA. Fine for an MVP; scale to an ALB + Auto Scaling group later if needed.
- **Go 1.26** is required to build — the box never compiles anything; you
  cross-compile locally and ship the binary.
