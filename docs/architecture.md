# Architecture Diagram

## Components

* Webhook (Lead Intake)
* n8n Workflows (W1–W5)
* OpenAI (AI enrichment)
* PostgreSQL (data storage)
* Slack (notifications)
* SMTP (email)
* GitHub Actions (CI/CD)

## Flow

1. Lead enters via webhook
2. W1 processes input
3. LeadForge node sanitises data
4. W2 enriches via OpenAI
5. Data stored in PostgreSQL
6. W3 routes:

   * High score → Slack
   * Low score → nurture
7. Email sent to lead
8. W4 provides monitoring endpoint
9. W5 sends daily report

## Environments

* DEV → localhost:5678
* QA → localhost:5679 (ngrok exposed)
* PROD → localhost:5680 (queue mode)

## Deployment Flow

DEV → Git push → QA → Tag → PROD
