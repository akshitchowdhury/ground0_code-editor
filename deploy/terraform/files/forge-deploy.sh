#!/usr/bin/env bash
# Rebuilds the backend env from SSM, pulls the latest binary + SPA from S3, and
# restarts the API. Run on first boot (by cloud-init) and on every deploy (by
# the build script, via SSM Run Command). Idempotent.
set -euo pipefail

source /etc/forge/deploy.conf # REGION, ARTIFACTS_BUCKET, SSM_PATH, FORGE_DOMAIN

# 1) Render the systemd EnvironmentFile from SSM Parameter Store. Anything still
#    at the "__UNSET__" sentinel is skipped so the Go server sees it as absent.
tmp="$(mktemp)"
aws ssm get-parameters-by-path \
  --path "${SSM_PATH}/" --recursive --with-decryption \
  --region "${REGION}" --output json \
  | jq -r '.Parameters[] | select(.Value != "__UNSET__") | "\(.Name | split("/") | last)=\(.Value)"' \
  > "$tmp"
install -o forge -g forge -m 600 "$tmp" /etc/forge/forge.env
rm -f "$tmp"

# 2) Pull artifacts (no-op on the very first boot, before anything is pushed).
if aws s3 ls "s3://${ARTIFACTS_BUCKET}/goserver" --region "${REGION}" >/dev/null 2>&1; then
  aws s3 cp "s3://${ARTIFACTS_BUCKET}/goserver" /opt/forge/goserver.new --region "${REGION}"
  chmod +x /opt/forge/goserver.new
  chown forge:forge /opt/forge/goserver.new
  mv /opt/forge/goserver.new /opt/forge/goserver
fi

if aws s3 ls "s3://${ARTIFACTS_BUCKET}/dist/" --region "${REGION}" >/dev/null 2>&1; then
  aws s3 sync "s3://${ARTIFACTS_BUCKET}/dist" /var/www/forge --delete --region "${REGION}"
  chown -R forge:forge /var/www/forge
fi

# 3) Restart the API once a binary is actually present.
systemctl daemon-reload
if [ -x /opt/forge/goserver ]; then
  systemctl restart forge
  echo "forge-deploy: API restarted."
else
  echo "forge-deploy: no binary yet — push a build to start the API."
fi
