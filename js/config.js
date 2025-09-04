// Firebase Configuration
// These are safe to expose publicly as they're client-side keys
// For production, consider using environment variables
export const firebaseConfig = {
    apiKey: "AIzaSyBXyDjhD-uewbVQyfBIGF08sVJ6DTypJPU",
    authDomain: "internship-tracker-v01.firebaseapp.com",
    projectId: "internship-tracker-v01",
    storageBucket: "internship-tracker-v01.firebasestorage.app",
    messagingSenderId: "33562128425",
    appId: "1:33562128425:web:21084944a8360cf6ecec38"
};

// NOTE: Firebase client config is safe to be public
// Your database is protected by Firestore security rules
// For enhanced security in production, use environment variables

// Application Configuration
export const appConfig = {
    // Set to true to use local storage instead of Firebase
    // Change this to false to enable cloud storage
    USE_LOCAL_STORAGE: true,  // 👈 CHANGE TO false FOR CLOUD STORAGE
    
    // Unique identifier for this application instance
    APP_ID: 'internship-tracker-default',
    
    // File upload configuration
    FILE_UPLOAD: {
        MAX_SIZE: 10 * 1024 * 1024, // 10MB in bytes
        ACCEPTED_TYPES: [
            'image/*',
            '.pdf',
            '.doc',
            '.docx',
            '.txt',
            '.json',
            '.js',
            '.html',
            '.css',
            '.py'
        ],
        SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    },
    
    // UI Configuration
    UI: {
        MEMOS_PER_PAGE: 20,
        AUTO_SAVE_DELAY: 1000, // milliseconds
        ANIMATION_DURATION: 200 // milliseconds
    },
    
    // Category configuration
    CATEGORIES: [
        { value: 'development', label: 'Development', color: '#3b82f6' },
        { value: 'meeting', label: 'Meeting', color: '#10b981' },
        { value: 'learning', label: 'Learning', color: '#8b5cf6' },
        { value: 'planning', label: 'Planning', color: '#f59e0b' },
        { value: 'testing', label: 'Testing', color: '#ef4444' },
        { value: 'documentation', label: 'Documentation', color: '#6b7280' },
        { value: 'other', label: 'Other', color: '#ec4899' }
    ],
    
    // Local storage keys
    STORAGE_KEYS: {
        MEMOS: 'internship-memos',
        USER_PREFERENCES: 'internship-user-preferences',
        DRAFT: 'internship-memo-draft'
    }
};

// Development/Production Environment Detection
export const isDevelopment = () => {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.protocol === 'file:';
};

// Logging configuration
export const LOG_LEVEL = isDevelopment() ? 'debug' : 'error';
