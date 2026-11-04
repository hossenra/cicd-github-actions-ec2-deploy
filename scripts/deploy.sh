#!/usr/bin/env bash
set -euo pipefail
cd /opt/cicd-demo/app
git fetch origin main
git checkout -B main origin/main
npm ci --omit=dev
sudo systemctl restart cicd-demo
sudo systemctl is-active --quiet cicd-demo
curl --fail --silent --show-error http://127.0.0.1:3000/health
printf '\nDeployment successful!\n'
