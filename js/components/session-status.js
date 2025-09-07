// Session Status Component - Display session information and warnings
export class SessionStatus {
    constructor(authService) {
        this.authService = authService;
        this.container = null;
        this.updateInterval = null;
        this.warningShown = false;
    }

    // Create and render session status component
    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Session status container not found:', containerId);
            return;
        }

        this.container = container;
        this.createSessionStatusHTML();
        this.startUpdating();
    }

    createSessionStatusHTML() {
        this.container.innerHTML = `
            <div class="session-status" id="session-status">
                <div class="session-info">
                    <div class="session-indicator">
                        <div class="status-dot active"></div>
                        <span class="status-text">Active Session</span>
                    </div>
                    <div class="session-details">
                        <div class="session-time">
                            <small>Session: <span id="session-duration">--</span> minutes</small>
                        </div>
                        <div class="inactivity-warning" id="inactivity-warning" style="display: none;">
                            <small class="warning-text">⚠️ Session will expire in <span id="expiry-time">--</span> minutes due to inactivity</small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add CSS styles
        this.addStyles();
    }

    addStyles() {
        if (document.getElementById('session-status-styles')) {
            return; // Styles already added
        }

        const style = document.createElement('style');
        style.id = 'session-status-styles';
        style.textContent = `
            .session-status {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 16px;
                backdrop-filter: blur(10px);
            }

            .session-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .session-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #10b981;
                animation: pulse 2s infinite;
            }

            .status-dot.warning {
                background: #f59e0b;
            }

            .status-dot.expired {
                background: #ef4444;
                animation: none;
            }

            @keyframes pulse {
                0%, 100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.5;
                }
            }

            .status-text {
                font-size: 0.9rem;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.9);
            }

            .session-details {
                flex: 1;
                text-align: right;
            }

            .session-time {
                color: rgba(255, 255, 255, 0.7);
            }

            .inactivity-warning {
                margin-top: 4px;
            }

            .warning-text {
                color: #f59e0b;
                font-weight: 500;
            }

            .session-actions {
                margin-top: 8px;
                display: flex;
                gap: 8px;
            }

            .extend-session-btn {
                background: rgba(59, 130, 246, 0.8);
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.8rem;
                cursor: pointer;
                transition: background 0.2s;
            }

            .extend-session-btn:hover {
                background: rgba(59, 130, 246, 1);
            }
        `;
        document.head.appendChild(style);
    }

    startUpdating() {
        // Update immediately
        this.updateSessionInfo();
        
        // Update every 30 seconds
        this.updateInterval = setInterval(() => {
            this.updateSessionInfo();
        }, 30000);
    }

    updateSessionInfo() {
        const sessionInfo = this.authService.getSessionInfo();
        
        if (!sessionInfo || !sessionInfo.isActive) {
            this.destroy();
            return;
        }

        // Update session duration
        const durationElement = document.getElementById('session-duration');
        if (durationElement) {
            durationElement.textContent = sessionInfo.sessionDuration;
        }

        // Check for inactivity warning (show when less than 5 minutes until inactivity timeout)
        const warningElement = document.getElementById('inactivity-warning');
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');

        if (sessionInfo.timeUntilInactivity <= 5 && sessionInfo.timeUntilInactivity > 0) {
            // Show inactivity warning
            if (warningElement) {
                warningElement.style.display = 'block';
                const expiryTime = document.getElementById('expiry-time');
                if (expiryTime) {
                    expiryTime.textContent = sessionInfo.timeUntilInactivity;
                }
            }
            
            if (statusDot) {
                statusDot.classList.remove('active');
                statusDot.classList.add('warning');
            }
            
            if (statusText) {
                statusText.textContent = 'Session Warning';
            }

            // Show browser notification if not already shown
            if (!this.warningShown && 'Notification' in window) {
                this.showInactivityNotification(sessionInfo.timeUntilInactivity);
                this.warningShown = true;
            }

        } else if (sessionInfo.timeUntilExpiry <= 10 && sessionInfo.timeUntilExpiry > 0) {
            // Show session expiry warning
            if (warningElement) {
                warningElement.style.display = 'block';
                warningElement.innerHTML = `<small class="warning-text">⚠️ Session expires in ${sessionInfo.timeUntilExpiry} minutes</small>`;
            }
            
            if (statusDot) {
                statusDot.classList.remove('active');
                statusDot.classList.add('warning');
            }
            
            if (statusText) {
                statusText.textContent = 'Session Expiring';
            }

        } else {
            // Normal active session
            if (warningElement) {
                warningElement.style.display = 'none';
            }
            
            if (statusDot) {
                statusDot.classList.remove('warning', 'expired');
                statusDot.classList.add('active');
            }
            
            if (statusText) {
                statusText.textContent = 'Active Session';
            }
            
            this.warningShown = false;
        }
    }

    async showInactivityNotification(minutesLeft) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Session Warning', {
                body: `Your session will expire in ${minutesLeft} minutes due to inactivity.`,
                icon: '/favicon.ico',
                tag: 'session-warning'
            });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            // Request permission
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.showInactivityNotification(minutesLeft);
            }
        }
    }

    // Extend session by resetting activity
    extendSession() {
        this.authService.handleUserActivity();
        this.warningShown = false;
        console.log('Session extended by user action');
    }

    // Clean up
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
