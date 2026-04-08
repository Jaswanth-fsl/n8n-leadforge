# LeadForge AI — Runbook

**Programme:** n8n for AI Solutions & Workflow Orchestration  
**Trainer:** Jai Singh | CloudThat  
**Author:** Jaswanth Bodlapati  
**Version:** 1.0 — April 2026

---

## Table of Contents

1. [Fresh Deployment](#1-fresh-deployment)
2. [Promoting a Workflow Change to PROD](#2-promoting-a-workflow-change-to-prod)
3. [Rolling Back a Failed PROD Deployment](#3-rolling-back-a-failed-prod-deployment)
4. [Restoring from Backup](#4-restoring-from-backup)
5. [Governance Note — RBAC (Community Edition)](#5-governance-note--rbac-community-edition)
6. [Audit Log Note (Community Edition)](#6-audit-log-note-community-edition)

---

## 1. Fresh Deployment

### Prerequisites
- Docker Desktop installed and running
- Node.js v18+ and npm installed
- PostgreSQL 17 installed locally
- Git repository cloned: `git clone https://github.com/Jaswanth-fsl/n8n-leadforge.git`
- `.env` file created in repo root (never committed — see template below)

### .env Template
```
N8N_ENCRYPTION_KEY=<32-char-random-string>
POSTGRES_HOST=host.docker.internal
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<your-postgres-password>
```

Generate encryption key:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

### Step 1 — Create PostgreSQL Databases
```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE n8n_dev;"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE n8n_qa;"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE n8n_prod;"
```

### Step 2 — Create the leads table in each database
```sql
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  score INTEGER,
  intent VARCHAR(50),
  company_size VARCHAR(50),
  summary TEXT,
  source VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
Run against n8n_dev, n8n_qa, and n8n_prod.

### Step 3 — Allow Docker to reach local PostgreSQL
Add to `pg_hba.conf`:
```
host    all    all    172.17.0.0/16    scram-sha-256
```
Restart PostgreSQL:
```powershell
Restart-Service postgresql-x64-17
```

### Step 4 — Start DEV
```powershell
cd docker\dev
docker compose --env-file ..\..\\.env up -d
cd ..\..
```
Verify: `curl http://localhost:5678/healthz` → `{"status":"ok"}`

### Step 5 — Start QA
```powershell
cd docker\qa
docker compose --env-file ..\..\\.env up -d
cd ..\..
```
Verify: `curl http://localhost:5679/healthz` → `{"status":"ok"}`

### Step 6 — Start PROD (Queue Mode)
```powershell
cd docker\prod
docker compose --env-file ..\..\\.env up -d
cd ..\..
```
Verify: `curl http://localhost:5680/healthz` → `{"status":"ok"}`

### Step 7 — Install Custom Node on DEV
```powershell
cd custom-nodes\n8n-nodes-leadforge
npm install
npm run build
```
Restart DEV container so it picks up the custom node.

### Step 8 — Import Workflows into DEV
In n8n UI (http://localhost:5678):
- Workflows → Import from file
- Import in this order: W2, W3, W1, W4, W5

### Step 9 — Create Credentials in DEV
| Name | Type | Details |
|---|---|---|
| LeadForge PostgreSQL | Postgres | host.docker.internal:5432, db: n8n_dev |
| LeadForge OpenAI | HTTP Header Auth | Authorization: Bearer sk-... |
| LeadForge Slack | HTTP Header Auth | webhookUrl: https://hooks.slack.com/... |
| LeadForge SMTP | SMTP | smtp.gmail.com:465, Gmail App Password |

### Step 10 — Activate all workflows
Toggle each workflow to **Active** in the n8n UI.

### Step 11 — Smoke test
```powershell
curl -X POST http://localhost:5678/webhook-test/leads `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"priya.sharma@techcorp.in\",\"first_name\":\"Priya\",\"last_name\":\"Sharma\",\"company\":\"TechCorp India\",\"message\":\"Evaluating automation for 500-person team.\",\"source\":\"website-contact-form\"}'
```
Expected: `{"status":"accepted","score":>70}`

---

## 2. Promoting a Workflow Change to PROD

### Step 1 — Make changes on DEV
Edit the workflow in n8n DEV UI (http://localhost:5678). Test thoroughly with Appendix A payloads.

### Step 2 — Export the changed workflow
```powershell
# Get workflow ID from n8n UI URL e.g. /workflow/12
docker exec <dev-container> n8n export:workflow --id=<ID> --output=/tmp/<name>.json
docker cp <dev-container>:/tmp/<name>.json workflows\<name>.json
```

### Step 3 — Commit to feature branch
```powershell
git checkout -b feature/update-<workflow-name>
git add workflows\<name>.json
git commit -m "feat: update <workflow-name> — <description>"
git push origin feature/update-<workflow-name>
```

### Step 4 — Raise Pull Request
- Go to GitHub → New Pull Request → base: main ← compare: feature branch
- Add description of changes
- Request review

### Step 5 — Merge triggers QA deploy
GitHub Actions `deploy-n8n.yml` automatically:
- Runs JSON lint check (validate job)
- Imports workflow into QA via API
- Runs `/healthz` smoke test on QA

### Step 6 — Verify on QA
```powershell
curl http://localhost:5679/healthz
curl -X POST http://localhost:5679/webhook-test/leads ...
```

### Step 7 — Tag for PROD release
```powershell
git tag v1.0.1
git push origin v1.0.1
```
GitHub Actions deploys to PROD after manual approval in GitHub Environments.

### Step 8 — Verify on PROD
```powershell
curl http://localhost:5680/healthz
curl http://localhost:5680/webhook/leads/summary
```

---

## 3. Rolling Back a Failed PROD Deployment

### Option A — Roll back via git tag (recommended)

### Step 1 — Identify last good tag
```powershell
git tag --sort=-creatordate | Select-Object -First 5
```

### Step 2 — Check out last good workflows
```powershell
git checkout v1.0.0 -- workflows\
```

### Step 3 — Re-import to PROD via API
```powershell
curl -sX POST http://localhost:5680/api/v1/workflows/import `
  -H "X-N8N-API-KEY: <prod-api-key>" `
  -H "Content-Type: application/json" `
  -d @workflows\<name>.json
```

### Step 4 — Verify rollback
```powershell
curl http://localhost:5680/healthz
curl http://localhost:5680/webhook/leads/summary
```

### Step 5 — Commit the rollback
```powershell
git checkout main
git revert HEAD --no-edit
git push origin main
```

### Option B — Restore PROD from backup (full rollback)
See Section 4 below.

---

## 4. Restoring from Backup

### Step 1 — Locate the backup archive
```powershell
dir backups\leadforge-backup-*.tar.gz
```

### Step 2 — Extract the archive
```powershell
# Create restore temp folder
New-Item -ItemType Directory -Force -Path backups\restore-temp

# Extract
tar -xzf backups\leadforge-backup-2026-04-08.tar.gz -C backups\restore-temp
dir backups\restore-temp
```
You should see: `db.sql` and workflow JSON files.

### Step 3 — Restore PostgreSQL database
```powershell
# Drop and recreate the database
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS n8n_dev;"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE n8n_dev;"

# Restore from dump
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d n8n_dev -f backups\restore-temp\db.sql
```

### Step 4 — Verify database restored
```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d n8n_dev -c "SELECT COUNT(*) FROM leads;"
```

### Step 5 — Re-import workflows into n8n
In n8n UI → Workflows → Import from file → import each JSON from `backups\restore-temp\`.

Or via API:
```powershell
curl -sX POST http://localhost:5678/api/v1/workflows/import `
  -H "X-N8N-API-KEY: <api-key>" `
  -H "Content-Type: application/json" `
  -d @backups\restore-temp\W1_lead-intake.json
```

### Step 6 — Re-activate workflows
Toggle each workflow to Active in the n8n UI.

### Step 7 — Smoke test after restore
```powershell
curl http://localhost:5678/healthz
curl http://localhost:5678/webhook/leads/summary
```

### Step 8 — Clean up temp folder
```powershell
Remove-Item -Recurse -Force backups\restore-temp
```

---

## 5. Governance Note — RBAC (Community Edition)

LeadForge AI runs on n8n Community Edition which does not support Role-Based Access Control (RBAC). The following documents the RBAC configuration that **would** be applied on an Enterprise-licensed instance.

### Intended RBAC Configuration

| Role | Scope | Permissions |
|---|---|---|
| Owner | All workflows | Full access — create, edit, delete, execute |
| Admin | All workflows | Edit and execute — cannot manage users |
| Project Viewer | lead-intake project | Read-only — can view executions, cannot edit workflows |
| Member | Assigned workflows only | Execute only — cannot edit or export |

### Why this configuration
- **Project Viewer** on `lead-intake` ensures that non-engineering stakeholders (e.g. sales ops) can monitor lead processing without accidentally modifying the webhook or routing logic.
- **Member** role on W4 (monitoring) allows ops team to trigger the summary endpoint without access to AI enrichment credentials.
- Credentials are scoped per project — the `LeadForge OpenAI` credential would be visible only to workflows in the leadforge project, not globally.

### On Community Edition
- All users with login access have full admin rights.
- Mitigation: restrict n8n instance access to VPN/internal network only.
- Only one owner account is active on the DEV instance.

---

## 6. Audit Log Note (Community Edition)

n8n Community Edition does not support audit log export. On an Enterprise-licensed instance, the audit log would be exported as follows:

```powershell
curl -sX GET http://localhost:5678/api/v1/audit `
  -H "X-N8N-API-KEY: <api-key>" `
  > audit-log.json
```

The audit log would capture: user logins, workflow edits, credential access, execution history, and API key usage.

On Community Edition this deliverable is not available. Execution history is available in the n8n UI under **Executions** and provides partial observability for workflow runs.

---

*LeadForge AI | CloudThat | n8n for AI Solutions & Workflow Orchestration — Day 10 Capstone*