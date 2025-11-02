# 🚀 Deployment Fix Guide - CodeSync.AI

## Problem Identified
Login/Signup was failing due to **CORS misconfiguration** after deployment.

### Issues Fixed:
1. ❌ Backend CORS was set to `origin: "*"` with `credentials: false`
2. ❌ Frontend was using `withCredentials: true` (incompatible with `origin: "*"`)
3. ❌ Backend `.env` had `FRONTEND_URL=http://localhost:5173` instead of production URL
4. ❌ Browser was blocking requests with error: `(blocked:other)`

---

## ✅ Solutions Applied

### 1. Backend CORS Configuration Fixed
**File:** `backend/server.js`

**Changes Made:**
- ✅ Changed from wildcard `origin: "*"` to specific allowed origins
- ✅ Added proper origin validation function
- ✅ Enabled `credentials: true` for both Express CORS and Socket.IO
- ✅ Added support for multiple environments (localhost + production)

**New Configuration:**
```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'https://codesyncai.vercel.app'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow non-browser requests
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'development') {
      callback(null, true); // Allow all in development
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
```

### 2. Backend Environment Variables Updated
**File:** `backend/.env`

**Changes:**
```env
# OLD (Wrong for production)
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# NEW (Correct for production)
NODE_ENV=production
FRONTEND_URL=https://codesyncai.vercel.app
```

---

## 🔧 Render Deployment Setup

### Environment Variables Required on Render:

Go to your Render Dashboard → Service → Environment Variables and add:

```env
# Required Variables
NODE_ENV=production
FRONTEND_URL=https://codesyncai.vercel.app
PORT=5000
MONGODB_URI=mongodb+srv://hackerabhay007_db_user:Abh%40y%24oni007@cluster0.qwqlkbg.mongodb.net/collaborative-editor?retryWrites=true&w=majority&appName=Cluster0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Encryption Configuration
MASTER_KEY=your-master-encryption-key-32-chars-minimum-change-in-production

# LiveKit Configuration (Optional - for video calls)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# AI Provider API Keys (Optional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
GROQ_API_KEY=
```

### Render Build Settings:
- **Build Command:** `npm install`
- **Start Command:** `npm start` or `node server.js`
- **Environment:** Node
- **Branch:** main

---

## 🌐 Vercel Frontend Setup

### Environment Variables Required on Vercel:

Go to Vercel Dashboard → Project Settings → Environment Variables:

```env
# Backend API URL (Production)
VITE_API_URL=https://codesyncai.onrender.com
```

### Vercel Build Settings:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

---

## 📋 Deployment Checklist

### Backend (Render)
- [ ] Environment variables added to Render
- [ ] `NODE_ENV=production` set
- [ ] `FRONTEND_URL=https://codesyncai.vercel.app` set
- [ ] MongoDB connection string is correct
- [ ] JWT_SECRET and MASTER_KEY are secure (different from local)
- [ ] Redeploy backend on Render

### Frontend (Vercel)
- [ ] `VITE_API_URL=https://codesyncai.onrender.com` set
- [ ] Redeploy frontend on Vercel
- [ ] Clear browser cache and test

### Testing
- [ ] Test backend health: https://codesyncai.onrender.com/health
- [ ] Test signup on frontend
- [ ] Test login on frontend
- [ ] Check browser console for CORS errors
- [ ] Test Socket.IO connection
- [ ] Test real-time features

---

## 🔍 How to Verify Fix

### 1. Check Backend is Running
```bash
curl https://codesyncai.onrender.com/
# Should return: {"message":"🚀 Collaborative Code Editor Backend","status":"running",...}

curl https://codesyncai.onrender.com/health
# Should return: {"status":"ok","mongodb":"connected",...}
```

### 2. Test CORS from Frontend
Open browser console on https://codesyncai.vercel.app and run:
```javascript
fetch('https://codesyncai.onrender.com/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'test123'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### 3. Check Network Tab
- Should see status `200` or `401` (not `blocked:other`)
- Response headers should include: `Access-Control-Allow-Origin: https://codesyncai.vercel.app`
- Response headers should include: `Access-Control-Allow-Credentials: true`

---

## 🐛 Troubleshooting

### Issue: Still seeing CORS errors
**Solution:**
1. Verify environment variables are set correctly on Render
2. Trigger a manual redeploy on Render
3. Clear browser cache completely
4. Check Render logs for startup errors

### Issue: "Not allowed by CORS" error
**Solution:**
1. Verify `FRONTEND_URL` environment variable on Render
2. Check if frontend URL matches exactly (with/without trailing slash)
3. Ensure `NODE_ENV=production` is set

### Issue: MongoDB connection error
**Solution:**
1. Check if MongoDB Atlas allows connections from `0.0.0.0/0` (anywhere)
2. Verify MongoDB connection string is correct
3. Check Render logs: `View Logs` in Render dashboard

### Issue: 502 Bad Gateway
**Solution:**
1. Check if backend is starting correctly in Render logs
2. Verify `PORT` environment variable (should be `5000` or Render's assigned port)
3. Ensure start command is correct: `node server.js`

---

## 📝 Commands to Redeploy

### Redeploy Backend (from local)
```bash
cd backend
git add .
git commit -m "fix: Update CORS configuration for production"
git push origin main
```
Render will auto-deploy on push (if connected to GitHub).

### Redeploy Frontend (from local)
```bash
cd frontend-new
git add .
git commit -m "fix: Update API URL for production"
git push origin main
```
Vercel will auto-deploy on push (if connected to GitHub).

---

## ✨ What Changed Summary

| Component | Before | After |
|-----------|--------|-------|
| Backend CORS Origin | `*` (wildcard) | Specific URLs with validation |
| Backend Credentials | `false` | `true` |
| Backend FRONTEND_URL | `http://localhost:5173` | `https://codesyncai.vercel.app` |
| Backend NODE_ENV | `development` | `production` |
| Socket.IO CORS | `origin: "*", credentials: false` | Proper origin validation with `credentials: true` |

---

## 🎉 Expected Result

After applying these fixes:
1. ✅ Login/Signup will work from https://codesyncai.vercel.app
2. ✅ No CORS errors in browser console
3. ✅ Socket.IO connections will establish successfully
4. ✅ Real-time collaboration will work
5. ✅ API requests will include credentials properly

---

## 📞 Support

If issues persist:
1. Check browser console for detailed error messages
2. Check Render logs for backend errors
3. Verify all environment variables are set correctly
4. Ensure both frontend and backend are using latest deployed versions

**Deployed URLs:**
- Frontend: https://codesyncai.vercel.app
- Backend: https://codesyncai.onrender.com
