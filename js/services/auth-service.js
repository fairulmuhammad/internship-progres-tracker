// Firebase Authentication Service - User management and routing
import { firebaseConfig } from '../config.js';

class AuthService {
    constructor() {
        this.currentUser = null;
        this.auth = null;
        this.isInitialized = false;
        this.authStateCallbacks = [];
        this.firebaseApp = null;
    }

    // Initialize Firebase Auth
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Wait for Firebase to be available globally
            if (!window.Firebase) {
                throw new Error('Firebase not loaded. Make sure Firebase scripts are included.');
            }

            // Initialize Firebase app
            this.firebaseApp = window.Firebase.initializeApp(firebaseConfig);
            this.auth = window.Firebase.getAuth(this.firebaseApp);
            
            // Import auth methods dynamically
            const authModule = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
            
            // Set persistence to keep users logged in
            await authModule.setPersistence(this.auth, authModule.browserLocalPersistence);
            
            // Listen for auth state changes
            authModule.onAuthStateChanged(this.auth, (user) => {
                this.currentUser = user;
                this.handleAuthStateChange(user);
                this.authStateCallbacks.forEach(callback => callback(user));
            });
            
            this.isInitialized = true;
            console.log('Firebase Auth initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Firebase Auth:', error);
            throw error;
        }
    }

    // Handle authentication state changes and routing
    handleAuthStateChange(user) {
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || 'index.html';
        
        if (user) {
            // User is authenticated
            console.log('User authenticated:', user.email);
            
            // If user is on auth pages or home page, redirect to dashboard
            if (currentPage === 'login.html' || currentPage === 'register.html' || currentPage === 'index.html' || currentPage === '') {
                window.location.href = './dashboard.html';
            }
        } else {
            // User is not authenticated
            console.log('User not authenticated');
            
            // If user is trying to access dashboard, redirect to login
            if (currentPage === 'dashboard.html') {
                window.location.href = './login.html';
            }
        }
    }

    // Sign up with email and password
    async signUpWithEmail(email, password, displayName) {
        if (!this.isInitialized) {
            throw new Error('Auth service not initialized');
        }

        try {
            const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
            
            // Create user account
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const { user } = userCredential;
            
            // Update user profile with display name
            if (displayName) {
                await updateProfile(user, { displayName });
            }
            
            console.log('User created successfully:', user.email);
            
            // Redirect will happen automatically via auth state change
            return {
                user,
                message: 'Account created successfully! Redirecting to dashboard...'
            };
            
        } catch (error) {
            console.error('Signup error:', error);
            throw new Error(this.getReadableErrorMessage(error.code));
        }
    }

    // Sign in with email and password
    async signInWithEmail(email, password) {
        if (!this.isInitialized) {
            throw new Error('Auth service not initialized');
        }

        try {
            const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
            
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const { user } = userCredential;
            
            console.log('User signed in successfully:', user.email);
            
            // Redirect will happen automatically via auth state change
            return user;
            
        } catch (error) {
            console.error('Login error:', error);
            throw new Error(this.getReadableErrorMessage(error.code));
        }
    }

    // Sign in with Google
    async signInWithGoogle() {
        if (!this.isInitialized) {
            throw new Error('Auth service not initialized');
        }

        try {
            const { signInWithPopup, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
            
            const provider = new GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');
            
            const result = await signInWithPopup(this.auth, provider);
            const { user } = result;
            
            console.log('Google sign-in successful:', user.displayName);
            
            // Redirect will happen automatically via auth state change
            return user;
            
        } catch (error) {
            console.error('Google sign-in error:', error);
            
            if (error.code === 'auth/popup-closed-by-user') {
                throw new Error('Sign-in cancelled');
            }
            
            throw new Error(this.getReadableErrorMessage(error.code));
        }
    }

    // Send password reset email
    async resetPassword(email) {
        if (!this.isInitialized) {
            throw new Error('Auth service not initialized');
        }

        try {
            const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
            
            await sendPasswordResetEmail(this.auth, email);
            
            console.log('Password reset email sent to:', email);
            return 'Password reset email sent! Check your inbox.';
            
        } catch (error) {
            console.error('Password reset error:', error);
            throw new Error(this.getReadableErrorMessage(error.code));
        }
    }

    // Sign out and redirect to login
    async signOut() {
        if (!this.isInitialized) {
            throw new Error('Auth service not initialized');
        }

        try {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
            
            await signOut(this.auth);
            console.log('User signed out successfully');
            
            // Redirect to login page
            window.location.href = './login.html';
            
        } catch (error) {
            console.error('Sign out error:', error);
            throw new Error('Failed to sign out');
        }
    }

    // Check if user is authenticated (for route protection)
    requireAuth() {
        if (!this.currentUser) {
            window.location.href = './login.html';
            return false;
        }
        return true;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Listen for authentication state changes
    onAuthStateChanged(callback) {
        this.authStateCallbacks.push(callback);
        
        // Call immediately with current state
        if (this.currentUser !== undefined) {
            callback(this.currentUser);
        }
    }

    // Get user info for display
    getUserInfo() {
        if (!this.currentUser) {
            return null;
        }
        
        return {
            uid: this.currentUser.uid,
            email: this.currentUser.email,
            displayName: this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'User',
            photoURL: this.currentUser.photoURL,
            emailVerified: this.currentUser.emailVerified,
            createdAt: this.currentUser.metadata.creationTime,
            lastLogin: this.currentUser.metadata.lastSignInTime
        };
    }

    // Convert Firebase error codes to user-friendly messages
    getReadableErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email address',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'An account with this email already exists',
            'auth/weak-password': 'Password should be at least 6 characters long',
            'auth/invalid-email': 'Please enter a valid email address',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later',
            'auth/network-request-failed': 'Network error. Please check your connection',
            'auth/user-disabled': 'This account has been disabled',
            'auth/requires-recent-login': 'Please sign in again to continue',
            'auth/popup-blocked': 'Pop-up blocked by browser. Please allow pop-ups and try again',
            'auth/cancelled-popup-request': 'Sign-in cancelled',
            'auth/popup-closed-by-user': 'Sign-in cancelled'
        };
        
        return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
    }
}

// Export singleton instance
export const authService = new AuthService();
