/**
 * Task Form Component - Create and edit task form
 */

import { Task } from '../models/task-model.js';
import { categoryService } from '../services/category-service.js';

export class TaskForm {
    constructor(container, taskService) {
        this.container = container;
        this.taskService = taskService;
        this.currentTask = null;
        this.isEditing = false;
        this.userRole = 'developer'; // Default role, could be set from user preferences
        
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="task-form-container">
                <div class="form-header">
                    <h2 id="form-title">📝 Create New Task</h2>
                    <button class="btn-close" id="close-form" title="Close">✕</button>
                </div>
                
                <form id="task-form" class="task-form">
                    <!-- Basic Info -->
                    <div class="form-section">
                        <h3>📋 Basic Information</h3>
                        
                        <div class="form-group">
                            <label for="task-title">Title *</label>
                            <input 
                                type="text" 
                                id="task-title" 
                                name="title" 
                                required 
                                placeholder="What needs to be done?"
                                maxlength="100"
                            >
                            <small class="char-count">0/100</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="task-description">Description</label>
                            <textarea 
                                id="task-description" 
                                name="description" 
                                rows="4"
                                placeholder="Add more details about this task..."
                                maxlength="500"
                            ></textarea>
                            <small class="char-count">0/500</small>
                        </div>
                    </div>

                    <!-- Categorization -->
                    <div class="form-section">
                        <h3>🏷️ Categorization</h3>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="task-category">Category *</label>
                                <select id="task-category" name="category" required>
                                    <option value="">Select a category</option>
                                </select>
                                <small class="help-text">Choose the category that best fits this task</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="task-priority">Priority</label>
                                <select id="task-priority" name="priority">
                                    <option value="low">🟢 Low</option>
                                    <option value="medium" selected>🟡 Medium</option>
                                    <option value="high">🟠 High</option>
                                    <option value="critical">🔴 Critical</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="task-tags">Tags</label>
                            <input 
                                type="text" 
                                id="task-tags" 
                                name="tags" 
                                placeholder="Enter tags separated by commas (e.g., frontend, urgent, review)"
                            >
                            <small class="help-text">Use tags to make your tasks easier to find</small>
                        </div>
                    </div>

                    <!-- Scheduling -->
                    <div class="form-section">
                        <h3>📅 Scheduling & Time</h3>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="task-due-date">Due Date</label>
                                <input type="date" id="task-due-date" name="dueDate">
                            </div>
                            
                            <div class="form-group">
                                <label for="task-estimated-hours">Estimated Hours</label>
                                <input 
                                    type="number" 
                                    id="task-estimated-hours" 
                                    name="estimatedHours"
                                    min="0" 
                                    max="1000" 
                                    step="0.5"
                                    placeholder="0"
                                >
                            </div>
                        </div>
                    </div>

                    <!-- Subtasks -->
                    <div class="form-section">
                        <h3>📝 Subtasks</h3>
                        <div id="subtasks-container">
                            <!-- Subtasks will be rendered here -->
                        </div>
                        <button type="button" class="btn btn-secondary btn-sm" id="add-subtask">
                            ➕ Add Subtask
                        </button>
                    </div>

                    <!-- AI Suggestions (if available) -->
                    <div class="form-section" id="suggestions-section" style="display: none;">
                        <h3>💡 Smart Suggestions</h3>
                        <div id="category-suggestions" class="suggestions">
                            <!-- Category suggestions will appear here -->
                        </div>
                        <div id="template-suggestions" class="suggestions">
                            <!-- Template suggestions will appear here -->
                        </div>
                    </div>

                    <!-- Form Actions -->
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancel-btn">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary" id="submit-btn">
                            <span class="btn-text">Create Task</span>
                            <span class="btn-spinner hidden">⏳</span>
                        </button>
                    </div>
                </form>
            </div>
        `;

        this.populateCategories();
        this.setupFormValidation();
    }

    populateCategories() {
        const categorySelect = this.container.querySelector('#task-category');
        const categories = categoryService.getCategoriesByRole(this.userRole);
        
        // Clear existing options except the first one
        categorySelect.innerHTML = '<option value="">Select a category</option>';
        
        // Group categories by role
        const roleGroups = {
            developer: [],
            student: [],
            generic: []
        };
        
        categories.forEach(category => {
            roleGroups[category.role].push(category);
        });
        
        // Add options with role groupings
        Object.entries(roleGroups).forEach(([role, roleCategories]) => {
            if (roleCategories.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = this.getRoleLabel(role);
                
                roleCategories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = `${category.icon} ${category.name}`;
                    optgroup.appendChild(option);
                });
                
                categorySelect.appendChild(optgroup);
            }
        });
    }

    getRoleLabel(role) {
        const labels = {
            developer: '👨‍💻 Developer Tasks',
            student: '🎓 Student Tasks',
            generic: '📁 General Tasks'
        };
        return labels[role] || 'Other Tasks';
    }

    setupEventListeners() {
        const form = this.container.querySelector('#task-form');
        const closeBtn = this.container.querySelector('#close-form');
        const cancelBtn = this.container.querySelector('#cancel-btn');
        const addSubtaskBtn = this.container.querySelector('#add-subtask');
        
        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
        
        // Close form
        closeBtn.addEventListener('click', () => this.close());
        cancelBtn.addEventListener('click', () => this.close());
        
        // Add subtask
        addSubtaskBtn.addEventListener('click', () => this.addSubtaskField());
        
        // Character counters
        this.setupCharacterCounters();
        
        // Smart suggestions
        this.setupSmartSuggestions();
        
        // Category change handler
        this.container.querySelector('#task-category').addEventListener('change', (e) => {
            this.handleCategoryChange(e.target.value);
        });
    }

    setupCharacterCounters() {
        const titleInput = this.container.querySelector('#task-title');
        const descriptionInput = this.container.querySelector('#task-description');
        
        titleInput.addEventListener('input', () => {
            this.updateCharacterCount(titleInput, 100);
        });
        
        descriptionInput.addEventListener('input', () => {
            this.updateCharacterCount(descriptionInput, 500);
        });
    }

    updateCharacterCount(input, maxLength) {
        const current = input.value.length;
        const counter = input.parentElement.querySelector('.char-count');
        
        if (counter) {
            counter.textContent = `${current}/${maxLength}`;
            counter.className = `char-count ${current > maxLength * 0.9 ? 'warning' : ''}`;
        }
    }

    setupSmartSuggestions() {
        const titleInput = this.container.querySelector('#task-title');
        const descriptionInput = this.container.querySelector('#task-description');
        
        // Debounced suggestion updates
        let suggestionTimeout;
        
        const updateSuggestions = () => {
            clearTimeout(suggestionTimeout);
            suggestionTimeout = setTimeout(() => {
                this.updateSmartSuggestions();
            }, 500);
        };
        
        titleInput.addEventListener('input', updateSuggestions);
        descriptionInput.addEventListener('input', updateSuggestions);
    }

    updateSmartSuggestions() {
        const title = this.container.querySelector('#task-title').value;
        const description = this.container.querySelector('#task-description').value;
        
        if (!title && !description) {
            this.hideSuggestions();
            return;
        }
        
        // Get category recommendations
        const recommendations = categoryService.getRecommendedCategories(title, description);
        
        if (recommendations.length > 0) {
            this.showCategorySuggestions(recommendations);
        }
    }

    showCategorySuggestions(recommendations) {
        const suggestionsSection = this.container.querySelector('#suggestions-section');
        const categorySuggestions = this.container.querySelector('#category-suggestions');
        
        categorySuggestions.innerHTML = `
            <h4>Suggested Categories:</h4>
            <div class="suggestion-chips">
                ${recommendations.map(rec => `
                    <button type="button" class="suggestion-chip" data-category="${rec.category.id}">
                        ${rec.category.icon} ${rec.category.name}
                        <small>(${Math.round(rec.confidence * 100)}% match)</small>
                    </button>
                `).join('')}
            </div>
        `;
        
        // Add click handlers for suggestions
        categorySuggestions.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const categoryId = chip.dataset.category;
                this.container.querySelector('#task-category').value = categoryId;
                this.handleCategoryChange(categoryId);
                this.hideSuggestions();
            });
        });
        
        suggestionsSection.style.display = 'block';
    }

    hideSuggestions() {
        this.container.querySelector('#suggestions-section').style.display = 'none';
    }

    handleCategoryChange(categoryId) {
        const category = categoryService.getCategoryById(categoryId);
        if (!category) return;
        
        // Show template suggestions for this category
        if (category.templates && category.templates.length > 0) {
            this.showTemplateSuggestions(category);
        }
    }

    showTemplateSuggestions(category) {
        const templateSuggestions = this.container.querySelector('#template-suggestions');
        
        templateSuggestions.innerHTML = `
            <h4>Quick Templates for ${category.name}:</h4>
            <div class="template-chips">
                ${category.templates.map(template => `
                    <button type="button" class="template-chip" data-template="${template}">
                        ${template}
                    </button>
                `).join('')}
            </div>
        `;
        
        // Add click handlers for templates
        templateSuggestions.querySelectorAll('.template-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const template = chip.dataset.template;
                this.applyTemplate(template);
            });
        });
    }

    applyTemplate(templateName) {
        const titleInput = this.container.querySelector('#task-title');
        const descriptionInput = this.container.querySelector('#task-description');
        
        if (!titleInput.value) {
            titleInput.value = templateName;
            this.updateCharacterCount(titleInput, 100);
        }
        
        if (!descriptionInput.value) {
            descriptionInput.value = `Complete ${templateName.toLowerCase()} task`;
            this.updateCharacterCount(descriptionInput, 500);
        }
    }

    addSubtaskField(subtaskText = '') {
        const container = this.container.querySelector('#subtasks-container');
        const subtaskId = 'subtask_' + Date.now();
        
        const subtaskElement = document.createElement('div');
        subtaskElement.className = 'subtask-item';
        subtaskElement.innerHTML = `
            <input 
                type="text" 
                name="subtasks[]" 
                placeholder="Enter subtask..."
                value="${subtaskText}"
                class="subtask-input"
            >
            <button type="button" class="btn-remove-subtask" title="Remove">🗑️</button>
        `;
        
        // Add remove handler
        subtaskElement.querySelector('.btn-remove-subtask').addEventListener('click', () => {
            subtaskElement.remove();
        });
        
        container.appendChild(subtaskElement);
        
        // Focus on the new input
        subtaskElement.querySelector('.subtask-input').focus();
    }

    setupFormValidation() {
        const form = this.container.querySelector('#task-form');
        
        // Real-time validation
        form.addEventListener('input', () => {
            this.validateForm();
        });
        
        form.addEventListener('change', () => {
            this.validateForm();
        });
    }

    validateForm() {
        const title = this.container.querySelector('#task-title').value.trim();
        const category = this.container.querySelector('#task-category').value;
        const submitBtn = this.container.querySelector('#submit-btn');
        
        const isValid = title.length > 0 && category.length > 0;
        
        submitBtn.disabled = !isValid;
        submitBtn.className = `btn ${isValid ? 'btn-primary' : 'btn-secondary'}`;
        
        return isValid;
    }

    async handleSubmit() {
        if (!this.validateForm()) {
            return;
        }
        
        const submitBtn = this.container.querySelector('#submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            btnText.classList.add('hidden');
            btnSpinner.classList.remove('hidden');
            
            // Collect form data
            const taskData = this.collectFormData();
            
            // Create or update task
            let result;
            if (this.isEditing) {
                result = await this.taskService.updateTask(this.currentTask.id, taskData);
            } else {
                result = await this.taskService.createTask(taskData);
            }
            
            // Success - emit event and close
            this.container.dispatchEvent(new CustomEvent('taskSaved', {
                detail: { task: result, isEditing: this.isEditing }
            }));
            
            this.close();
            
        } catch (error) {
            console.error('Error saving task:', error);
            this.showError('Failed to save task: ' + error.message);
            
        } finally {
            // Reset loading state
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
        }
    }

    collectFormData() {
        const form = this.container.querySelector('#task-form');
        const formData = new FormData(form);
        
        // Collect subtasks
        const subtaskInputs = this.container.querySelectorAll('.subtask-input');
        const subtasks = Array.from(subtaskInputs)
            .map(input => input.value.trim())
            .filter(text => text.length > 0)
            .map(title => ({
                id: 'subtask_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                title: title,
                completed: false,
                createdAt: new Date().toISOString()
            }));
        
        // Parse tags
        const tagsInput = formData.get('tags') || '';
        const tags = tagsInput
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        return {
            title: formData.get('title'),
            description: formData.get('description'),
            category: formData.get('category'),
            priority: formData.get('priority'),
            dueDate: formData.get('dueDate') || null,
            estimatedHours: parseFloat(formData.get('estimatedHours')) || 0,
            tags: tags,
            subtasks: subtasks
        };
    }

    // Public methods for external use
    show(taskId = null) {
        this.container.style.display = 'block';
        
        if (taskId) {
            this.loadTask(taskId);
        } else {
            this.resetForm();
        }
    }

    async loadTask(taskId) {
        try {
            this.isEditing = true;
            this.currentTask = await this.taskService.getTask(taskId);
            
            // Update form title
            this.container.querySelector('#form-title').textContent = '✏️ Edit Task';
            this.container.querySelector('.btn-text').textContent = 'Update Task';
            
            // Populate form with task data
            this.populateForm(this.currentTask);
            
        } catch (error) {
            console.error('Error loading task:', error);
            this.showError('Failed to load task for editing');
        }
    }

    populateForm(task) {
        const form = this.container.querySelector('#task-form');
        
        // Basic fields
        form.querySelector('#task-title').value = task.title || '';
        form.querySelector('#task-description').value = task.description || '';
        form.querySelector('#task-category').value = task.category || '';
        form.querySelector('#task-priority').value = task.priority || 'medium';
        form.querySelector('#task-tags').value = task.tags.join(', ');
        form.querySelector('#task-due-date').value = task.dueDate ? task.dueDate.split('T')[0] : '';
        form.querySelector('#task-estimated-hours').value = task.estimatedHours || '';
        
        // Update character counts
        this.updateCharacterCount(form.querySelector('#task-title'), 100);
        this.updateCharacterCount(form.querySelector('#task-description'), 500);
        
        // Populate subtasks
        const subtasksContainer = this.container.querySelector('#subtasks-container');
        subtasksContainer.innerHTML = '';
        
        if (task.subtasks && task.subtasks.length > 0) {
            task.subtasks.forEach(subtask => {
                this.addSubtaskField(subtask.title);
            });
        }
    }

    resetForm() {
        this.isEditing = false;
        this.currentTask = null;
        
        // Reset form title
        this.container.querySelector('#form-title').textContent = '📝 Create New Task';
        this.container.querySelector('.btn-text').textContent = 'Create Task';
        
        // Reset form
        this.container.querySelector('#task-form').reset();
        
        // Clear subtasks
        this.container.querySelector('#subtasks-container').innerHTML = '';
        
        // Hide suggestions
        this.hideSuggestions();
        
        // Reset character counters
        this.updateCharacterCount(this.container.querySelector('#task-title'), 100);
        this.updateCharacterCount(this.container.querySelector('#task-description'), 500);
        
        // Reset validation
        this.validateForm();
    }

    close() {
        this.container.style.display = 'none';
        this.resetForm();
        
        // Emit close event
        this.container.dispatchEvent(new CustomEvent('formClosed'));
    }

    showError(message) {
        // Could implement toast notification here
        console.error(message);
        alert(message); // Temporary error display
    }
    
    setUserRole(role) {
        this.userRole = role;
        this.populateCategories();
    }
}
