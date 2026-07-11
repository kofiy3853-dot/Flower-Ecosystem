// components/create-post.js — Expanded post composer

let postImageFiles = [];
let postVideoFile = null;

function renderCreatePostCard() {
  const name = getUserName();
  const initial = (name || '?')[0].toUpperCase();
  const avatarUrl = getUserAvatar();

  return `<div class="create-post-card">
    <div class="create-post-top">
      <div class="create-post-avatar">${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="">` : initial}</div>
      <div class="create-post-input" onclick="openCreateModal()">What's blooming today?</div>
    </div>
    <div class="create-post-actions">
      <button class="create-post-action photo" onclick="openCreateModal('photo')"><i class="bi bi-image"></i> Photo</button>
      <button class="create-post-action video" onclick="openCreateModal('video')"><i class="bi bi-camera-video"></i> Video</button>
      <button class="create-post-action showcase" onclick="openCreateModal('showcase')"><i class="bi bi-flower1"></i> Showcase</button>
      <button class="create-post-action question" onclick="openCreateModal('question')"><i class="bi bi-question-circle"></i> Question</button>
      <button class="create-post-action poll" onclick="openCreateModal('poll')"><i class="bi bi-bar-chart"></i> Poll</button>
      <button class="create-post-action event" onclick="openCreateModal('event')"><i class="bi bi-calendar-event"></i> Event</button>
    </div>
  </div>`;
}

function openCreateModal(type) {
  if (!getCurrentUserId()) { openAuthModal('login'); return; }
  const modal = document.getElementById('createPostModal');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('postTypeIndicator').textContent = type ? capitalizeFirst(type) : 'Post';
  if (type === 'poll') showPollCreator();
  else hidePollCreator();
  if (type === 'question') document.getElementById('postTitleGroup').style.display = 'block';
  else document.getElementById('postTitleGroup').style.display = 'block';
  setTimeout(() => document.getElementById('postContent').focus(), 100);
}

function closeCreateModal() {
  document.getElementById('createPostModal').classList.remove('open');
  document.getElementById('postContent').value = '';
  document.getElementById('postTitle').value = '';
  document.getElementById('postImagePreview').innerHTML = '';
  document.getElementById('postVideoPreview').innerHTML = '';
  document.getElementById('postTags').value = '';
  document.getElementById('postLocation').value = '';
  document.getElementById('postCategory').value = '';
  document.getElementById('pollCreator').style.display = 'none';
  document.getElementById('postTitleGroup').style.display = 'block';
  postImageFiles = [];
  postVideoFile = null;
  document.getElementById('submitPostBtn').disabled = true;
  document.body.style.overflow = '';
}

function handlePostImages(files) {
  const preview = document.getElementById('postImagePreview');
  Array.from(files).slice(0, 4).forEach(file => {
    if (file.size > 5 * 1024 * 1024 || !file.type.startsWith('image/')) return;
    postImageFiles.push(file);
    const reader = new FileReader();
    reader.onload = e => {
      const idx = postImageFiles.length - 1;
      const div = document.createElement('div');
      div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid var(--border-color);flex-shrink:0;';
      div.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;"><button onclick="removePostImage(${idx},this.parentElement)" style="position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.6);color:white;border:none;cursor:pointer;font-size:0.7rem;display:flex;align-items:center;justify-content:center;">×</button>`;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('submitPostBtn').disabled = false;
}

function removePostImage(idx, el) { postImageFiles.splice(idx, 1); el.remove(); }

function handlePostVideo(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 50 * 1024 * 1024) { showToast('Video must be under 50MB'); input.value = ''; return; }
  postVideoFile = file;
  document.getElementById('postVideoPreview').innerHTML = `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;background:var(--bg-light);border-radius:8px;font-size:0.85rem;"><i class="bi bi-camera-video" style="font-size:1.2rem;color:var(--primary-color);"></i> ${escapeHtml(file.name)}</div>`;
  document.getElementById('submitPostBtn').disabled = false;
}

function showPollCreator() {
  const el = document.getElementById('pollCreator');
  el.style.display = 'block';
  document.getElementById('postTitleGroup').style.display = 'block';
}

function hidePollCreator() { document.getElementById('pollCreator').style.display = 'none'; }

function addPollOption() {
  const list = document.getElementById('pollOptionsList');
  const count = list.children.length + 1;
  if (count > 6) return;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:0.5rem;margin-bottom:0.5rem;';
  div.innerHTML = `<input type="text" placeholder="Option ${count}" class="poll-option-input" style="flex:1;padding:0.4rem 0.6rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.85rem;background:var(--bg-light);color:var(--text-main);">`;
  list.appendChild(div);
}

function togglePollCreator() {
  const el = document.getElementById('pollCreator');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function submitPost() {
  const content = document.getElementById('postContent').value.trim();
  const title = document.getElementById('postTitle').value.trim();
  const tags = document.getElementById('postTags').value.trim();
  const location = document.getElementById('postLocation').value.trim();
  const category = document.getElementById('postCategory').value;
  const visibility = document.getElementById('postVisibility').value;

  if (!content && !postImageFiles.length && !postVideoFile) return;
  const submitBtn = document.getElementById('submitPostBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Posting...';

  const isPoll = document.getElementById('pollCreator').style.display !== 'none';
  const formData = new FormData();
  formData.append('content', content);
  formData.append('title', title);
  formData.append('post_type', isPoll ? 'poll' : 'standard');
  formData.append('audience', visibility);
  if (tags) formData.append('tags', tags);
  if (location) formData.append('location', location);
  if (category) formData.append('category', category);

  postImageFiles.forEach(f => formData.append('media', f));
  if (postVideoFile) formData.append('media', postVideoFile);

  if (isPoll) {
    const q = document.getElementById('pollQuestionInput').value.trim();
    const opts = Array.from(document.querySelectorAll('.poll-option-input')).map(i => i.value.trim()).filter(Boolean);
    if (q && opts.length >= 2) { formData.append('poll_options', JSON.stringify(opts)); formData.append('poll_question', q); }
  }

  try {
    const token = localStorage.getItem('flower-user');
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
    const res = await fetch('/api/feed', { method: 'POST', headers, body: formData });
    if (!res.ok) throw new Error('Failed');
    closeCreateModal();
    feedPage = 1;
    document.getElementById('feedContainer').innerHTML = '';
    document.getElementById('feedEnd').style.display = 'none';
    loadFeed();
    showToast('Post published!');
  } catch {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publish';
    showToast('Failed to create post');
  }
}

function saveDraft() {
  const content = document.getElementById('postContent').value.trim();
  const title = document.getElementById('postTitle').value.trim();
  if (!content && !title) { showToast('Nothing to save'); return; }
  try {
    const drafts = JSON.parse(localStorage.getItem('flower-drafts') || '[]');
    drafts.push({ content, title, savedAt: new Date().toISOString() });
    localStorage.setItem('flower-drafts', JSON.stringify(drafts.slice(-10)));
    showToast('Draft saved!');
  } catch { showToast('Failed to save draft'); }
}
