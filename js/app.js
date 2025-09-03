// Main Application Controller
import { appConfig } from './config.js';
import { storageService } from './storage.js';
import { fileService } from './file-service.js';
import { uiComponents, StatsCalculator, FormValidator } from './ui-components.js';

class InternshipTracker {
    constructor() {
        this.memos = [];
        this.filteredMemos = [];
        this.currentEditId = null;
        this.currentFiles = [];
        
        // DOM elements
        this.elements = {};
        
        // Bind methods
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleCategoryFilter = this.handleCategoryFilter.bind(this);
        this.handleDateFilter = this.handleDateFilter.bind(this);
        this.handleFileSelection = this.handleFileSelection.bind(this);
        this.handleMemoAction = this.handleMemoAction.bind(this);
        this.handleDataChange = this.handleDataChange.bind(this);
    }

    // Initialize the application
    async initialize() {
        try {
            // Show loading
            this.showLoading('Initializing application...');
            
            // Get DOM elements
            this.initializeElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize services
            await storageService.initialize();
            
            // Setup data listener and load initial data
            storageService.onDataChange(this.handleDataChange);
            
            // Force initial data load for local storage
            if (appConfig.USE_LOCAL_STORAGE) {
                const existingMemos = await this.loadInitialData();
                this.handleDataChange(existingMemos);
            }
            
            // Update storage status indicator
            this.updateStorageStatusIndicator();
            
            // Set initial form values
            this.resetForm();
            
            // Hide loading
            this.hideLoading();
            
            console.log('Internship Tracker initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please refresh and try again.');
        }
    }

    // Get and cache DOM elements
    initializeElements() {
        this.elements = {
            // Form elements
            form: document.getElementById('memo-form'),
            memoId: document.getElementById('memo-id'),
            memoDate: document.getElementById('memo-date'),
            memoTime: document.getElementById('memo-time'),
            memoCategory: document.getElementById('memo-category'),
            memoDuration: document.getElementById('memo-duration'),
            memoTitle: document.getElementById('memo-title'),
            memoDescription: document.getElementById('memo-description'),
            memoTags: document.getElementById('memo-tags'),
            memoFiles: document.getElementById('memo-files'),
            
            // File handling
            filePreview: document.getElementById('file-preview'),
            fileList: document.getElementById('file-list'),
            existingFiles: document.getElementById('existing-files'),
            existingFileList: document.getElementById('existing-file-list'),
            
            // Actions
            submitBtn: document.getElementById('submit-btn'),
            cancelEditBtn: document.getElementById('cancel-edit-btn'),
            exportBtn: document.getElementById('export-btn'),
            importBtn: document.getElementById('import-btn'),
            importFile: document.getElementById('import-file'),
            
            // Display
            memoList: document.getElementById('memo-list'),
            loadingIndicator: document.getElementById('loading-indicator'),
            
            // Filters
            searchBar: document.getElementById('search-bar'),
            categoryFilter: document.getElementById('category-filter'),
            dateFilter: document.getElementById('date-filter'),
            
            // Statistics
            totalMemos: document.getElementById('total-memos'),
            totalHours: document.getElementById('total-hours'),
            weekHours: document.getElementById('week-hours'),
            avgHours: document.getElementById('avg-hours'),
            
            // Storage indicator
            storageIndicator: document.getElementById('storage-indicator'),
            storageStatus: document.getElementById('storage-status'),
            toggleStorage: document.getElementById('toggle-storage')
        };

        // Validate critical elements exist
        const requiredElements = ['form', 'memoList', 'loadingIndicator'];
        for (const elementName of requiredElements) {
            if (!this.elements[elementName]) {
                throw new Error(`Critical element '${elementName}' not found in DOM. Check if element with id '${elementName.replace(/([A-Z])/g, '-$1').toLowerCase()}' exists.`);
            }
        }
    }

    // Setup all event listeners
    setupEventListeners() {
        // Form submission
        this.elements.form.addEventListener('submit', this.handleFormSubmit);
        
        // File handling
        this.elements.memoFiles.addEventListener('change', this.handleFileSelection);
        
        // Search and filters
        this.elements.searchBar.addEventListener('input', 
            uiComponents.debounce(this.handleSearch, 300));
        this.elements.categoryFilter.addEventListener('change', this.handleCategoryFilter);
        this.elements.dateFilter.addEventListener('change', this.handleDateFilter);
        
        // Memo actions
        this.elements.memoList.addEventListener('click', this.handleMemoAction);
        
        // Form actions
        this.elements.cancelEditBtn.addEventListener('click', () => this.resetForm());
        
        // Import/Export
        this.elements.exportBtn.addEventListener('click', () => this.exportData());
        this.elements.importBtn.addEventListener('click', () => this.elements.importFile.click());
        this.elements.importFile.addEventListener('change', (e) => this.importData(e));
    }

    // Handle form submission
    async handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            // Get form data
            const formData = this.getFormData();
            
            // Validate form
            const validation = FormValidator.validateMemo(formData);
            if (!validation.isValid) {
                uiComponents.showNotification(validation.errors.join(', '), 'error');
                return;
            }
            
            // Process files
            let attachments = [];
            if (this.currentFiles.length > 0) {
                this.setSubmitButtonState('Processing files...', true);
                attachments = await fileService.processFiles(this.currentFiles);
            }
            
            // Prepare memo data
            const memoData = {
                ...formData,
                attachments: this.currentEditId ? 
                    [...(this.getCurrentMemoAttachments() || []), ...attachments] : 
                    attachments
            };
            
            // Save memo
            if (this.currentEditId) {
                await storageService.updateMemo(this.currentEditId, memoData);
                uiComponents.showNotification('Memo updated successfully!', 'success');
            } else {
                await storageService.addMemo(memoData);
                uiComponents.showNotification('Memo added successfully!', 'success');
            }
            
            // Reset form
            this.resetForm();
            
        } catch (error) {
            console.error('Error saving memo:', error);
            uiComponents.showNotification(error.message || 'Failed to save memo', 'error');
        } finally {
            this.setSubmitButtonState();
        }
    }

    // Get form data
    getFormData() {
        return {
            date: this.elements.memoDate.value,
            time: this.elements.memoTime.value,
            category: this.elements.memoCategory.value,
            duration: this.elements.memoDuration.value,
            title: FormValidator.sanitizeInput(this.elements.memoTitle.value),
            description: FormValidator.sanitizeInput(this.elements.memoDescription.value),
            tags: FormValidator.validateTags(this.elements.memoTags.value).join(', ')
        };
    }

    // Handle file selection
    handleFileSelection() {
        this.currentFiles = Array.from(this.elements.memoFiles.files);
        this.displayFilePreview();
    }

    // Display file preview
    displayFilePreview() {
        if (this.currentFiles.length === 0) {
            this.elements.filePreview.classList.add('hidden');
            return;
        }

        this.elements.filePreview.classList.remove('hidden');
        this.elements.fileList.innerHTML = '';

        this.currentFiles.forEach((file, index) => {
            const fileElement = fileService.createFilePreview(file, () => {
                this.removeFileFromSelection(index);
            });
            this.elements.fileList.appendChild(fileElement);
        });
    }

    // Remove file from selection
    removeFileFromSelection(index) {
        this.currentFiles.splice(index, 1);
        
        // Update file input
        const dt = new DataTransfer();
        this.currentFiles.forEach(file => dt.items.add(file));
        this.elements.memoFiles.files = dt.files;
        
        this.displayFilePreview();
    }

    // Handle search
    handleSearch() {
        this.applyFilters();
    }

    // Handle category filter
    handleCategoryFilter() {
        this.applyFilters();
    }

    // Handle date filter
    handleDateFilter() {
        this.applyFilters();
    }

    // Apply all filters
    applyFilters() {
        const searchText = this.elements.searchBar.value.toLowerCase();
        const categoryFilter = this.elements.categoryFilter.value;
        const dateFilter = this.elements.dateFilter.value;

        this.filteredMemos = this.memos.filter(memo => {
            const matchesSearch = !searchText || 
                memo.title.toLowerCase().includes(searchText) || 
                memo.description.toLowerCase().includes(searchText) ||
                (memo.tags && memo.tags.toLowerCase().includes(searchText));
            
            const matchesCategory = !categoryFilter || memo.category === categoryFilter;
            const matchesDate = !dateFilter || memo.date === dateFilter;
            
            return matchesSearch && matchesCategory && matchesDate;
        });

        this.renderMemos();
    }

    // Handle memo actions (edit, delete)
    handleMemoAction(e) {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const id = editBtn.dataset.id;
            this.editMemo(id);
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            this.deleteMemo(id);
        }
    }

    // Edit memo
    editMemo(id) {
        const memo = this.memos.find(m => m.id === id);
        if (!memo) return;

        // Populate form
        this.elements.memoId.value = memo.id;
        this.elements.memoDate.value = memo.date;
        this.elements.memoTime.value = memo.time || '';
        this.elements.memoCategory.value = memo.category || 'development';
        this.elements.memoDuration.value = memo.duration || '';
        this.elements.memoTitle.value = memo.title;
        this.elements.memoDescription.value = memo.description;
        this.elements.memoTags.value = memo.tags || '';

        // Set edit mode
        this.currentEditId = id;
        this.setEditMode(true);
        
        // Clear file input and show existing files
        this.elements.memoFiles.value = '';
        this.currentFiles = [];
        this.displayFilePreview();
        this.displayExistingFiles(memo.attachments);

        // Scroll to form
        uiComponents.scrollTo(this.elements.form, 100);
    }

    // Delete memo
    deleteMemo(id) {
        const memo = this.memos.find(m => m.id === id);
        if (!memo) return;

        uiComponents.showConfirmDialog(
            `Are you sure you want to delete "${memo.title}"? This action cannot be undone.`,
            async () => {
                try {
                    await storageService.deleteMemo(id);
                    uiComponents.showNotification('Memo deleted successfully!', 'success');
                } catch (error) {
                    console.error('Error deleting memo:', error);
                    uiComponents.showNotification('Failed to delete memo', 'error');
                }
            }
        );
    }

    // Display existing files for editing
    displayExistingFiles(attachments) {
        if (!attachments || attachments.length === 0) {
            this.elements.existingFiles.classList.add('hidden');
            return;
        }

        this.elements.existingFiles.classList.remove('hidden');
        this.elements.existingFileList.innerHTML = '';

        attachments.forEach((file, index) => {
            const fileElement = fileService.createAttachmentElement(file, () => {
                this.removeExistingFile(index);
            });
            this.elements.existingFileList.appendChild(fileElement);
        });
    }

    // Remove existing file
    removeExistingFile(index) {
        if (!this.currentEditId) return;
        
        const memo = this.memos.find(m => m.id === this.currentEditId);
        if (memo && memo.attachments) {
            memo.attachments.splice(index, 1);
            this.displayExistingFiles(memo.attachments);
        }
    }

    // Get current memo attachments
    getCurrentMemoAttachments() {
        if (!this.currentEditId) return [];
        const memo = this.memos.find(m => m.id === this.currentEditId);
        return memo ? memo.attachments || [] : [];
    }

    // Handle data changes from storage
    handleDataChange(memos) {
        console.log('Data changed:', memos.length, 'memos loaded');
        this.memos = memos;
        this.applyFilters();
        this.updateStatistics();
    }

    // Load initial data (for local storage)
    async loadInitialData() {
        try {
            // For local storage, directly read from localStorage
            const data = localStorage.getItem(appConfig.STORAGE_KEYS.MEMOS);
            const memos = data ? JSON.parse(data) : [];
            console.log('Loaded initial data:', memos.length, 'memos');
            return memos;
        } catch (error) {
            console.error('Error loading initial data:', error);
            return [];
        }
    }

    // Update storage status indicator
    updateStorageStatusIndicator() {
        if (this.elements.storageStatus) {
            const isLocal = appConfig.USE_LOCAL_STORAGE;
            const statusText = isLocal ? '📱 Local Storage Mode' : '☁️ Cloud Storage Mode';
            this.elements.storageStatus.textContent = statusText;
            
            // Update indicator styling
            if (this.elements.storageIndicator) {
                this.elements.storageIndicator.style.background = isLocal 
                    ? 'rgba(79, 70, 229, 0.1)' 
                    : 'rgba(16, 185, 129, 0.1)';
                this.elements.storageIndicator.style.borderColor = isLocal 
                    ? 'rgba(79, 70, 229, 0.2)' 
                    : 'rgba(16, 185, 129, 0.2)';
            }
        }
    }

    // Render memos
    renderMemos() {
        this.elements.memoList.innerHTML = '';

        if (this.filteredMemos.length === 0) {
            const emptyState = this.memos.length === 0 ? 
                uiComponents.createEmptyState(
                    'No memos yet. Add your first one above!',
                    'Add Memo',
                    () => this.elements.memoTitle.focus()
                ) :
                uiComponents.createEmptyState('No memos found with current filters.');
            
            this.elements.memoList.appendChild(emptyState);
            return;
        }

        this.filteredMemos.forEach(memo => {
            const memoElement = this.createMemoElement(memo);
            this.elements.memoList.appendChild(memoElement);
            uiComponents.animate(memoElement, 'fadeIn');
        });
    }

    // Create memo element
    createMemoElement(memo) {
        const memoEl = document.createElement('div');
        memoEl.className = 'memo-card';
        
        // Memo header
        const header = document.createElement('div');
        header.className = 'memo-header';
        
        // Meta information
        const meta = document.createElement('div');
        meta.className = 'memo-meta';
        
        // Date and time
        const dateTime = document.createElement('div');
        dateTime.className = 'memo-date-time';
        
        const dateText = uiComponents.formatDate(memo.date);
        const timeText = memo.time ? ` at ${uiComponents.formatTime(memo.time)}` : '';
        const durationText = memo.duration ? ` • ${memo.duration}h` : '';
        
        dateTime.textContent = `${dateText}${timeText}${durationText}`;
        
        // Categories and tags
        const categories = document.createElement('div');
        categories.className = 'memo-categories';
        
        categories.appendChild(uiComponents.createCategoryBadge(memo.category || 'other'));
        
        if (memo.tags) {
            const tags = memo.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            tags.forEach(tag => {
                categories.appendChild(uiComponents.createTagBadge(tag));
            });
        }
        
        // Title
        const title = document.createElement('h3');
        title.className = 'memo-title';
        title.textContent = memo.title;
        
        meta.appendChild(dateTime);
        meta.appendChild(categories);
        meta.appendChild(title);
        
        // Actions
        const actions = document.createElement('div');
        actions.className = 'memo-actions';
        
        const editBtn = uiComponents.createActionButton(
            'Edit memo',
            null,
            'btn-secondary',
            '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>'
        );
        editBtn.className += ' edit-btn';
        editBtn.dataset.id = memo.id;
        
        const deleteBtn = uiComponents.createActionButton(
            'Delete memo',
            null,
            'btn-danger',
            '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>'
        );
        deleteBtn.className += ' delete-btn';
        deleteBtn.dataset.id = memo.id;
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        header.appendChild(meta);
        header.appendChild(actions);
        
        // Content
        const content = document.createElement('div');
        content.className = 'memo-content prose';
        content.innerHTML = uiComponents.markdownToHtml(memo.description);
        
        memoEl.appendChild(header);
        memoEl.appendChild(content);
        
        // Attachments
        if (memo.attachments && memo.attachments.length > 0) {
            const attachments = this.createAttachmentsSection(memo.attachments);
            memoEl.appendChild(attachments);
        }
        
        return memoEl;
    }

    // Create attachments section
    createAttachmentsSection(attachments) {
        const section = document.createElement('div');
        section.className = 'mt-4 pt-4 border-t';
        
        const title = document.createElement('h4');
        title.className = 'text-sm font-medium mb-2';
        title.innerHTML = `📎 Attachments (${attachments.length})`;
        
        const grid = document.createElement('div');
        grid.className = 'grid gap-2';
        
        attachments.forEach(file => {
            const item = document.createElement('div');
            item.className = 'flex items-center gap-2 p-2 bg-gray-50 rounded border';
            
            const icon = document.createElement('span');
            icon.textContent = fileService.getFileIcon(file.type, file.name);
            
            const name = document.createElement('span');
            name.className = 'text-sm flex-1';
            name.textContent = file.name;
            
            const size = document.createElement('span');
            size.className = 'text-xs text-secondary';
            size.textContent = `(${fileService.formatFileSize(file.size)})`;
            
            const actions = document.createElement('div');
            actions.className = 'flex gap-1';
            
            if (fileService.isImage(file.type)) {
                const viewBtn = document.createElement('button');
                viewBtn.className = 'btn btn-sm btn-secondary';
                viewBtn.innerHTML = '👁️';
                viewBtn.onclick = () => fileService.viewFile(file);
                actions.appendChild(viewBtn);
            }
            
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'btn btn-sm btn-secondary';
            downloadBtn.innerHTML = '⬇️';
            downloadBtn.onclick = () => fileService.downloadFile(file);
            actions.appendChild(downloadBtn);
            
            item.appendChild(icon);
            item.appendChild(name);
            item.appendChild(size);
            item.appendChild(actions);
            grid.appendChild(item);
        });
        
        section.appendChild(title);
        section.appendChild(grid);
        
        return section;
    }

    // Update statistics
    updateStatistics() {
        const totalMemos = this.memos.length;
        const totalHours = StatsCalculator.calculateTotalHours(this.memos);
        const weekHours = StatsCalculator.calculateWeekHours(this.memos);
        const avgHours = StatsCalculator.calculateAverageHours(this.memos);
        
        this.elements.totalMemos.textContent = totalMemos;
        this.elements.totalHours.textContent = totalHours.toFixed(1);
        this.elements.weekHours.textContent = weekHours.toFixed(1) + 'h';
        this.elements.avgHours.textContent = avgHours.toFixed(1) + 'h';
    }

    // Reset form
    resetForm() {
        this.elements.form.reset();
        this.elements.memoId.value = '';
        this.currentEditId = null;
        this.currentFiles = [];
        
        // Set current date and time
        const now = new Date();
        this.elements.memoDate.valueAsDate = now;
        this.elements.memoTime.value = now.toTimeString().slice(0, 5);
        
        // Reset file inputs
        this.elements.memoFiles.value = '';
        this.elements.filePreview.classList.add('hidden');
        this.elements.existingFiles.classList.add('hidden');
        
        // Reset filters
        this.elements.searchBar.value = '';
        this.elements.categoryFilter.value = '';
        this.elements.dateFilter.value = '';
        
        // Reset UI state
        this.setEditMode(false);
        this.applyFilters();
    }

    // Set edit mode
    setEditMode(isEdit) {
        if (isEdit) {
            this.elements.submitBtn.textContent = 'Update Memo';
            this.elements.submitBtn.className = 'btn btn-success';
            this.elements.cancelEditBtn.classList.remove('hidden');
        } else {
            this.elements.submitBtn.textContent = 'Add Memo';
            this.elements.submitBtn.className = 'btn btn-primary';
            this.elements.cancelEditBtn.classList.add('hidden');
        }
    }

    // Set submit button state
    setSubmitButtonState(text = null, disabled = false) {
        if (text) {
            this.elements.submitBtn.textContent = text;
        } else {
            this.elements.submitBtn.textContent = this.currentEditId ? 'Update Memo' : 'Add Memo';
        }
        this.elements.submitBtn.disabled = disabled;
    }

    // Show loading
    showLoading(message = 'Loading...') {
        if (!this.elements.loadingIndicator) {
            console.warn('Loading indicator element not found');
            return;
        }
        this.elements.loadingIndicator.innerHTML = '';
        this.elements.loadingIndicator.appendChild(uiComponents.createLoadingSpinner(message));
        this.elements.loadingIndicator.style.display = 'block';
    }

    // Hide loading
    hideLoading() {
        if (!this.elements.loadingIndicator) {
            console.warn('Loading indicator element not found');
            return;
        }
        this.elements.loadingIndicator.style.display = 'none';
    }

    // Show error
    showError(message) {
        if (!this.elements.loadingIndicator) {
            console.error('Cannot show error - loading indicator element not found:', message);
            alert(`Error: ${message}`); // Fallback to alert
            return;
        }
        this.elements.loadingIndicator.innerHTML = `<p class="text-error text-center">${message}</p>`;
        this.elements.loadingIndicator.style.display = 'block';
    }

    // Export data
    exportData() {
        try {
            if (storageService.getStorageMode() === 'firebase') {
                uiComponents.showNotification(
                    'Data export not needed in Firebase mode. Your data is automatically synced to the cloud.',
                    'info'
                );
                return;
            }
            
            const data = storageService.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `internship-memos-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            uiComponents.showNotification('Data exported successfully!', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            uiComponents.showNotification('Failed to export data', 'error');
        }
    }

    // Import data
    async importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await this.readFileAsText(file);
            const data = JSON.parse(text);
            
            if (!data.memos || !Array.isArray(data.memos)) {
                throw new Error('Invalid file format');
            }
            
            uiComponents.showConfirmDialog(
                `This will import ${data.memos.length} memos. Continue?`,
                async () => {
                    try {
                        await storageService.importData(data);
                        uiComponents.showNotification('Data imported successfully!', 'success');
                    } catch (error) {
                        console.error('Import failed:', error);
                        uiComponents.showNotification('Failed to import data', 'error');
                    }
                }
            );
            
        } catch (error) {
            console.error('Import failed:', error);
            uiComponents.showNotification('Error reading file. Please make sure it\'s a valid JSON file.', 'error');
        }
        
        // Reset file input
        e.target.value = '';
    }

    // Read file as text
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new InternshipTracker();
    await app.initialize();
    
    // Make app available globally for debugging
    window.internshipTracker = app;
});
