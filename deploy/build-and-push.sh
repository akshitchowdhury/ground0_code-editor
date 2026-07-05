#!/usr/bin/env bash
# Build the SPA + Go binary and deploy them to the running EC2 instance.
# Run from anywhere:  ./deploy/build-and-push.sh
# Requires: node, go (1.26+), aws CLI, terraform — all on PATH.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
tf_dir="$repo_root/deploy/terraform"
cd "$repo_root"

echo "==> Reading Terraform outputs..."
bucket="$(terraform -chdir="$tf_dir" output -raw artifacts_bucket)"
instance_id="$(terraform -chdir="$tf_dir" output -raw instance_id)"
region="$(terraform -chdir="$tf_dir" output -raw region)"

echo "==> Building the SPA (vite build)..."
npm run build

echo "==> Building the Go binary (linux/amd64)..."
mkdir -p "$repo_root/deploy/.artifacts"
( cd "$repo_root/go-server" && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 \
    go build -trimpath -ldflags "-s -w" -o "$repo_root/deploy/.artifacts/goserver" ./cmd/server )

echo "==> Uploading artifacts to s3://$bucket ..."
aws s3 cp "$repo_root/deploy/.artifacts/goserver" "s3://$bucket/goserver" --region "$region"
aws s3 sync "$repo_root/dist" "s3://$bucket/dist" --delete --region "$region"

echo "==> Triggering redeploy on $instance_id (SSM Run Command)..."
aws ssm send-command \
  --instance-ids "$instance_id" \
  --document-name "AWS-RunShellScript" \
  --comment "forge deploy" \
  --parameters commands='/usr/local/bin/forge-deploy' \
  --region "$region" >/dev/null

echo "==> Done. The API restarts in a few seconds at $(terraform -chdir="$tf_dir" output -raw app_url)"
