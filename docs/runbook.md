# LeadForge AI — Runbook

## 1. Fresh Deployment

### Start DEV

cd docker/dev
docker compose up -d

### Start QA

cd ../qa
docker compose up -d

### Start PROD

cd ../prod
docker compose up -d

---

## 2. Deploy Workflow Change

1. Make changes in DEV (n8n UI)
2. Export workflow:
   docker compose exec n8n n8n export:workflow --id=<ID> --output=/tmp/workflow.json
3. Copy to repo:
   docker cp n8n:/tmp/workflow.json ./workflows/
4. Commit & push:
   git add .
   git commit -m "update workflow"
   git push

→ GitHub Actions deploys to QA automatically

---

## 3. Promote to PROD

git tag v1.0.0
git push origin v1.0.0

→ triggers PROD deployment

---

## 4. Rollback

git revert <commit-id>
git push

---

## 5. Backup

docker compose exec n8n n8n export:workflow --all --output=/tmp/wf/
docker cp n8n:/tmp/wf/ ./backups/

---

## 6. Restore

Import workflows via n8n UI or API

---

## 7. Troubleshooting

* Check logs:
  docker compose logs -f
* Restart:
  docker compose restart
* Check ngrok:
  ngrok http 5679
