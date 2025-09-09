// UI Components and Utilities
import { appConfig } from './config.js';

export class UIComponents {
    constructor() {
        this.converter = new showdown.Converter();
    }

    // Create statistics card
    createStatCard(title, value, color = 'blue') {
        const card = document.createElement('div');
        card.className = `stat-card ${color}`;
        
        const titleEl = document.createElement('h3');
        titleEl.className = 'stat-title';
        titleEl.textContent = title;
        
        const valueEl = document.createElement('p');
        valueEl.className = 'stat-value';
        valueEl.textContent = value;
        
        card.appendChild(titleEl);
        card.appendChild(valueEl);
        
        return card;
    }

    // Create category badge
    createCategoryBadge(category) {
        const badge = document.createElement('span');
        badge.className = 'badge badge-category category';
        badge.setAttribute('data-category', category);
        
        // Format display text for new categories
        let displayText = category;
        if (category.startsWith('internship-')) {
            displayText = '🎓 ' + category.replace('internship-', '').split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        } else if (category.startsWith('personal-')) {
            displayText = '👤 ' + category.replace('personal-', '').split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        } else {
            // Legacy categories
            displayText = category.charAt(0).toUpperCase() + category.slice(1);
        }
        
        badge.textContent = displayText;
        return badge;
    }

    // Create tag badge
    createTagBadge(tag) {
        const badge = document.createElement('span');
        badge.className = 'badge badge-tag';
        badge.textContent = tag;
        return badge;
    }

    // Create action button
    createActionButton(text, onClick, className = 'btn-secondary', icon = null) {
        const button = document.createElement('button');
        button.className = `btn btn-icon-only ${className}`;
        button.setAttribute('aria-label', text);
        button.onclick = onClick;
        
        if (icon) {
            button.innerHTML = icon;
        } else {
            button.textContent = text;
        }
        
        return button;
    }

    // Create loading spinner
    createLoadingSpinner(text = 'Loading...') {
        const container = document.createElement('div');
        container.className = 'loading';
        
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        
        const textEl = document.createElement('span');
        textEl.textContent = text;
        
        container.appendChild(spinner);
        container.appendChild(textEl);
        
        return container;
    }

    // Create empty state message
    createEmptyState(message, actionText = null, onAction = null) {
        const container = document.createElement('div');
        container.className = 'text-center p-6';
        
        const messageEl = document.createElement('p');
        messageEl.className = 'text-secondary mb-4';
        messageEl.textContent = message;
        
        container.appendChild(messageEl);
        
        if (actionText && onAction) {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'btn btn-primary';
            actionBtn.textContent = actionText;
            actionBtn.onclick = onAction;
            container.appendChild(actionBtn);
        }
        
        return container;
    }

    // Format date for display
    formatDate(dateString, includeTime = false) {
        const date = new Date(dateString);
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        };
        
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        
        return date.toLocaleDateString('en-US', options);
    }

    // Format time for display
    formatTime(timeString) {
        if (!timeString) return '';
        return timeString;
    }

    // Convert markdown to HTML
    markdownToHtml(markdown) {
        return this.converter.makeHtml(markdown);
    }

    // Show notification
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            max-width: 400px;
            border-left: 4px solid ${this.getNotificationColor(type)};
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto remove notification
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, duration);
        
        return notification;
    }

    // Get notification color based on type
    getNotificationColor(type) {
        const colors = {
            'info': '#3b82f6',
            'success': '#10b981',
            'warning': '#f59e0b',
            'error': '#ef4444'
        };
        return colors[type] || colors.info;
    }

    // Create confirmation dialog
    showConfirmDialog(message, onConfirm, onCancel = null) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        modal.style.maxWidth = '400px';
        modal.style.padding = '2rem';
        
        const messageEl = document.createElement('p');
        messageEl.textContent = message;
        messageEl.style.marginBottom = '1.5rem';
        
        const actions = document.createElement('div');
        actions.className = 'flex gap-3 justify-end';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => {
            document.body.removeChild(overlay);
            if (onCancel) onCancel();
        };
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-danger';
        confirmBtn.textContent = 'Confirm';
        confirmBtn.onclick = () => {
            document.body.removeChild(overlay);
            onConfirm();
        };
        
        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        
        modal.appendChild(messageEl);
        modal.appendChild(actions);
        overlay.appendChild(modal);
        
        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                if (onCancel) onCancel();
            }
        };
        
        document.body.appendChild(overlay);
        confirmBtn.focus();
    }

    // Animate element
    animate(element, animation, duration = 200) {
        element.style.transition = `all ${duration}ms ease-in-out`;
        
        switch (animation) {
            case 'fadeIn':
                element.style.opacity = '0';
                element.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }, 10);
                break;
                
            case 'fadeOut':
                element.style.opacity = '0';
                element.style.transform = 'translateY(-10px)';
                break;
                
            case 'slideUp':
                element.style.transform = 'translateY(100%)';
                setTimeout(() => {
                    element.style.transform = 'translateY(0)';
                }, 10);
                break;
        }
    }

    // Debounce function for search inputs
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Scroll to element smoothly
    scrollTo(element, offset = 0) {
        const elementPosition = element.offsetTop - offset;
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    }

    // Set focus trap for modals
    setFocusTrap(container) {
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        const handleTabKey = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        };
        
        container.addEventListener('keydown', handleTabKey);
        
        // Focus first element
        if (firstElement) {
            firstElement.focus();
        }
        
        return () => {
            container.removeEventListener('keydown', handleTabKey);
        };
    }
}

// Statistics calculation utilities
export class StatsCalculator {
    static calculateTotalHours(memos) {
        return memos.reduce((sum, memo) => sum + (parseFloat(memo.duration) || 0), 0);
    }

    static calculateWeekHours(memos) {
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        
        return memos
            .filter(memo => new Date(memo.date) >= startOfWeek)
            .reduce((sum, memo) => sum + (parseFloat(memo.duration) || 0), 0);
    }

    static calculateAverageHours(memos) {
        const daysWithEntries = new Set(memos.map(memo => memo.date)).size;
        const totalHours = this.calculateTotalHours(memos);
        return daysWithEntries > 0 ? totalHours / daysWithEntries : 0;
    }

    static getCategoryStats(memos) {
        const categoryCount = {};
        const categoryHours = {};
        
        memos.forEach(memo => {
            const category = memo.category || 'other';
            categoryCount[category] = (categoryCount[category] || 0) + 1;
            categoryHours[category] = (categoryHours[category] || 0) + (parseFloat(memo.duration) || 0);
        });
        
        return { categoryCount, categoryHours };
    }

    static getRecentActivity(memos, days = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        return memos.filter(memo => new Date(memo.date) >= cutoffDate);
    }

    static getLongestStreak(memos) {
        if (memos.length === 0) return 0;
        
        const dates = [...new Set(memos.map(memo => memo.date))].sort();
        let currentStreak = 1;
        let longestStreak = 1;
        
        for (let i = 1; i < dates.length; i++) {
            const currentDate = new Date(dates[i]);
            const previousDate = new Date(dates[i - 1]);
            const diffTime = currentDate - previousDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else {
                currentStreak = 1;
            }
        }
        
        return longestStreak;
    }
}

// Form validation utilities
export class FormValidator {
    static validateMemo(formData) {
        const errors = [];
        
        if (!formData.date) {
            errors.push('Date is required');
        }
        
        if (!formData.title || formData.title.trim().length === 0) {
            errors.push('Title is required');
        }
        
        if (!formData.description || formData.description.trim().length === 0) {
            errors.push('Description is required');
        }
        
        if (formData.duration && (isNaN(formData.duration) || parseFloat(formData.duration) < 0)) {
            errors.push('Duration must be a positive number');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .trim()
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }

    static validateTags(tagString) {
        if (!tagString) return [];
        
        return tagString
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0 && tag.length <= 50)
            .slice(0, 10); // Limit to 10 tags
    }
}

// Export singleton instance
export const uiComponents = new UIComponents();
