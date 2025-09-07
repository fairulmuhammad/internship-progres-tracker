/**
 * Task List Component - Displays and manages task list interface
 */

import { categoryService } from '../services/category-service.js';

export class TaskList {
    constructor(container, taskService) {
        this.container = container;
        this.taskService = taskService;
        this.tasks = [];
        this.filteredTasks = [];
        this.currentFilters = {};
        this.currentSort = { field: 'createdAt', direction: 'desc' };
        this.searchTerm = '';
        
        // Task listener cleanup function
        this.taskListener = null;
        
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
        this.loadTasks();
    }

    render() {
        this.container.innerHTML = `
            <div class="task-list-container">
                <!-- Header -->
                <div class="task-list-header">
                    <div class="header-left">
                        <h2>📋 My Tasks</h2>
                        <span class="task-count">0 tasks</span>
                    </div>
                    <div class="header-right">
                        <button class="btn btn-primary" id="add-task-btn">
                            <span class="btn-icon">➕</span>
                            New Task
                        </button>
                    </div>
                </div>

                <!-- Filters and Search -->
                <div class="task-filters">
                    <div class="search-container">
                        <input 
                            type="text" 
                            id="task-search" 
                            placeholder="🔍 Search tasks..."
                            class="search-input"
                        >
                    </div>
                    
                    <div class="filter-container">
                        <select id="status-filter" class="filter-select">
                            <option value="">All Status</option>
                            <option value="todo">📋 To Do</option>
                            <option value="in-progress">🔄 In Progress</option>
                            <option value="review">👀 Review</option>
                            <option value="done">✅ Done</option>
                        </select>
                        
                        <select id="category-filter" class="filter-select">
                            <option value="">All Categories</option>
                        </select>
                        
                        <select id="priority-filter" class="filter-select">
                            <option value="">All Priority</option>
                            <option value="low">🟢 Low</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="high">🟠 High</option>
                            <option value="critical">🔴 Critical</option>
                        </select>

                        <select id="sort-select" class="filter-select">
                            <option value="createdAt-desc">Latest First</option>
                            <option value="createdAt-asc">Oldest First</option>
                            <option value="dueDate-asc">Due Date</option>
                            <option value="priority-desc">Priority</option>
                            <option value="title-asc">Title A-Z</option>
                        </select>
                    </div>
                </div>

                <!-- Task Statistics -->
                <div class="task-stats" id="task-stats">
                    <div class="stat-card">
                        <div class="stat-number">0</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">0</div>
                        <div class="stat-label">To Do</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">0</div>
                        <div class="stat-label">In Progress</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">0</div>
                        <div class="stat-label">Completed</div>
                    </div>
                </div>

                <!-- Task List -->
                <div class="task-list-content">
                    <div id="task-list" class="task-grid">
                        <!-- Tasks will be rendered here -->
                    </div>
                    
                    <div id="empty-state" class="empty-state hidden">
                        <div class="empty-icon">📝</div>
                        <h3>No tasks yet</h3>
                        <p>Create your first task to get started with tracking your progress!</p>
                        <button class="btn btn-primary" id="empty-add-task">
                            ➕ Create Your First Task
                        </button>
                    </div>
                    
                    <div id="no-results" class="empty-state hidden">
                        <div class="empty-icon">🔍</div>
                        <h3>No tasks found</h3>
                        <p>Try adjusting your search or filters to find what you're looking for.</p>
                        <button class="btn btn-secondary" id="clear-filters">
                            Clear Filters
                        </button>
                    </div>
                </div>

                <!-- Loading State -->
                <div id="loading-state" class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading tasks...</p>
                </div>
            </div>
        `;

        this.populateCategoryFilter();
    }

    populateCategoryFilter() {
        const categoryFilter = this.container.querySelector('#category-filter');
        const categories = categoryService.getAllCategories();
        
        // Clear existing options except "All Categories"
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = `${category.icon} ${category.name}`;
            categoryFilter.appendChild(option);
        });
    }

    setupEventListeners() {
        const container = this.container;

        // Add task buttons
        container.querySelector('#add-task-btn')?.addEventListener('click', () => {
            this.showTaskForm();
        });
        
        container.querySelector('#empty-add-task')?.addEventListener('click', () => {
            this.showTaskForm();
        });

        // Search
        container.querySelector('#task-search')?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.filterTasks();
        });

        // Filters
        container.querySelector('#status-filter')?.addEventListener('change', (e) => {
            this.currentFilters.status = e.target.value || undefined;
            this.filterTasks();
        });

        container.querySelector('#category-filter')?.addEventListener('change', (e) => {
            this.currentFilters.category = e.target.value || undefined;
            this.filterTasks();
        });

        container.querySelector('#priority-filter')?.addEventListener('change', (e) => {
            this.currentFilters.priority = e.target.value || undefined;
            this.filterTasks();
        });

        // Sort
        container.querySelector('#sort-select')?.addEventListener('change', (e) => {
            const [field, direction] = e.target.value.split('-');
            this.currentSort = { field, direction };
            this.filterTasks();
        });

        // Clear filters
        container.querySelector('#clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });
    }

    async loadTasks() {
        try {
            this.showLoading();
            
            // Set up real-time listener
            this.taskListener = this.taskService.listenToTasks((tasks, error) => {
                if (error) {
                    console.error('Error loading tasks:', error);
                    this.showError('Failed to load tasks');
                    return;
                }
                
                this.tasks = tasks;
                this.filterTasks();
                this.updateStats();
            });
            
        } catch (error) {
            console.error('Error setting up task listener:', error);
            this.showError('Failed to load tasks');
        }
    }

    filterTasks() {
        let filtered = [...this.tasks];

        // Apply search
        if (this.searchTerm) {
            const searchLower = this.searchTerm.toLowerCase();
            filtered = filtered.filter(task => 
                task.title.toLowerCase().includes(searchLower) ||
                task.description.toLowerCase().includes(searchLower) ||
                task.tags.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }

        // Apply filters
        Object.entries(this.currentFilters).forEach(([key, value]) => {
            if (value) {
                filtered = filtered.filter(task => task[key] === value);
            }
        });

        // Apply sorting
        filtered.sort((a, b) => {
            const field = this.currentSort.field;
            const direction = this.currentSort.direction === 'asc' ? 1 : -1;
            
            let aValue = a[field];
            let bValue = b[field];
            
            // Handle special sorting cases
            if (field === 'priority') {
                const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
                aValue = priorityOrder[a.priority];
                bValue = priorityOrder[b.priority];
            } else if (field === 'dueDate') {
                aValue = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
                bValue = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
            }

            if (aValue < bValue) return -direction;
            if (aValue > bValue) return direction;
            return 0;
        });

        this.filteredTasks = filtered;
        this.renderTasks();
        this.updateTaskCount();
    }

    renderTasks() {
        const taskList = this.container.querySelector('#task-list');
        const emptyState = this.container.querySelector('#empty-state');
        const noResults = this.container.querySelector('#no-results');
        
        this.hideLoading();

        if (this.tasks.length === 0) {
            // No tasks at all
            taskList.innerHTML = '';
            emptyState.classList.remove('hidden');
            noResults.classList.add('hidden');
            return;
        }

        if (this.filteredTasks.length === 0) {
            // No tasks match current filters
            taskList.innerHTML = '';
            emptyState.classList.add('hidden');
            noResults.classList.remove('hidden');
            return;
        }

        // Hide empty states
        emptyState.classList.add('hidden');
        noResults.classList.add('hidden');

        // Render tasks
        taskList.innerHTML = this.filteredTasks.map(task => this.renderTaskCard(task)).join('');
        
        // Setup task card event listeners
        this.setupTaskCardListeners();
    }

    renderTaskCard(task) {
        const category = categoryService.getCategoryById(task.category);
        const statusInfo = task.getStatusInfo();
        const isOverdue = task.isOverdue();
        const daysUntilDue = task.getDaysUntilDue();
        
        return `
            <div class="task-card ${isOverdue ? 'overdue' : ''}" data-task-id="${task.id}">
                <div class="task-header">
                    <div class="task-priority" style="background-color: ${task.getPriorityColor()}">
                        ${task.priority.toUpperCase()}
                    </div>
                    <div class="task-category" style="color: ${category?.color || '#6c757d'}">
                        ${category?.icon || '📁'} ${category?.name || 'General'}
                    </div>
                    <div class="task-actions">
                        <button class="btn-icon" title="Edit Task" data-action="edit">✏️</button>
                        <button class="btn-icon" title="Delete Task" data-action="delete">🗑️</button>
                    </div>
                </div>
                
                <div class="task-content">
                    <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                    <p class="task-description">${this.escapeHtml(task.description || '')}</p>
                    
                    ${task.tags.length > 0 ? `
                        <div class="task-tags">
                            ${task.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="task-footer">
                    <div class="task-status">
                        <span class="status-badge" style="background-color: ${statusInfo.color}">
                            ${statusInfo.icon} ${statusInfo.label}
                        </span>
                    </div>
                    
                    <div class="task-meta">
                        ${task.dueDate ? `
                            <div class="due-date ${isOverdue ? 'overdue' : ''}">
                                📅 ${daysUntilDue !== null ? 
                                    (daysUntilDue === 0 ? 'Due today' : 
                                     daysUntilDue > 0 ? `${daysUntilDue} days left` : 
                                     `${Math.abs(daysUntilDue)} days overdue`) : 
                                    new Date(task.dueDate).toLocaleDateString()}
                            </div>
                        ` : ''}
                        
                        ${task.estimatedHours > 0 ? `
                            <div class="time-estimate">
                                ⏱️ ${task.estimatedHours}h estimated
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="task-buttons">
                        ${task.status === 'todo' ? `
                            <button class="btn btn-sm btn-primary" data-action="start">
                                ▶️ Start
                            </button>
                        ` : ''}
                        
                        ${task.status === 'in-progress' ? `
                            <button class="btn btn-sm btn-success" data-action="complete">
                                ✅ Complete
                            </button>
                        ` : ''}
                        
                        ${task.status === 'done' ? `
                            <span class="completed-indicator">
                                ✅ Completed ${task.completedAt ? 
                                    new Date(task.completedAt).toLocaleDateString() : ''}
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                ${task.subtasks.length > 0 ? `
                    <div class="task-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${task.getCompletionPercentage()}%"></div>
                        </div>
                        <span class="progress-text">
                            ${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length} subtasks completed
                        </span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    setupTaskCardListeners() {
        const taskCards = this.container.querySelectorAll('.task-card');
        
        taskCards.forEach(card => {
            const taskId = card.dataset.taskId;
            
            // Action buttons
            card.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    await this.handleTaskAction(taskId, action);
                });
            });
            
            // Click to view task details
            card.addEventListener('click', () => {
                this.showTaskDetails(taskId);
            });
        });
    }

    async handleTaskAction(taskId, action) {
        try {
            switch (action) {
                case 'start':
                    await this.taskService.startTask(taskId);
                    break;
                case 'complete':
                    await this.taskService.completeTask(taskId);
                    break;
                case 'edit':
                    this.showTaskForm(taskId);
                    break;
                case 'delete':
                    if (confirm('Are you sure you want to delete this task?')) {
                        await this.taskService.deleteTask(taskId);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling task action:', error);
            this.showError('Failed to ' + action + ' task');
        }
    }

    updateStats() {
        const stats = {
            total: this.tasks.length,
            todo: this.tasks.filter(t => t.status === 'todo').length,
            inProgress: this.tasks.filter(t => t.status === 'in-progress').length,
            completed: this.tasks.filter(t => t.status === 'done').length
        };

        const statCards = this.container.querySelectorAll('.stat-card .stat-number');
        if (statCards.length >= 4) {
            statCards[0].textContent = stats.total;
            statCards[1].textContent = stats.todo;
            statCards[2].textContent = stats.inProgress;
            statCards[3].textContent = stats.completed;
        }
    }

    updateTaskCount() {
        const taskCount = this.container.querySelector('.task-count');
        if (taskCount) {
            const total = this.filteredTasks.length;
            const totalAll = this.tasks.length;
            
            if (total === totalAll) {
                taskCount.textContent = `${total} task${total !== 1 ? 's' : ''}`;
            } else {
                taskCount.textContent = `${total} of ${totalAll} tasks`;
            }
        }
    }

    clearFilters() {
        this.currentFilters = {};
        this.searchTerm = '';
        
        // Reset form controls
        this.container.querySelector('#task-search').value = '';
        this.container.querySelector('#status-filter').value = '';
        this.container.querySelector('#category-filter').value = '';
        this.container.querySelector('#priority-filter').value = '';
        this.container.querySelector('#sort-select').value = 'createdAt-desc';
        
        this.currentSort = { field: 'createdAt', direction: 'desc' };
        this.filterTasks();
    }

    showLoading() {
        this.container.querySelector('#loading-state').classList.remove('hidden');
        this.container.querySelector('.task-list-content').style.opacity = '0.5';
    }

    hideLoading() {
        this.container.querySelector('#loading-state').classList.add('hidden');
        this.container.querySelector('.task-list-content').style.opacity = '1';
    }

    showError(message) {
        // Could implement toast notification here
        console.error(message);
        alert(message); // Temporary error display
    }

    showTaskForm(taskId = null) {
        // Emit event for parent component to handle
        this.container.dispatchEvent(new CustomEvent('showTaskForm', {
            detail: { taskId }
        }));
    }

    showTaskDetails(taskId) {
        // Emit event for parent component to handle
        this.container.dispatchEvent(new CustomEvent('showTaskDetails', {
            detail: { taskId }
        }));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        // Clean up listeners
        if (this.taskListener) {
            this.taskListener();
        }
    }
}
