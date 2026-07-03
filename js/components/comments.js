// components/comments.js — Threaded comments with emoji picker

let replyContext = { postId: null, commentId: null, name: '' };

function renderCommentsSection(postId, comments) {
  const commentsHtml = (comments || []).map(c => {
    const name = c.author_name || 'User';
    const cavatar = c.author_avatar || c.profile_image;
    return `<div class="comment-item">
      <div class="comment-avatar">${cavatar ? `<img src="${escapeHtml(cavatar)}" alt="">` : name.charAt(0)}</div>
      <div class="comment-body">
        <span class="comment-author">${escapeHtml(name)}</span>
        <div class="comment-text">${escapeHtml(c.content || '')}</div>
        <div class="comment-meta">
          <span>${timeAgo(c.created_at)}</span>
          <span onclick="likeComment('${c.id}')">Like</span>
          <span onclick="replyToComment('${postId}','${c.id}','${escapeHtml(name).replace(/'/g, "\\'")}')">Reply</span>
        </div>
      </div>
    </div>`;
  }).join('');

  return `<div class="feed-comments" id="comments-${postId}">
    ${commentsHtml}
    <div class="comment-input-wrap">
      <input type="text" class="comment-input" id="commentInput-${postId}" placeholder="Write a comment..." onkeydown="if(event.key==='Enter')submitComment('${postId}',this)">
      <button class="btn btn-sm btn-outline" style="padding:0.3rem 0.5rem;font-size:0.85rem;" onclick="toggleCommentEmoji('${postId}')" title="Emoji">😊</button>
      <button class="btn btn-primary btn-sm" onclick="submitComment('${postId}',document.getElementById('commentInput-${postId}'))">Send</button>
    </div>
    <div class="emoji-picker" id="emojiPicker-${postId}" style="display:none;padding:0.5rem;border-top:1px solid var(--border-light);">
      ${['😊','❤️','🌹','🌸','🌻','🌷','💐','🌿','🎉','👏','👍','🔥'].map(e => `<span class="emoji-opt" onclick="insertCommentEmoji('${postId}','${e}')" style="cursor:pointer;font-size:1.3rem;padding:0.15rem 0.3rem;">${e}</span>`).join('')}
    </div>
  </div>`;
}

function toggleComments(postId) {
  const el = document.getElementById(`comments-${postId}`);
  if (el) el.classList.toggle('open');
}

function toggleCommentEmoji(postId) {
  const p = document.getElementById(`emojiPicker-${postId}`);
  if (p) p.style.display = p.style.display === 'none' ? 'flex' : 'none';
}

function insertCommentEmoji(postId, emoji) {
  const input = document.getElementById(`commentInput-${postId}`);
  if (input) { input.value += emoji; input.focus(); }
}

async function submitComment(postId, inputEl) {
  const content = inputEl.value.trim();
  if (!content) return;
  if (!getCurrentUserId()) { openAuthModal('login'); return; }
  try {
    await fetch(`/api/feed/${postId}/comments`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ content })
    });
    inputEl.value = '';
    const section = document.getElementById(`comments-${postId}`);
    const name = getUserName();
    const avatar = getUserAvatar();
    section.insertAdjacentHTML('afterbegin',
      `<div class="comment-item" style="animation:fadeIn 0.3s;">
        <div class="comment-avatar">${avatar ? `<img src="${escapeHtml(avatar)}" alt="">` : name.charAt(0)}</div>
        <div class="comment-body">
          <span class="comment-author">${escapeHtml(name)}</span>
          <div class="comment-text">${escapeHtml(content)}</div>
          <div class="comment-meta"><span>just now</span><span>Like</span><span>Reply</span></div>
        </div>
      </div>`);
    document.getElementById(`emojiPicker-${postId}`).style.display = 'none';
  } catch {}
}

function replyToComment(postId, commentId, authorName) {
  const input = document.getElementById(`commentInput-${postId}`);
  if (input) {
    input.value = `@${authorName.replace(/&quot;/g, '').replace(/&lt;/g, '').replace(/&gt;/g, '')} `;
    input.focus();
    replyContext = { postId, commentId, name: authorName };
  }
}

function likeComment(commentId) {}
