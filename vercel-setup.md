# Vercel Deployment Setup Guide

## Quick Setup (5 minutes)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```
This will open your browser. Choose your login method (GitHub recommended).

### Step 3: Deploy from Command Line
```bash
cd C:\customer-portal
vercel
```

The CLI will ask you:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → No
- **Project name?** → customer-portal (or your choice)
- **Directory?** → ./ (press Enter)
- **Want to override settings?** → No

### Step 4: Add Environment Variables

After first deployment, add environment variables:

```bash
# Copy all variables from .env.local to Vercel
vercel env pull .env.vercel.local
```

Or add them via web UI: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

### Step 5: Deploy to Production
```bash
vercel --prod
```

---

## Environment Variables to Set in Vercel

Copy these from your `.env.local` file:

### Required Variables:
- `DATABASE_URL` - Your PostgreSQL connection string
- `SANMAR_FTP_HOST`
- `SANMAR_FTP_USERNAME`
- `SANMAR_FTP_PASSWORD`
- `SANMAR_FTP_REMOTE_DIR`
- `SSACTIVEWEAR_ACCOUNT_NUMBER`
- `SSACTIVEWEAR_API_KEY`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_DOMAIN`
- `AUTH0_SECRET`

### Optional (for monitoring):
- `LOGTAIL_SOURCE_TOKEN`
- `KV_REST_API_TOKEN`
- `KV_REST_API_URL`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

---

## Automatic Deployments

Once set up, Vercel will automatically deploy when you:
1. Push to `main` branch → Production deployment
2. Create a pull request → Preview deployment

---

## Useful Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# Open project in browser
vercel open

# List all deployments
vercel ls

# Set environment variable
vercel env add DATABASE_URL production
```

---

## Your GitHub Repository
https://github.com/huymai96/customer-portal

## Next Steps After Deployment

1. ✅ Run database migrations on production
   ```bash
   npx prisma migrate deploy
   ```

2. ✅ Sync SanMar catalog
   ```bash
   npx tsx scripts/sync-sanmar-full-catalog-ftp.ts
   ```

3. ✅ Set up cron jobs for inventory sync (in Vercel dashboard)

---

## Troubleshooting

**Build fails?**
- Check environment variables are set
- Check database is accessible from Vercel
- View logs: `vercel logs`

**Can't connect to database?**
- Make sure DATABASE_URL uses `?sslmode=require`
- Whitelist Vercel IPs in your database firewall

**Environment variables not loading?**
- Make sure they're set for "Production" environment
- Redeploy after adding variables

---

## Support

Need help? Check:
- Vercel Docs: https://vercel.com/docs
- Your deployments: https://vercel.com/dashboard

