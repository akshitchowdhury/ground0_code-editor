# Build the SPA + Go binary and deploy them to the running EC2 instance.
# Run from the repo root:  .\deploy\build-and-push.ps1
# Requires: node, go (1.26+), aws CLI, terraform — all on PATH.
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
$tfDir = Join-Path $repoRoot "deploy\terraform"

Write-Host "==> Reading Terraform outputs..." -ForegroundColor Cyan
$bucket     = (terraform -chdir="$tfDir" output -raw artifacts_bucket)
$instanceId = (terraform -chdir="$tfDir" output -raw instance_id)
$region     = (terraform -chdir="$tfDir" output -raw region)

Write-Host "==> Building the SPA (vite build)..." -ForegroundColor Cyan
npm run build

Write-Host "==> Building the Go binary (linux/amd64)..." -ForegroundColor Cyan
$artifacts = Join-Path $repoRoot "deploy\.artifacts"
New-Item -ItemType Directory -Force -Path $artifacts | Out-Null
$env:GOOS = "linux"; $env:GOARCH = "amd64"; $env:CGO_ENABLED = "0"
try {
  Push-Location (Join-Path $repoRoot "go-server")
  go build -trimpath -ldflags "-s -w" -o (Join-Path $artifacts "goserver") ./cmd/server
} finally {
  Pop-Location
  Remove-Item Env:GOOS, Env:GOARCH, Env:CGO_ENABLED -ErrorAction SilentlyContinue
}

Write-Host "==> Uploading artifacts to s3://$bucket ..." -ForegroundColor Cyan
aws s3 cp (Join-Path $artifacts "goserver") "s3://$bucket/goserver" --region $region
aws s3 sync (Join-Path $repoRoot "dist") "s3://$bucket/dist" --delete --region $region

Write-Host "==> Triggering redeploy on $instanceId (SSM Run Command)..." -ForegroundColor Cyan
aws ssm send-command `
  --instance-ids $instanceId `
  --document-name "AWS-RunShellScript" `
  --comment "forge deploy" `
  --parameters commands='/usr/local/bin/forge-deploy' `
  --region $region | Out-Null

$appUrl = (terraform -chdir="$tfDir" output -raw app_url)
Write-Host "==> Done. The API restarts in a few seconds at $appUrl" -ForegroundColor Green
