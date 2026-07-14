// ─── Course Creation Wizard ────────────────────────────────────────────
(function() {
    'use strict';

    let currentStep = 1;
    const totalSteps = 7;
    const STORAGE_KEY = 'cc-draft';
    const SAVE_INTERVAL = 30000;
    let autoSaveTimer = null;

    // ─── Course Data Model ──────────────────────────────────────────────
    const courseData = {
        title: '', subtitle: '', category: '', level: 'Beginner', language: 'English',
        short_description: '', description: '',
        learning_outcomes: [], requirements: [], target_audience: [],
        sections: [],
        thumbnail_url: '', promo_video_url: '', gallery: [],
        resources: [],
        quiz: { title: '', passing_score: 70, questions: [] },
        assignment: { title: '', instructions: '', deadline: '', allow_files: true, allowed_file_types: ['pdf', 'doc', 'zip', 'img'], max_file_size: 20 },
        has_certificate: true, certificate_title: 'Certificate of Completion', certificate_desc: 'Awarded to {{studentName}} for completing {{courseTitle}}', certificate_signature: '', certificate_logo: '',
        is_free: true, price: 0, discount_price: 0, enrollment_limit: 0, visibility: 'public',
        status: 'draft', course_id: null,
        seo_slug: '', meta_title: '', meta_description: ''
    };

    // ─── Init ───────────────────────────────────────────────────────────
    function init() {
        if (!localStorage.getItem('flower-user')) {
            window.location.href = 'login.html';
            return;
        }
        restoreDraft();
        setupInputListeners();
        updateSummary();
        startAutoSave();
    }

    // ─── Step Navigation ────────────────────────────────────────────────
    window.goToStep = function(step) {
        if (step < 1 || step > totalSteps) return;
        saveStepData(currentStep);
        currentStep = step;
        renderStep();
    };

    window.nextStep = function() {
        if (!validateStep(currentStep)) return;
        saveStepData(currentStep);
        if (currentStep < totalSteps) {
            currentStep++;
            renderStep();
        }
    };

    window.prevStep = function() {
        saveStepData(currentStep);
        if (currentStep > 1) {
            currentStep--;
            renderStep();
        }
    };

    function renderStep() {
        // Update content
        document.querySelectorAll('.cc-step-content').forEach(el => el.classList.remove('active'));
        document.getElementById('step-' + currentStep).classList.add('active');

        // Update sidebar
        document.querySelectorAll('.cc-step').forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.remove('active', 'completed');
            if (s === currentStep) el.classList.add('active');
            else if (s < currentStep) el.classList.add('completed');
        });

        // Update progress
        const pct = (currentStep / totalSteps) * 100;
        document.getElementById('progressFill').style.width = pct + '%';
        document.getElementById('progressLabel').textContent = `Step ${currentStep} of ${totalSteps}`;

        // Update step numbers
        document.querySelectorAll('.cc-step-num').forEach(el => {
            const step = el.closest('.cc-step');
            if (step.classList.contains('completed')) el.innerHTML = '<i class="bi bi-check-lg"></i>';
            else el.textContent = el.closest('.cc-step').dataset.step;
        });

        // Update buttons
        document.getElementById('ccBackBtn').disabled = currentStep === 1;
        const nextBtn = document.getElementById('ccNextBtn');
        if (currentStep === totalSteps) {
            nextBtn.style.display = 'none';
        } else {
            nextBtn.style.display = '';
            nextBtn.innerHTML = 'Next <i class="bi bi-arrow-right"></i>';
        }

        // Load step-specific data
        loadStepData(currentStep);
        updateSummary();

        // Scroll to top
        document.querySelector('.cc-main').scrollTop = 0;

        // Analytics: track step view
        trackStepView(currentStep);
    }

    // ─── Validation ─────────────────────────────────────────────────────
    function validateStep(step) {
        switch(step) {
            case 1:
                if (!document.getElementById('ccTitle').value.trim()) { alert('Please enter a course title.'); return false; }
                if (!document.getElementById('ccCategory').value) { alert('Please select a category.'); return false; }
                if (!document.getElementById('ccShortDesc').value.trim()) { alert('Please enter a short description.'); return false; }
                if (!document.getElementById('ccFullDesc').value.trim()) { alert('Please enter a full description.'); return false; }
                return true;
            case 2:
                if (courseData.sections.length === 0) { alert('Please add at least one section.'); return false; }
                for (const sec of courseData.sections) {
                    if (!sec.title.trim()) { alert('Please name all sections.'); return false; }
                    if (sec.lessons.length === 0) { alert(`Section "${sec.title}" needs at least one lesson.`); return false; }
                    for (const les of sec.lessons) {
                        if (!les.title.trim()) { alert('Please name all lessons.'); return false; }
                    }
                }
                return true;
            default:
                return true;
        }
    }

    // ─── Save/Load Step Data ────────────────────────────────────────────
    function saveStepData(step) {
        switch(step) {
            case 1:
                courseData.title = document.getElementById('ccTitle').value;
                courseData.subtitle = document.getElementById('ccSubtitle').value;
                courseData.category = document.getElementById('ccCategory').value;
                courseData.level = document.getElementById('ccLevel').value;
                courseData.language = document.getElementById('ccLanguage').value;
                courseData.short_description = document.getElementById('ccShortDesc').value;
                courseData.description = document.getElementById('ccFullDesc').value;
                courseData.target_audience = Array.from(document.querySelectorAll('#ccAudience .cc-checkbox.selected')).map(el => el.dataset.value);
                // SEO fields
                courseData.seo_slug = document.getElementById('ccSeoSlug').value;
                courseData.meta_title = document.getElementById('ccMetaTitle').value;
                courseData.meta_description = document.getElementById('ccMetaDesc').value;
                break;
            case 5:
                courseData.quiz.title = document.getElementById('ccQuizTitle').value;
                courseData.quiz.passing_score = parseInt(document.getElementById('ccQuizPassing').value) || 70;
                courseData.assignment.title = document.getElementById('ccAssignmentTitle').value;
                courseData.assignment.instructions = document.getElementById('ccAssignmentInstructions').value;
                courseData.assignment.deadline = document.getElementById('ccAssignmentDeadline').value;
                courseData.has_certificate = document.getElementById('ccCertEnabled').value === 'true';
                break;
            case 6:
                courseData.is_free = document.getElementById('ccIsFree').value === 'true';
                courseData.price = parseFloat(document.getElementById('ccPrice').value) || 0;
                courseData.discount_price = parseFloat(document.getElementById('ccDiscountPrice').value) || 0;
                courseData.enrollment_limit = parseInt(document.getElementById('ccEnrollmentLimit').value) || 0;
                courseData.visibility = document.getElementById('ccVisibility').value;
                break;
        }
        saveDraftLocal();
    }

    function loadStepData(step) {
        switch(step) {
            case 1:
                document.getElementById('ccTitle').value = courseData.title;
                document.getElementById('ccSubtitle').value = courseData.subtitle;
                document.getElementById('ccCategory').value = courseData.category;
                document.getElementById('ccLevel').value = courseData.level;
                document.getElementById('ccLanguage').value = courseData.language;
                document.getElementById('ccShortDesc').value = courseData.short_description;
                document.getElementById('ccShortDescCount').textContent = courseData.short_description.length;
                document.getElementById('ccFullDesc').value = courseData.description;
                renderList('outcomes', courseData.learning_outcomes);
                renderList('requirements', courseData.requirements);
                document.querySelectorAll('#ccAudience .cc-checkbox').forEach(el => {
                    el.classList.toggle('selected', courseData.target_audience.includes(el.dataset.value));
                });
                // SEO fields
                document.getElementById('ccSeoSlug').value = courseData.seo_slug || '';
                document.getElementById('ccMetaTitle').value = courseData.meta_title || '';
                document.getElementById('ccMetaDesc').value = courseData.meta_description || '';
                document.getElementById('ccMetaDescCount').textContent = (courseData.meta_description || '').length;
                break;
            case 2:
                renderCurriculum();
                break;
            case 3:
                renderMedia();
                break;
            case 4:
                renderResources();
                break;
            case 5:
                document.getElementById('ccQuizTitle').value = courseData.quiz.title;
                document.getElementById('ccQuizPassing').value = courseData.quiz.passing_score;
                document.getElementById('ccAssignmentTitle').value = courseData.assignment.title;
                document.getElementById('ccAssignmentInstructions').value = courseData.assignment.instructions;
                document.getElementById('ccAssignmentDeadline').value = courseData.assignment.deadline;
                renderQuizQuestions();
                break;
            case 6:
                document.getElementById('ccIsFree').value = courseData.is_free;
                document.getElementById('ccPrice').value = courseData.price || '';
                document.getElementById('ccDiscountPrice').value = courseData.discount_price || '';
                document.getElementById('ccEnrollmentLimit').value = courseData.enrollment_limit || '';
                document.getElementById('ccVisibility').value = courseData.visibility;
                const paidFields = document.getElementById('ccPaidFields');
                const pricingRadios = document.querySelectorAll('input[name="pricing"]');
                if (!courseData.is_free) {
                    paidFields.style.display = '';
                    pricingRadios[1].closest('.cc-radio').classList.add('selected');
                    pricingRadios[0].closest('.cc-radio').classList.remove('selected');
                }
                document.querySelectorAll('.cc-visibility-btn').forEach(btn => {
                    btn.classList.toggle('selected', btn.textContent.trim().toLowerCase().includes(courseData.visibility));
                });
                break;
            case 7:
                renderChecklist();
                break;
        }
    }

    // ─── Dynamic Lists (Outcomes, Requirements) ─────────────────────────
    window.addListItem = function(type) {
        const input = document.getElementById(type === 'outcomes' ? 'ccOutcomeInput' : 'ccRequirementInput');
        const val = input.value.trim();
        if (!val) return;
        const arr = type === 'outcomes' ? courseData.learning_outcomes : courseData.requirements;
        arr.push(val);
        input.value = '';
        renderList(type, arr);
    };

    window.removeListItem = function(type, idx) {
        const arr = type === 'outcomes' ? courseData.learning_outcomes : courseData.requirements;
        arr.splice(idx, 1);
        renderList(type, arr);
    };

    function renderList(type, items) {
        const el = document.getElementById(type === 'outcomes' ? 'ccOutcomes' : 'ccRequirements');
        el.innerHTML = items.map((item, i) => `
            <li class="cc-list-item">
                <i class="bi bi-grip-vertical" style="color:var(--text-muted);cursor:grab;"></i>
                <span class="cc-list-text">${escapeHtml(item)}</span>
                <button class="cc-list-remove" onclick="removeListItem('${type}', ${i})"><i class="bi bi-trash"></i></button>
            </li>
        `).join('');
    }

    // ─── Target Audience Checkboxes ─────────────────────────────────────
    window.toggleCheckbox = function(el) {
        el.classList.toggle('selected');
    };

    // ─── Curriculum Builder ─────────────────────────────────────────────
    window.addSection = function() {
        courseData.sections.push({
            id: 'sec_' + Date.now(),
            title: '',
            lessons: []
        });
        renderCurriculum();
    };

    window.removeSection = function(secIdx) {
        if (!confirm('Remove this section and all its lessons?')) return;
        courseData.sections.splice(secIdx, 1);
        renderCurriculum();
    };

    window.updateSectionTitle = function(secIdx, val) {
        courseData.sections[secIdx].title = val;
    };

    window.addLesson = function(secIdx) {
        courseData.sections[secIdx].lessons.push({
            id: 'les_' + Date.now(),
            title: '',
            type: 'video',
            content: '',
            video_url: '',
            duration_minutes: 0
        });
        renderCurriculum();
    };

    window.removeLesson = function(secIdx, lesIdx) {
        courseData.sections[secIdx].lessons.splice(lesIdx, 1);
        renderCurriculum();
    };

    window.updateLessonTitle = function(secIdx, lesIdx, val) {
        courseData.sections[secIdx].lessons[lesIdx].title = val;
    };

    window.updateLessonType = function(secIdx, lesIdx, val) {
        courseData.sections[secIdx].lessons[lesIdx].type = val;
        renderCurriculum();
    };

    function renderCurriculum() {
        const el = document.getElementById('ccCurriculum');
        if (!courseData.sections.length) {
            el.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:2rem 0;">No sections yet. Click "Add Section" to start building your curriculum.</p>';
            return;
        }
        el.innerHTML = courseData.sections.map((sec, si) => `
            <div class="cc-section">
                <div class="cc-section-header">
                    <i class="bi bi-grip-vertical cc-drag"></i>
                    <input type="text" value="${escapeHtml(sec.title)}" placeholder="Section ${si + 1} title" onchange="updateSectionTitle(${si}, this.value)">
                    <div class="cc-section-actions">
                        <button title="Remove section" onclick="removeSection(${si})"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
                <div class="cc-lessons">
                    ${sec.lessons.map((les, li) => `
                        <div class="cc-lesson">
                            <i class="bi bi-grip-vertical cc-drag"></i>
                            <span class="cc-lesson-type ${les.type}">${les.type}</span>
                            <input type="text" class="cc-lesson-title" value="${escapeHtml(les.title)}" placeholder="Lesson title" onchange="updateLessonTitle(${si}, ${li}, this.value)" style="border:none;background:none;font-size:0.88rem;flex:1;padding:0.25rem 0;">
                            <select class="cc-select" style="width:auto;padding:0.3rem 1.5rem 0.3rem 0.5rem;font-size:0.78rem;border-radius:6px;" onchange="updateLessonType(${si}, ${li}, this.value)">
                                <option value="video" ${les.type==='video'?'selected':''}>Video</option>
                                <option value="article" ${les.type==='article'?'selected':''}>Article</option>
                                <option value="pdf" ${les.type==='pdf'?'selected':''}>PDF</option>
                                <option value="download" ${les.type==='download'?'selected':''}>Download</option>
                                <option value="quiz" ${les.type==='quiz'?'selected':''}>Quiz</option>
                                <option value="assignment" ${les.type==='assignment'?'selected':''}>Assignment</option>
                            </select>
                            <div class="cc-lesson-actions">
                                <button title="Remove lesson" onclick="removeLesson(${si}, ${li})"><i class="bi bi-x"></i></button>
                            </div>
                        </div>
                    `).join('')}
                    <div class="cc-add-lesson" onclick="addLesson(${si})"><i class="bi bi-plus"></i> Add Lesson</div>
                </div>
            </div>
        `).join('');

        // Initialize SortableJS for sections and lessons
        setTimeout(() => initSortable(), 0);
    }

    function initSortable() {
        if (typeof Sortable === 'undefined') return;

        // Sortable for sections
        const sectionsContainer = document.getElementById('ccCurriculum');
        if (sectionsContainer && !sectionsContainer.sortableInstance) {
            sectionsContainer.sortableInstance = new Sortable(sectionsContainer, {
                animation: 200,
                handle: '.cc-drag',
                dragClass: 'sortable-drag',
                ghostClass: 'sortable-ghost',
                onEnd: evt => {
                    const oldIndex = evt.oldIndex;
                    const newIndex = evt.newIndex;
                    if (oldIndex !== newIndex) {
                        const [moved] = courseData.sections.splice(oldIndex, 1);
                        courseData.sections.splice(newIndex, 0, moved);
                        updateSummary();
                    }
                }
            });
        }

        // Sortable for lessons within each section
        document.querySelectorAll('.cc-lessons').forEach((container, si) => {
            if (!container.sortableInstance) {
                container.sortableInstance = new Sortable(container, {
                    animation: 200,
                    handle: '.cc-drag',
                    dragClass: 'sortable-drag',
                    ghostClass: 'sortable-ghost',
                    onEnd: evt => {
                        const oldIndex = evt.oldIndex;
                        const newIndex = evt.newIndex;
                        if (oldIndex !== newIndex) {
                            const [moved] = courseData.sections[si].lessons.splice(oldIndex, 1);
                            courseData.sections[si].lessons.splice(newIndex, 0, moved);
                            updateSummary();
                        }
                    }
                });
            }
        });
    }

    // ─── Media Upload ───────────────────────────────────────────────────
    window.handleThumbUpload = async function(input) {
        const file = input.files[0];
        if (!file) return;
        const url = await uploadFile(file);
        if (url) {
            courseData.thumbnail_url = url;
            renderMedia();
        }
    };

    window.handleVideoUpload = async function(input) {
        const file = input.files[0];
        if (!file) return;
        const url = await uploadFile(file, true);
        if (url) {
            courseData.promo_video_url = url;
            // Detect video duration
            detectVideoDuration(file).then(duration => {
                if (duration) {
                    courseData.promo_video_duration = duration;
                    renderMedia();
                }
            });
            renderMedia();
        }
    };

    window.handleGalleryUpload = async function(input) {
        for (const file of input.files) {
            const url = await uploadFile(file);
            if (url) courseData.gallery.push(url);
        }
        renderMedia();
    };

    window.removeGalleryImage = function(idx) {
        courseData.gallery.splice(idx, 1);
        renderMedia();
    };

    window.removeThumb = function() {
        courseData.thumbnail_url = '';
        renderMedia();
    };

    window.removeVideo = function() {
        courseData.promo_video_url = '';
        courseData.promo_video_duration = null;
        renderMedia();
    };

    async function detectVideoDuration(file) {
        return new Promise(resolve => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                resolve(Math.round(video.duration));
                URL.revokeObjectURL(video.src);
            };
            video.onerror = () => {
                resolve(null);
                URL.revokeObjectURL(video.src);
            };
            video.src = URL.createObjectURL(file);
        });
    }

    async function uploadFile(file, isVideo) {
        const formData = new FormData();
        formData.append(isVideo ? 'video' : 'images', file);
        try {
            const token = localStorage.getItem('flower-user');
            const res = await fetch('/api/upload' + (isVideo ? '/video' : ''), {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            return isVideo ? (data.url || data.video_url) : (data.urls?.[0] || data.url);
        } catch (err) {
            alert('Upload failed: ' + err.message);
            return null;
        }
    }

    function renderMedia() {
        const thumbPreview = document.getElementById('ccThumbPreview');
        if (courseData.thumbnail_url) {
            thumbPreview.innerHTML = `<div class="cc-upload-preview"><img src="${courseData.thumbnail_url}" alt="Thumbnail"><button class="cc-remove" onclick="removeThumb()"><i class="bi bi-x"></i></button></div>`;
        } else {
            thumbPreview.innerHTML = '';
        }

        const videoPreview = document.getElementById('ccVideoPreview');
        if (courseData.promo_video_url) {
            videoPreview.innerHTML = `<div style="margin-top:0.75rem;"><video src="${courseData.promo_video_url}" controls style="max-width:400px;border-radius:8px;"></video><br><button class="cc-btn cc-btn-outline cc-btn-sm" onclick="removeVideo()" style="margin-top:0.5rem;"><i class="bi bi-trash"></i> Remove</button></div>`;
        } else {
            videoPreview.innerHTML = '';
        }

        const gallery = document.getElementById('ccGallery');
        gallery.innerHTML = courseData.gallery.map((url, i) => `
            <div class="cc-gallery-item"><img src="${url}" alt="Gallery"><button class="cc-remove" onclick="removeGalleryImage(${i})"><i class="bi bi-x"></i></button></div>
        `).join('');
    }

    // ─── Resources ──────────────────────────────────────────────────────
    window.handleResourceUpload = async function(input) {
        for (const file of input.files) {
            const url = await uploadFile(file);
            if (url) {
                const ext = file.name.split('.').pop().toLowerCase();
                let type = 'other';
                if (['pdf'].includes(ext)) type = 'pdf';
                else if (['ppt', 'pptx'].includes(ext)) type = 'ppt';
                else if (['zip', 'rar'].includes(ext)) type = 'zip';
                else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) type = 'img';
                courseData.resources.push({
                    id: 'res_' + Date.now(),
                    name: file.name,
                    file_url: url,
                    file_type: type,
                    file_size: (file.size / 1024 / 1024).toFixed(1) + ' MB'
                });
            }
        }
        renderResources();
    };

    window.removeResource = function(idx) {
        courseData.resources.splice(idx, 1);
        renderResources();
    };

    function renderResources() {
        const el = document.getElementById('ccResources');
        if (!courseData.resources.length) {
            el.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:1rem 0;">No resources uploaded yet.</p>';
            return;
        }
        el.innerHTML = courseData.resources.map((r, i) => `
            <div class="cc-resource">
                <div class="cc-resource-icon ${r.file_type}"><i class="bi bi-file-earmark${r.file_type === 'pdf' ? '-pdf' : r.file_type === 'ppt' ? '-ppt' : r.file_type === 'zip' ? '-zip' : ''}"></i></div>
                <div class="cc-resource-info">
                    <div class="cc-resource-name">${escapeHtml(r.name)}</div>
                    <div class="cc-resource-meta">${r.file_type.toUpperCase()} · ${r.file_size}</div>
                </div>
                <button class="cc-list-remove" onclick="removeResource(${i})"><i class="bi bi-trash"></i></button>
            </div>
        `).join('');
    }

    // ─── Quiz Builder ───────────────────────────────────────────────────
    window.addQuizQuestion = function() {
        courseData.quiz.questions.push({
            question: '',
            options: ['', '', ''],
            correct_answer: 0
        });
        renderQuizQuestions();
    };

    window.addQuizOption = function(qIdx) {
        const q = courseData.quiz.questions[qIdx];
        if (q.options.length >= 6) {
            showToast('Maximum 6 options per question', 'error');
            return;
        }
        q.options.push('');
        renderQuizQuestions();
    };

    window.removeQuizOption = function(qIdx, oIdx) {
        const q = courseData.quiz.questions[qIdx];
        if (q.options.length <= 2) {
            showToast('Minimum 2 options required', 'error');
            return;
        }
        q.options.splice(oIdx, 1);
        if (q.correct_answer >= oIdx) {
            q.correct_answer = Math.max(0, q.correct_answer - 1);
        }
        renderQuizQuestions();
    };

    window.removeQuizQuestion = function(idx) {
        courseData.quiz.questions.splice(idx, 1);
        renderQuizQuestions();
    };

    window.updateQuizQuestion = function(idx, val) {
        courseData.quiz.questions[idx].question = val;
    };

    window.updateQuizOption = function(qIdx, oIdx, val) {
        courseData.quiz.questions[qIdx].options[oIdx] = val;
    };

    window.setCorrectAnswer = function(qIdx, oIdx) {
        courseData.quiz.questions[qIdx].correct_answer = oIdx;
        renderQuizQuestions();
    };

    function renderQuizQuestions() {
        const el = document.getElementById('ccQuizQuestions');
        el.innerHTML = courseData.quiz.questions.map((q, qi) => `
            <div class="cc-quiz-question">
                <div class="cc-quiz-question-header">
                    <strong>Question ${qi + 1}</strong>
                    <button class="cc-btn cc-btn-outline cc-btn-sm" onclick="removeQuizQuestion(${qi})"><i class="bi bi-trash"></i></button>
                </div>
                <div class="cc-field" style="margin-bottom:0.75rem;">
                    <input type="text" class="cc-input" value="${escapeHtml(q.question)}" placeholder="Enter your question" onchange="updateQuizQuestion(${qi}, this.value)">
                </div>
                ${q.options.map((opt, oi) => `
                    <div class="cc-quiz-option">
                        <input type="radio" name="qq${qi}" ${q.correct_answer === oi ? 'checked' : ''} onchange="setCorrectAnswer(${qi}, ${oi})">
                        <input type="text" class="cc-input" value="${escapeHtml(opt)}" placeholder="Option ${oi + 1}" onchange="updateQuizOption(${qi}, ${oi}, this.value)" style="flex:1;">
                        <button class="cc-btn cc-btn-outline cc-btn-sm" onclick="removeQuizOption(${qi}, ${oi})" style="padding:0.2rem 0.5rem;font-size:0.7rem;" title="Remove option"><i class="bi bi-x"></i></button>
                    </div>
                `).join('')}
                <div style="margin-top:0.5rem;">
                    <button class="cc-btn cc-btn-outline cc-btn-sm" onclick="addQuizOption(${qi})" style="font-size:0.75rem;"><i class="bi bi-plus"></i> Add Option</button>
                    <span style="margin-left:0.5rem;font-size:0.75rem;color:var(--text-muted);">${q.options.length}/6 options</span>
                </div>
            </div>
        `).join('');
    }

    // ─── Pricing ────────────────────────────────────────────────────────
    window.togglePricing = function(el, isFree) {
        document.querySelectorAll('.cc-radio-group')[0].querySelectorAll('.cc-radio').forEach(r => r.classList.remove('selected'));
        el.classList.add('selected');
        document.getElementById('ccIsFree').value = isFree;
        document.getElementById('ccPaidFields').style.display = isFree ? 'none' : '';
    };

    window.toggleRadio = function(el, inputId, val) {
        el.closest('.cc-radio-group').querySelectorAll('.cc-radio').forEach(r => r.classList.remove('selected'));
        el.classList.add('selected');
        document.getElementById(inputId).value = val;
    };

    window.setVisibility = function(el, val) {
        document.querySelectorAll('.cc-visibility-btn').forEach(b => b.classList.remove('selected'));
        el.classList.add('selected');
        document.getElementById('ccVisibility').value = val;
    };

    // ─── Publish Checklist ──────────────────────────────────────────────
    function renderChecklist() {
        saveStepData(currentStep);
        const items = [
            { label: 'Thumbnail uploaded', done: !!courseData.thumbnail_url },
            { label: 'Description complete', done: !!(courseData.title && courseData.short_description && courseData.description) },
            { label: 'Lessons added', done: courseData.sections.some(s => s.lessons.length > 0) },
            { label: 'Quiz added', done: courseData.quiz.questions.length > 0 },
            { label: 'Resources uploaded', done: courseData.resources.length > 0 },
            { label: 'Preview ready', done: true }
        ];
        document.getElementById('ccChecklist').innerHTML = items.map(item => `
            <li><i class="bi ${item.done ? 'bi-check-circle-fill' : 'bi-x-circle'}"></i> ${item.label}</li>
        `).join('');
    }

    // ─── Summary Sidebar ────────────────────────────────────────────────
    function updateSummary() {
        const totalLessons = courseData.sections.reduce((sum, s) => sum + s.lessons.length, 0);
        const totalVideos = courseData.sections.reduce((sum, s) => sum + s.lessons.filter(l => l.type === 'video').length, 0);
        document.getElementById('sumSections').textContent = courseData.sections.length;
        document.getElementById('sumLessons').textContent = totalLessons;
        document.getElementById('sumVideos').textContent = totalVideos;
        document.getElementById('sumResources').textContent = courseData.resources.length;
        document.getElementById('sumQuiz').textContent = courseData.quiz.questions.length > 0 ? 'Yes' : 'No';
        document.getElementById('sumAssignment').textContent = courseData.assignment.title ? 'Yes' : 'No';
        document.getElementById('sumCert').textContent = courseData.has_certificate ? 'Yes' : 'No';
        document.getElementById('sumPrice').textContent = courseData.is_free ? 'Free' : 'GHS ' + (courseData.price || 0);
        document.getElementById('sumVisibility').textContent = courseData.visibility.charAt(0).toUpperCase() + courseData.visibility.slice(1);
        document.getElementById('sumStatus').textContent = courseData.status === 'draft' ? 'Draft' : 'Submitted';
    }

    // ─── Input Listeners ────────────────────────────────────────────────
    function setupInputListeners() {
        // Short description char count
        const shortDesc = document.getElementById('ccShortDesc');
        if (shortDesc) {
            shortDesc.addEventListener('input', function() {
                document.getElementById('ccShortDescCount').textContent = this.value.length;
            });
        }

        // Enter key on list inputs
        document.getElementById('ccOutcomeInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addListItem('outcomes'); } });
        document.getElementById('ccRequirementInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addListItem('requirements'); } });
    }

    // ─── Draft Save/Restore ─────────────────────────────────────────────
    function saveDraftLocal() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...courseData, _step: currentStep, _savedAt: Date.now() }));
        } catch {}
    }

    function restoreDraft() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (saved && saved._savedAt && (Date.now() - saved._savedAt < 86400000)) {
                Object.assign(courseData, saved);
                currentStep = saved._step || 1;
            }
        } catch {}
    }

    function startAutoSave() {
        autoSaveTimer = setInterval(() => {
            saveStepData(currentStep);
        }, SAVE_INTERVAL);
    }

    // ─── Save Draft (API) ───────────────────────────────────────────────
    window.saveDraft = async function() {
        saveStepData(currentStep);
        try {
            const body = buildPayload();
            body.status = 'draft';

            let res;
            if (courseData.course_id) {
                res = await fetchWithCsrf('/api/courses/' + courseData.course_id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            } else {
                res = await fetchWithCsrf('/api/courses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            }

            if (res.ok) {
                const data = await res.json();
                courseData.course_id = data.id;
                courseData.status = 'draft';
                alert('Draft saved successfully!');
            } else {
                const err = await res.json();
                alert('Save failed: ' + (err.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Save failed: ' + err.message);
        }
    };

    // ─── Submit for Review ──────────────────────────────────────────────
    window.submitForReview = async function() {
        saveStepData(currentStep);
        
        // Check for duplicate course title
        const isDuplicate = await checkDuplicateCourse();
        if (isDuplicate) {
            if (!confirm('A course with this title already exists. Do you want to submit anyway?')) {
                return;
            }
        }
        
        try {
            const body = buildPayload();
            body.status = 'review';
            body.is_published = false;

            let res;
            if (courseData.course_id) {
                res = await fetchWithCsrf('/api/courses/' + courseData.course_id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            } else {
                res = await fetchWithCsrf('/api/courses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            }

            if (res.ok) {
                const data = await res.json();
                courseData.course_id = data.id;
                courseData.status = 'review';
                localStorage.removeItem(STORAGE_KEY);
                alert('Course submitted for review! An admin will review it shortly.');
                window.location.href = 'instructor-dashboard.html';
            } else {
                const err = await res.json();
                alert('Submission failed: ' + (err.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Submission failed: ' + err.message);
        }
    };

    window.previewCourse = function() {
        if (courseData.course_id) {
            window.open('course-detail.html?id=' + courseData.course_id, '_blank');
        } else {
            alert('Save your course first to preview it.');
        }
    };

// ─── Build API Payload ──────────────────────────────────────────────
    function buildPayload() {
        return {
            title: courseData.title,
            subtitle: courseData.subtitle,
            description: courseData.description,
            short_description: courseData.short_description,
            category: courseData.category,
            level: courseData.level,
            language: courseData.language,
            learning_outcomes: courseData.learning_outcomes,
            requirements: courseData.requirements,
            target_audience: courseData.target_audience,
            seo_slug: courseData.seo_slug,
            meta_title: courseData.meta_title,
            meta_description: courseData.meta_description,
            thumbnail_url: courseData.thumbnail_url,
            promo_video_url: courseData.promo_video_url,
            promo_video_duration: courseData.promo_video_duration,
            gallery: courseData.gallery,
            is_free: courseData.is_free,
            price: courseData.is_free ? 0 : courseData.price,
            discount_price: courseData.discount_price,
            enrollment_limit: courseData.enrollment_limit,
            visibility: courseData.visibility,
            has_certificate: courseData.has_certificate,
            certificate_title: courseData.certificate_title,
            certificate_description: courseData.certificate_description,
            certificate_signature: courseData.certificate_signature,
            certificate_logo: courseData.certificate_logo,
            sections: courseData.sections,
            resources: courseData.resources,
            quiz: courseData.quiz.questions.length > 0 ? courseData.quiz : null,
            assignment: courseData.assignment.title ? courseData.assignment : null,
            allow_files: courseData.allow_files,
            assignment_file_types: courseData.assignment_file_types,
            max_file_size: courseData.max_file_size,
            certificate_title: courseData.certificate_title,
            certificate_description: courseData.certificate_description,
            certificate_signature: courseData.certificate_signature,
            certificate_logo: courseData.certificate_logo
        };
    }

    // ─── Analytics ──────────────────────────────────────────────────────
    function trackStepView(step) {
        const stepNames = {
            1: 'course_details',
            2: 'curriculum',
            3: 'media',
            4: 'resources',
            5: 'assessments',
            6: 'pricing',
            7: 'publish'
        };
        const eventName = 'course_creation_step_view';
        const stepName = stepNames[step] || `step_${step}`;
        
        // Send to analytics endpoint (non-blocking)
        fetch('/api/analytics/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'include',
            body: JSON.stringify({ event: eventName, step: stepName, timestamp: Date.now() })
        }).catch(() => {});
    }

    // ─── Duplicate Prevention ───────────────────────────────────────────
    function checkDuplicateCourse() {
        if (!courseData.title) return Promise.resolve(false);
        return fetch('/api/courses/check-duplicate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'include',
            body: JSON.stringify({ title: courseData.title, exclude_id: courseData.course_id })
        }).then(r => r.json()).then(r => r.is_duplicate).catch(() => false);
    }

    // ─── Helpers ────────────────────────────────────────────────────────
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
    }

    // ─── Analytics Tracking ───────────────────────────────────────────────
    function trackStepView(step) {
        // Send analytics event to backend
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: JSON.stringify({
                event: 'course_creation_step_view',
                step: step,
                course_id: courseData.course_id,
                timestamp: new Date().toISOString()
            })
        }).catch(() => {}); // Silently fail

        // Also store locally for offline support
        const analytics = JSON.parse(localStorage.getItem('cc_analytics') || '[]');
        analytics.push({ step, timestamp: Date.now() });
        if (analytics.length > 50) analytics.shift();
        localStorage.setItem('cc_analytics', JSON.stringify(analytics));
    }

    // ─── Boot ───────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
