// File Handling Service - Manages file uploads, processing, and attachments
import { appConfig, LOG_LEVEL } from './config.js';

class FileService {
    constructor() {
        this.supportedTypes = appConfig.FILE_UPLOAD.ACCEPTED_TYPES;
        this.maxSize = appConfig.FILE_UPLOAD.MAX_SIZE;
        this.imageTypes = appConfig.FILE_UPLOAD.SUPPORTED_IMAGE_TYPES;
    }

    // Process multiple files from file input
    async processFiles(files) {
        const fileArray = Array.from(files);
        const processedFiles = [];
        
        for (const file of fileArray) {
            try {
                // Validate file
                this.validateFile(file);
                
                // Process file
                const processedFile = await this.processFile(file);
                processedFiles.push(processedFile);
                
                this.log(`File processed successfully: ${file.name}`);
            } catch (error) {
                this.logError(`Error processing file ${file.name}`, error);
                throw new Error(`Error processing file "${file.name}": ${error.message}`);
            }
        }
        
        return processedFiles;
    }

    // Process single file
    async processFile(file) {
        const fileData = await this.fileToBase64(file);
        
        return {
            name: file.name,
            type: file.type,
            size: file.size,
            data: fileData,
            lastModified: file.lastModified,
            processedAt: new Date().toISOString()
        };
    }

    // Validate file before processing
    validateFile(file) {
        // Check file size
        if (file.size > this.maxSize) {
            throw new Error(`File size exceeds ${this.formatFileSize(this.maxSize)} limit`);
        }

        // Check if file size is 0
        if (file.size === 0) {
            throw new Error('File is empty');
        }

        // Check file type (basic validation)
        const isValidType = this.supportedTypes.some(type => {
            if (type.startsWith('.')) {
                return file.name.toLowerCase().endsWith(type.toLowerCase());
            } else if (type.includes('*')) {
                const baseType = type.split('/')[0];
                return file.type.startsWith(baseType);
            } else {
                return file.type === type;
            }
        });

        if (!isValidType) {
            throw new Error(`File type not supported. Supported types: ${this.supportedTypes.join(', ')}`);
        }
    }

    // Convert file to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                resolve(reader.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.onabort = () => {
                reject(new Error('File reading was aborted'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    // Create download link for file
    downloadFile(fileData, filename) {
        try {
            const link = document.createElement('a');
            link.href = fileData.data;
            link.download = filename || fileData.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.log(`File downloaded: ${filename || fileData.name}`);
        } catch (error) {
            this.logError('Error downloading file', error);
            throw new Error('Failed to download file');
        }
    }

    // View file in modal (for images)
    viewFile(fileData) {
        if (!this.isImage(fileData.type)) {
            throw new Error('File type not supported for viewing');
        }

        const modal = this.createImageModal(fileData);
        document.body.appendChild(modal);
    }

    // Create image viewing modal
    createImageModal(fileData) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.padding = '0';
        modalContent.style.maxWidth = '90vw';
        modalContent.style.maxHeight = '90vh';
        
        const img = document.createElement('img');
        img.src = fileData.data;
        img.alt = fileData.name;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        img.style.display = 'block';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('aria-label', 'Close');
        
        const closeModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        };
        
        closeBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
        
        // Keyboard support
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        
        document.addEventListener('keydown', handleKeydown);
        
        modalContent.appendChild(img);
        modalContent.appendChild(closeBtn);
        modal.appendChild(modalContent);
        
        return modal;
    }

    // Get appropriate icon for file type
    getFileIcon(type, name) {
        if (this.isImage(type)) return '🖼️';
        if (type.includes('pdf')) return '📄';
        if (type.includes('doc') || type.includes('word')) return '📝';
        if (name.endsWith('.js') || name.endsWith('.json')) return '📜';
        if (name.endsWith('.html') || name.endsWith('.css')) return '🌐';
        if (name.endsWith('.py')) return '🐍';
        if (name.endsWith('.java')) return '☕';
        if (name.endsWith('.cpp') || name.endsWith('.c')) return '⚡';
        if (type.includes('text')) return '📄';
        if (type.includes('zip') || type.includes('archive')) return '📦';
        return '📎';
    }

    // Format file size for display
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Check if file is an image
    isImage(type) {
        return this.imageTypes.some(imageType => 
            type.startsWith(imageType.split('/')[0]) || type === imageType
        );
    }

    // Create file preview element
    createFilePreview(file, onRemove = null) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        const fileIcon = document.createElement('span');
        fileIcon.className = 'file-icon';
        fileIcon.textContent = this.getFileIcon(file.type, file.name);
        
        const fileDetails = document.createElement('div');
        
        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        
        const fileSize = document.createElement('span');
        fileSize.className = 'file-size';
        fileSize.textContent = `(${this.formatFileSize(file.size)})`;
        
        fileDetails.appendChild(fileName);
        fileDetails.appendChild(fileSize);
        
        fileInfo.appendChild(fileIcon);
        fileInfo.appendChild(fileDetails);
        
        const actions = document.createElement('div');
        actions.className = 'file-actions';
        
        if (onRemove) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn btn-sm btn-danger';
            removeBtn.innerHTML = '×';
            removeBtn.setAttribute('aria-label', 'Remove file');
            removeBtn.onclick = onRemove;
            actions.appendChild(removeBtn);
        }
        
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(actions);
        
        return fileItem;
    }

    // Create attachment element with view/download actions
    createAttachmentElement(fileData, onRemove = null) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.style.backgroundColor = '#eff6ff'; // Light blue background for attachments
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        const fileIcon = document.createElement('span');
        fileIcon.className = 'file-icon';
        fileIcon.textContent = this.getFileIcon(fileData.type, fileData.name);
        
        const fileDetails = document.createElement('div');
        
        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        fileName.textContent = fileData.name;
        
        const fileSize = document.createElement('span');
        fileSize.className = 'file-size';
        fileSize.textContent = `(${this.formatFileSize(fileData.size)})`;
        
        fileDetails.appendChild(fileName);
        fileDetails.appendChild(fileSize);
        
        fileInfo.appendChild(fileIcon);
        fileInfo.appendChild(fileDetails);
        
        const actions = document.createElement('div');
        actions.className = 'file-actions';
        
        // View button for images
        if (this.isImage(fileData.type)) {
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-sm btn-secondary';
            viewBtn.textContent = '👁️';
            viewBtn.setAttribute('aria-label', 'View file');
            viewBtn.onclick = () => this.viewFile(fileData);
            actions.appendChild(viewBtn);
        }
        
        // Download button
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-sm btn-secondary';
        downloadBtn.textContent = '⬇️';
        downloadBtn.setAttribute('aria-label', 'Download file');
        downloadBtn.onclick = () => this.downloadFile(fileData);
        actions.appendChild(downloadBtn);
        
        // Remove button
        if (onRemove) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn btn-sm btn-danger';
            removeBtn.innerHTML = '×';
            removeBtn.setAttribute('aria-label', 'Remove attachment');
            removeBtn.onclick = onRemove;
            actions.appendChild(removeBtn);
        }
        
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(actions);
        
        return fileItem;
    }

    // Utility logging methods
    log(message, data = null) {
        if (LOG_LEVEL === 'debug') {
            console.log(`[FileService] ${message}`, data || '');
        }
    }

    logError(message, error) {
        console.error(`[FileService] ${message}`, error);
    }
}

// Export singleton instance
export const fileService = new FileService();
