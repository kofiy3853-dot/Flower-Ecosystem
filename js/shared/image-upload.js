// js/shared/image-upload.js
// Image upload with preview, drag-and-drop, and validation

const ImageUpload = {
    init(input, options = {}) {
        const {
            previewContainer = null,
            maxFiles = 1,
            maxSize = 5 * 1024 * 1024, // 5MB
            acceptTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            showPreview = true,
            allowMultiple = false,
            onFileSelect = null,
            onFileRemove = null,
            onError = null
        } = options;

        if (!input) return null;

        // Create upload wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'image-upload-wrapper';
        wrapper.style.cssText = `
            position: relative;
        `;

        // Create drop zone
        const dropZone = document.createElement('div');
        dropZone.className = 'image-drop-zone';
        dropZone.style.cssText = `
            border: 2px dashed var(--border-color);
            border-radius: 12px;
            padding: 2rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: var(--bg-white);
        `;

        dropZone.innerHTML = `
            <i class="bi bi-cloud-upload" style="font-size: 2.5rem; color: var(--text-light); margin-bottom: 1rem; display: block;"></i>
            <p style="margin: 0; color: var(--text-main); font-weight: 500;">Drag & drop images here</p>
            <p style="margin: 0.5rem 0 0; color: var(--text-light); font-size: 0.85rem;">or click to browse</p>
            <p style="margin: 0.5rem 0 0; color: var(--text-muted); font-size: 0.75rem;">Max ${maxSize / 1024 / 1024}MB per file</p>
        `;

        // Create preview container
        let previewContainerEl = previewContainer;
        if (!previewContainerEl && showPreview) {
            previewContainerEl = document.createElement('div');
            previewContainerEl.className = 'image-preview-container';
            previewContainerEl.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: 12px;
                margin-top: 16px;
            `;
        }

        // Hide original input
        input.style.display = 'none';

        // Insert elements
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(dropZone);
        wrapper.appendChild(input);
        if (previewContainerEl && !previewContainer) {
            wrapper.appendChild(previewContainerEl);
        }

        const state = {
            files: [],
            maxFiles,
            maxSize,
            acceptTypes,
            allowMultiple,
            onFileSelect,
            onFileRemove,
            onError,
            previewContainer: previewContainerEl
        };

        // Event listeners
        dropZone.addEventListener('click', () => input.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--primary-color)';
            dropZone.style.background = 'rgba(172, 50, 80, 0.05)';
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = 'var(--border-color)';
            dropZone.style.background = 'var(--bg-white)';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--border-color)';
            dropZone.style.background = 'var(--bg-white)';
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files, state);
        });

        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFiles(files, state);
            input.value = ''; // Reset input to allow re-selecting same file
        });

        return state;
    },

    handleFiles(files, state) {
        const { maxFiles, maxSize, acceptTypes, allowMultiple, onFileSelect, onError, previewContainer } = state;

        if (!allowMultiple && files.length > 1) {
            if (onError) onError('Only one file is allowed');
            if (typeof Toast !== 'undefined') Toast.error('Only one file is allowed');
            return;
        }

        if (state.files.length + files.length > maxFiles) {
            if (onError) onError(`Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed`);
            if (typeof Toast !== 'undefined') Toast.error(`Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed`);
            return;
        }

        files.forEach(file => {
            // Validate file type
            if (!acceptTypes.includes(file.type)) {
                if (onError) onError(`Invalid file type: ${file.type}`);
                if (typeof Toast !== 'undefined') Toast.error('Invalid file type. Please upload an image.');
                return;
            }

            // Validate file size
            if (file.size > maxSize) {
                if (onError) onError(`File too large: ${file.size} bytes`);
                if (typeof Toast !== 'undefined') Toast.error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB.`);
                return;
            }

            // Add to state
            state.files.push(file);

            // Create preview
            if (previewContainer) {
                this.createPreview(file, previewContainer, state);
            }

            // Callback
            if (onFileSelect) onFileSelect(file, state.files);
        });

        // Update drop zone text
        const dropZone = document.querySelector('.image-drop-zone');
        if (dropZone && state.files.length > 0) {
            dropZone.innerHTML = `
                <i class="bi bi-check-circle-fill" style="font-size: 2.5rem; color: #16a34a; margin-bottom: 1rem; display: block;"></i>
                <p style="margin: 0; color: var(--text-main); font-weight: 500;">${state.files.length} file${state.files.length > 1 ? 's' : ''} selected</p>
                <p style="margin: 0.5rem 0 0; color: var(--text-light); font-size: 0.85rem;">Click to add more</p>
            `;
        }
    },

    createPreview(file, container, state) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const preview = document.createElement('div');
            preview.className = 'image-preview-item';
            preview.style.cssText = `
                position: relative;
                aspect-ratio: 1;
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid var(--border-color);
                background: var(--bg-light);
            `;

            preview.innerHTML = `
                <img src="${e.target.result}" 
                     alt="${file.name}" 
                     style="width: 100%; height: 100%; object-fit: cover;">
                <button class="image-remove-btn" 
                        style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; transition: background 0.2s;">
                    <i class="bi bi-x"></i>
                </button>
                <div class="image-info" 
                     style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; font-size: 0.7rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${file.name}
                </div>
            `;

            // Remove button
            const removeBtn = preview.querySelector('.image-remove-btn');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFile(file, preview, state);
            });
            removeBtn.addEventListener('mouseenter', () => removeBtn.style.background = 'rgba(220, 38, 38, 0.9)');
            removeBtn.addEventListener('mouseleave', () => removeBtn.style.background = 'rgba(0,0,0,0.7)');

            container.appendChild(preview);
        };

        reader.readAsDataURL(file);
    },

    removeFile(file, previewEl, state) {
        const index = state.files.indexOf(file);
        if (index > -1) {
            state.files.splice(index, 1);
        }

        previewEl.remove();

        // Update drop zone
        const dropZone = document.querySelector('.image-drop-zone');
        if (dropZone && state.files.length === 0) {
            dropZone.innerHTML = `
                <i class="bi bi-cloud-upload" style="font-size: 2.5rem; color: var(--text-light); margin-bottom: 1rem; display: block;"></i>
                <p style="margin: 0; color: var(--text-main); font-weight: 500;">Drag & drop images here</p>
                <p style="margin: 0.5rem 0 0; color: var(--text-light); font-size: 0.85rem;">or click to browse</p>
                <p style="margin: 0.5rem 0 0; color: var(--text-muted); font-size: 0.75rem;">Max ${state.maxSize / 1024 / 1024}MB per file</p>
            `;
        } else if (dropZone) {
            dropZone.querySelector('p').textContent = `${state.files.length} file${state.files.length > 1 ? 's' : ''} selected`;
        }

        // Callback
        if (state.onFileRemove) state.onFileRemove(file, state.files);
    },

    getFiles(state) {
        return state.files;
    },

    clear(state) {
        state.files = [];
        const previews = state.previewContainer.querySelectorAll('.image-preview-item');
        previews.forEach(p => p.remove());

        const dropZone = document.querySelector('.image-drop-zone');
        if (dropZone) {
            dropZone.innerHTML = `
                <i class="bi bi-cloud-upload" style="font-size: 2.5rem; color: var(--text-light); margin-bottom: 1rem; display: block;"></i>
                <p style="margin: 0; color: var(--text-main); font-weight: 500;">Drag & drop images here</p>
                <p style="margin: 0.5rem 0 0; color: var(--text-light); font-size: 0.85rem;">or click to browse</p>
                <p style="margin: 0.5rem 0 0; color: var(--text-muted); font-size: 0.75rem;">Max ${state.maxSize / 1024 / 1024}MB per file</p>
            `;
        }
    },

    // Simple avatar upload with circular preview
    initAvatarUpload(input, previewElement, options = {}) {
        const {
            maxSize = 2 * 1024 * 1024, // 2MB
            acceptTypes = ['image/jpeg', 'image/png', 'image/webp'],
            onChange = null
        } = options;

        if (!input || !previewElement) return null;

        const state = {
            currentFile: null,
            maxSize,
            acceptTypes,
            onChange
        };

        // Set initial preview
        if (previewElement.tagName === 'IMG') {
            previewElement.style.borderRadius = '50%';
            previewElement.style.objectFit = 'cover';
        }

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate
            if (!acceptTypes.includes(file.type)) {
                if (typeof Toast !== 'undefined') Toast.error('Invalid file type');
                return;
            }

            if (file.size > maxSize) {
                if (typeof Toast !== 'undefined') Toast.error('File too large');
                return;
            }

            // Read and preview
            const reader = new FileReader();
            reader.onload = (e) => {
                if (previewElement.tagName === 'IMG') {
                    previewElement.src = e.target.result;
                } else {
                    previewElement.style.backgroundImage = `url(${e.target.result})`;
                    previewElement.style.backgroundSize = 'cover';
                    previewElement.style.backgroundPosition = 'center';
                }
                
                state.currentFile = file;
                if (onChange) onChange(file);
            };
            reader.readAsDataURL(file);
        });

        return state;
    }
};

// Global functions for backward compatibility
window.initImageUpload = (input, options) => ImageUpload.init(input, options);
window.initAvatarUpload = (input, preview, options) => ImageUpload.initAvatarUpload(input, preview, options);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageUpload;
}
