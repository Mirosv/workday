# WorkDay

Field service management platform — Node/Express + PostgreSQL + React, deployed via Portainer with Cloudflare Tunnel.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind, shadcn/ui |
| Backend | Node.js, Express, JWT auth |
| Database | PostgreSQL 16 |
| Tunnel | Cloudflare Tunnel (cloudflared) |
| Deploy | Portainer (git-based stack) |

---

## Cloudflare Tunnel Setup

No inbound firewall ports are required. Cloudflare Tunnel creates an outbound-only connection from the `cloudflared` container to Cloudflare's edge.

### 1 — Create the tunnel

1. Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com) → **Networks → Tunnels**
2. Click **Add a tunnel** → select **Cloudflared**
3. Name it `workday`
4. Copy the **tunnel token** shown during setup (starts with `eyJ...`)

### 2 — Configure the public hostname

In the tunnel's **Public Hostname** tab, add one entry:

| Field | Value |
|---|---|
| Subdomain | `app` (or your choice) |
| Domain | your Cloudflare-managed domain |
| Type | `HTTP` |
| URL | `workday_frontend:80` |

This routes `https://app.yourdomain.com` → `workday_frontend:80` inside the Docker network.
The Nginx inside `workday_frontend` already proxies `/api/*` → `workday_api:4000`, so no second entry is needed.

### 3 — Deploy via Portainer

**Portainer → Stacks → Add stack → Repository**

| Field | Value |
|---|---|
| Repository URL | `https://github.com/Mirosv/workday` |
| Reference | `refs/heads/main` |
| Compose path | `portainer-stack.yml` |

**Environment variables** (Portainer stack → Environment tab):

| Variable | How to generate | Required |
|---|---|---|
| `POSTGRES_PASSWORD` | `openssl rand -base64 24` | yes |
| `JWT_SECRET` | `openssl rand -hex 32` | yes |
| `SUPER_ADMIN_EMAIL` | your admin email address | yes |
| `TUNNEL_TOKEN` | token from Cloudflare step 1 | yes |
| `FRONTEND_URL` | `https://app.yourdomain.com` | yes |
| `STRIPE_SECRET_KEY` | Stripe dashboard | no |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard | no |
| `STRIPE_PRICE_PRO` | Stripe price ID | no |
| `STRIPE_PRICE_PREMIUM` | Stripe price ID | no |
| `PLAID_CLIENT_ID` | Plaid dashboard | no |
| `PLAID_SECRET` | Plaid dashboard | no |
| `PLAID_ENV` | `sandbox` or `production` | no |

Click **Deploy the stack**. Portainer clones the repo, builds the images, and starts all 4 containers.

### 4 — First login

Open `https://app.yourdomain.com/login`, register with `SUPER_ADMIN_EMAIL` — that account is automatically promoted to Super Admin.

---

## Network architecture

```
Internet
   │  HTTPS (port 443 — Cloudflare terminates TLS)
   ▼
Cloudflare Edge
   │  Encrypted outbound tunnel (no inbound ports on server)
   ▼
workday_cloudflared
   │  HTTP  workday_frontend:80  (Docker internal)
   ▼
workday_frontend  (Nginx — serves React SPA)
   │  /api/*  proxy_pass
   ▼
workday_api:4000  (Express + JWT)
   │  PGHOST / PGPASSWORD
   ▼
workday_db:5432  (PostgreSQL)
```

All traffic stays on the `workday_net` Docker bridge. Zero host ports exposed.

---

## Local development

```bash
# Clone
git clone https://github.com/Mirosv/workday && cd workday

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL or individual PG* vars
cd backend && npm install && npm run migrate && npm run dev

# Frontend (separate terminal)
cd ..
cp .env.example .env.local   # VITE_API_URL=http://localhost:4000
npm install && npm run dev
```

Vite proxies `/api/*` to `http://localhost:4000` in dev mode automatically.

---

## Updating the app

Push to `main`, then in Portainer:

**Stacks → workday → Pull and redeploy**
