# CI/CD Teaching Demo — GitHub Actions → EC2

A tiny dependency-free JavaScript/Node.js website, with **two parallel CI jobs** (basic dependency-free lint and Node built-in tests), followed by **EC2 deployment only when both pass**. No Docker, database, or Nginx needed.

## 1. Run locally (Node.js 22+)

```bash
npm ci
npm run lint
npm test
npm start
```

Open http://localhost:3000 and http://localhost:3000/health. Press Ctrl+C to stop.

## 2. Push to GitHub

Create a GitHub repository, then from this project folder:

```bash
git init
git add .
git commit -m "Initial CI/CD demo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

The workflow `.github/workflows/ci-cd.yml` starts on pushes and pull requests targeting `main`. Pull requests run CI only; pushes to main run CI then deployment. The first push will show a deploy failure until EC2 and GitHub secrets are configured.

## 3. Launch EC2 (Ubuntu 24.04)

- Use an Ubuntu 24.04 EC2 instance with a public IP.
- EC2 security group inbound: TCP **22** for SSH (restrict to the appropriate GitHub Actions runner egress IP ranges or use a self-hosted runner / alternative secure access; GitHub-hosted runners do not have a single stable IP), and TCP **3000** from your own IP for the classroom demo. Avoid opening SSH to the world.
- Download your EC2 key pair `.pem` securely; never commit it to Git.
- Connect from your machine:

```bash
chmod 400 YOUR_KEY.pem
ssh -i YOUR_KEY.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

## 4. Install Node.js, Git, and app on EC2

Run on EC2:

```bash
sudo apt-get update
sudo apt-get install -y git curl ca-certificates
# Node.js 22 from NodeSource (inspect third-party installation scripts before using):
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
sudo -E bash /tmp/nodesource_setup.sh
sudo apt-get install -y nodejs
node --version
sudo mkdir -p /opt/cicd-demo
sudo chown -R ubuntu:ubuntu /opt/cicd-demo
cd /opt/cicd-demo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git app
cd app
npm ci --omit=dev
sudo cp scripts/cicd-demo.service /etc/systemd/system/cicd-demo.service
sudo systemctl daemon-reload
sudo systemctl enable --now cicd-demo
curl http://127.0.0.1:3000/health
```

For a **private** GitHub repository, configure a read-only deploy key or other Git authentication on EC2 before cloning; a public teaching repository avoids this step.

## 5. Set up deployment script and restricted sudo on EC2

On EC2:

```bash
sudo cp /opt/cicd-demo/app/scripts/deploy.sh /opt/cicd-demo/deploy.sh
sudo chmod 755 /opt/cicd-demo/deploy.sh
sudo visudo -f /etc/sudoers.d/cicd-demo
```

Inside the editor, add exactly:

```
ubuntu ALL=(root) NOPASSWD: /usr/bin/systemctl restart cicd-demo, /usr/bin/systemctl is-active --quiet cicd-demo
```

Save and exit. Confirm the `systemctl` path with `command -v systemctl` and adjust if different. The deploy script is in `/opt/cicd-demo/deploy.sh` so it is not overwritten by `git` operations.

## 6. Add GitHub Actions secrets

Go to **GitHub repository → Settings → Secrets and variables → Actions → New repository secret**. Add:

| Secret | Value |
|---|---|
| `EC2_HOST` | EC2 public IP or DNS |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Full contents of your EC2 private SSH key, including BEGIN/END lines |
| `EC2_HOST_KEY` | Verified SSH host key line for the EC2 instance, e.g. `YOUR_EC2_PUBLIC_IP ssh-ed25519 AAAA...` |

For `EC2_HOST_KEY`, obtain the host public key **on EC2** with `sudo cat /etc/ssh/ssh_host_ed25519_key.pub`, then prepend your EC2 public IP or DNS followed by a space. Verify it through your trusted EC2 session. Do **not** blindly trust a key obtained via `ssh-keyscan` from an untrusted network.

Create a GitHub **production** environment under Settings → Environments if your repository requires it; optionally require approval. The workflow uses `environment: production`.

**Important SSH networking note:** GitHub-hosted runners have changing outbound IPs. For a simple classroom demo, use a dedicated self-hosted runner with a fixed IP or an appropriately secured access path for SSH. Temporarily opening SSH broadly is risky and should not be used for production. You can also switch to AWS Systems Manager for production-grade deployments.

## 7. Trigger deployment

Change the heading in `src/app.js`, then:

```bash
git add .
git commit -m "Update home page"
git push origin main
```

Open GitHub → **Actions**. You should see `lint` and `test` run, then `deploy`. Once successful, open `http://YOUR_EC2_PUBLIC_IP:3000` (if the security group allows your IP).

## 8. Teach a failing pipeline

**Lint failure:** In `src/app.js`, add an unused variable inside `greet`, e.g. `const unused = 1;`. Push to `main`. The demo linter fails, and `deploy` is skipped. Remove it to fix.

**Test failure:** In `src/app.js`, change `CI/CD deployment is working.` to `CI/CD deployment is broken.`. The greeting test fails and `deploy` is skipped. Restore it and push again.

For safer classroom practice, create a feature branch and open a pull request to `main` first; CI runs without deploying. Merge only after checks pass.

## Pipeline

```text
Developer pushes to main
          |
          v
    GitHub Actions
       /       \
    Lint       Tests
       \       /
        both pass?
       /       \
      no       yes
      |         |
    STOP    SSH to EC2
                |
           git fetch/reset
                |
             npm ci
                |
        systemctl restart
                |
          /health check
```

## Troubleshooting

- **`npm ci` fails:** ensure `package-lock.json` is committed; run `npm install` locally and commit the lockfile if missing.
- **SSH timeout:** check security group, route, instance public IP and runner-to-EC2 connectivity.
- **Host key error:** check `EC2_HOST_KEY` matches the instance's verified host key and the same hostname/IP used by `EC2_HOST`.
- **Permission denied:** check private key, `ubuntu` user, and sudoers configuration.
- **Service not running:** `sudo systemctl status cicd-demo` and `sudo journalctl -u cicd-demo -n 50 --no-pager`.
- **App not reachable:** test `curl localhost:3000/health` on EC2; verify security group inbound TCP 3000.

> This is an educational deployment demo. For production, prefer an artifact-based deployment, hardened access via OIDC/SSM, HTTPS through a reverse proxy, rollback and smoke tests.

**Note:** The demo linter uses `node --check` and a simple unused-variable rule rather than full ESLint. This keeps setup fully dependency-free. For production use, replace it with ESLint.
