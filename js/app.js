// Main Application Controller - Enhanced with user authentication
import { appConfig } from './config.js';
import { storageService } from './services/storage-service.js';
import { fileService } from './file-service.js';
import { uiComponents, StatsCalculator, FormValidator } from './ui-components.js';
import { authService } from './services/auth-service.js';
import { authUI } from './components/auth-ui.js';

class InternshipTracker {
    constructor() {
        this.memos = [];
        this.filteredMemos = [];
        this.currentEditId = null;
        this.currentFiles = [];
        
        // Initialize auth UI
        this.authUI = authUI;
        
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

    // Initialize the application with authentication
    async initialize() {
        try {
            // Show loading
            this.showLoading('Initializing application...');
            
            // Get DOM elements
            this.initializeElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize auth service first
            await authService.initialize();
            
            // Initialize storage service with auth
            await storageService.initialize(authService);
            
            // Setup data listener for real-time updates
            storageService.onDataChange(this.handleDataChange);
            
            // Load user's memos (will be empty for new users)
            await this.loadUserData();
            
            // Check if this is a new user and offer migration
            await this.checkForDataMigration();
            
            // Update storage status indicator
            this.updateStorageStatusIndicator();
            
            // Set initial form values
            this.resetForm();
            
            // Hide loading
            this.hideLoading();
            
            // Show welcome message for new users
            this.showWelcomeMessageIfNeeded();
            
            console.log('Internship Tracker initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.hideLoading();
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
        this.elements.form.addEventListener('submit', this.handleFormSubmit.bind(this));
        
        // File handling
        this.elements.memoFiles.addEventListener('change', this.handleFileSelection.bind(this));
        
        // Search and filters
        this.elements.searchBar.addEventListener('input', 
            uiComponents.debounce(this.handleSearch.bind(this), 300));
        this.elements.categoryFilter.addEventListener('change', this.handleCategoryFilter.bind(this));
        this.elements.dateFilter.addEventListener('change', this.handleDateFilter.bind(this));
        
        // Memo actions
        this.elements.memoList.addEventListener('click', this.handleMemoAction.bind(this));
        
        // Form actions
        this.elements.cancelEditBtn.addEventListener('click', () => this.resetForm());
        
        // Import/Export
        this.elements.exportBtn.addEventListener('click', () => this.exportData());
        this.elements.importBtn.addEventListener('click', () => this.elements.importFile.click());
        this.elements.importFile.addEventListener('change', (e) => this.importData(e));
        
        // Settings button
        if (this.elements.toggleStorage) {
            this.elements.toggleStorage.addEventListener('click', () => this.showSettingsPanel());
        }
        
        // Authentication buttons
        const loginBtn = document.getElementById('login-btn');
        const signOutBtn = document.getElementById('sign-out-btn');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.authUI.showLoginModal());
        }
        
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => this.handleSignOut());
        }
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
                await storageService.saveMemo(memoData);
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
        const startTime = document.getElementById('start-time')?.value;
        const endTime = document.getElementById('end-time')?.value;
        const simpleStartTime = document.getElementById('simple-start-time')?.value;
        const simpleEndTime = document.getElementById('simple-end-time')?.value;
        
        return {
            date: this.elements.memoDate.value,
            time: this.elements.memoTime.value,
            category: this.elements.memoCategory.value,
            duration: this.elements.memoDuration.value,
            startTime: startTime ? new Date(startTime).toISOString() : null,
            endTime: endTime ? new Date(endTime).toISOString() : null,
            simpleStartTime: simpleStartTime || null,
            simpleEndTime: simpleEndTime || null,
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
        
        // Get current filter from the tab system
        const currentFilter = window.currentFilter ? window.currentFilter() : 'all';

        this.filteredMemos = this.memos.filter(memo => {
            const matchesSearch = !searchText || 
                memo.title.toLowerCase().includes(searchText) || 
                memo.description.toLowerCase().includes(searchText) ||
                (memo.tags && memo.tags.toLowerCase().includes(searchText));
            
            const matchesCategory = !categoryFilter || memo.category === categoryFilter;
            const matchesDate = !dateFilter || memo.date === dateFilter;
            
            // Apply tab filter
            let matchesTabFilter = true;
            if (currentFilter === 'internship') {
                matchesTabFilter = memo.category && memo.category.startsWith('internship-');
            } else if (currentFilter === 'personal') {
                matchesTabFilter = memo.category && memo.category.startsWith('personal-');
            }
            // 'all' filter shows everything, so no additional filtering needed
            
            return matchesSearch && matchesCategory && matchesDate && matchesTabFilter;
        });

        this.renderMemos();
        
        // Update filter counts if function is available
        if (window.updateFilterCounts) {
            window.updateFilterCounts(this.memos);
        }
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
        
        // Populate timestamp fields
        const startTimeField = document.getElementById('start-time');
        const endTimeField = document.getElementById('end-time');
        const simpleStartTimeField = document.getElementById('simple-start-time');
        const simpleEndTimeField = document.getElementById('simple-end-time');
        
        if (startTimeField && memo.startTime) {
            const startDate = new Date(memo.startTime);
            startTimeField.value = this.formatDateTimeLocalInput(startDate);
        }
        
        if (endTimeField && memo.endTime) {
            const endDate = new Date(memo.endTime);
            endTimeField.value = this.formatDateTimeLocalInput(endDate);
        }
        
        if (simpleStartTimeField && memo.simpleStartTime) {
            simpleStartTimeField.value = memo.simpleStartTime;
        }
        
        if (simpleEndTimeField && memo.simpleEndTime) {
            simpleEndTimeField.value = memo.simpleEndTime;
        }
        
        // Recalculate durations if fields are present
        if (window.timeTracker) {
            window.timeTracker.calculateDuration();
            window.timeTracker.calculateSimpleDuration();
        }

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
        
        // Add timestamps section if available
        if (memo.startTime || memo.endTime || memo.simpleStartTime || memo.simpleEndTime) {
            const timestamps = document.createElement('div');
            timestamps.className = 'memo-timestamps';
            
            // Full datetime timestamps
            if (memo.startTime) {
                const startItem = document.createElement('div');
                startItem.className = 'timestamp-item';
                startItem.innerHTML = `
                    <span class="timestamp-label">Started:</span>
                    <span class="timestamp-value">${this.formatTimestamp(memo.startTime)}</span>
                `;
                timestamps.appendChild(startItem);
            }
            
            if (memo.endTime) {
                const endItem = document.createElement('div');
                endItem.className = 'timestamp-item';
                endItem.innerHTML = `
                    <span class="timestamp-label">Finished:</span>
                    <span class="timestamp-value">${this.formatTimestamp(memo.endTime)}</span>
                `;
                timestamps.appendChild(endItem);
            }
            
            if (memo.startTime && memo.endTime) {
                const duration = this.calculateDisplayDuration(memo.startTime, memo.endTime);
                const durationItem = document.createElement('div');
                durationItem.className = 'timestamp-item';
                durationItem.innerHTML = `
                    <span class="timestamp-label">Duration:</span>
                    <span class="timestamp-value duration-highlight">${duration}</span>
                `;
                timestamps.appendChild(durationItem);
            }
            
            // Simple time display
            if (memo.simpleStartTime || memo.simpleEndTime) {
                const simpleTimeItem = document.createElement('div');
                simpleTimeItem.className = 'timestamp-item';
                const startText = memo.simpleStartTime ? memo.simpleStartTime : '--:--';
                const endText = memo.simpleEndTime ? memo.simpleEndTime : '--:--';
                simpleTimeItem.innerHTML = `
                    <span class="timestamp-label">Time:</span>
                    <span class="timestamp-value">${startText} → ${endText}</span>
                `;
                timestamps.appendChild(simpleTimeItem);
            }
            
            meta.appendChild(timestamps);
        }
        
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
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-icon-only btn-secondary edit-btn';
        editBtn.setAttribute('aria-label', 'Edit memo');
        editBtn.dataset.id = memo.id;
        editBtn.title = 'Edit memo';
        editBtn.innerHTML = '✏️';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-icon-only btn-danger delete-btn';
        deleteBtn.setAttribute('aria-label', 'Delete memo');
        deleteBtn.dataset.id = memo.id;
        deleteBtn.title = 'Delete memo';
        deleteBtn.innerHTML = '🗑️';
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        header.appendChild(meta);
        header.appendChild(actions);
        
        // Content
        const content = document.createElement('div');
        content.className = 'memo-content prose';
        
        // Create description with truncation support
        const description = document.createElement('div');
        description.className = 'memo-description';
        description.innerHTML = uiComponents.markdownToHtml(memo.description);
        
        content.appendChild(description);
        
        // Apply text truncation after element is added to DOM
        setTimeout(() => {
            if (window.TextTruncator) {
                window.TextTruncator.addTruncationControls(description);
            }
        }, 100);
        
        memoEl.appendChild(header);
        memoEl.appendChild(content);
        
        // Attachments
        if (memo.attachments && memo.attachments.length > 0) {
            const attachments = this.createAttachmentsSection(memo.attachments);
            memoEl.appendChild(attachments);
        }
        
        return memoEl;
    }

    // Format timestamp for display
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    // Calculate and format duration for display
    calculateDisplayDuration(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const diffMs = end - start;
        
        if (diffMs <= 0) return 'Invalid duration';
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        } else {
            return `${minutes}m`;
        }
    }

    // Format date for datetime-local input
    formatDateTimeLocalInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
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

    // Load user's memos from Firestore
    async loadUserData() {
        try {
            this.showLoading('Loading your memos...');
            const userMemos = await storageService.loadMemos();
            this.handleDataChange(userMemos);
            this.hideLoading();
        } catch (error) {
            console.error('Error loading user data:', error);
            this.hideLoading();
            this.showError('Failed to load your memos. Please refresh and try again.');
        }
    }

    // Check if user needs data migration from localStorage
    async checkForDataMigration() {
        try {
            // Check if user has existing cloud data
            const hasCloudData = await storageService.hasExistingData();
            
            // Check if there's local data to migrate
            const localData = this.loadLocalStorageData();
            
            if (!hasCloudData && localData.length > 0) {
                // Show migration dialog
                this.showMigrationDialog(localData.length);
            }
        } catch (error) {
            console.error('Error checking for data migration:', error);
        }
    }

    // Load data from localStorage for migration
    loadLocalStorageData() {
        try {
            const data = localStorage.getItem('memos');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading localStorage data:', error);
            return [];
        }
    }

    // Show migration dialog
    showMigrationDialog(localMemoCount) {
        const dialog = document.createElement('div');
        dialog.className = 'migration-dialog-overlay';
        dialog.innerHTML = `
            <div class="migration-dialog">
                <h3>📦 Import Your Data</h3>
                <p>We found ${localMemoCount} memo(s) in your browser storage. Would you like to import them to your cloud account?</p>
                <div class="dialog-buttons">
                    <button id="migrate-yes" class="btn btn-primary">Yes, Import My Data</button>
                    <button id="migrate-no" class="btn btn-secondary">Skip for Now</button>
                    <button id="migrate-never" class="btn btn-secondary">Don't Ask Again</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Handle migration choices
        document.getElementById('migrate-yes').onclick = async () => {
            try {
                this.showLoading('Migrating your data...');
                const result = await storageService.migrateLocalDataToCloud();
                this.hideLoading();
                
                if (result.migrated > 0) {
                    this.showSuccess(`Successfully imported ${result.migrated} memo(s) to your cloud account!`);
                }
                
                dialog.remove();
            } catch (error) {
                this.hideLoading();
                this.showError('Failed to migrate data. Please try again later.');
                console.error('Migration error:', error);
            }
        };

        document.getElementById('migrate-no').onclick = () => {
            dialog.remove();
        };

        document.getElementById('migrate-never').onclick = () => {
            localStorage.setItem('skipMigration', 'true');
            dialog.remove();
        };
    }

    // Show welcome message for new users
    showWelcomeMessageIfNeeded() {
        if (this.memos.length === 0) {
            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'welcome-message';
            welcomeMessage.innerHTML = `
                <div class="welcome-content">
                    <h2>🎉 Welcome to Your Internship Journal!</h2>
                    <p>Start documenting your journey by creating your first memo. Track your progress, learnings, and achievements!</p>
                    <button class="btn btn-primary" onclick="this.parentElement.parentElement.style.display='none'">Get Started</button>
                </div>
            `;
            
            const container = document.querySelector('.container');
            if (container) {
                container.insertBefore(welcomeMessage, container.firstChild.nextSibling);
            }
        }
    }

    // Show settings panel
    showSettingsPanel() {
        const settingsOverlay = this.createSettingsOverlay();
        document.body.appendChild(settingsOverlay);
        
        // Setup settings panel event listeners
        this.setupSettingsEventListeners(settingsOverlay);
    }

    // Create settings panel overlay
    createSettingsOverlay() {
        const user = authService.getCurrentUser();
        const userInfo = authService.getUserInfo();
        const storageInfo = storageService.getStorageInfo();
        const sessionInfo = authService.getSessionInfo();

        const overlay = document.createElement('div');
        overlay.className = 'settings-overlay';
        overlay.innerHTML = `
            <div class="settings-panel">
                <div class="settings-header">
                    <h2>⚙️ Settings</h2>
                    <button class="close-settings" aria-label="Close settings">&times;</button>
                </div>
                
                <div class="settings-content">
                    <!-- Account Information -->
                    <div class="settings-section">
                        <h3>👤 Account Information</h3>
                        <div class="setting-item">
                            <label>Email:</label>
                            <span>${userInfo?.email || 'Not available'}</span>
                        </div>
                        <div class="setting-item">
                            <label>Display Name:</label>
                            <span>${userInfo?.displayName || 'Not set'}</span>
                        </div>
                        <div class="setting-item">
                            <label>Account Created:</label>
                            <span>${userInfo?.createdAt ? new Date(userInfo.createdAt).toLocaleDateString() : 'Not available'}</span>
                        </div>
                        <div class="setting-item">
                            <label>Last Login:</label>
                            <span>${userInfo?.lastLogin ? new Date(userInfo.lastLogin).toLocaleDateString() : 'Not available'}</span>
                        </div>
                    </div>

                    <!-- Storage & Sync -->
                    <div class="settings-section">
                        <h3>☁️ Storage & Sync</h3>
                        <div class="setting-item">
                            <label>Storage Mode:</label>
                            <span>Cloud Storage (Firebase)</span>
                        </div>
                        <div class="setting-item">
                            <label>Sync Status:</label>
                            <span class="sync-indicator ${storageInfo.syncStatus}">${this.getSyncStatusText(storageInfo.syncStatus)}</span>
                        </div>
                        <div class="setting-item">
                            <label>User ID:</label>
                            <span class="user-id">${userInfo?.uid?.substring(0, 12) || 'Not available'}...</span>
                        </div>
                    </div>

                    <!-- Session Information -->
                    <div class="settings-section">
                        <h3>🕐 Session Information</h3>
                        <div class="setting-item">
                            <label>Session Duration:</label>
                            <span>${sessionInfo?.sessionDuration || 0} minutes</span>
                        </div>
                        <div class="setting-item">
                            <label>Time Until Expiry:</label>
                            <span>${sessionInfo?.timeUntilExpiry || 0} minutes</span>
                        </div>
                        <div class="setting-item">
                            <label>Last Activity:</label>
                            <span>${sessionInfo?.lastActivity ? sessionInfo.lastActivity.toLocaleTimeString() : 'Unknown'}</span>
                        </div>
                    </div>

                    <!-- Data Management -->
                    <div class="settings-section">
                        <h3>📊 Data Management</h3>
                        <div class="setting-actions">
                            <button class="btn btn-secondary" id="refresh-data">🔄 Refresh Data</button>
                            <button class="btn btn-secondary" id="export-settings">📤 Export Data</button>
                            <button class="btn btn-secondary" id="clear-cache">🗑️ Clear Cache</button>
                        </div>
                    </div>

                    <!-- Security -->
                    <div class="settings-section">
                        <h3>🔒 Security</h3>
                        <div class="setting-actions">
                            <button class="btn btn-secondary" id="change-password">🔑 Change Password</button>
                            <button class="btn btn-secondary" id="extend-session">⏰ Extend Session</button>
                        </div>
                    </div>

                    <!-- About -->
                    <div class="settings-section">
                        <h3>ℹ️ About</h3>
                        <div class="setting-item">
                            <label>App Version:</label>
                            <span>2.0.0 (Authentication)</span>
                        </div>
                        <div class="setting-item">
                            <label>Last Updated:</label>
                            <span>September 2025</span>
                        </div>
                        <div class="about-links">
                            <a href="https://github.com/fairulmuhammad/internship-progres-tracker" target="_blank" class="btn btn-link">📂 GitHub</a>
                            <a href="https://fairulmuhammad.github.io/internship-progres-tracker/" target="_blank" class="btn btn-link">🌐 Live Demo</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return overlay;
    }

    // Setup settings panel event listeners
    setupSettingsEventListeners(overlay) {
        // Close button
        const closeBtn = overlay.querySelector('.close-settings');
        closeBtn.addEventListener('click', () => {
            overlay.remove();
        });

        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // Settings actions
        const refreshBtn = overlay.querySelector('#refresh-data');
        const exportBtn = overlay.querySelector('#export-settings');
        const clearCacheBtn = overlay.querySelector('#clear-cache');
        const changePasswordBtn = overlay.querySelector('#change-password');
        const extendSessionBtn = overlay.querySelector('#extend-session');

        // Refresh data
        refreshBtn?.addEventListener('click', async () => {
            try {
                this.showLoading('Refreshing data...');
                await this.loadUserData();
                this.hideLoading();
                uiComponents.showNotification('Data refreshed successfully!', 'success');
                overlay.remove();
            } catch (error) {
                this.hideLoading();
                uiComponents.showNotification('Failed to refresh data', 'error');
            }
        });

        // Export data
        exportBtn?.addEventListener('click', () => {
            this.exportData();
            overlay.remove();
        });

        // Clear cache
        clearCacheBtn?.addEventListener('click', () => {
            uiComponents.showConfirmDialog(
                'Clear browser cache? This will remove temporary data but keep your cloud memos safe.',
                () => {
                    localStorage.clear();
                    sessionStorage.clear();
                    uiComponents.showNotification('Cache cleared successfully!', 'success');
                    overlay.remove();
                }
            );
        });

        // Change password
        changePasswordBtn?.addEventListener('click', () => {
            this.showChangePasswordDialog();
            overlay.remove();
        });

        // Extend session
        extendSessionBtn?.addEventListener('click', () => {
            authService.handleUserActivity(); // Reset activity timer
            uiComponents.showNotification('Session extended successfully!', 'success');
            overlay.remove();
        });
    }

    // Get sync status text
    getSyncStatusText(status) {
        switch (status) {
            case 'connected': return '✅ Connected';
            case 'syncing': return '🔄 Syncing';
            case 'error': return '⚠️ Error';
            case 'disconnected': return '❌ Disconnected';
            default: return '❓ Unknown';
        }
    }

    // Show change password dialog
    showChangePasswordDialog() {
        const user = authService.getCurrentUser();
        
        if (!user) {
            uiComponents.showNotification('You must be logged in to change password', 'error');
            return;
        }

        // For Google users, redirect to Google account settings
        if (user.providerData?.[0]?.providerId === 'google.com') {
            uiComponents.showConfirmDialog(
                'To change your password, you need to update it in your Google account. Open Google Account settings?',
                () => {
                    window.open('https://myaccount.google.com/security', '_blank');
                }
            );
            return;
        }

        // For email/password users, show reset password option
        uiComponents.showConfirmDialog(
            'We will send a password reset email to your registered email address. Continue?',
            async () => {
                try {
                    await authService.resetPassword(user.email);
                    uiComponents.showNotification('Password reset email sent! Check your inbox.', 'success');
                } catch (error) {
                    console.error('Password reset error:', error);
                    uiComponents.showNotification('Failed to send password reset email', 'error');
                }
            }
        );
    }

    // Handle sign out with confirmation
    handleSignOut() {
        uiComponents.showConfirmDialog(
            'Are you sure you want to sign out? Make sure all your changes are saved.',
            async () => {
                try {
                    await authService.signOut();
                } catch (error) {
                    console.error('Sign out error:', error);
                    uiComponents.showNotification('Failed to sign out. Please try again.', 'error');
                }
            }
        );
    }

}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new InternshipTracker();
    await app.initialize();
    
    // Make app available globally for debugging
    window.internshipTracker = app;
    
    // Expose functions needed by dashboard filter system
    window.displayMemos = () => app.applyFilters(); // Use applyFilters instead of renderMemos
    window.getMemosForFiltering = () => app.memos;
});
