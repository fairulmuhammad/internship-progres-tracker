// Authentication UI Components - Login/Signup modals and user interface
import { authService } from '../services/auth-service.js';
import { uiComponents } from '../ui-components.js';

class AuthUI {
    constructor() {
        this.currentModal = null;
        this.isLoading = false;
    }

    // Show login modal
    showLoginModal() {
        this.hideCurrentModal();
        
        const modal = this.createModal('login', 'Welcome Back', `
            <form id="login-form" class="auth-form">
                <div class="auth-tabs">
                    <button type="button" class="auth-tab active" data-tab="login">Sign In</button>
                    <button type="button" class="auth-tab" data-tab="signup">Sign Up</button>
                </div>
                
                <div class="form-group">
                    <label for="login-email">Email Address</label>
                    <input type="email" id="login-email" class="form-input" required autocomplete="email">
                </div>
                
                <div class="form-group">
                    <label for="login-password">Password</label>
                    <input type="password" id="login-password" class="form-input" required autocomplete="current-password">
                </div>
                
                <button type="submit" class="btn btn-primary btn-full" id="login-submit-btn">
                    <span class="btn-text">Sign In</span>
                    <div class="btn-spinner hidden"></div>
                </button>
                
                <div class="auth-divider">
                    <span>or</span>
                </div>
                
                <button type="button" class="btn btn-google btn-full" id="google-signin-btn">
                    <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                </button>
                
                <div class="auth-links">
                    <button type="button" class="link-btn" id="forgot-password-btn">Forgot Password?</button>
                </div>
            </form>
        `);
        
        this.setupLoginEventListeners(modal);
        this.currentModal = modal;
    }

    // Show signup modal
    showSignupModal() {
        this.hideCurrentModal();
        
        const modal = this.createModal('signup', 'Create Account', `
            <form id="signup-form" class="auth-form">
                <div class="auth-tabs">
                    <button type="button" class="auth-tab" data-tab="login">Sign In</button>
                    <button type="button" class="auth-tab active" data-tab="signup">Sign Up</button>
                </div>
                
                <div class="form-group">
                    <label for="signup-name">Full Name</label>
                    <input type="text" id="signup-name" class="form-input" required autocomplete="name">
                </div>
                
                <div class="form-group">
                    <label for="signup-email">Email Address</label>
                    <input type="email" id="signup-email" class="form-input" required autocomplete="email">
                </div>
                
                <div class="form-group">
                    <label for="signup-password">Password</label>
                    <input type="password" id="signup-password" class="form-input" required autocomplete="new-password">
                    <div class="form-help-text">Minimum 6 characters</div>
                </div>
                
                <div class="form-group">
                    <label for="signup-confirm">Confirm Password</label>
                    <input type="password" id="signup-confirm" class="form-input" required autocomplete="new-password">
                </div>
                
                <button type="submit" class="btn btn-primary btn-full" id="signup-submit-btn">
                    <span class="btn-text">Create Account</span>
                    <div class="btn-spinner hidden"></div>
                </button>
                
                <div class="auth-divider">
                    <span>or</span>
                </div>
                
                <button type="button" class="btn btn-google btn-full" id="google-signup-btn">
                    <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign up with Google
                </button>
                
                <div class="auth-footer">
                    <p>By creating an account, you agree to our terms of service and privacy policy.</p>
                </div>
            </form>
        `);
        
        this.setupSignupEventListeners(modal);
        this.currentModal = modal;
    }

    // Create modal structure
    createModal(type, title, content) {
        const modal = document.createElement('div');
        modal.className = 'auth-modal-overlay';
        modal.innerHTML = `
            <div class="auth-modal">
                <div class="auth-modal-header">
                    <h2 class="auth-modal-title">${title}</h2>
                    <button class="auth-modal-close" aria-label="Close modal">&times;</button>
                </div>
                <div class="auth-modal-body">
                    ${content}
                </div>
                <div id="auth-message" class="auth-message hidden"></div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal when clicking outside or close button
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('auth-modal-close')) {
                this.hideCurrentModal();
            }
        });
        
        // Prevent modal from closing when clicking inside
        modal.querySelector('.auth-modal').addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Setup tab switching
        this.setupTabSwitching(modal);
        
        return modal;
    }

    // Setup tab switching between login and signup
    setupTabSwitching(modal) {
        const tabs = modal.querySelectorAll('.auth-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabType = tab.dataset.tab;
                if (tabType === 'login') {
                    this.showLoginModal();
                } else if (tabType === 'signup') {
                    this.showSignupModal();
                }
            });
        });
    }

    // Setup login form event listeners
    setupLoginEventListeners(modal) {
        const form = modal.querySelector('#login-form');
        const googleBtn = modal.querySelector('#google-signin-btn');
        const forgotBtn = modal.querySelector('#forgot-password-btn');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin(form);
        });
        
        googleBtn.addEventListener('click', async () => {
            await this.handleGoogleSignIn();
        });
        
        forgotBtn.addEventListener('click', () => {
            this.showForgotPasswordModal();
        });
    }

    // Setup signup form event listeners
    setupSignupEventListeners(modal) {
        const form = modal.querySelector('#signup-form');
        const googleBtn = modal.querySelector('#google-signup-btn');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSignup(form);
        });
        
        googleBtn.addEventListener('click', async () => {
            await this.handleGoogleSignIn();
        });
    }

    // Handle email/password login
    async handleLogin(form) {
        if (this.isLoading) return;
        
        const email = form.querySelector('#login-email').value;
        const password = form.querySelector('#login-password').value;
        const submitBtn = form.querySelector('#login-submit-btn');
        
        this.setLoading(submitBtn, true);
        this.hideMessage();
        
        try {
            await authService.signInWithEmail(email, password);
            this.showMessage('Welcome back! 🎉', 'success');
            setTimeout(() => this.hideCurrentModal(), 1000);
            
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            this.setLoading(submitBtn, false);
        }
    }

    // Handle email/password signup
    async handleSignup(form) {
        if (this.isLoading) return;
        
        const name = form.querySelector('#signup-name').value;
        const email = form.querySelector('#signup-email').value;
        const password = form.querySelector('#signup-password').value;
        const confirmPassword = form.querySelector('#signup-confirm').value;
        const submitBtn = form.querySelector('#signup-submit-btn');
        
        // Validate passwords match
        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }
        
        this.setLoading(submitBtn, true);
        this.hideMessage();
        
        try {
            const result = await authService.signUpWithEmail(email, password, name);
            this.showMessage(result.message, 'success');
            
            // Auto-close modal after signup
            setTimeout(() => this.hideCurrentModal(), 3000);
            
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            this.setLoading(submitBtn, false);
        }
    }

    // Handle Google sign in
    async handleGoogleSignIn() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.hideMessage();
        
        try {
            await authService.signInWithGoogle();
            this.showMessage('Welcome! 🎉', 'success');
            setTimeout(() => this.hideCurrentModal(), 1000);
            
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // Show forgot password modal
    showForgotPasswordModal() {
        this.hideCurrentModal();
        
        const modal = this.createModal('forgot', 'Reset Password', `
            <form id="forgot-form" class="auth-form">
                <p class="auth-description">Enter your email address and we'll send you a link to reset your password.</p>
                
                <div class="form-group">
                    <label for="forgot-email">Email Address</label>
                    <input type="email" id="forgot-email" class="form-input" required autocomplete="email">
                </div>
                
                <button type="submit" class="btn btn-primary btn-full" id="forgot-submit-btn">
                    <span class="btn-text">Send Reset Link</span>
                    <div class="btn-spinner hidden"></div>
                </button>
                
                <div class="auth-links">
                    <button type="button" class="link-btn" id="back-to-login-btn">← Back to Sign In</button>
                </div>
            </form>
        `);
        
        const form = modal.querySelector('#forgot-form');
        const backBtn = modal.querySelector('#back-to-login-btn');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleForgotPassword(form);
        });
        
        backBtn.addEventListener('click', () => {
            this.showLoginModal();
        });
        
        this.currentModal = modal;
    }

    // Handle forgot password
    async handleForgotPassword(form) {
        if (this.isLoading) return;
        
        const email = form.querySelector('#forgot-email').value;
        const submitBtn = form.querySelector('#forgot-submit-btn');
        
        this.setLoading(submitBtn, true);
        this.hideMessage();
        
        try {
            const message = await authService.resetPassword(email);
            this.showMessage(message, 'success');
            
            // Auto-close after success
            setTimeout(() => this.hideCurrentModal(), 3000);
            
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            this.setLoading(submitBtn, false);
        }
    }

    // Show/hide loading state on buttons
    setLoading(button, loading) {
        this.isLoading = loading;
        const text = button.querySelector('.btn-text');
        const spinner = button.querySelector('.btn-spinner');
        
        if (loading) {
            button.disabled = true;
            text.style.opacity = '0.7';
            spinner.classList.remove('hidden');
        } else {
            button.disabled = false;
            text.style.opacity = '1';
            spinner.classList.add('hidden');
        }
    }

    // Show message in modal
    showMessage(message, type = 'info') {
        if (!this.currentModal) return;
        
        const messageEl = this.currentModal.querySelector('#auth-message');
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
        messageEl.classList.remove('hidden');
    }

    // Hide message in modal
    hideMessage() {
        if (!this.currentModal) return;
        
        const messageEl = this.currentModal.querySelector('#auth-message');
        messageEl.classList.add('hidden');
    }

    // Hide current modal
    hideCurrentModal() {
        if (this.currentModal) {
            document.body.removeChild(this.currentModal);
            this.currentModal = null;
        }
    }

    // Create user profile dropdown
    createUserProfile(user) {
        const userInfo = authService.getUserInfo();
        if (!userInfo) return null;

        const container = document.createElement('div');
        container.className = 'user-profile';
        container.innerHTML = `
            <button class="user-profile-btn" id="user-profile-btn">
                <img src="${userInfo.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.displayName)}&background=4f46e5&color=ffffff`}" 
                     alt="${userInfo.displayName}" class="user-avatar">
                <span class="user-name">${userInfo.displayName}</span>
                <svg class="dropdown-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4.427 9.573L8 6l3.573 3.573-1.073 1.073L8 8.147l-2.5 2.5-1.073-1.074z"/>
                </svg>
            </button>
            
            <div class="user-dropdown hidden" id="user-dropdown">
                <div class="dropdown-header">
                    <img src="${userInfo.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.displayName)}&background=4f46e5&color=ffffff`}" 
                         alt="${userInfo.displayName}" class="dropdown-avatar">
                    <div class="dropdown-user-info">
                        <div class="dropdown-name">${userInfo.displayName}</div>
                        <div class="dropdown-email">${userInfo.email}</div>
                    </div>
                </div>
                
                <div class="dropdown-divider"></div>
                
                <button class="dropdown-item" id="profile-settings-btn">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z"/>
                        <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 002.693 1.115l.292-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 001.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 00-1.115 2.693l.16.292c.415.764-.42 1.6-1.185 1.184l-.292-.159a1.873 1.873 0 00-2.692 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 00-2.693-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.292A1.873 1.873 0 001.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 003.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 002.692-1.115l.094-.319z"/>
                    </svg>
                    Profile Settings
                </button>
                
                <button class="dropdown-item" id="export-data-btn">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M.5 9.9a.5.5 0 01.5.5v2.5a1 1 0 001 1h12a1 1 0 001-1v-2.5a.5.5 0 011 0v2.5a2 2 0 01-2 2H2a2 2 0 01-2-2v-2.5a.5.5 0 01.5-.5z"/>
                        <path d="M7.646 11.854a.5.5 0 00.708 0l3-3a.5.5 0 00-.708-.708L8.5 10.293V1.5a.5.5 0 00-1 0v8.793L5.354 8.146a.5.5 0 10-.708.708l3 3z"/>
                    </svg>
                    Export Data
                </button>
                
                <div class="dropdown-divider"></div>
                
                <button class="dropdown-item text-error" id="sign-out-btn">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 12.5a.5.5 0 01-.5.5h-8a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5h8a.5.5 0 01.5.5v2a.5.5 0 001 0v-2A1.5 1.5 0 009.5 2h-8A1.5 1.5 0 000 3.5v9A1.5 1.5 0 001.5 14h8a1.5 1.5 0 001.5-1.5v-2a.5.5 0 00-1 0v2z"/>
                        <path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 000-.708l-3-3a.5.5 0 00-.708.708L14.293 7.5H5.5a.5.5 0 000 1h8.793l-2.147 2.146a.5.5 0 00.708.708l3-3z"/>
                    </svg>
                    Sign Out
                </button>
            </div>
        `;

        this.setupUserProfileEvents(container);
        return container;
    }

    // Setup user profile dropdown events
    setupUserProfileEvents(container) {
        const profileBtn = container.querySelector('#user-profile-btn');
        const dropdown = container.querySelector('#user-dropdown');
        const signOutBtn = container.querySelector('#sign-out-btn');

        // Toggle dropdown
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.add('hidden');
        });

        // Sign out
        signOutBtn.addEventListener('click', async () => {
            uiComponents.showConfirmDialog(
                'Are you sure you want to sign out? Make sure all your changes are saved.',
                async () => {
                    try {
                        await authService.signOut();
                    } catch (error) {
                        console.error('Sign out error:', error);
                        uiComponents.showNotification('Failed to sign out. Please try again.', 'error');
                    }
                }
            );
        });
    }
}

// Export singleton instance
export const authUI = new AuthUI();
