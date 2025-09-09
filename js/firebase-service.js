// Firebase Service - Centralized Firebase Initialization & Authentication
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
        const { getAuth, connectAuthEmulator, setPersistence, browserLocalPersistence } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
        const { getFirestore, connectFirestoreEmulator } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
        const { getStorage, connectStorageEmulator } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js');

        // Initialize Firebase app
        app = initializeApp(firebaseConfig);
        
        // Initialize services
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);

        // Set authentication persistence to keep users logged in
        await setPersistence(auth, browserLocalPersistence);

        console.log('✅ Firebase initialized successfully');
        isInitialized = true;

        return { app, auth, db, storage };

    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        throw error;
    }
}

/**
 * Authentication Methods
 */
export async function signUpWithEmail(email, password) {
    try {
        const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
        const { auth } = await initializeFirebase();
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('✅ User registered successfully:', userCredential.user.email);
        return userCredential.user;
    } catch (error) {
        console.error('❌ Registration failed:', error);
        throw error;
    }
}

export async function signInWithEmail(email, password) {
    try {
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
        const { auth } = await initializeFirebase();
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ User signed in successfully:', userCredential.user.email);
        return userCredential.user;
    } catch (error) {
        console.error('❌ Sign in failed:', error);
        throw error;
    }
}

export async function signOut() {
    try {
        const { signOut: firebaseSignOut } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
        const { auth } = await initializeFirebase();
        
        await firebaseSignOut(auth);
        console.log('✅ User signed out successfully');
    } catch (error) {
        console.error('❌ Sign out failed:', error);
        throw error;
    }
}

export async function getCurrentUser() {
    const { auth } = await initializeFirebase();
    return auth.currentUser;
}

export async function onAuthStateChanged(callback) {
    const { onAuthStateChanged: firebaseOnAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
    const { auth } = await initializeFirebase();
    
    return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Password Reset
 */
export async function resetPassword(email) {
    try {
        const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
        const { auth } = await initializeFirebase();
        
        await sendPasswordResetEmail(auth, email);
        console.log('✅ Password reset email sent');
        return true;
    } catch (error) {
        console.error('❌ Password reset failed:', error);
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
