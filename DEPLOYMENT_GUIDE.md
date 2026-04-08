# QuizApp — Complete DigitalOcean Deployment Guide
### For Beginners | GitHub Student Developer Pack

---

## What This Guide Covers

This guide will take your QuizApp (Next.js frontend + Node.js/Express backend + PostgreSQL database) from your local computer to a live URL on DigitalOcean — completely free using the GitHub Student Developer Pack ($200 credit).

**Your app stack:**
- **Frontend** → Next.js 14 (React, TypeScript, Tailwind CSS) — runs on port 3007
- **Backend** → Node.js + Express + Socket.IO — runs on port 5000
- **Database** → PostgreSQL

**What you'll end up with:**
- A live backend URL like: `https://api.yourquizapp.com` or `http://YOUR_IP:5000`
- A live frontend URL like: `https://yourquizapp.com`
- A managed PostgreSQL database in the cloud

---

## PHASE 0 — Get Your Free $200 DigitalOcean Credit

### Step 1: Get the GitHub Student Developer Pack

1. Go to **https://education.github.com/pack**
2. Click **"Get student benefits"**
3. Sign in with your GitHub account
4. Fill in your school details and upload your student ID or `.edu` email
5. Wait for approval (usually takes a few hours to 2 days)
6. Once approved, you will see DigitalOcean listed as a partner

### Step 2: Redeem DigitalOcean Credit

1. Go to **https://education.github.com/pack** after approval
2. Find **DigitalOcean** and click **"Get access"**
3. You will be redirected to DigitalOcean — create a free account
4. The **$200 credit for 60 days** will be automatically applied to your account
5. You WILL need to add a credit/debit card to verify, but you will NOT be charged as long as you use only the credit

---

## PHASE 1 — Set Up Your GitHub Repository

Before deploying, your code needs to be on GitHub.

### Step 1: Create a GitHub Repository

1. Go to **https://github.com** and sign in
2. Click the **"+"** icon at the top right → **"New repository"**
3. Name it `QuizApp` (or any name you like)
4. Choose **Private** (recommended — your `.env` files should NOT be public)
5. Do NOT check "Initialize with README"
6. Click **"Create repository"**

### Step 2: Push Your Code to GitHub

Open a terminal in `C:\Users\Himanshu Gupta\Desktop\QuizApp` and run these commands one by one:

```bash
# Initialize git in the root folder
git init

# Create a root-level .gitignore to protect sensitive files
# (see the .gitignore section below first)

# Add all files
git add .

# Make your first commit
git commit -m "Initial commit"

# Connect to your GitHub repo (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/QuizApp.git

# Push to GitHub
git push -u origin main
```

### Step 3: Create a Root .gitignore

Create a file called `.gitignore` in `C:\Users\Himanshu Gupta\Desktop\QuizApp\` (the root, not inside backend or frontend) with this content:

```
# Environment files — NEVER commit these
backend/.env
frontend/.env
frontend/.env.local
frontend/.env.production

# Dependencies — these are installed automatically
backend/node_modules/
frontend/node_modules/
frontend/.next/

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db
```

> **IMPORTANT:** Never push `.env` files to GitHub. They contain your database password and JWT secret.

---

## PHASE 2 — Create a DigitalOcean Droplet (Your Server)

A **Droplet** is just a virtual computer (server) in the cloud that runs 24/7.

### Step 1: Create the Droplet

1. Log in to **https://cloud.digitalocean.com**
2. Click **"Create"** in the top menu → **"Droplets"**
3. **Choose Region:** Select the region closest to your users (e.g., Bangalore for India)
4. **Choose an image:** Click **"Ubuntu"** → Select **Ubuntu 24.04 LTS x64**
5. **Choose Size:**
   - Click **"Basic"** (Shared CPU)
   - Choose the **$6/month** plan (1 GB RAM, 1 CPU, 25 GB SSD)
   - With your $200 credit this runs for many months free
6. **Choose Authentication:** Select **Password** (easier for beginners)
   - Set a strong root password and **save it somewhere safe**
7. **Hostname:** Name it `quizapp-server`
8. Click **"Create Droplet"**
9. Wait 1-2 minutes. You will get an **IP address** like `143.198.XX.XX` — **save this IP**

---

## PHASE 3 — Connect to Your Server

### Step 1: Open SSH (Secure Shell)

SSH lets you control your server from your terminal, like typing commands on a remote computer.

On Windows, open **PowerShell** and type:

```powershell
ssh root@YOUR_DROPLET_IP
```

Replace `YOUR_DROPLET_IP` with the actual IP from DigitalOcean (e.g., `ssh root@143.198.12.34`).

- Type `yes` when asked about fingerprint
- Enter the root password you set

You are now inside your server! The prompt will change to something like `root@quizapp-server:~#`

### Step 2: Update the Server

Run these commands to make sure the server is up to date:

```bash
apt update && apt upgrade -y
```

This may take 2-3 minutes.

---

## PHASE 4 — Install Required Software on the Server

### Step 1: Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

### Step 2: Install PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql   # auto-start on reboot
```

### Step 3: Install Git

```bash
apt install -y git
git --version
```

### Step 4: Install PM2 (Process Manager)

PM2 keeps your Node.js server running even after you close the terminal, and restarts it if it crashes.

```bash
npm install -g pm2
pm2 --version
```

### Step 5: Install Nginx (Web Server / Reverse Proxy)

Nginx will forward traffic from port 80 (normal web traffic) to your app ports.

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

---

## PHASE 5 — Set Up the PostgreSQL Database

### Step 1: Create Database and User

```bash
# Switch to the postgres system user
sudo -u postgres psql
```

You are now inside the PostgreSQL shell. Run these SQL commands:

```sql
-- Create a dedicated database user (replace 'your_strong_password' with a real password)
CREATE USER quizapp_user WITH PASSWORD 'your_strong_password';

-- Create the database
CREATE DATABASE quiz_db OWNER quizapp_user;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE quiz_db TO quizapp_user;

-- Exit
\q
```

### Step 2: Allow Password Authentication

```bash
nano /etc/postgresql/16/main/pg_hba.conf
```

> **Note:** The `16` in the path is the PostgreSQL version. Check your version with `psql --version` and adjust if different.

Find this line:
```
local   all             all                                     peer
```

Change it to:
```
local   all             all                                     md5
```

Save and exit: Press `Ctrl+X`, then `Y`, then `Enter`.

Restart PostgreSQL:
```bash
systemctl restart postgresql
```

---

## PHASE 6 — Deploy the Backend

### Step 1: Clone Your Repository

```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/QuizApp.git
cd QuizApp
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Create the Backend .env File

```bash
nano .env
```

Paste the following (fill in your actual values):

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=quiz_db
DATABASE_USER=quizapp_user
DATABASE_PASSWORD=your_strong_password

# Server Port
PORT=5000
NODE_ENV=production

# Frontend URL (for CORS) — your actual frontend domain or IP
FRONTEND_URL=http://YOUR_DROPLET_IP:3007

# JWT Configuration — use a long random string (keep the one you have or generate new)
JWT_SECRET=31c99d9a5493a46c70e799a817802f9e9bfacc7bd5c14b7e9e733825e30dbab1
JWT_EXPIRATION=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

Save: `Ctrl+X` → `Y` → `Enter`

### Step 4: Run Database Migrations

```bash
npm run migrate
```

You should see: `✓ Database migrations completed successfully`

### Step 5: Start Backend with PM2

```bash
pm2 start src/index.js --name "quizapp-backend"
pm2 save
pm2 startup
```

Copy and run the command PM2 shows after `pm2 startup` (it will look like `sudo env PATH=...`).

**Verify it's running:**
```bash
pm2 status
pm2 logs quizapp-backend
```

You should see `✓ Database connected successfully` and `Server running on port 5000`.

### Step 6: Open Port 5000 in Firewall

```bash
ufw allow 5000
ufw allow 22       # Keep SSH open!
ufw allow 80
ufw allow 443
ufw enable
```

---

## PHASE 7 — Deploy the Frontend

### Step 1: Install Frontend Dependencies

```bash
cd /var/www/QuizApp/frontend
npm install
```

### Step 2: Create the Frontend .env File

```bash
nano .env.production
```

Paste:

```env
NEXT_PUBLIC_API_URL=http://YOUR_DROPLET_IP:5000
NEXT_PUBLIC_SOCKET_URL=http://YOUR_DROPLET_IP:5000
```

Replace `YOUR_DROPLET_IP` with your actual IP (e.g., `http://143.198.12.34:5000`).

Save: `Ctrl+X` → `Y` → `Enter`

### Step 3: Build the Frontend

```bash
npm run build
```

This compiles your Next.js app for production. It will take 2-4 minutes. You should see output ending with something like `✓ Compiled successfully`.

### Step 4: Start Frontend with PM2

```bash
pm2 start npm --name "quizapp-frontend" -- start
pm2 save
```

### Step 5: Open Port 3007

```bash
ufw allow 3007
```

**Test it:** Open your browser and go to:
- `http://YOUR_DROPLET_IP:3007` → Should show your QuizApp homepage
- `http://YOUR_DROPLET_IP:5000/api/auth/login` → Should show a JSON error (that means backend is live)

---

## PHASE 8 — Set Up Nginx (Optional but Recommended)

This makes your app accessible on standard port 80 (users just type the IP, no `:3007` needed).

### Step 1: Create Nginx Configuration

```bash
nano /etc/nginx/sites-available/quizapp
```

Paste this:

```nginx
# Frontend
server {
    listen 80;
    server_name YOUR_DROPLET_IP;

    location / {
        proxy_pass http://localhost:3007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 5000;
    server_name YOUR_DROPLET_IP;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save: `Ctrl+X` → `Y` → `Enter`

### Step 2: Enable the Config

```bash
ln -s /etc/nginx/sites-available/quizapp /etc/nginx/sites-enabled/
nginx -t          # Test config — should say "syntax is ok"
systemctl reload nginx
```

Now your app is accessible at `http://YOUR_DROPLET_IP` (no port needed for the frontend).

---

## PHASE 9 — Add a Free Domain Name (Optional)

If you want `yourquizapp.com` instead of an IP address:

### Option A: Free subdomain via DigitalOcean
Not directly available, but you can use **Freenom** (free .tk/.ml domains) or **DuckDNS** (free subdomain).

### Option B: Free domain with GitHub Student Pack
The Student Pack includes a free `.me` domain from Namecheap for 1 year:
1. Go to https://education.github.com/pack
2. Find **Namecheap** and claim your free domain
3. In Namecheap DNS settings, add an **A Record** pointing to your Droplet IP
4. Update your Nginx config to use the domain name instead of the IP
5. Update `FRONTEND_URL` in backend `.env` and `NEXT_PUBLIC_API_URL` in frontend `.env.production`
6. Rebuild the frontend: `npm run build` and `pm2 restart quizapp-frontend`

---

## PHASE 10 — Add HTTPS/SSL (Free with Let's Encrypt)

Once you have a domain, add HTTPS so your site is secure (shows the padlock in the browser).

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get certificate (replace with your actual domain)
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renew (certificates expire every 90 days, this renews automatically)
crontab -e
```

Add this line to crontab:
```
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## PHASE 11 — Keeping Your App Updated

Whenever you make changes locally and push to GitHub, deploy them to the server:

```bash
# SSH into server
ssh root@YOUR_DROPLET_IP

# Go to project directory
cd /var/www/QuizApp

# Pull latest changes
git pull origin main

# Update backend (if backend changed)
cd backend
npm install
pm2 restart quizapp-backend

# Update frontend (if frontend changed)
cd ../frontend
npm install
npm run build
pm2 restart quizapp-frontend
```

---

## Useful Commands Reference

### PM2 (Process Manager)
```bash
pm2 status                          # See all running apps
pm2 logs quizapp-backend            # View backend logs
pm2 logs quizapp-frontend           # View frontend logs
pm2 restart quizapp-backend         # Restart backend
pm2 restart quizapp-frontend        # Restart frontend
pm2 stop quizapp-backend            # Stop backend
pm2 delete quizapp-backend          # Remove from PM2
```

### PostgreSQL
```bash
sudo -u postgres psql               # Enter PostgreSQL shell
\l                                  # List all databases
\c quiz_db                          # Connect to quiz_db
\dt                                 # List all tables
\q                                  # Quit
```

### Nginx
```bash
nginx -t                            # Test configuration
systemctl reload nginx              # Apply config changes
systemctl status nginx              # Check if running
cat /var/log/nginx/error.log        # View errors
```

### Firewall
```bash
ufw status                          # See open ports
ufw allow PORT_NUMBER               # Open a port
ufw deny PORT_NUMBER                # Close a port
```

---

## Troubleshooting Common Issues

### "Connection refused" when accessing the site
- Run `pm2 status` — check if both apps show `online`
- Run `ufw status` — make sure ports 80, 3007, 5000 are allowed
- Run `pm2 logs quizapp-backend` to see error messages

### "Database connection error"
- Make sure PostgreSQL is running: `systemctl status postgresql`
- Double-check the password in `/var/www/QuizApp/backend/.env`
- Verify the database exists: `sudo -u postgres psql -c "\l"`

### Frontend shows "CORS error" in browser
- Check that `FRONTEND_URL` in backend `.env` matches your actual frontend URL exactly
- Restart the backend: `pm2 restart quizapp-backend`

### "Cannot find module" errors
- Run `npm install` inside the correct folder (backend or frontend)

### Changes not showing after `git pull`
- Rebuild the frontend: `npm run build`
- Restart both services: `pm2 restart all`

---

## Cost Breakdown

| Resource | Plan | Monthly Cost | With $200 Credit |
|---|---|---|---|
| Droplet (1GB RAM) | Basic | $6/month | Free for ~33 months |
| Managed PostgreSQL (optional) | Starter | $15/month | Free for ~13 months |
| Domain via Namecheap (Student Pack) | .me domain | $0 first year | Free |
| SSL Certificate (Let's Encrypt) | - | $0 forever | Free |

> The setup in this guide uses PostgreSQL **on the same Droplet** (no extra cost). Managed database is optional.

---

## Architecture Overview

```
User's Browser
      |
      | HTTPS (port 443) or HTTP (port 80)
      |
   Nginx (reverse proxy)
      |
      |--- / ---------> Next.js Frontend (port 3007)
      |--- /api/ -----> Express Backend (port 5000)
      |--- /socket/ --> Socket.IO (port 5000)
      |
   PostgreSQL (port 5432, local only)
```

---

## Summary Checklist

- [ ] GitHub Student Developer Pack approved
- [ ] DigitalOcean $200 credit redeemed
- [ ] GitHub repository created and code pushed
- [ ] Droplet created (Ubuntu 24.04, $6/month)
- [ ] SSH into server works
- [ ] Node.js 20, PostgreSQL, Git, PM2, Nginx installed
- [ ] Database `quiz_db` and user created
- [ ] Backend `.env` configured with production values
- [ ] Backend running via PM2
- [ ] Frontend `.env.production` configured
- [ ] Frontend built and running via PM2
- [ ] Firewall ports opened (22, 80, 443, 3007, 5000)
- [ ] App accessible via browser at `http://YOUR_DROPLET_IP`
- [ ] (Optional) Domain name connected
- [ ] (Optional) HTTPS/SSL enabled
