# Firebase Google Sign-in Setup Instructions

## Problem: "This domain is not authorized for Google Sign-in"

This error occurs because localhost is not added to Firebase's authorized domains for Google authentication.

## Solution: Add localhost to Firebase Console

### Step 1: Open Firebase Console
1. Go to https://console.firebase.google.com/
2. Click on your project: **internship-tracker-v01**

### Step 2: Navigate to Authentication Settings
1. In the left sidebar, click **Authentication**
2. Click on the **Settings** tab (gear icon)
3. Scroll down to **Authorized domains**

### Step 3: Add Required Domains
1. Click **Add domain**
2. Add the following domains one by one:
   - `localhost` (for local development)
   - `127.0.0.1` (alternative local address)
   - `fairulmuhammad.github.io` (for GitHub Pages production)
3. Click **Add** for each domain

### Step 4: Verify Your Authorized Domains List
Your authorized domains should include:
- `localhost`
- `127.0.0.1`
- `fairulmuhammad.github.io`
- Any other domains where you plan to host the app

### Step 5: Enable Google Sign-in (if not already enabled)
1. Go to **Authentication** → **Sign-in method** tab
2. Find **Google** in the list
3. Click on it
4. Toggle **Enable**
5. Add your email as **Project support email**
6. Click **Save**

### Step 6: Test
- Refresh your application
- Try Google Sign-in again

## Alternative Solution: Use 127.0.0.1
If localhost doesn't work, try accessing your app via:
- `http://127.0.0.1:8080` instead of `http://localhost:8080`

## Production Setup
For production on GitHub Pages, add:
- `fairulmuhammad.github.io` to authorized domains
