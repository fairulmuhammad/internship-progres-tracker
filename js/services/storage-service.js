// Enhanced Storage Service - User-specific Firebase Firestore integration
import { appConfig } from '../config.js';
import { firestoreService } from './firestore-service.js';

class StorageService {
    constructor() {
        this.isCloudMode = true; // Always use cloud mode for authenticated users
        this.isInitialized = false;
        this.currentUser = null;
        this.onDataChangeCallback = null;
        this.unsubscribeRealtime = null;
        this.syncStatus = 'disconnected'; // 'connected', 'syncing', 'disconnected', 'error'
    }

    // Initialize storage service with authenticated user
    async initialize(authService) {
        if (this.isInitialized) {
            return;
        }

        try {
            this.authService = authService;
            
            // Initialize Firestore service
            await firestoreService.initialize(authService.firebaseApp);
            
            // Listen for auth state changes
            this.authService.onAuthStateChanged((user) => {
                this.handleUserChange(user);
            });
            
            this.isInitialized = true;
            this.log('Storage service initialized successfully');
            
        } catch (error) {
            console.error('Storage service initialization failed:', error);
            throw error;
        }
    }

    // Handle user authentication changes
    async handleUserChange(user) {
        if (user) {
            // User signed in
            this.currentUser = user;
            firestoreService.setCurrentUser(user.uid);
            
            // Initialize user document in Firestore
            await firestoreService.initializeUserDocument({
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
            });
            
            // Set up real-time listener for user's memos
            this.setupRealtimeSync();
            
            // Update sync status
            this.setSyncStatus('connected');
            
            this.log('User storage initialized', { userId: user.uid, email: user.email });
            
        } else {
            // User signed out
            this.currentUser = null;
            firestoreService.clearCurrentUser();
            
            // Clean up real-time listener
            this.cleanupRealtimeSync();
            
            // Update sync status
            this.setSyncStatus('disconnected');
            
            this.log('User storage cleared');
        }
    }

    // Set up real-time synchronization
    setupRealtimeSync() {
        if (this.unsubscribeRealtime) {
            this.unsubscribeRealtime(); // Clean up existing listener
        }

        this.unsubscribeRealtime = firestoreService.setupRealtimeListener((memos) => {
            this.log('Real-time data update received', { count: memos.length });
            
            if (this.onDataChangeCallback) {
                this.onDataChangeCallback(memos);
            }
            
            // Update sync status
            this.setSyncStatus('connected');
        });
    }

    // Clean up real-time synchronization
    cleanupRealtimeSync() {
        if (this.unsubscribeRealtime) {
            this.unsubscribeRealtime();
            this.unsubscribeRealtime = null;
        }
    }

    // Save memo to user's collection
    async saveMemo(memo) {
        if (!this.currentUser) {
            throw new Error('User must be authenticated to save memos');
        }

        try {
            this.setSyncStatus('syncing');
            
            // Ensure memo has required fields
            const memoToSave = {
                id: memo.id || this.generateId(),
                title: memo.title || '',
                content: memo.content || '',
                category: memo.category || 'general',
                date: memo.date || new Date().toISOString().split('T')[0],
                createdAt: memo.createdAt || new Date(),
                ...memo
            };
            
            await firestoreService.saveMemo(memoToSave);
            
            this.setSyncStatus('connected');
            this.log('Memo saved successfully', { memoId: memoToSave.id });
            
            return memoToSave;
            
        } catch (error) {
            this.setSyncStatus('error');
            console.error('Error saving memo to Firestore:', error);
            
            // Handle specific Firestore errors
            if (error.code === 'permission-denied') {
                console.warn('Firestore permission denied - falling back to localStorage');
                // Fallback to localStorage when permissions are denied
                try {
                    const memos = JSON.parse(localStorage.getItem('memos') || '[]');
                    const existingIndex = memos.findIndex(m => m.id === memoToSave.id);
                    
                    if (existingIndex >= 0) {
                        memos[existingIndex] = memoToSave;
                    } else {
                        memos.push(memoToSave);
                    }
                    
                    localStorage.setItem('memos', JSON.stringify(memos));
                    this.setSyncStatus('offline');
                    this.log('Memo saved to localStorage as fallback', { memoId: memoToSave.id });
                    return memoToSave;
                } catch (localError) {
                    console.error('Failed to save to localStorage:', localError);
                    throw new Error('Failed to save memo - please check your permissions or try again later');
                }
            } else {
                throw new Error('Failed to save memo: ' + error.message);
            }
        }
    }

    // Alias for backward compatibility
    async addMemo(memo) {
        return await this.saveMemo(memo);
    }

    // Load all memos for current user
    async loadMemos() {
        if (!this.currentUser) {
            this.log('No authenticated user - returning empty memos array');
            return [];
        }

        try {
            this.setSyncStatus('syncing');
            
            const memos = await firestoreService.loadUserMemos();
            
            this.setSyncStatus('connected');
            this.log('Memos loaded successfully', { count: memos.length });
            
            return memos;
            
        } catch (error) {
            this.setSyncStatus('error');
            console.error('Error loading memos:', error);
            return []; // Return empty array on error
        }
    }

    // Update existing memo
    async updateMemo(memoId, updates) {
        if (!this.currentUser) {
            throw new Error('User must be authenticated to update memos');
        }

        try {
            this.setSyncStatus('syncing');
            
            await firestoreService.updateMemo(memoId, updates);
            
            this.setSyncStatus('connected');
            this.log('Memo updated successfully', { memoId });
            
        } catch (error) {
            this.setSyncStatus('error');
            console.error('Error updating memo in Firestore:', error);
            
            // Handle specific Firestore errors with localStorage fallback
            if (error.code === 'permission-denied') {
                console.warn('Firestore permission denied - falling back to localStorage for update');
                try {
                    const memos = JSON.parse(localStorage.getItem('memos') || '[]');
                    const memoIndex = memos.findIndex(m => m.id === memoId);
                    
                    if (memoIndex >= 0) {
                        memos[memoIndex] = { ...memos[memoIndex], ...updates, updatedAt: new Date().toISOString() };
                        localStorage.setItem('memos', JSON.stringify(memos));
                        this.setSyncStatus('offline');
                        this.log('Memo updated in localStorage as fallback', { memoId });
                        return;
                    } else {
                        throw new Error('Memo not found in localStorage');
                    }
                } catch (localError) {
                    console.error('Failed to update in localStorage:', localError);
                    throw new Error('Failed to update memo - please check your permissions or try again later');
                }
            } else {
                throw new Error('Failed to update memo: ' + error.message);
            }
        }
    }

    // Delete memo
    async deleteMemo(memoId) {
        if (!this.currentUser) {
            throw new Error('User must be authenticated to delete memos');
        }

        try {
            this.setSyncStatus('syncing');
            
            await firestoreService.deleteMemo(memoId);
            
            this.setSyncStatus('connected');
            this.log('Memo deleted successfully', { memoId });
            
        } catch (error) {
            this.setSyncStatus('error');
            console.error('Error deleting memo from Firestore:', error);
            
            // Handle specific Firestore errors with localStorage fallback
            if (error.code === 'permission-denied') {
                console.warn('Firestore permission denied - falling back to localStorage for deletion');
                try {
                    const memos = JSON.parse(localStorage.getItem('memos') || '[]');
                    const filteredMemos = memos.filter(m => m.id !== memoId);
                    
                    if (memos.length !== filteredMemos.length) {
                        localStorage.setItem('memos', JSON.stringify(filteredMemos));
                        this.setSyncStatus('offline');
                        this.log('Memo deleted from localStorage as fallback', { memoId });
                        return;
                    } else {
                        throw new Error('Memo not found in localStorage');
                    }
                } catch (localError) {
                    console.error('Failed to delete from localStorage:', localError);
                    throw new Error('Failed to delete memo - please check your permissions or try again later');
                }
            } else {
                throw new Error('Failed to delete memo: ' + error.message);
            }
        }
    }

    // Get user statistics
    async getUserStats() {
        if (!this.currentUser) {
            return {
                totalMemos: 0,
                recentMemos: 0,
                categories: {}
            };
        }

        try {
            return await firestoreService.getUserStats();
        } catch (error) {
            console.error('Error getting user stats:', error);
            return {
                totalMemos: 0,
                recentMemos: 0,
                categories: {}
            };
        }
    }

    // Check if user has existing data (for new users)
    async hasExistingData() {
        if (!this.currentUser) {
            return false;
        }

        try {
            return await firestoreService.hasExistingData();
        } catch (error) {
            console.error('Error checking existing data:', error);
            return false;
        }
    }

    // Register callback for data changes
    onDataChange(callback) {
        this.onDataChangeCallback = callback;
    }

    // Generate unique ID for memos
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Set sync status and update UI
    setSyncStatus(status) {
        this.syncStatus = status;
        this.updateSyncUI();
    }

    // Update sync status UI
    updateSyncUI() {
        const syncStatusElement = document.getElementById('sync-status');
        const storageStatusElement = document.getElementById('storage-status');
        
        if (!syncStatusElement || !storageStatusElement) {
            return;
        }

        switch (this.syncStatus) {
            case 'connected':
                syncStatusElement.textContent = '✅ Synced';
                syncStatusElement.className = 'sync-status sync-connected';
                break;
                
            case 'syncing':
                syncStatusElement.textContent = '🔄 Syncing...';
                syncStatusElement.className = 'sync-status sync-syncing';
                break;
                
            case 'error':
                syncStatusElement.textContent = '⚠️ Sync Error';
                syncStatusElement.className = 'sync-status sync-error';
                break;
                
            case 'disconnected':
            default:
                syncStatusElement.textContent = '📴 Offline';
                syncStatusElement.className = 'sync-status sync-disconnected';
                break;
        }

        // Update storage status with user info
        if (this.currentUser && storageStatusElement) {
            const displayName = this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'User';
            storageStatusElement.textContent = `☁️ Cloud Sync (${displayName})`;
        }
    }

    // Get current storage mode info
    getStorageInfo() {
        return {
            mode: 'cloud',
            isAuthenticated: !!this.currentUser,
            userId: this.currentUser?.uid || null,
            syncStatus: this.syncStatus,
            userEmail: this.currentUser?.email || null,
            userName: this.currentUser?.displayName || this.currentUser?.email?.split('@')[0] || null
        };
    }

    // Migrate localStorage data to Firestore (for existing users)
    async migrateLocalDataToCloud() {
        if (!this.currentUser) {
            throw new Error('User must be authenticated to migrate data');
        }

        try {
            // Check if user already has cloud data
            const hasCloudData = await this.hasExistingData();
            if (hasCloudData) {
                this.log('User already has cloud data, skipping migration');
                return { migrated: 0, skipped: true };
            }

            // Load local storage data
            const localMemos = this.loadLocalStorageData();
            if (localMemos.length === 0) {
                this.log('No local data to migrate');
                return { migrated: 0, skipped: false };
            }

            this.log('Migrating local data to cloud', { count: localMemos.length });
            this.setSyncStatus('syncing');

            // Save each memo to Firestore
            let migrated = 0;
            for (const memo of localMemos) {
                try {
                    await this.saveMemo(memo);
                    migrated++;
                } catch (error) {
                    console.error('Failed to migrate memo:', memo.id, error);
                }
            }

            this.setSyncStatus('connected');
            this.log('Migration completed', { migrated });

            return { migrated, skipped: false };

        } catch (error) {
            this.setSyncStatus('error');
            console.error('Migration failed:', error);
            throw error;
        }
    }

    // Load data from localStorage (for migration)
    loadLocalStorageData() {
        try {
            const data = localStorage.getItem('memos');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading localStorage data:', error);
            return [];
        }
    }

    // Logging utility
    log(message, data = null) {
        if (appConfig.LOG_LEVEL !== 'none') {
            console.log(`[StorageService] ${message}`, data || '');
        }
    }

    // Get current storage mode
    getStorageMode() {
        return this.currentUser ? 'firebase' : 'local';
    }

    // Export data for backup
    exportData() {
        // For now, return empty data - could be enhanced to export user data
        return {
            memos: [],
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
    }

    // Import data from backup
    async importData(data) {
        if (!data || !Array.isArray(data.memos)) {
            throw new Error('Invalid import data format');
        }

        // For now, just log the import - could be enhanced to import user data
        console.log('Import data:', data);
        return { imported: 0, errors: 0 };
    }

    // Clean up resources
    cleanup() {
        this.cleanupRealtimeSync();
        this.currentUser = null;
        this.onDataChangeCallback = null;
        this.isInitialized = false;
    }
}

// Create singleton instance
export const storageService = new StorageService();
