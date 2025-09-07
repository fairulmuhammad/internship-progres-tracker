/**
 * Task Service - Handles task CRUD operations and Firebase integration
 */

import { Task } from '../models/task-model.js';
import { categoryService } from './category-service.js';

export class TaskService {
    constructor(authService) {
        this.authService = authService;
        this.db = null;
        this.currentUser = null;
        this.taskListeners = new Map(); // For real-time updates
        this.isInitialized = false;
        
        // Bind methods to preserve context
        this.handleAuthStateChange = this.handleAuthStateChange.bind(this);
    }

    // Initialize service
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Wait for Firebase to be available
            await this.waitForFirebase();
            
            // Initialize Firestore
            const { getFirestore } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            this.db = getFirestore();
            
            // Listen to auth state changes
            this.authService.onAuthStateChanged(this.handleAuthStateChange);
            
            this.isInitialized = true;
            console.log('TaskService initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize TaskService:', error);
            throw error;
        }
    }

    // Wait for Firebase to be available globally
    async waitForFirebase() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!window.Firebase && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.Firebase) {
            throw new Error('Firebase not available after waiting');
        }
    }

    // Handle authentication state changes
    handleAuthStateChange(user) {
        this.currentUser = user;
        
        if (!user) {
            // Clear task listeners when user signs out
            this.clearAllListeners();
        }
    }

    // Get current user's task collection reference
    async getUserTasksCollection() {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }
        
        const { collection } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
        return collection(this.db, `users/${this.currentUser.uid}/tasks`);
    }

    // Create a new task
    async createTask(taskData) {
        if (!this.isInitialized) {
            throw new Error('TaskService not initialized');
        }

        try {
            const task = new Task({
                ...taskData,
                userId: this.currentUser.uid,
                createdBy: this.currentUser.uid
            });

            // Validate task
            const validation = task.validate();
            if (!validation.isValid) {
                throw new Error('Task validation failed: ' + validation.errors.join(', '));
            }

            // Save to Firestore
            const { addDoc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            const tasksCollection = await this.getUserTasksCollection();
            const docRef = await addDoc(tasksCollection, task.toJSON());
            
            // Update task with Firestore ID
            task.id = docRef.id;
            await this.updateTask(task.id, { id: docRef.id });

            console.log('Task created successfully:', task.id);
            return task;

        } catch (error) {
            console.error('Error creating task:', error);
            throw new Error('Failed to create task: ' + error.message);
        }
    }

    // Get task by ID
    async getTask(taskId) {
        if (!this.isInitialized) {
            throw new Error('TaskService not initialized');
        }

        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            const tasksCollection = await this.getUserTasksCollection();
            const taskDoc = doc(tasksCollection, taskId);
            const docSnap = await getDoc(taskDoc);

            if (docSnap.exists()) {
                return Task.fromJSON({ id: docSnap.id, ...docSnap.data() });
            } else {
                throw new Error('Task not found');
            }

        } catch (error) {
            console.error('Error getting task:', error);
            throw new Error('Failed to get task: ' + error.message);
        }
    }

    // Get all tasks for current user
    async getTasks(filters = {}) {
        if (!this.isInitialized) {
            throw new Error('TaskService not initialized');
        }

        try {
            const { getDocs, query, where, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            
            const tasksCollection = await this.getUserTasksCollection();
            let q = tasksCollection;

            // Apply filters
            if (filters.status) {
                q = query(q, where('status', '==', filters.status));
            }

            if (filters.category) {
                q = query(q, where('category', '==', filters.category));
            }

            if (filters.priority) {
                q = query(q, where('priority', '==', filters.priority));
            }

            // Apply ordering
            const orderField = filters.orderBy || 'createdAt';
            const orderDirection = filters.orderDirection || 'desc';
            q = query(q, orderBy(orderField, orderDirection));

            // Apply limit
            if (filters.limit) {
                q = query(q, limit(filters.limit));
            }

            const querySnapshot = await getDocs(q);
            const tasks = [];

            querySnapshot.forEach((doc) => {
                tasks.push(Task.fromJSON({ id: doc.id, ...doc.data() }));
            });

            return tasks;

        } catch (error) {
            console.error('Error getting tasks:', error);
            throw new Error('Failed to get tasks: ' + error.message);
        }
    }

    // Update task
    async updateTask(taskId, updates) {
        if (!this.isInitialized) {
            throw new Error('TaskService not initialized');
        }

        try {
            const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            
            // Add update timestamp
            const updateData = {
                ...updates,
                updatedAt: new Date().toISOString()
            };

            const tasksCollection = await this.getUserTasksCollection();
            const taskDoc = doc(tasksCollection, taskId);
            await updateDoc(taskDoc, updateData);

            console.log('Task updated successfully:', taskId);
            return await this.getTask(taskId);

        } catch (error) {
            console.error('Error updating task:', error);
            throw new Error('Failed to update task: ' + error.message);
        }
    }

    // Delete task
    async deleteTask(taskId) {
        if (!this.isInitialized) {
            throw new Error('TaskService not initialized');
        }

        try {
            const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            
            const tasksCollection = await this.getUserTasksCollection();
            const taskDoc = doc(tasksCollection, taskId);
            await deleteDoc(taskDoc);

            console.log('Task deleted successfully:', taskId);
            return true;

        } catch (error) {
            console.error('Error deleting task:', error);
            throw new Error('Failed to delete task: ' + error.message);
        }
    }

    // Mark task as complete
    async completeTask(taskId) {
        try {
            return await this.updateTask(taskId, {
                status: 'done',
                completedAt: new Date().toISOString()
            });
        } catch (error) {
            throw new Error('Failed to complete task: ' + error.message);
        }
    }

    // Start working on task
    async startTask(taskId) {
        try {
            return await this.updateTask(taskId, {
                status: 'in-progress'
            });
        } catch (error) {
            throw new Error('Failed to start task: ' + error.message);
        }
    }

    // Add comment to task
    async addComment(taskId, comment) {
        try {
            const task = await this.getTask(taskId);
            const newComment = {
                id: 'comment_' + Date.now(),
                text: comment,
                userId: this.currentUser.uid,
                userName: this.currentUser.displayName || this.currentUser.email,
                createdAt: new Date().toISOString()
            };

            task.comments.push(newComment);
            return await this.updateTask(taskId, { comments: task.comments });

        } catch (error) {
            throw new Error('Failed to add comment: ' + error.message);
        }
    }

    // Get task statistics
    async getTaskStats() {
        try {
            const tasks = await this.getTasks();
            
            const stats = {
                total: tasks.length,
                todo: tasks.filter(t => t.status === 'todo').length,
                inProgress: tasks.filter(t => t.status === 'in-progress').length,
                review: tasks.filter(t => t.status === 'review').length,
                completed: tasks.filter(t => t.status === 'done').length,
                overdue: tasks.filter(t => t.isOverdue()).length,
                categoryStats: categoryService.getCategoryStats(tasks),
                priorityStats: {
                    low: tasks.filter(t => t.priority === 'low').length,
                    medium: tasks.filter(t => t.priority === 'medium').length,
                    high: tasks.filter(t => t.priority === 'high').length,
                    critical: tasks.filter(t => t.priority === 'critical').length
                },
                completionRate: tasks.length > 0 ? Math.round((stats.completed / tasks.length) * 100) : 0
            };

            return stats;

        } catch (error) {
            throw new Error('Failed to get task statistics: ' + error.message);
        }
    }

    // Listen to real-time task updates
    async listenToTasks(callback, filters = {}) {
        if (!this.isInitialized || !this.currentUser) {
            throw new Error('TaskService not initialized or user not authenticated');
        }

        try {
            const { onSnapshot, query, where, orderBy } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
            
            const tasksCollection = await this.getUserTasksCollection();
            let q = tasksCollection;

            // Apply filters (similar to getTasks)
            if (filters.status) {
                q = query(q, where('status', '==', filters.status));
            }

            if (filters.category) {
                q = query(q, where('category', '==', filters.category));
            }

            // Order by creation date
            q = query(q, orderBy('createdAt', 'desc'));

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const tasks = [];
                querySnapshot.forEach((doc) => {
                    tasks.push(Task.fromJSON({ id: doc.id, ...doc.data() }));
                });
                
                callback(tasks);
            }, (error) => {
                console.error('Error in task listener:', error);
                callback([], error);
            });

            // Store listener for cleanup
            const listenerId = 'tasks_' + Date.now();
            this.taskListeners.set(listenerId, unsubscribe);

            return () => {
                unsubscribe();
                this.taskListeners.delete(listenerId);
            };

        } catch (error) {
            console.error('Error setting up task listener:', error);
            throw error;
        }
    }

    // Clear all listeners
    clearAllListeners() {
        this.taskListeners.forEach((unsubscribe) => {
            unsubscribe();
        });
        this.taskListeners.clear();
    }

    // Search tasks
    async searchTasks(searchTerm, filters = {}) {
        try {
            const allTasks = await this.getTasks(filters);
            
            if (!searchTerm) return allTasks;

            const lowerSearchTerm = searchTerm.toLowerCase();
            
            return allTasks.filter(task => 
                task.title.toLowerCase().includes(lowerSearchTerm) ||
                task.description.toLowerCase().includes(lowerSearchTerm) ||
                task.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
            );

        } catch (error) {
            throw new Error('Failed to search tasks: ' + error.message);
        }
    }

    // Bulk update tasks
    async bulkUpdateTasks(taskIds, updates) {
        const results = [];
        
        for (const taskId of taskIds) {
            try {
                const result = await this.updateTask(taskId, updates);
                results.push({ taskId, success: true, task: result });
            } catch (error) {
                results.push({ taskId, success: false, error: error.message });
            }
        }

        return results;
    }

    // Export tasks
    async exportTasks(format = 'json') {
        try {
            const tasks = await this.getTasks();
            const exportData = {
                tasks: tasks.map(task => task.toJSON()),
                categories: categoryService.exportCategories(),
                exportedAt: new Date().toISOString(),
                exportedBy: this.currentUser.uid
            };

            if (format === 'json') {
                return JSON.stringify(exportData, null, 2);
            }

            // Could add CSV export here later
            return exportData;

        } catch (error) {
            throw new Error('Failed to export tasks: ' + error.message);
        }
    }
}

// Create task service instance (will be initialized by auth service)
let taskServiceInstance = null;

export const initializeTaskService = (authService) => {
    if (!taskServiceInstance) {
        taskServiceInstance = new TaskService(authService);
    }
    return taskServiceInstance;
};

export const getTaskService = () => {
    if (!taskServiceInstance) {
        throw new Error('TaskService not initialized. Call initializeTaskService first.');
    }
    return taskServiceInstance;
};
