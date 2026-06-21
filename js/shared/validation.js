// js/shared/validation.js
// Form validation UI with real-time feedback

const Validation = {
    validators: {
        required: (value) => ({
            valid: value !== null && value !== undefined && value !== '',
            message: 'This field is required'
        }),

        email: (value) => ({
            valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            message: 'Please enter a valid email address'
        }),

        minLength: (min) => (value) => ({
            valid: value.length >= min,
            message: `Must be at least ${min} characters`
        }),

        maxLength: (max) => (value) => ({
            valid: value.length <= max,
            message: `Must be no more than ${max} characters`
        }),

        pattern: (regex, message) => (value) => ({
            valid: regex.test(value),
            message: message || 'Invalid format'
        }),

        password: (value) => ({
            valid: value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value),
            message: 'Must be at least 8 characters with uppercase, lowercase, and number'
        }),

        phone: (value) => ({
            valid: /^[\d\s\-\+\(\)]{10,}$/.test(value.replace(/\s/g, '')),
            message: 'Please enter a valid phone number'
        }),

        url: (value) => ({
            valid: /^https?:\/\/.+\..+/.test(value),
            message: 'Please enter a valid URL'
        }),

        number: (value) => ({
            valid: !isNaN(parseFloat(value)) && isFinite(value),
            message: 'Please enter a valid number'
        }),

        min: (min) => (value) => ({
            valid: parseFloat(value) >= min,
            message: `Must be at least ${min}`
        }),

        max: (max) => (value) => ({
            valid: parseFloat(value) <= max,
            message: `Must be no more than ${max}`
        }),

        match: (fieldName) => (value, formData) => ({
            valid: value === formData[fieldName],
            message: `Must match ${fieldName}`
        }),

        date: (value) => ({
            valid: !isNaN(Date.parse(value)),
            message: 'Please enter a valid date'
        }),

        age: (minAge) => (value) => {
            const birthDate = new Date(value);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
            return {
                valid: actualAge >= minAge,
                message: `Must be at least ${minAge} years old`
            };
        }
    },

    initForm(form, options = {}) {
        const {
            validateOnBlur = true,
            validateOnInput = false,
            validateOnChange = true,
            showSuccess = true,
            realtime = true
        } = options;

        const fields = form.querySelectorAll('[data-validate]');
        const formData = {};

        fields.forEach(field => {
            const name = field.name || field.id;
            formData[name] = field.value;

            // Get validation rules
            const rules = this.parseRules(field.dataset.validate);

            // Create validation indicator
            const indicator = this.createIndicator(field);
            field.parentElement.style.position = 'relative';
            field.parentElement.appendChild(indicator);

            // Validate on blur
            if (validateOnBlur) {
                field.addEventListener('blur', () => {
                    this.validateField(field, rules, formData, showSuccess);
                });
            }

            // Validate on input
            if (validateOnInput) {
                field.addEventListener('input', () => {
                    formData[name] = field.value;
                    if (realtime) {
                        this.validateField(field, rules, formData, showSuccess);
                    }
                });
            }

            // Validate on change
            if (validateOnChange) {
                field.addEventListener('change', () => {
                    formData[name] = field.value;
                    this.validateField(field, rules, formData, showSuccess);
                });
            }
        });

        return { fields, formData };
    },

    parseRules(ruleString) {
        const rules = [];
        const parts = ruleString.split('|').map(r => r.trim());

        parts.forEach(part => {
            if (part === 'required') {
                rules.push(this.validators.required);
            } else if (part === 'email') {
                rules.push(this.validators.email);
            } else if (part === 'password') {
                rules.push(this.validators.password);
            } else if (part === 'phone') {
                rules.push(this.validators.phone);
            } else if (part === 'url') {
                rules.push(this.validators.url);
            } else if (part === 'number') {
                rules.push(this.validators.number);
            } else if (part === 'date') {
                rules.push(this.validators.date);
            } else if (part.startsWith('min:')) {
                const min = parseInt(part.split(':')[1], 10);
                rules.push(this.validators.min(min));
            } else if (part.startsWith('max:')) {
                const max = parseInt(part.split(':')[1], 10);
                rules.push(this.validators.max(max));
            } else if (part.startsWith('minLength:')) {
                const min = parseInt(part.split(':')[1], 10);
                rules.push(this.validators.minLength(min));
            } else if (part.startsWith('maxLength:')) {
                const max = parseInt(part.split(':')[1], 10);
                rules.push(this.validators.maxLength(max));
            } else if (part.startsWith('pattern:')) {
                const pattern = part.split(':')[1];
                const message = part.includes(':message:') ? part.split(':message:')[1] : 'Invalid format';
                rules.push(this.validators.pattern(new RegExp(pattern), message));
            } else if (part.startsWith('match:')) {
                const fieldName = part.split(':')[1];
                rules.push(this.validators.match(fieldName));
            } else if (part.startsWith('age:')) {
                const minAge = parseInt(part.split(':')[1], 10);
                rules.push(this.validators.age(minAge));
            }
        });

        return rules;
    },

    createIndicator(field) {
        const indicator = document.createElement('span');
        indicator.className = 'validation-indicator';
        indicator.style.cssText = `
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 1.1rem;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
        `;
        return indicator;
    },

    validateField(field, rules, formData, showSuccess = true) {
        const value = field.value;
        const indicator = field.parentElement.querySelector('.validation-indicator');
        const name = field.name || field.id;

        // Clear previous state
        this.clearFieldState(field);

        // Run all validators
        for (const validator of rules) {
            const result = validator(value, formData);
            
            if (!result.valid) {
                // Show error
                this.showError(field, result.message);
                if (indicator) {
                    indicator.innerHTML = '<i class="bi bi-x-circle-fill" style="color: #dc2626;"></i>';
                    indicator.style.opacity = '1';
                }
                field.style.borderColor = '#dc2626';
                return false;
            }
        }

        // Show success if valid and not empty
        if (showSuccess && value !== '') {
            this.showSuccess(field);
            if (indicator) {
                indicator.innerHTML = '<i class="bi bi-check-circle-fill" style="color: #16a34a;"></i>';
                indicator.style.opacity = '1';
            }
            field.style.borderColor = '#16a34a';
        }

        return true;
    },

    showError(field, message) {
        this.clearFieldState(field);
        
        const errorEl = document.createElement('div');
        errorEl.className = 'validation-error';
        errorEl.style.cssText = `
            color: #dc2626;
            font-size: 0.8rem;
            margin-top: 4px;
            display: flex;
            align-items: center;
            gap: 4px;
            animation: slideDown 0.2s ease-out;
        `;
        errorEl.innerHTML = `<i class="bi bi-exclamation-circle"></i> ${this.escapeHtml(message)}`;
        
        field.parentElement.appendChild(errorEl);
        field.dataset.hasError = 'true';
    },

    showSuccess(field) {
        this.clearFieldState(field);
        
        const successEl = document.createElement('div');
        successEl.className = 'validation-success';
        successEl.style.cssText = `
            color: #16a34a;
            font-size: 0.8rem;
            margin-top: 4px;
            display: flex;
            align-items: center;
            gap: 4px;
            animation: slideDown 0.2s ease-out;
        `;
        successEl.innerHTML = `<i class="bi bi-check-circle"></i> Looks good`;
        
        field.parentElement.appendChild(successEl);
        field.dataset.hasSuccess = 'true';
    },

    clearFieldState(field) {
        const errorEl = field.parentElement.querySelector('.validation-error');
        const successEl = field.parentElement.querySelector('.validation-success');
        
        if (errorEl) errorEl.remove();
        if (successEl) successEl.remove();
        
        delete field.dataset.hasError;
        delete field.dataset.hasSuccess;
        field.style.borderColor = '';
    },

    validateForm(form) {
        const fields = form.querySelectorAll('[data-validate]');
        let isValid = true;
        const formData = {};

        fields.forEach(field => {
            const name = field.name || field.id;
            formData[name] = field.value;
            const rules = this.parseRules(field.dataset.validate);
            
            if (!this.validateField(field, rules, formData, true)) {
                isValid = false;
            }
        });

        return isValid;
    },

    // Password strength meter
    initPasswordStrength(input, meterElement) {
        if (!input || !meterElement) return;

        input.addEventListener('input', () => {
            const strength = this.calculatePasswordStrength(input.value);
            this.updatePasswordMeter(meterElement, strength);
        });
    },

    calculatePasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength += 1;
        if (password.length >= 12) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

        return Math.min(strength, 5);
    },

    updatePasswordMeter(meter, strength) {
        const levels = [
            { color: '#dc2626', label: 'Very Weak', width: '20%' },
            { color: '#ea580c', label: 'Weak', width: '40%' },
            { color: '#ca8a04', label: 'Fair', width: '60%' },
            { color: '#16a34a', label: 'Good', width: '80%' },
            { color: '#15803d', label: 'Strong', width: '100%' }
        ];

        const level = levels[Math.min(strength, 4)];
        
        meter.innerHTML = `
            <div class="password-strength-bar" style="
                height: 4px;
                background: ${level.color};
                width: ${level.width};
                border-radius: 2px;
                transition: all 0.3s ease;
            "></div>
            <div class="password-strength-label" style="
                font-size: 0.75rem;
                color: ${level.color};
                margin-top: 4px;
                font-weight: 500;
            ">${level.label}</div>
        `;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-5px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .validation-indicator {
        transition: opacity 0.2s ease;
    }

    @media (prefers-reduced-motion: reduce) {
        .validation-error,
        .validation-success {
            animation: none;
        }
    }
`;
document.head.appendChild(style);

// Global functions for backward compatibility
window.initFormValidation = (form, options) => Validation.initForm(form, options);
window.validateForm = (form) => Validation.validateForm(form);
window.initPasswordStrength = (input, meter) => Validation.initPasswordStrength(input, meter);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Validation;
}
