# Firestore Permissions Setup Guide

## Problem: "Missing or insufficient permissions"

This error occurs when Firestore security rules don't allow the current user to read/write data.

## Solution: Configure Firestore Security Rules

### Step 1: Open Firebase Console
1. Go to https://console.firebase.google.com/
2. Select your project: **internship-tracker-v01**

### Step 2: Configure Firestore Rules
1. In the left sidebar, click **Firestore Database**
2. Click on the **Rules** tab
3. You'll see the current rules (probably very restrictive)

### Step 3: Update Rules
1. Replace the existing rules with these rules (supports both Google Sign-in and Anonymous users):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users (both Google and Anonymous) to access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Allow users to manage their own memos
      match /memos/{memoId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Legacy support for existing artifacts structure (if needed)
    match /artifacts/{appId}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 4: Publish Rules
1. Click **Publish** button
2. Wait for the rules to deploy (usually takes a few seconds)

### Step 5: Test
1. Refresh your application
2. Try creating a memo again
3. The permission error should be resolved

## Alternative Quick Fix (for testing only)

If you want to quickly test without proper security, you can temporarily use these rules (NOT recommended for production):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

This allows any authenticated user to read/write any data. **Use only for testing!**

## Fallback Behavior

The app has been updated to automatically fall back to localStorage if Firestore permissions fail, so your data will still be saved locally even if Firestore is not properly configured.

## Security Notes

The recommended rules ensure:
- Only authenticated users can access data
- Users can only access their own data  
- Data is properly isolated per user
- Follows security best practices
