// Firebase Service - Centralized Firebase Initialization
// Import this file instead of duplicating Firebase config everywhere

import { firebaseConfig } from './config.js';

// Firebase instances (will be initialized once)
let app = null;
let auth = null;
let db = null;
let storage = null;
let isInitialized = false;

/**
 * Initialize Firebase once and return the instances
 * This replaces all the duplicate initializeFirebase functions
 */
export async function initializeFirebase() {
    if (isInitialized) {
        return { app, auth, db, storage };
    }

    try {
        // Import Firebase modules dynamically
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js');
        const { getAuth, connectAuthEmulator } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
        const { getFirestore, connectFirestoreEmulator } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
        const { getStorage, connectStorageEmulator } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js');

        // Initialize Firebase app
        app = initializeApp(firebaseConfig);
        
        // Initialize services
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);

        console.log('✅ Firebase initialized successfully');
        isInitialized = true;

        return { app, auth, db, storage };

    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        throw error;
    }
}

/**
 * Get Firebase instances (must call initializeFirebase first)
 */
export function getFirebaseInstances() {
    if (!isInitialized) {
        throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }
    return { app, auth, db, storage };
}

/**
 * Get Auth instance
 */
export function getAuth() {
    const { auth } = getFirebaseInstances();
    return auth;
}

/**
 * Get Firestore instance
 */
export function getFirestore() {
    const { db } = getFirebaseInstances();
    return db;
}

/**
 * Get Storage instance
 */
export function getStorage() {
    const { storage } = getFirebaseInstances();
    return storage;
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseInitialized() {
    return isInitialized;
}
