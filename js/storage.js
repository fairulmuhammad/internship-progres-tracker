// Storage Service - Handles both Firebase and Local Storage
import { appConfig, LOG_LEVEL } from './config.js';

class StorageService {
    constructor() {
        this.isFirebaseMode = !appConfig.USE_LOCAL_STORAGE;
        this.isInitialized = false;
        this.userId = null;
        this.firebaseApp = null;
        this.auth = null;
        this.db = null;
        this.onDataChangeCallback = null;
    }

    // Initialize storage service
    async initialize() {
        if (this.isInitialized) return;

        if (this.isFirebaseMode) {
            await this.initializeFirebase();
        } else {
            this.initializeLocalStorage();
        }
        
        this.isInitialized = true;
        this.log('Storage service initialized', { mode: this.isFirebaseMode ? 'Firebase' : 'Local Storage' });
    }

    // Initialize Firebase
    async initializeFirebase() {
        try {
            const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
            const { getAuth, signInAnonymously, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
            const { getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, orderBy } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            
            // Import Firebase config
            const { firebaseConfig } = await import('./config.js');
            
            this.firebaseApp = initializeApp(firebaseConfig);
            this.auth = getAuth(this.firebaseApp);
            this.db = getFirestore(this.firebaseApp);
            
            // Store Firebase methods for later use
            this.firebaseMethods = {
                collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, orderBy,
                signInAnonymously, onAuthStateChanged
            };
            
            this.log('Firebase initialized successfully');
            
            // Set up authentication
            await this.setupFirebaseAuth();
            
        } catch (error) {
            this.logError('Firebase initialization failed', error);
            throw new Error('Firebase configuration error. Please check your settings.');
        }
    }

    // Setup Firebase authentication
    async setupFirebaseAuth() {
        return new Promise((resolve, reject) => {
            this.firebaseMethods.onAuthStateChanged(this.auth, async (user) => {
                if (user) {
                    this.log("User authenticated with UID:", user.uid);
                    this.userId = user.uid;
                    await this.setupFirebaseListener();
                    resolve();
                } else {
                    this.log("No user signed in, signing in anonymously.");
                    try {
                        await this.firebaseMethods.signInAnonymously(this.auth);
                    } catch (error) {
                        this.logError("Anonymous sign-in failed", error);
                        reject(new Error('Firebase authentication failed'));
                    }
                }
            });
        });
    }

    // Setup Firebase real-time listener
    async setupFirebaseListener() {
        if (!this.userId) return;
        
        const memosCollectionPath = `artifacts/${appConfig.APP_ID}/users/${this.userId}/memos`;
        this.log("Setting up listener for:", memosCollectionPath);

        const q = this.firebaseMethods.query(
            this.firebaseMethods.collection(this.db, memosCollectionPath),
            this.firebaseMethods.orderBy('createdAt', 'desc')
        );
        
        this.firebaseMethods.onSnapshot(q, (snapshot) => {
            const memos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.log('Memos updated from Firebase', { count: memos.length });
            
            if (this.onDataChangeCallback) {
                this.onDataChangeCallback(memos);
            }
        }, (error) => {
            this.logError("Error in Firebase listener", error);
        });
    }

    // Initialize local storage
    initializeLocalStorage() {
        this.userId = 'local-user';
        this.log('Local storage initialized');
    }

    // Set callback for data changes
    onDataChange(callback) {
        this.onDataChangeCallback = callback;
        
        // If using local storage, trigger initial load
        if (!this.isFirebaseMode) {
            const memos = this.loadFromLocalStorage();
            callback(memos);
        }
    }

    // Add a new memo
    async addMemo(memoData) {
        if (!this.isInitialized) {
            throw new Error('Storage service not initialized');
        }

        const memoWithTimestamp = {
            ...memoData,
            createdAt: new Date().toISOString()
        };

        if (this.isFirebaseMode) {
            return await this.addMemoToFirebase(memoWithTimestamp);
        } else {
            return this.addMemoToLocalStorage(memoWithTimestamp);
        }
    }

    // Update existing memo
    async updateMemo(id, memoData) {
        if (!this.isInitialized) {
            throw new Error('Storage service not initialized');
        }

        const updatedData = {
            ...memoData,
            updatedAt: new Date().toISOString()
        };

        if (this.isFirebaseMode) {
            return await this.updateMemoInFirebase(id, updatedData);
        } else {
            return this.updateMemoInLocalStorage(id, updatedData);
        }
    }

    // Delete memo
    async deleteMemo(id) {
        if (!this.isInitialized) {
            throw new Error('Storage service not initialized');
        }

        if (this.isFirebaseMode) {
            return await this.deleteMemoFromFirebase(id);
        } else {
            return this.deleteMemoFromLocalStorage(id);
        }
    }

    // Firebase specific methods
    async addMemoToFirebase(memoData) {
        if (!this.userId) throw new Error('User not authenticated');
        
        try {
            const memosCollectionPath = `artifacts/${appConfig.APP_ID}/users/${this.userId}/memos`;
            const docRef = await this.firebaseMethods.addDoc(
                this.firebaseMethods.collection(this.db, memosCollectionPath), 
                memoData
            );
            this.log("Memo added to Firebase", { id: docRef.id });
            return docRef.id;
        } catch (error) {
            this.logError("Error adding memo to Firebase", error);
            throw error;
        }
    }

    async updateMemoInFirebase(id, memoData) {
        if (!this.userId) throw new Error('User not authenticated');
        
        try {
            const memoDocPath = `artifacts/${appConfig.APP_ID}/users/${this.userId}/memos/${id}`;
            const memoRef = this.firebaseMethods.doc(this.db, memoDocPath);
            await this.firebaseMethods.updateDoc(memoRef, memoData);
            this.log("Memo updated in Firebase", { id });
        } catch (error) {
            this.logError("Error updating memo in Firebase", error);
            throw error;
        }
    }

    async deleteMemoFromFirebase(id) {
        if (!this.userId) throw new Error('User not authenticated');
        
        try {
            const memoDocPath = `artifacts/${appConfig.APP_ID}/users/${this.userId}/memos/${id}`;
            await this.firebaseMethods.deleteDoc(this.firebaseMethods.doc(this.db, memoDocPath));
            this.log("Memo deleted from Firebase", { id });
        } catch (error) {
            this.logError("Error deleting memo from Firebase", error);
            throw error;
        }
    }

    // Local storage specific methods
    addMemoToLocalStorage(memoData) {
        const memos = this.loadFromLocalStorage();
        const newMemo = {
            id: Date.now().toString(),
            ...memoData
        };
        memos.unshift(newMemo);
        this.saveToLocalStorage(memos);
        
        // Trigger data change callback
        if (this.onDataChangeCallback) {
            this.onDataChangeCallback(memos);
        }
        
        this.log("Memo added to local storage", { id: newMemo.id });
        return newMemo.id;
    }

    updateMemoInLocalStorage(id, memoData) {
        const memos = this.loadFromLocalStorage();
        const index = memos.findIndex(memo => memo.id === id);
        
        if (index !== -1) {
            memos[index] = { ...memos[index], ...memoData };
            this.saveToLocalStorage(memos);
            
            // Trigger data change callback
            if (this.onDataChangeCallback) {
                this.onDataChangeCallback(memos);
            }
            
            this.log("Memo updated in local storage", { id });
        } else {
            throw new Error(`Memo with id ${id} not found`);
        }
    }

    deleteMemoFromLocalStorage(id) {
        const memos = this.loadFromLocalStorage();
        const filteredMemos = memos.filter(memo => memo.id !== id);
        
        if (filteredMemos.length === memos.length) {
            throw new Error(`Memo with id ${id} not found`);
        }
        
        this.saveToLocalStorage(filteredMemos);
        
        // Trigger data change callback
        if (this.onDataChangeCallback) {
            this.onDataChangeCallback(filteredMemos);
        }
        
        this.log("Memo deleted from local storage", { id });
    }

    // Local storage utilities
    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem(appConfig.STORAGE_KEYS.MEMOS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            this.logError("Error loading from local storage", error);
            return [];
        }
    }

    saveToLocalStorage(memos) {
        try {
            localStorage.setItem(appConfig.STORAGE_KEYS.MEMOS, JSON.stringify(memos));
        } catch (error) {
            this.logError("Error saving to local storage", error);
            throw error;
        }
    }

    // Import/Export functionality
    exportData() {
        if (this.isFirebaseMode) {
            throw new Error('Export not available in Firebase mode. Data is automatically synced.');
        }
        
        const memos = this.loadFromLocalStorage();
        return {
            memos,
            exportDate: new Date().toISOString(),
            version: '2.0',
            source: 'local-storage'
        };
    }

    async importData(data) {
        if (!data.memos || !Array.isArray(data.memos)) {
            throw new Error('Invalid data format');
        }

        if (this.isFirebaseMode) {
            // For Firebase, we need to add each memo individually
            for (const memo of data.memos) {
                const { id, ...memoData } = memo; // Remove the old ID
                await this.addMemo(memoData);
            }
        } else {
            // For local storage, replace all data
            this.saveToLocalStorage(data.memos);
            if (this.onDataChangeCallback) {
                this.onDataChangeCallback(data.memos);
            }
        }
        
        this.log("Data imported successfully", { count: data.memos.length });
    }

    // Utility methods
    log(message, data = null) {
        if (LOG_LEVEL === 'debug') {
            console.log(`[StorageService] ${message}`, data || '');
        }
    }

    logError(message, error) {
        console.error(`[StorageService] ${message}`, error);
    }

    // Get current storage mode
    getStorageMode() {
        return this.isFirebaseMode ? 'firebase' : 'localStorage';
    }

    // Check if storage is ready
    isReady() {
        return this.isInitialized && (this.isFirebaseMode ? this.userId !== null : true);
    }
}

// Export singleton instance
export const storageService = new StorageService();
