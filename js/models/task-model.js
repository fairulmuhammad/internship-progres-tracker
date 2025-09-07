/**
 * Task Model - Data structure for task management
 */

export class Task {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.title = data.title || '';
        this.description = data.description || '';
        this.category = data.category || 'general';
        this.priority = data.priority || 'medium'; // low, medium, high, critical
        this.status = data.status || 'todo'; // todo, in-progress, review, done
        this.userId = data.userId || null;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.dueDate = data.dueDate || null;
        this.estimatedHours = data.estimatedHours || 0;
        this.actualHours = data.actualHours || 0;
        this.tags = data.tags || [];
        this.subtasks = data.subtasks || [];
        this.comments = data.comments || [];
        this.attachments = data.attachments || [];
        this.assignedTo = data.assignedTo || null;
        this.createdBy = data.createdBy || null;
        this.completedAt = data.completedAt || null;
    }

    generateId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Convert to plain object for Firebase storage
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            category: this.category,
            priority: this.priority,
            status: this.status,
            userId: this.userId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            dueDate: this.dueDate,
            estimatedHours: this.estimatedHours,
            actualHours: this.actualHours,
            tags: this.tags,
            subtasks: this.subtasks,
            comments: this.comments,
            attachments: this.attachments,
            assignedTo: this.assignedTo,
            createdBy: this.createdBy,
            completedAt: this.completedAt
        };
    }

    // Update task properties
    update(data) {
        Object.assign(this, data);
        this.updatedAt = new Date().toISOString();
        return this;
    }

    // Mark task as complete
    complete() {
        this.status = 'done';
        this.completedAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
        return this;
    }

    // Mark task as in progress
    start() {
        this.status = 'in-progress';
        this.updatedAt = new Date().toISOString();
        return this;
    }

    // Get task priority color
    getPriorityColor() {
        const colors = {
            low: '#28a745',
            medium: '#ffc107',
            high: '#fd7e14',
            critical: '#dc3545'
        };
        return colors[this.priority] || colors.medium;
    }

    // Get status display info
    getStatusInfo() {
        const statusInfo = {
            todo: { label: 'To Do', color: '#6c757d', icon: '📋' },
            'in-progress': { label: 'In Progress', color: '#007bff', icon: '🔄' },
            review: { label: 'Review', color: '#ffc107', icon: '👀' },
            done: { label: 'Done', color: '#28a745', icon: '✅' }
        };
        return statusInfo[this.status] || statusInfo.todo;
    }

    // Check if task is overdue
    isOverdue() {
        if (!this.dueDate || this.status === 'done') return false;
        return new Date(this.dueDate) < new Date();
    }

    // Get days until due date
    getDaysUntilDue() {
        if (!this.dueDate) return null;
        const today = new Date();
        const due = new Date(this.dueDate);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    // Add a comment
    addComment(comment, userId, userName) {
        const newComment = {
            id: 'comment_' + Date.now(),
            text: comment,
            userId: userId,
            userName: userName,
            createdAt: new Date().toISOString()
        };
        this.comments.push(newComment);
        this.updatedAt = new Date().toISOString();
        return this;
    }

    // Add a subtask
    addSubtask(title) {
        const subtask = {
            id: 'subtask_' + Date.now(),
            title: title,
            completed: false,
            createdAt: new Date().toISOString()
        };
        this.subtasks.push(subtask);
        this.updatedAt = new Date().toISOString();
        return this;
    }

    // Toggle subtask completion
    toggleSubtask(subtaskId) {
        const subtask = this.subtasks.find(st => st.id === subtaskId);
        if (subtask) {
            subtask.completed = !subtask.completed;
            this.updatedAt = new Date().toISOString();
        }
        return this;
    }

    // Get completion percentage
    getCompletionPercentage() {
        if (this.status === 'done') return 100;
        if (this.subtasks.length === 0) {
            const statusProgress = {
                'todo': 0,
                'in-progress': 50,
                'review': 80,
                'done': 100
            };
            return statusProgress[this.status] || 0;
        }
        
        const completedSubtasks = this.subtasks.filter(st => st.completed).length;
        return Math.round((completedSubtasks / this.subtasks.length) * 100);
    }

    // Static method to create from Firebase data
    static fromJSON(data) {
        return new Task(data);
    }

    // Validate task data
    validate() {
        const errors = [];
        
        if (!this.title || this.title.trim().length === 0) {
            errors.push('Title is required');
        }
        
        if (!this.category) {
            errors.push('Category is required');
        }
        
        if (!['low', 'medium', 'high', 'critical'].includes(this.priority)) {
            errors.push('Invalid priority level');
        }
        
        if (!['todo', 'in-progress', 'review', 'done'].includes(this.status)) {
            errors.push('Invalid status');
        }
        
        if (this.dueDate && new Date(this.dueDate).toString() === 'Invalid Date') {
            errors.push('Invalid due date');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}
