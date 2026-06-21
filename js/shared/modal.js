// js/shared/modal.js
// General modal system for confirmations, alerts, and interactive dialogs

const Modal = {
    container: null,
    overlay: null,
    currentModal: null,

    init() {
        if (this.container) return;

        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'modal-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            backdrop-filter: blur(4px);
        `;

        // Create modal container
        this.container = document.createElement('div');
        this.container.id = 'modal-container';
        this.container.style.cssText = `
            background: var(--bg-white);
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow: auto;
            transform: scale(0.9);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
        `;

        this.overlay.appendChild(this.container);
        document.body.appendChild(this.overlay);

        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.close();
            }
        });
    },

    show(options) {
        this.init();

        const {
            title = '',
            content = '',
            buttons = [],
            size = 'medium',
            showClose = true,
            onOpen = null,
            onClose = null
        } = options;

        // Size variants
        const sizes = {
            small: 'max-width: 400px;',
            medium: 'max-width: 500px;',
            large: 'max-width: 700px;',
            xlarge: 'max-width: 900px;'
        };

        this.container.style.cssText = `
            background: var(--bg-white);
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            ${sizes[size] || sizes.medium}
            width: 100%;
            max-height: 90vh;
            overflow: auto;
            transform: scale(0.9);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
        `;

        // Build modal content
        let buttonsHtml = '';
        if (buttons.length > 0) {
            buttonsHtml = `
                <div class="modal-buttons" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; flex-wrap: wrap;">
                    ${buttons.map((btn, index) => `
                        <button class="modal-btn modal-btn-${btn.type || 'primary'}" 
                                data-index="${index}"
                                style="padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.2s; ${btn.style || ''}">
                            ${btn.icon ? `<i class="bi ${btn.icon}" style="margin-right: 6px;"></i>` : ''}
                            ${btn.text}
                        </button>
                    `).join('')}
                </div>
            `;
        }

        this.container.innerHTML = `
            <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; padding: 20px; border-bottom: 1px solid var(--border-color);">
                <h2 style="margin: 0; font-size: 1.2rem; font-weight: 600; color: var(--text-main);">${this.escapeHtml(title)}</h2>
                ${showClose ? `
                    <button class="modal-close-btn" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-light); padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: background 0.2s;">
                        <i class="bi bi-x"></i>
                    </button>
                ` : ''}
            </div>
            <div class="modal-body" style="padding: 20px; color: var(--text-main); line-height: 1.6;">
                ${content}
            </div>
            ${buttonsHtml}
        `;

        // Add button event listeners
        const buttonElements = this.container.querySelectorAll('.modal-btn');
        buttonElements.forEach((btnEl, index) => {
            btnEl.addEventListener('click', () => {
                if (buttons[index].onClick) {
                    buttons[index].onClick();
                }
                if (buttons[index].closeOnClick !== false) {
                    this.close();
                }
            });
        });

        // Style buttons
        buttonElements.forEach(btnEl => {
            const type = btnEl.classList.contains('modal-btn-primary') ? 'primary' :
                        btnEl.classList.contains('modal-btn-danger') ? 'danger' :
                        btnEl.classList.contains('modal-btn-success') ? 'success' : 'secondary';
            
            const styles = {
                primary: 'background: var(--primary-color); color: white;',
                danger: 'background: #dc2626; color: white;',
                success: 'background: #16a34a; color: white;',
                secondary: 'background: var(--bg-light); color: var(--text-main); border: 1px solid var(--border-color);'
            };

            btnEl.style.cssText += styles[type] || styles.secondary;
            btnEl.addEventListener('mouseenter', () => {
                if (type === 'primary') btnEl.style.opacity = '0.9';
                if (type === 'secondary') btnEl.style.background = 'var(--border-color)';
            });
            btnEl.addEventListener('mouseleave', () => {
                if (type === 'primary') btnEl.style.opacity = '1';
                if (type === 'secondary') btnEl.style.background = 'var(--bg-light)';
            });
        });

        // Close button
        const closeBtn = this.container.querySelector('.modal-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
            closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = 'var(--bg-light)');
            closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = 'none');
        }

        // Store callbacks
        this.currentModal = { onOpen, onClose };

        // Show modal
        this.overlay.style.display = 'flex';
        setTimeout(() => {
            this.container.style.transform = 'scale(1)';
            this.container.style.opacity = '1';
        }, 10);

        // Call onOpen callback
        if (onOpen) onOpen();

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    },

    close() {
        if (!this.currentModal) return;

        const { onClose } = this.currentModal;

        this.container.style.transform = 'scale(0.9)';
        this.container.style.opacity = '0';

        setTimeout(() => {
            this.overlay.style.display = 'none';
            this.currentModal = null;
            document.body.style.overflow = '';
            if (onClose) onClose();
        }, 300);
    },

    // Convenience methods
    alert(message, title = 'Alert') {
        return new Promise((resolve) => {
            this.show({
                title,
                content: `<p>${this.escapeHtml(message)}</p>`,
                buttons: [
                    {
                        text: 'OK',
                        type: 'primary',
                        onClick: () => resolve()
                    }
                ]
            });
        });
    },

    confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            this.show({
                title,
                content: `<p>${this.escapeHtml(message)}</p>`,
                buttons: [
                    {
                        text: 'Cancel',
                        type: 'secondary',
                        onClick: () => resolve(false)
                    },
                    {
                        text: 'Confirm',
                        type: 'primary',
                        onClick: () => resolve(true)
                    }
                ]
            });
        });
    },

    prompt(message, defaultValue = '', title = 'Input') {
        return new Promise((resolve) => {
            this.show({
                title,
                content: `
                    <p style="margin-bottom: 15px;">${this.escapeHtml(message)}</p>
                    <input type="text" 
                           class="modal-prompt-input" 
                           value="${this.escapeHtml(defaultValue)}"
                           style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.95rem; font-family: inherit; box-sizing: border-box;">
                `,
                buttons: [
                    {
                        text: 'Cancel',
                        type: 'secondary',
                        onClick: () => resolve(null)
                    },
                    {
                        text: 'Submit',
                        type: 'primary',
                        onClick: () => {
                            const input = this.container.querySelector('.modal-prompt-input');
                            resolve(input ? input.value : null);
                        }
                    }
                ],
                closeOnClick: false
            });

            // Focus input after modal opens
            setTimeout(() => {
                const input = this.container.querySelector('.modal-prompt-input');
                if (input) input.focus();
            }, 100);
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Global functions for backward compatibility
window.showModal = (options) => Modal.show(options);
window.closeModal = () => Modal.close();
window.alertModal = (message, title) => Modal.alert(message, title);
window.confirmModal = (message, title) => Modal.confirm(message, title);
window.promptModal = (message, defaultValue, title) => Modal.prompt(message, defaultValue, title);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Modal;
}
