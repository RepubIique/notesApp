# Deployment Guide - Discreet Chat

This guide covers deploying your discreet chat application to free hosting services.

## Quick Start - Recommended Setup

**Frontend:** Vercel (free forever)  
**Backend:** Render (free tier with 750 hours/month)  
**Database:** Supabase (already set up)

Total cost: **$0/month**

---

## Prerequisites

Before deploying, ensure you have:
- [x] GitHub account
- [x] Supabase project configured (already done)
- [x] Your code pushed to a GitHub repository

---

## Step 1: Push Code to GitHub

If you haven't already:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Discreet Chat"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Render

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (free)

### 2.2 Create New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name:** `discreet-chat-backend` (or your choice)
   - **Region:** Choose closest to you
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

### 2.3 Add Environment Variables
In the "Environment" section, add these variables:

```
PORT=3000
FRONTEND_URL=https://your-app.vercel.app
PASSWORD_A_HASH=$2b$10$LEkKXxamC.KDis6ApXqgEeFqCRebEBbjJfVJkUhgkF6DX2EqEKYrm
PASSWORD_B_HASH=$2b$10$kBEm3rGeGSrcaQ2bNHm50Oos/gYc/.7y4fW8AA9GWmrDzPasbLh9K
JWT_SECRET=your-production-jwt-secret-here
HASH_SALT=$2b$10$2yYPw234YEZDRD0xLx62Be
SUPABASE_URL=https://gztlgzjoqhkfuhdlhobg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

**Important:** 
- Generate a NEW JWT_SECRET for production:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'));"
  ```
- Update `FRONTEND_URL` after deploying frontend (Step 3)

### 2.4 Deploy
1. Click "Create Web Service"
2. Wait for deployment (3-5 minutes)
3. Copy your backend URL: `https://discreet-chat-backend.onrender.com`

**Note:** Free tier sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds.

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub (free)

### 3.2 Import Project
1. Click "Add New..." → "Project"
2. Import your GitHub repository
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 3.3 Add Environment Variables
In "Environment Variables" section:

```
VITE_API_URL=https://discreet-chat-backend.onrender.com
VITE_QUICK_EXIT_URL=https://www.google.com
```

Replace the backend URL with your actual Render URL from Step 2.4.

### 3.4 Deploy
1. Click "Deploy"
2. Wait for deployment (2-3 minutes)
3. Your app will be live at: `https://your-app.vercel.app`

### 3.5 Update Backend CORS
Go back to Render and update the `FRONTEND_URL` environment variable:
```
FRONTEND_URL=https://your-app.vercel.app
```

Then manually redeploy the backend service.

---

## Step 4: Custom Domain (Optional)

### Vercel Custom Domain (Free)
1. In Vercel project settings → Domains
2. Add your domain (e.g., `chat.yourdomain.com`)
3. Follow DNS configuration instructions
4. Vercel provides free SSL automatically

### Free Domain Options
If you don't have a domain:
- **Freenom:** Free domains (.tk, .ml, .ga, .cf, .gq)
- **Cloudflare Pages:** Free subdomain
- Use Vercel's provided subdomain (free)

---

## Alternative Deployment Options

### Option 2: Netlify + Railway

**Frontend on Netlify:**
1. Go to [netlify.com](https://netlify.com)
2. "Add new site" → "Import from Git"
3. Select repository
4. Configure:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables (same as Vercel)

**Backend on Railway:**
1. Go to [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. Select repository
4. Configure:
   - Root directory: `backend`
   - Start command: `npm start`
5. Add environment variables
6. Get $5 free credit/month (no sleep mode)

### Option 3: All-in-One with Fly.io

**Both Frontend & Backend on Fly.io:**
- Free tier: 3 shared VMs
- No sleep mode
- More complex setup but better performance

---

## Post-Deployment Checklist

- [ ] Backend is accessible at your Render URL
- [ ] Frontend is accessible at your Vercel URL
- [ ] Login works with both passwords
- [ ] Messages can be sent and received
- [ ] Images can be uploaded
- [ ] Reactions work
- [ ] Auto-lock works after 90 seconds
- [ ] CORS is configured correctly (no console errors)

---

## Troubleshooting

### Backend Issues

**"Application failed to respond"**
- Check Render logs for errors
- Verify all environment variables are set
- Ensure Supabase credentials are correct

**CORS errors in browser console**
- Verify `FRONTEND_URL` in backend matches your Vercel URL exactly
- Include protocol (https://) and no trailing slash

**"Cannot connect to backend"**
- Check if backend is sleeping (free tier)
- First request after sleep takes ~30 seconds
- Verify `VITE_API_URL` in frontend is correct

### Frontend Issues

**"Network Error" when logging in**
- Check browser console for CORS errors
- Verify backend URL is correct in environment variables
- Ensure backend is running (check Render dashboard)

**Images not loading**
- Verify Supabase Storage bucket is public or has correct policies
- Check browser console for 403 errors
- Ensure signed URLs are being generated correctly

### Database Issues

**"Failed to fetch messages"**
- Check Supabase dashboard for connection issues
- Verify service role key is correct
- Check if tables exist (run migrations)

---

## Monitoring & Maintenance

### Free Monitoring Tools
- **Render:** Built-in logs and metrics
- **Vercel:** Analytics dashboard
- **Supabase:** Database dashboard with query logs

### Keeping Backend Awake (Optional)
Free tier sleeps after 15 min. To keep it awake:

1. Use a free uptime monitor:
   - [UptimeRobot](https://uptimerobot.com) - Free, pings every 5 min
   - [Cron-job.org](https://cron-job.org) - Free scheduled requests

2. Configure to ping: `https://your-backend.onrender.com/api/auth/me`

**Note:** This uses your 750 free hours faster.

---

## Security Recommendations

### Production Security Checklist

- [ ] Use strong, unique JWT_SECRET (64+ characters)
- [ ] Use different passwords than development
- [ ] Enable Supabase Row Level Security (RLS)
- [ ] Set up Supabase backup policy
- [ ] Monitor Render logs for suspicious activity
- [ ] Rotate secrets every 90 days
- [ ] Use environment variables (never commit secrets)

### Supabase Security

1. Enable Row Level Security:
```sql
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
```

2. Create policies (optional, since using service role):
```sql
-- Allow service role full access
CREATE POLICY "Service role full access" ON messages
  FOR ALL USING (true);
```

---

## Cost Breakdown

### Free Tier Limits

**Vercel (Frontend):**
- ✅ Unlimited bandwidth
- ✅ 100 deployments/day
- ✅ Custom domain + SSL
- ✅ Global CDN

**Render (Backend):**
- ✅ 750 hours/month (enough for 1 service)
- ✅ 512 MB RAM
- ✅ Sleeps after 15 min inactivity
- ⚠️ Slower cold starts (~30 sec)

**Supabase (Database):**
- ✅ 500 MB database
- ✅ 1 GB file storage
- ✅ 2 GB bandwidth/month
- ✅ 50,000 monthly active users

**Total: $0/month** for moderate usage

### When to Upgrade

Consider paid plans when:
- Backend needs to stay awake 24/7 ($7/month Render)
- Need more than 2GB bandwidth (Supabase Pro $25/month)
- Need faster backend performance (Railway $5/month)

---

## Deployment Commands Reference

### Generate Production Secrets

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'));"

# Password Hashes
node -e "const bcrypt = require('bcrypt'); const salt = bcrypt.genSaltSync(10); console.log(bcrypt.hashSync('your_password', salt));"

# Hash Salt
node -e "console.log(require('bcrypt').genSaltSync(10));"
```

### Test Production Build Locally

```bash
# Backend
cd backend
npm install
npm start

# Frontend
cd frontend
npm install
npm run build
npm run preview
```

---

## Support & Resources

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **GitHub Issues:** Create issues in your repository

---

## Next Steps

After successful deployment:

1. **Test thoroughly** - Try all features in production
2. **Set up monitoring** - Use UptimeRobot for backend health
3. **Share the URL** - Give the Vercel URL to your users
4. **Document passwords** - Securely share Identity A and B passwords
5. **Plan backups** - Set up Supabase backup schedule

Your discreet chat is now live! 🎉
