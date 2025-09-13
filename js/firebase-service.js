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

export async function signInWithGoogle() {
    try {
        const { signInWithPopup, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
        const { auth } = await initializeFirebase();
        
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        console.log('✅ User signed in with Google:', userCredential.user.email);
        return userCredential.user;
    } catch (error) {
        console.error('❌ Google sign in failed:', error);
        throw error;
    }
}

/**
 * Account Linking Methods - Allow users to link multiple auth methods to same account
 */
export async function linkEmailPassword(email, password) {
    try {
        const { EmailAuthProvider, linkWithCredential } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
        const user = await getCurrentUser();
        
        if (!user) {
            throw new Error('No user is currently signed in');
        }
        
        const credential = EmailAuthProvider.credential(email, password);
        const result = await linkWithCredential(user, credential);
        console.log('✅ Email/password linked to account:', result.user.email);
        return result.user;
    } catch (error) {
        console.error('❌ Account linking failed:', error);
        throw error;
    }
}

export async function linkGoogleAccount() {
    try {
        const { GoogleAuthProvider, linkWithPopup } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
        const user = await getCurrentUser();
        
        if (!user) {
            throw new Error('No user is currently signed in');
        }
        
        const provider = new GoogleAuthProvider();
        const result = await linkWithPopup(user, provider);
        console.log('✅ Google account linked:', result.user.email);
        return result.user;
    } catch (error) {
        console.error('❌ Google account linking failed:', error);
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

export async function fetchSignInMethodsForEmail(email) {
    try {
        const { fetchSignInMethodsForEmail: firebaseFetchSignInMethods } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
        const { auth } = await initializeFirebase();
        
        const methods = await firebaseFetchSignInMethods(auth, email);
        console.log('✅ Sign-in methods fetched for', email, ':', methods);
        return methods;
    } catch (error) {
        console.error('❌ Failed to fetch sign-in methods:', error);
        throw error;
    }
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
