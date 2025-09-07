// Firebase Authentication Service - User management and routing
import { firebaseConfig } from '../config.js';

class AuthService {
    constructor() {
        this.currentUser = null;
        this.auth = null;
        this.isInitialized = false;
        this.authStateCallbacks = [];
        this.firebaseApp = null;
        
        // Session management properties
        this.sessionTimeout = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
        this.inactivityTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
        this.sessionTimer = null;
        this.inactivityTimer = null;
        this.lastActivity = Date.now();
        
        // Bind methods to preserve 'this' context
        this.handleUserActivity = this.handleUserActivity.bind(this);
        this.checkSessionExpiry = this.checkSessionExpiry.bind(this);
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
            
            // Start session tracking for authenticated user
            this.startSessionTracking();
            
            // Check if session should be expired (on page refresh/reload)
            this.checkSessionExpiry();
            
            // If user is on auth pages or home page, redirect to dashboard
            if (currentPage === 'login.html' || currentPage === 'register.html' || currentPage === 'index.html' || currentPage === '') {
                window.location.href = './dashboard.html';
            }
        } else {
            // User is not authenticated
            console.log('User not authenticated');
            
            // Clear session tracking
            this.clearSessionTimers();
            this.removeActivityListeners();
            localStorage.removeItem('sessionStartTime');
            localStorage.removeItem('lastActivity');
            
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
            } else if (error.code === 'auth/unauthorized-domain') {
                throw new Error('This domain is not authorized for Google Sign-in.\n\nTo fix this:\n1. Go to Firebase Console\n2. Authentication → Settings → Authorized domains\n3. Add "localhost" to the list\n\nSee docs/firebase-setup.md for detailed instructions.');
            } else if (error.code === 'auth/operation-not-allowed') {
                throw new Error('Google Sign-in is not enabled.\n\nTo fix this:\n1. Go to Firebase Console\n2. Authentication → Sign-in method\n3. Enable Google provider\n\nSee docs/firebase-setup.md for detailed instructions.');
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

    // Sign out and optionally redirect to login
    async signOut(shouldRedirect = true) {
        if (!this.isInitialized) {
            throw new Error('Auth service not initialized');
        }

        try {
            // Clear session tracking
            this.clearSessionTimers();
            this.removeActivityListeners();
            localStorage.removeItem('sessionStartTime');
            localStorage.removeItem('lastActivity');
            
            const { signOut } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
            
            await signOut(this.auth);
            console.log('User signed out successfully');
            
            // Redirect to login page if requested
            if (shouldRedirect) {
                window.location.href = './login.html';
            }
            
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
            'auth/popup-closed-by-user': 'Sign-in cancelled',
            'session-expired': 'Your session has expired. Please sign in again.',
            'session-inactive': 'You have been signed out due to inactivity.'
        };
        
        return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
    }

    // Session Management Methods
    startSessionTracking() {
        if (!this.currentUser) return;
        
        // Clear any existing timers
        this.clearSessionTimers();
        
        // Start session timeout (absolute expiry)
        this.sessionTimer = setTimeout(() => {
            this.handleSessionExpired('session-expired');
        }, this.sessionTimeout);
        
        // Start inactivity timeout
        this.resetInactivityTimer();
        
        // Add activity listeners
        this.addActivityListeners();
        
        // Store session start time
        localStorage.setItem('sessionStartTime', Date.now().toString());
        
        console.log(`Session started. Will expire in ${this.sessionTimeout / 60000} minutes`);
    }

    resetInactivityTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        
        this.lastActivity = Date.now();
        localStorage.setItem('lastActivity', this.lastActivity.toString());
        
        // Set new inactivity timer
        this.inactivityTimer = setTimeout(() => {
            this.handleSessionExpired('session-inactive');
        }, this.inactivityTimeout);
    }

    handleUserActivity() {
        // Only track activity if user is authenticated
        if (this.currentUser) {
            this.resetInactivityTimer();
        }
    }

    addActivityListeners() {
        // Remove existing listeners first
        this.removeActivityListeners();
        
        // Track various user activities
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(event => {
            document.addEventListener(event, this.handleUserActivity, true);
        });
    }

    removeActivityListeners() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(event => {
            document.removeEventListener(event, this.handleUserActivity, true);
        });
    }

    clearSessionTimers() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
    }

    async handleSessionExpired(reason) {
        console.log(`Session expired: ${reason}`);
        
        // Clear timers
        this.clearSessionTimers();
        
        // Remove activity listeners
        this.removeActivityListeners();
        
        // Clear session data
        localStorage.removeItem('sessionStartTime');
        localStorage.removeItem('lastActivity');
        
        // Show user-friendly message
        const message = this.getReadableErrorMessage(reason);
        
        // Sign out user
        try {
            await this.signOut(false); // Don't redirect immediately
            
            // Show expiration message
            if (window.location.pathname.includes('dashboard.html')) {
                alert(message);
            }
            
        } catch (error) {
            console.error('Error signing out expired session:', error);
        }
    }

    // Check if session should be expired on page load
    checkSessionExpiry() {
        if (!this.currentUser) return;
        
        const sessionStartTime = parseInt(localStorage.getItem('sessionStartTime') || '0');
        const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0');
        const currentTime = Date.now();
        
        // Check absolute session timeout
        if (sessionStartTime && (currentTime - sessionStartTime) > this.sessionTimeout) {
            this.handleSessionExpired('session-expired');
            return;
        }
        
        // Check inactivity timeout
        if (lastActivity && (currentTime - lastActivity) > this.inactivityTimeout) {
            this.handleSessionExpired('session-inactive');
            return;
        }
        
        // Session is still valid, restart tracking
        this.startSessionTracking();
    }

    // Get session info for display
    getSessionInfo() {
        if (!this.currentUser) return null;
        
        const sessionStartTime = parseInt(localStorage.getItem('sessionStartTime') || '0');
        const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0');
        const currentTime = Date.now();
        
        const sessionDuration = sessionStartTime ? currentTime - sessionStartTime : 0;
        const timeSinceActivity = lastActivity ? currentTime - lastActivity : 0;
        const timeUntilExpiry = sessionStartTime ? this.sessionTimeout - (currentTime - sessionStartTime) : 0;
        const timeUntilInactivity = lastActivity ? this.inactivityTimeout - (currentTime - lastActivity) : 0;
        
        return {
            isActive: !!this.currentUser,
            sessionDuration: Math.floor(sessionDuration / 60000), // minutes
            timeSinceActivity: Math.floor(timeSinceActivity / 60000), // minutes
            timeUntilExpiry: Math.max(0, Math.floor(timeUntilExpiry / 60000)), // minutes
            timeUntilInactivity: Math.max(0, Math.floor(timeUntilInactivity / 60000)), // minutes
            sessionStartTime: sessionStartTime ? new Date(sessionStartTime) : null,
            lastActivity: lastActivity ? new Date(lastActivity) : null
        };
    }
}

// Export singleton instance
export const authService = new AuthService();
