# 🚀 Frontend Deployment Guide (Vercel)

## ✅ Step 1: Pre-deployment Checklist

### Package.json Scripts ✓
Your `package.json` already has the correct scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### Environment Variables ✓
The `.env` file is configured with:
```
VITE_API_URL=http://localhost:5000
```

## 📝 Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Website

1. **Go to Vercel**
   - Visit: https://vercel.com
   - Sign in with your GitHub account

2. **Import Project**
   - Click "Add New Project"
   - Import your Git repository
   - Select the `frontend-new` folder as the root directory

3. **Configure Build Settings**
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend-new`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **Set Environment Variables**
   - Go to "Environment Variables" section
   - Add:
     ```
     VITE_API_URL=http://localhost:5000
     ```
   - **IMPORTANT:** After deploying backend to Render, update this to:
     ```
     VITE_API_URL=https://your-backend-name.onrender.com
     ```

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete

### Option B: Deploy via Vercel CLI

```powershell
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend directory
cd "c:\Users\yuvra\Downloads\Testing 2 - Copy\New Project\frontend-new"

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

## 🔄 Step 3: Update Environment Variables After Backend Deployment

Once you deploy your backend to Render:

1. Go to your Vercel project dashboard
2. Navigate to **Settings > Environment Variables**
3. Update `VITE_API_URL` to your Render backend URL:
   ```
   VITE_API_URL=https://your-backend-name.onrender.com
   ```
4. **Redeploy** the frontend to apply the changes

## 🧪 Step 4: Test Your Deployment

After deployment, test:

1. ✅ Registration/Login works
2. ✅ Dashboard loads correctly
3. ✅ Project creation works
4. ✅ Real-time collaboration features work
5. ✅ File explorer functions properly
6. ✅ AI features connect correctly
7. ✅ Video/Audio calls work (if applicable)

## 📋 Environment Variable Reference

### Local Development (.env)
```
VITE_API_URL=http://localhost:5000
```

### Production (Vercel Dashboard)
```
VITE_API_URL=https://your-backend-name.onrender.com
```

## 🎯 Key Files Already Configured

✓ `package.json` - Has correct build scripts
✓ `.env` - Environment variables setup
✓ `.env.example` - Template for reference
✓ All API calls use `VITE_API_URL` environment variable
✓ Socket.io connections use environment variable
✓ Profile avatar URLs use environment variable

## 🔧 Troubleshooting

### Build Fails
- Check Node version compatibility
- Run `npm install` locally first
- Check for any TypeScript/ESLint errors

### API Connection Issues
- Verify `VITE_API_URL` is set correctly
- Check browser console for CORS errors
- Ensure backend is deployed and running

### Environment Variables Not Working
- Remember: Vite env vars must start with `VITE_`
- Redeploy after changing environment variables
- Clear cache and hard reload browser

## 🎉 Next Steps

1. Deploy frontend to Vercel ✓
2. Deploy backend to Render (separate guide)
3. Update `VITE_API_URL` in Vercel
4. Test the complete application
5. Share your live URL! 🚀

---

**Note:** Keep your `.env` file secure and never commit it to Git. Use `.env.example` for sharing configuration templates.
