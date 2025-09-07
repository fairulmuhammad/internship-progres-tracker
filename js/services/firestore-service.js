// Firebase Firestore Service - User-specific memo storage
import { firebaseConfig } from '../config.js';

class FirestoreService {
    constructor() {
        this.db = null;
        this.currentUserId = null;
        this.isInitialized = false;
        this.firebaseApp = null;
    }

    // Initialize Firestore
    async initialize(firebaseApp) {
        if (this.isInitialized) {
            return;
        }

        try {
            // Import Firestore
            const { getFirestore, enableNetwork } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            
            this.firebaseApp = firebaseApp;
            this.db = getFirestore(firebaseApp);
            
            // Enable network for real-time updates
            await enableNetwork(this.db);
            
            this.isInitialized = true;
            console.log('Firestore initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Firestore:', error);
            throw error;
        }
    }

    // Set current user for data operations
    setCurrentUser(userId) {
        this.currentUserId = userId;
        console.log('Firestore user set:', userId);
    }

    // Clear current user
    clearCurrentUser() {
        this.currentUserId = null;
        console.log('Firestore user cleared');
    }

    // Get user's memo collection reference
    getUserMemoCollection() {
        if (!this.currentUserId) {
            throw new Error('No user set for Firestore operations');
        }
        
        // Each user has their own subcollection: users/{userId}/memos
        return `users/${this.currentUserId}/memos`;
    }

    // Save memo to Firestore
    async saveMemo(memo) {
        if (!this.isInitialized || !this.currentUserId) {
            throw new Error('Firestore not initialized or no user set');
        }

        try {
            const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            
            const memoData = {
                ...memo,
                userId: this.currentUserId,
                updatedAt: serverTimestamp(),
                createdAt: memo.createdAt || serverTimestamp()
            };

            // Use memo ID as document ID for easy retrieval
            const docRef = doc(this.db, this.getUserMemoCollection(), memo.id);
            await setDoc(docRef, memoData);
            
            console.log('Memo saved to Firestore:', memo.id);
            return memo;
            
        } catch (error) {
            console.error('Error saving memo to Firestore:', error);
            throw error;
        }
    }

    // Load all memos for current user
    async loadUserMemos() {
        if (!this.isInitialized || !this.currentUserId) {
            throw new Error('Firestore not initialized or no user set');
        }

        try {
            const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            
            // Query user's memos ordered by creation date (newest first)
            const memosCollection = collection(this.db, this.getUserMemoCollection());
            const q = query(memosCollection, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            
            const memos = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Convert Firestore timestamps to regular dates
                memos.push({
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
                    updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
                });
            });
            
            console.log(`Loaded ${memos.length} memos for user:`, this.currentUserId);
            return memos;
            
        } catch (error) {
            console.error('Error loading user memos:', error);
            return []; // Return empty array on error
        }
    }

    // Delete memo from Firestore
    async deleteMemo(memoId) {
        if (!this.isInitialized || !this.currentUserId) {
            throw new Error('Firestore not initialized or no user set');
        }

        try {
            const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            
            const docRef = doc(this.db, this.getUserMemoCollection(), memoId);
            await deleteDoc(docRef);
            
            console.log('Memo deleted from Firestore:', memoId);
            
        } catch (error) {
            console.error('Error deleting memo from Firestore:', error);
            throw error;
        }
    }

    // Update memo in Firestore
    async updateMemo(memoId, updates) {
        if (!this.isInitialized || !this.currentUserId) {
            throw new Error('Firestore not initialized or no user set');
        }

        try {
            const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            
            const updateData = {
                ...updates,
                updatedAt: serverTimestamp()
            };

            const docRef = doc(this.db, this.getUserMemoCollection(), memoId);
            await updateDoc(docRef, updateData);
            
            console.log('Memo updated in Firestore:', memoId);
            
        } catch (error) {
            console.error('Error updating memo in Firestore:', error);
            throw error;
        }
    }

    // Get user's memo statistics
    async getUserStats() {
        if (!this.isInitialized || !this.currentUserId) {
            return {
                totalMemos: 0,
                recentMemos: 0,
                categories: {}
            };
        }

        try {
            const memos = await this.loadUserMemos();
            
            // Calculate stats
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            const recentMemos = memos.filter(memo => 
                new Date(memo.createdAt) >= sevenDaysAgo
            ).length;
            
            // Count categories
            const categories = {};
            memos.forEach(memo => {
                if (memo.category) {
                    categories[memo.category] = (categories[memo.category] || 0) + 1;
                }
            });
            
            return {
                totalMemos: memos.length,
                recentMemos,
                categories,
                lastActivity: memos.length > 0 ? memos[0].createdAt : null
            };
            
        } catch (error) {
            console.error('Error getting user stats:', error);
            return {
                totalMemos: 0,
                recentMemos: 0,
                categories: {}
            };
        }
    }

    // Listen to real-time updates for user's memos
    setupRealtimeListener(callback) {
        if (!this.isInitialized || !this.currentUserId) {
            console.warn('Cannot setup realtime listener: Firestore not initialized or no user set');
            return () => {}; // Return empty unsubscribe function
        }

        try {
            import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js').then(
                ({ collection, onSnapshot, query, orderBy }) => {
                    const memosCollection = collection(this.db, this.getUserMemoCollection());
                    const q = query(memosCollection, orderBy('createdAt', 'desc'));
                    
                    const unsubscribe = onSnapshot(q, (querySnapshot) => {
                        const memos = [];
                        querySnapshot.forEach((doc) => {
                            const data = doc.data();
                            memos.push({
                                ...data,
                                id: doc.id,
                                createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
                                updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
                            });
                        });
                        
                        console.log('Real-time update: received', memos.length, 'memos');
                        callback(memos);
                    }, (error) => {
                        console.error('Realtime listener error:', error);
                    });
                    
                    return unsubscribe;
                }
            );
        } catch (error) {
            console.error('Error setting up realtime listener:', error);
            return () => {};
        }
    }

    // Initialize user document (called on first login)
    async initializeUserDocument(userInfo) {
        if (!this.isInitialized || !this.currentUserId) {
            throw new Error('Firestore not initialized or no user set');
        }

        try {
            const { doc, setDoc, getDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            
            const userDocRef = doc(this.db, 'users', this.currentUserId);
            const userDoc = await getDoc(userDocRef);
            
            if (!userDoc.exists()) {
                // Create user document for new user
                const userData = {
                    uid: this.currentUserId,
                    email: userInfo.email,
                    displayName: userInfo.displayName || userInfo.email?.split('@')[0] || 'User',
                    photoURL: userInfo.photoURL || null,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                    memoCount: 0
                };
                
                await setDoc(userDocRef, userData);
                console.log('New user document created:', this.currentUserId);
            } else {
                // Update last login for existing user
                const { updateDoc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
                await updateDoc(userDocRef, {
                    lastLogin: serverTimestamp()
                });
                console.log('User last login updated:', this.currentUserId);
            }
            
        } catch (error) {
            console.error('Error initializing user document:', error);
        }
    }

    // Check if user has any existing data
    async hasExistingData() {
        if (!this.isInitialized || !this.currentUserId) {
            return false;
        }

        try {
            const memos = await this.loadUserMemos();
            return memos.length > 0;
        } catch (error) {
            console.error('Error checking existing data:', error);
            return false;
        }
    }
}

// Create singleton instance
export const firestoreService = new FirestoreService();
