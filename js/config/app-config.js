/**
 * Application Configuration
 * Handles environment-specific settings including base URLs for deployment
 */

class AppConfig {
    constructor() {
        this.init();
    }

    init() {
        // Detect if we're running on GitHub Pages
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        
        // Check if we're on GitHub Pages
        this.isGitHubPages = hostname === 'fairulmuhammad.github.io';
        
        // Set base path based on environment
        if (this.isGitHubPages) {
            // GitHub Pages serves from /internship-progres-tracker/
            this.basePath = '/internship-progres-tracker/';
        } else {
            // Local development or other hosting
            this.basePath = './';
        }
        
        console.log('Environment detected:', {
            isGitHubPages: this.isGitHubPages,
            hostname: hostname,
            basePath: this.basePath
        });
    }

    // Get the correct path for navigation
    getPath(relativePath) {
        // Remove leading './' if present
        const cleanPath = relativePath.replace(/^\.\//, '');
        
        if (this.isGitHubPages) {
            // For GitHub Pages, use absolute paths
            return this.basePath + cleanPath;
        } else {
            // For local development, use relative paths
            return './' + cleanPath;
        }
    }

    // Navigate to a page with the correct path
    navigateTo(page) {
        const fullPath = this.getPath(page);
        console.log('Navigating to:', fullPath);
        window.location.href = fullPath;
    }

    // Get the current page name
    getCurrentPage() {
        const pathname = window.location.pathname;
        return pathname.split('/').pop() || 'index.html';
    }

    // Check if current page matches
    isCurrentPage(pageName) {
        const currentPage = this.getCurrentPage();
        return currentPage === pageName || (currentPage === '' && pageName === 'index.html');
    }
}

// Create global instance
window.appConfig = new AppConfig();

export { AppConfig };
