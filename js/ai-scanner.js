// js/ai-scanner.js — AI Flower Identification Center

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  const cameraInput = document.getElementById('camera-input');
  const uploadArea = document.getElementById('upload-area');
  const analyzeBtn = document.getElementById('analyze-btn');
  const resultSection = document.getElementById('result-section');
  const errorMsg = document.getElementById('error-msg');
  const loadingSection = document.getElementById('loading-section');
  const historySection = document.getElementById('history-section');
  const historyGrid = document.getElementById('history-grid');
  const stickyActions = document.getElementById('sticky-actions');

  let selectedFile = null;
  let flowerKnowledge = [];
  let currentResult = null;

  const flowerEmojis = {
    rose: '🌹', tulip: '🌷', lily: '🌺', sunflower: '🌻', daisy: '🌼',
    orchid: '🌸', cherry: '🌸', lotus: '🪷', lavender: '💜', peony: '🌸',
    carnation: '🌺', hibiscus: '🌺', jasmine: '🤍', marigold: '🌼',
    chrysanthemum: '🌼', dahlia: '🌺', iris: '💜', violet: '💜',
    poppy: '🔴', aster: '💜', buttercup: '🌼', clover: '☘️',
    forget: '💙', gardenia: '🤍', gladiolus: '🌺', magnolia: '🤍',
    pansy: '💜', petunia: '💜', wisteria: '💜', zinnia: '🌺',
    begonia: '🌺', camellia: '🌸', azalea: '🌺', hydrangea: '💙',
    bluebell: '💙', snowdrop: '🤍', primrose: '🌼', protea: '🌺'
  };

  const careIcons = {
    sunlight: 'bi-sun', water: 'bi-droplet', soil: 'bi-flower1',
    temperature: 'bi-thermometer-half', pruning: 'bi-scissors'
  };

  // Load flower knowledge for encyclopedia linking
  fetch('/api/knowledge/flowers').then(r => r.json()).then(d => { flowerKnowledge = Array.isArray(d) ? d : []; }).catch(() => {});

  function getFlowerEmoji(name) {
    const lower = (name || '').toLowerCase();
    for (const [key, emoji] of Object.entries(flowerEmojis)) {
      if (lower.includes(key)) return emoji;
    }
    return '🌸';
  }

  function getToken() { return localStorage.getItem('flower-user'); }

  // ─── Upload handling ──────────────────────────────────────────────────
  const enableButton = () => {
    analyzeBtn.disabled = !selectedFile;
    const prompt = document.getElementById('upload-prompt');
    const preview = document.getElementById('image-preview');
    if (selectedFile) {
      preview.src = URL.createObjectURL(selectedFile);
      preview.style.display = 'block';
      if (prompt) prompt.style.display = 'none';
      uploadArea.style.padding = '1rem';
      uploadArea.style.borderStyle = 'solid';
      uploadArea.style.borderColor = 'var(--primary-color)';
    } else {
      preview.src = '';
      preview.style.display = 'none';
      if (prompt) prompt.style.display = 'block';
      uploadArea.style.padding = '';
      uploadArea.style.borderStyle = 'dashed';
      uploadArea.style.borderColor = '';
    }
  };

  function setFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      showError('Image is too large. Maximum size is 10MB.');
      return;
    }
    selectedFile = file;
    enableButton();
  }

  fileInput.addEventListener('change', (e) => { setFile(e.target.files[0]); });

  // Camera capture
  document.getElementById('camera-btn')?.addEventListener('click', () => cameraInput.click());
  cameraInput.addEventListener('change', (e) => { setFile(e.target.files[0]); });

  // Paste image
  document.getElementById('paste-btn')?.addEventListener('click', async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            setFile(new File([blob], 'pasted-image.png', { type }));
            return;
          }
        }
      }
      showError('No image found in clipboard. Copy an image first.');
    } catch { showError('Clipboard access denied. Paste with Ctrl+V instead.'); }
  });

  document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        setFile(item.getAsFile());
        return;
      }
    }
  });

  // Drag & drop
  uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', (e) => { e.preventDefault(); uploadArea.classList.remove('dragover'); });
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files?.[0]) {
      selectedFile = e.dataTransfer.files[0];
      fileInput.files = e.dataTransfer.files;
      enableButton();
    }
  });

  // ─── Error display ────────────────────────────────────────────────────
  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
  }

  // ─── Analyze flower ───────────────────────────────────────────────────
  analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    errorMsg.style.display = 'none';
    resultSection.style.display = 'none';
    stickyActions.style.display = 'none';
    loadingSection.style.display = 'block';
    analyzeBtn.innerHTML = '<span class="auth-spinner" style="margin-right:0.5rem;border-color:rgba(255,255,255,0.3);border-top-color:white;"></span> Analyzing...';
    analyzeBtn.disabled = true;

    const form = new FormData();
    form.append('image', selectedFile);

    try {
      const resp = await fetch('/api/openai/flower-expert', { method: 'POST', body: form });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Server error');
      }
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      currentResult = data;
      renderResult(data);
      saveToHistory(data);
      loadHistory();
    } catch (err) {
      let msg = err.message || 'Failed to analyze image.';
      if (msg.includes('429') || msg.includes('Rate limit')) msg = 'Too many requests. Please wait a minute.';
      if (msg.includes('not configured')) msg = 'AI service not configured.';
      if (msg.includes('too large')) msg = 'Image too large. Use an image under 4MB.';
      showError(msg);
    } finally {
      loadingSection.style.display = 'none';
      analyzeBtn.innerHTML = '<i class="bi bi-stars" style="margin-right:0.5rem;"></i> Identify Flower';
      enableButton();
    }
  });

  // ─── Render result ────────────────────────────────────────────────────
  function renderResult(data) {
    const ai = data.ai || {};
    const emoji = getFlowerEmoji(ai.flowerName);
    const confidencePercent = ((ai.confidence || 0) * 100).toFixed(0);
    const naturalPercent = ((ai.naturalConfidence || 0) * 100).toFixed(0);

    let html = '';

    // Header with confidence badge
    html += `<div class="scanner-result-card" style="background:var(--bg-white);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1.5rem;margin-top:1.5rem;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
        <div>
          <h2 style="margin-bottom:0.25rem;color:var(--primary-color);">${emoji} ${ai.flowerName || 'Unknown Flower'}</h2>
          <p style="color:var(--text-light);font-style:italic;margin:0;">${ai.scientificName || 'Unknown'}</p>
        </div>
        <span class="confidence-badge ${confidencePercent >= 80 ? 'high' : confidencePercent >= 50 ? 'medium' : 'low'}">
          <span class="confidence-dot"></span> ${confidencePercent}% Match
        </span>
      </div>`;

    // Basic info grid
    html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:0.75rem;margin-bottom:1.25rem;">
      <div class="fact-card"><div class="fact-label">Category</div><div class="fact-value">${ai.category || 'Unknown'}</div></div>
      <div class="fact-card"><div class="fact-label">Type</div><div class="fact-value">${ai.flowerType || 'Unknown'}</div></div>
      <div class="fact-card"><div class="fact-label">Family</div><div class="fact-value">${ai.family || 'Unknown'}</div></div>
      <div class="fact-card"><div class="fact-label">Origin</div><div class="fact-value">${ai.origin || 'Unknown'}</div></div>
    </div>`;

    // Quick facts
    html += `<div class="quick-facts-grid">
      <div class="fact-card"><div class="fact-label">Bloom Season</div><div class="fact-value">${ai.bloomSeason || 'Spring-Fall'}</div></div>
      <div class="fact-card"><div class="fact-label">Colors</div><div class="fact-value">${ai.colors || 'Various'}</div></div>
      <div class="fact-card"><div class="fact-label">Height</div><div class="fact-value">${ai.height || 'Varies'}</div></div>
      <div class="fact-card"><div class="fact-label">Fragrance</div><div class="fact-value">${ai.fragrance || 'Mild'}</div></div>
      <div class="fact-card"><div class="fact-label">Toxicity</div><div class="fact-value">${ai.toxicity || 'Check species'}</div></div>
      <div class="fact-card"><div class="fact-label">Pollinator Friendly</div><div class="fact-value">${ai.pollinatorFriendly || 'Yes'}</div></div>
      <div class="fact-card"><div class="fact-label">Difficulty</div><div class="fact-value">${ai.difficulty || 'Easy'}</div></div>
      <div class="fact-card"><div class="fact-label">Indoor/Outdoor</div><div class="fact-value">${ai.indoorOutdoor || 'Outdoor'}</div></div>
    </div>`;

    // Description
    if (ai.description) {
      html += `<div class="scanner-description">${ai.description}</div>`;
    }

    // Uses & benefits
    const useColumns = [
      { title: 'Ornamental Uses', icon: 'bi-palette', items: ai.ornamentalUses },
      { title: 'Perfume Uses', icon: 'bi-droplet-half', items: ai.perfumeUses },
      { title: 'Medicinal Properties', icon: 'bi-heart-pulse', items: ai.medicinalProperties },
      { title: 'Food Uses', icon: 'bi-cup-hot', items: ai.foodUses }
    ];
    if (useColumns.some(c => c.items?.length)) {
      html += `<h3 style="font-size:1.05rem;margin:1.25rem 0 0.75rem;display:flex;align-items:center;gap:0.4rem;"><i class="bi bi-grid" style="color:var(--primary-color);"></i> Uses & Benefits</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.75rem;margin-bottom:1.25rem;">`;
      useColumns.forEach(col => {
        if (!col.items?.length) return;
        html += `<div style="background:var(--bg-light);padding:1rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);">
          <h4 style="font-size:0.9rem;margin-bottom:0.5rem;color:var(--primary-color);"><i class="bi ${col.icon}"></i> ${col.title}</h4>
          <ul style="list-style:none;padding:0;margin:0;">`;
        col.items.forEach(item => { html += `<li style="padding:0.3rem 0;font-size:0.85rem;"><i class="bi bi-check2-all" style="color:var(--accent-green);margin-right:0.4rem;"></i>${item}</li>`; });
        html += `</ul></div>`;
      });
      html += `</div>`;
    }

    // Health benefits
    if (ai.healthBenefits?.length) {
      html += `<h3 style="font-size:1.05rem;margin:1.25rem 0 0.75rem;display:flex;align-items:center;gap:0.4rem;"><i class="bi bi-heart" style="color:var(--primary-color);"></i> Health Benefits</h3>
        <ul style="list-style:none;padding:0;margin:0 0 1.25rem;">`;
      ai.healthBenefits.forEach(b => { html += `<li style="padding:0.4rem 0;font-size:0.9rem;"><i class="bi bi-check2-circle" style="color:var(--accent-green);margin-right:0.4rem;"></i>${b}</li>`; });
      html += `</ul>`;
    }

    // Care guide
    if (ai.careGuide) {
      const care = ai.careGuide;
      const careItems = [
        { label: 'Sunlight', icon: careIcons.sunlight, value: care.sunlight },
        { label: 'Water', icon: careIcons.water, value: care.water },
        { label: 'Soil', icon: careIcons.soil, value: care.soil },
        { label: 'Temperature', icon: careIcons.temperature, value: care.temperature },
        { label: 'Pruning', icon: careIcons.pruning, value: care.pruning }
      ].filter(c => c.value);
      if (careItems.length) {
        html += `<h3 style="font-size:1.05rem;margin:1.25rem 0 0.75rem;display:flex;align-items:center;gap:0.4rem;"><i class="bi bi-calendar-check" style="color:var(--primary-color);"></i> Care Recommendations</h3>
          <div class="care-grid">`;
        careItems.forEach(item => {
          html += `<div class="care-card">
            <div class="care-icon"><i class="bi ${item.icon}"></i></div>
            <div class="care-label">${item.label}</div>
            <div class="care-value">${item.value}</div>
          </div>`;
        });
        html += `</div>`;
        // Link to full care guide
        const slug = (ai.flowerName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        html += `<div style="text-align:center;margin-bottom:1.25rem;"><a href="care-guides-hub.html?flower=${slug}" class="btn btn-outline" style="font-size:0.85rem;"><i class="bi bi-book"></i> View Full Care Guide</a></div>`;
      }
    }

    // Plant health check
    if (ai.isNatural === false || (ai.artificialReasons?.length > 0)) {
      html += `<div class="health-check-card">
        <h4><i class="bi bi-exclamation-triangle"></i> Authenticity Analysis</h4>
        <p style="font-size:0.9rem;margin:0;">This appears to be an <strong>artificial</strong> flower (${naturalPercent}% natural confidence).</p>
        <ul>${(ai.artificialReasons || []).map(r => `<li>${r}</li>`).join('')}</ul>
      </div>`;
    } else if (ai.naturalReasons?.length) {
      html += `<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:var(--radius-md);padding:1.25rem;margin:1.25rem 0;">
        <h4 style="color:#065f46;margin-bottom:0.5rem;display:flex;align-items:center;gap:0.4rem;"><i class="bi bi-shield-check"></i> Authenticity Verified</h4>
        <p style="font-size:0.9rem;margin:0 0 0.5rem;">This appears to be a <strong>natural</strong> flower (${naturalPercent}% confidence).</p>
        <ul style="padding-left:1.25rem;margin:0;">${ai.naturalReasons.map(r => `<li style="font-size:0.85rem;color:#065f46;">${r}</li>`).join('')}</ul>
      </div>`;
    }

    // Similar flowers
    if (ai.similarFlowers?.length) {
      html += `<h3 style="font-size:1.05rem;margin:1.25rem 0 0.75rem;display:flex;align-items:center;gap:0.4rem;"><i class="bi bi-grid-3x3-gap" style="color:var(--primary-color);"></i> Similar Flowers</h3>
        <div class="similar-flowers" style="margin-bottom:1.25rem;">`;
      ai.similarFlowers.forEach(flower => {
        const fLower = flower.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const fEmoji = getFlowerEmoji(flower);
        html += `<a href="flower-knowledge.html?slug=${fLower}" class="similar-chip">${fEmoji} ${flower}</a>`;
      });
      html += `</div>`;
    }

    // Marketplace products
    if (data.marketplace?.products?.length) {
      html += `<h3 style="font-size:1.05rem;margin:1.25rem 0 0.75rem;display:flex;align-items:center;gap:0.4rem;"><i class="bi bi-bag" style="color:var(--primary-color);"></i> Shop Related Products</h3>
        <div class="product-scroll" style="margin-bottom:1.25rem;">`;
      data.marketplace.products.forEach(prod => {
        html += `<div class="product-card">
          ${prod.image ? `<img class="product-image" src="${prod.image}" alt="${prod.name}" />` : `<div class="product-image" style="display:flex;align-items:center;justify-content:center;font-size:2rem;">🌸</div>`}
          <div class="product-info">
            <div class="product-name">${prod.name}</div>
            ${prod.price ? `<div class="product-price">$${Number(prod.price).toFixed(2)}</div>` : ''}
            ${prod.seller_name ? `<div class="product-seller"><i class="bi bi-shop"></i> ${prod.seller_name}</div>` : ''}
          </div>
        </div>`;
      });
      html += `</div>`;
    }

    // Related courses
    html += `<h3 style="font-size:1.05rem;margin:1.25rem 0 0.75rem;display:flex;align-items:center;gap:0.4rem;"><i class="bi bi-mortarboard" style="color:var(--primary-color);"></i> Related Courses</h3>
      <div class="courses-grid" style="margin-bottom:1.25rem;">
        <a href="learning.html" class="course-card"><h4>🌿 Flower Identification Basics</h4><p>Learn to identify common flowers by sight, scent, and touch.</p></a>
        <a href="learning.html" class="course-card"><h4>🌹 Rose Care Masterclass</h4><p>Everything you need to know about growing and caring for roses.</p></a>
        <a href="learning.html" class="course-card"><h4>🌱 Beginner Gardening</h4><p>Start your gardening journey with expert-led lessons.</p></a>
      </div>`;

    // Community discussions
    if (data.questions?.length) {
      html += `<h3 style="font-size:1.05rem;margin:1.25rem 0 0.75rem;display:flex;align-items:center;gap:0.4rem;"><i class="bi bi-chat-dots" style="color:var(--primary-color);"></i> Community Discussions</h3>
        <ul class="question-list" style="margin-bottom:1.25rem;">`;
      data.questions.forEach(q => {
        const qUrl = q.slug ? `question-detail.html?id=${q.slug}` : '#';
        html += `<li class="question-item">
          <i class="bi bi-question-circle question-icon"></i>
          <a href="${qUrl}" class="question-text" style="text-decoration:none;flex:1;">${q.title || 'View Question'}</a>
          ${q.answer_count ? `<span style="color:var(--text-light);font-size:0.8rem;"><i class="bi bi-chat-left-text"></i> ${q.answer_count}</span>` : ''}
        </li>`;
      });
      html += `</ul>`;
    }

    // Articles
    if (data.articles?.length) {
      html += `<h3 style="font-size:1.05rem;margin:1.25rem 0 0.75rem;display:flex;align-items:center;gap:0.4rem;"><i class="bi bi-journal-text" style="color:var(--primary-color);"></i> Learning Resources</h3>
        <div class="articles-grid" style="margin-bottom:1.25rem;">`;
      data.articles.forEach(article => {
        const url = article.slug ? `article-detail.html?id=${article.slug}` : '#';
        html += `<a href="${url}" class="article-card">
          <div class="article-title">${article.title || 'Article'}</div>
          ${article.excerpt ? `<div class="article-excerpt">${article.excerpt}</div>` : ''}
        </a>`;
      });
      html += `</div>`;
    }

    // Care guides
    if (data.careGuides?.length) {
      html += `<h3 style="font-size:1.05rem;margin:1.25rem 0 0.75rem;display:flex;align-items:center;gap:0.4rem;"><i class="bi bi-heart-pulse" style="color:var(--primary-color);"></i> Care Guides</h3>
        <div class="articles-grid" style="margin-bottom:1.25rem;">`;
      data.careGuides.forEach(guide => {
        const url = guide.slug ? `care-guide-detail.html?id=${guide.slug}` : '#';
        html += `<a href="${url}" class="article-card">
          <div class="article-title">${guide.title || 'Care Guide'}</div>
          ${guide.excerpt ? `<div class="article-excerpt">${guide.excerpt}</div>` : ''}
        </a>`;
      });
      html += `</div>`;
    }

    // References
    if (ai.references?.length) {
      html += `<details style="margin-top:1.25rem;">
        <summary style="cursor:pointer;font-size:0.9rem;font-weight:500;color:var(--text-light);display:flex;align-items:center;gap:0.5rem;">
          <i class="bi bi-book"></i> References (${ai.references.length} sources)
        </summary>
        <ul style="list-style:none;padding:0;margin:0.5rem 0 0;">`;
      ai.references.forEach(ref => { html += `<li style="padding:0.3rem 0;font-size:0.85rem;color:var(--text-light);"><i class="bi bi-check2" style="color:var(--accent-green);margin-right:0.4rem;"></i>${ref}</li>`; });
      html += `</ul></details>`;
    }

    // Action buttons
    const slug = (ai.flowerName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const match = flowerKnowledge.find(f =>
      f.common_name?.toLowerCase() === (ai.flowerName || '').toLowerCase() ||
      (f.scientific_name || '').toLowerCase() === (ai.scientificName || '').toLowerCase() ||
      f.common_name?.toLowerCase().includes((ai.flowerName || '').toLowerCase()) ||
      (ai.flowerName || '').toLowerCase().includes(f.common_name?.toLowerCase() || '')
    );
    const encSlug = match ? match.slug : slug;

    html += `<div class="action-bar">
      <a href="flower-knowledge.html?slug=${encSlug}" class="btn btn-primary"><i class="bi bi-book"></i> Encyclopedia</a>
      <button class="btn btn-outline" onclick="saveToGarden()"><i class="bi bi-plus-lg"></i> Save to Garden</button>
      <button class="btn btn-outline" onclick="shareResult()"><i class="bi bi-share"></i> Share</button>
      <a href="marketplace.html?q=${encodeURIComponent(ai.flowerName || '')}" class="btn btn-outline"><i class="bi bi-bag"></i> Buy</a>
    </div>`;

    html += `</div>`; // close result card

    resultSection.innerHTML = html;
    resultSection.style.display = 'block';
    stickyActions.style.display = 'flex';
  }

  // ─── Save to history ──────────────────────────────────────────────────
  async function saveToHistory(data) {
    const token = getToken();
    if (!token) return;
    const ai = data.ai || {};
    try {
      await fetch('/api/identification/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({
          flower_name: ai.flowerName,
          scientific_name: ai.scientificName,
          confidence: ai.confidence,
          category: ai.category,
          family: ai.family,
          origin: ai.origin,
          care_guide: ai.careGuide,
          ai_result: ai
        })
      });
    } catch {}
  }

  // ─── Load history ─────────────────────────────────────────────────────
  async function loadHistory() {
    const token = getToken();
    if (!token) { historySection.style.display = 'none'; return; }
    try {
      const res = await fetch('/api/identification/history?limit=6', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const items = await res.json();
      if (!items.length) { historySection.style.display = 'none'; return; }
      historySection.style.display = 'block';
      historyGrid.innerHTML = items.map(item => {
        const emoji = getFlowerEmoji(item.flower_name);
        const date = new Date(item.created_at).toLocaleDateString();
        return `<div class="history-card" onclick="viewHistory('${item.id}')">
          <div style="height:140px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--bg-light);">${emoji}</div>
          <div class="history-info">
            <div class="history-name">${item.flower_name || 'Unknown'}</div>
            <div class="history-date">${date}${item.confidence ? ` &bull; ${Math.round(item.confidence * 100)}%` : ''}</div>
          </div>
        </div>`;
      }).join('');
    } catch {}
  }

  // ─── Save to garden ───────────────────────────────────────────────────
  window.saveToGarden = async function() {
    const token = getToken();
    if (!token) { window.location.href = 'login.html'; return; }
    if (!currentResult?.ai) return;
    const ai = currentResult.ai;
    try {
      const res = await fetch('/api/identification/save-to-garden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ flower_name: ai.flowerName, image_url: currentResult.uploaded_image || null })
      });
      if (res.ok) {
        showToast('Saved to My Garden!');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to save');
      }
    } catch { showToast('Failed to save'); }
  };

  // ─── Share ────────────────────────────────────────────────────────────
  window.shareResult = function() {
    if (!currentResult?.ai) return;
    const ai = currentResult.ai;
    const text = `I identified a ${ai.flowerName} (${ai.scientificName}) using Flower Ecosystem's AI Scanner! 🌸`;
    if (navigator.share) {
      navigator.share({ title: ai.flowerName, text, url: window.location.href });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!');
    }
  };

  // ─── View history item ────────────────────────────────────────────────
  window.viewHistory = function(id) {
    // Reload the page — in a real app, this would load the saved result
    showToast('Loading identification details...');
  };

  // ─── Toast helper ─────────────────────────────────────────────────────
  function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--text-main);color:white;padding:0.6rem 1.25rem;border-radius:50px;font-size:0.85rem;z-index:9999;animation:fadeInUp 0.3s;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  // ─── Sticky actions ───────────────────────────────────────────────────
  document.getElementById('sticky-save')?.addEventListener('click', () => window.saveToGarden());
  document.getElementById('sticky-share')?.addEventListener('click', () => window.shareResult());

  // ─── Init ─────────────────────────────────────────────────────────────
  loadHistory();
});
