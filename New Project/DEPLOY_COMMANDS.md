# 🚀 DEPLOYMENT COMMANDS

## ✅ Changes Ready to Deploy:

### Files Modified:
- ✅ `backend/server.js` - CORS configuration updated
- ✅ `frontend-new/.env` - HTTPS backend URL (already set)

---

## 📤 Git Commands to Deploy:

### Step 1: Check Status
```powershell
git status
```

### Step 2: Add Changes
```powershell
git add backend/server.js
git add frontend-new/.env
```

### Step 3: Commit Changes
```powershell
git commit -m "Fix CORS for Vercel deployment - Add production URL"
```

### Step 4: Push to GitHub
```powershell
git push origin main
```

---

## ⏳ Auto-Deployment:

### Render (Backend):
- ✅ Will automatically detect changes
- ✅ Will redeploy backend
- ⏱️ Takes ~2-3 minutes

### Vercel (Frontend):
- ✅ Already configured
- ⏱️ No action needed (unless you want to redeploy)

---

## 🧪 Test After Deployment:

### 1. Check Backend Health:
```powershell
curl https://codesyncai.onrender.com/health
```

### 2. Open Frontend:
```
https://codesyncai.vercel.app
```

### 3. Verify:
- [ ] Login works
- [ ] No CORS errors in console
- [ ] Dashboard loads
- [ ] Real-time features work

---

## 🔧 Quick Deploy Script:

Copy and paste this in PowerShell:

```powershell
# Navigate to project root
cd "C:\Users\yuvra\Downloads\Testing 2 - Copy"

# Add and commit changes
git add .
git commit -m "Fix CORS for production - Add Vercel URL to backend"

# Push to GitHub
git push origin main

# Verify push
git log -1
```

---

## ✅ All Set!

Run the commands above to deploy your fixes! 🚀
