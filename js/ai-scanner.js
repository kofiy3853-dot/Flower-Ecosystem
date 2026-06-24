document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  const uploadArea = document.getElementById('upload-area');
  const analyzeBtn = document.getElementById('analyze-btn');
  const resultSection = document.getElementById('result-section');
  const errorMsg = document.getElementById('error-msg');
  const loadingSection = document.getElementById('loading-section');

  let selectedFile = null;
  let flowerKnowledge = [];

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
    sunlight: 'bi-sun',
    water: 'bi-droplet',
    soil: 'bi-flower1',
    temperature: 'bi-thermometer-half'
  };

  fetch('/api/knowledge/flowers')
    .then(r => r.json())
    .then(data => { flowerKnowledge = Array.isArray(data) ? data : []; })
    .catch(() => {});

  function getFlowerEmoji(name) {
    const lower = (name || '').toLowerCase();
    for (const [key, emoji] of Object.entries(flowerEmojis)) {
      if (lower.includes(key)) return emoji;
    }
    return '🌸';
  }

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
      uploadArea.style.padding = '3rem 2rem';
      uploadArea.style.borderStyle = 'dashed';
      uploadArea.style.borderColor = 'var(--border-color)';
    }
  };

  fileInput.addEventListener('change', (e) => {
    selectedFile = e.target.files[0] || null;
    enableButton();
  });

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
  });
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const dt = e.dataTransfer;
    if (dt.files && dt.files[0]) {
      selectedFile = dt.files[0];
      fileInput.files = dt.files;
      enableButton();
    }
  });

  analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    errorMsg.style.display = 'none';
    resultSection.style.display = 'none';
    if (loadingSection) loadingSection.style.display = 'block';
    analyzeBtn.innerHTML = '<span class="auth-spinner" style="margin-right:0.5rem;border-color:rgba(255,255,255,0.3);border-top-color:white;"></span> Analyzing...';
    analyzeBtn.disabled = true;

    const form = new FormData();
    form.append('image', selectedFile);

    try {
      const resp = await fetch('/api/openai/analyze-flower', {
        method: 'POST',
        body: form,
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || 'Server error');
      }
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      const ai = data.ai || {};
      const emoji = getFlowerEmoji(ai.flowerName);
      const confidencePercent = ((ai.confidence || 0) * 100).toFixed(0);
      const naturalPercent = ((ai.naturalConfidence || 0) * 100).toFixed(0);

      let html = '';

      // Section 1: Header
      html += `
        <div class="scanner-header" style="border-bottom:1px solid var(--border-color);padding-bottom:1.25rem;margin-bottom:1.25rem;">
          <h2 style="font-size:1.5rem;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
            <span id="flower-name" style="color:var(--primary-color);">${emoji} ${ai.flowerName || 'Unknown Flower'}</span>
            <span class="confidence-badge"><i class="bi bi-check-circle-fill"></i> <span id="confidence">${confidencePercent}</span>% Match</span>
          </h2>
          <p style="font-style:italic;color:var(--text-light);font-size:1.05rem;" id="scientific-name">${ai.scientificName || 'Unknown'}</p>
        </div>`;

      // Section 2: Basic Info Grid
      html += `
        <div class="scanner-info-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;margin-bottom:1.5rem;">
          <div class="info-tag"><i class="bi bi-tag" style="color:var(--primary-color);margin-right:0.5rem;"></i><strong>Category:</strong> <span id="category">${ai.category || 'Unknown'}</span></div>
          <div class="info-tag"><i class="bi bi-flower1" style="color:var(--primary-color);margin-right:0.5rem;"></i><strong>Type:</strong> <span id="flower-type">${ai.flowerType || 'Unknown'}</span></div>
          <div class="info-tag"><i class="bi bi-diagram-3" style="color:var(--primary-color);margin-right:0.5rem;"></i><strong>Family:</strong> <span>${ai.family || 'Unknown'}</span></div>
          <div class="info-tag"><i class="bi bi-geo-alt" style="color:var(--primary-color);margin-right:0.5rem;"></i><strong>Origin:</strong> <span>${ai.origin || 'Unknown'}</span></div>
        </div>`;

      // Section 3: Description
      if (ai.description) {
        html += `
          <div class="scanner-description" style="margin-bottom:1.5rem;">
            <h3 style="font-size:1.1rem;margin-bottom:0.75rem;"><i class="bi bi-info-circle"></i> About This Flower</h3>
            <p style="color:var(--text-light);line-height:1.7;font-size:0.95rem;">${ai.description}</p>
          </div>`;
      }

      // Section 4: Uses
      const useColumns = [
        { title: 'Ornamental Uses', icon: 'bi-palette', items: ai.ornamentalUses },
        { title: 'Perfume Uses', icon: 'bi-droplet-half', items: ai.perfumeUses },
        { title: 'Medicinal Properties', icon: 'bi-heart-pulse', items: ai.medicinalProperties },
        { title: 'Food Uses', icon: 'bi-cup-hot', items: ai.foodUses }
      ];
      const hasUses = useColumns.some(c => c.items && c.items.length);
      if (hasUses) {
        html += `<div class="scanner-uses" style="margin-bottom:1.5rem;">
          <h3 style="font-size:1.1rem;margin-bottom:0.75rem;"><i class="bi bi-grid"></i> Uses & Benefits</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">`;
        useColumns.forEach(col => {
          if (!col.items || !col.items.length) return;
          html += `<div style="background:var(--bg-light);padding:1rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);">
            <h4 style="font-size:0.95rem;margin-bottom:0.5rem;color:var(--primary-color);"><i class="bi ${col.icon}"></i> ${col.title}</h4>
            <ul class="feature-list" style="padding-left:0;">`;
          col.items.forEach(item => {
            html += `<li style="padding:0.4rem 0;font-size:0.9rem;"><i class="bi bi-check2-all" style="color:var(--accent-green);margin-right:0.4rem;"></i>${item}</li>`;
          });
          html += `</ul></div>`;
        });
        html += `</div></div>`;
      }

      // Section 5: Health Benefits
      if (ai.healthBenefits && ai.healthBenefits.length) {
        html += `
          <div class="scanner-health" style="margin-bottom:1.5rem;">
            <h3 style="font-size:1.1rem;margin-bottom:0.75rem;"><i class="bi bi-heart"></i> Health Benefits</h3>
            <ul class="feature-list" style="padding-left:0;">`;
        ai.healthBenefits.forEach(b => {
          html += `<li><i class="bi bi-check2-circle" style="color:var(--accent-green);"></i> ${b}</li>`;
        });
        html += `</ul></div>`;
      }

      // Section 6: Where to Buy
      if (data.marketplace && data.marketplace.products && data.marketplace.products.length) {
        html += `
          <div class="scanner-marketplace" style="margin-bottom:1.5rem;">
            <h3 style="font-size:1.1rem;margin-bottom:0.75rem;"><i class="bi bi-bag"></i> Where to Buy</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem;">`;
        data.marketplace.products.forEach(prod => {
          html += `<div style="background:var(--bg-light);padding:1rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);text-align:center;">
            ${prod.image ? `<img src="${prod.image}" alt="${prod.name}" style="width:100%;height:120px;object-fit:cover;border-radius:var(--radius-sm);margin-bottom:0.5rem;" />` : ''}
            <p style="font-weight:600;font-size:0.95rem;margin-bottom:0.25rem;">${prod.name}</p>
            ${prod.price ? `<p style="color:var(--primary-color);font-weight:700;margin-bottom:0.25rem;">$${Number(prod.price).toFixed(2)}</p>` : ''}
            ${prod.seller_name || prod.seller ? `<p style="color:var(--text-light);font-size:0.85rem;"><i class="bi bi-shop"></i> ${prod.seller_name || prod.seller}</p>` : ''}
          </div>`;
        });
        html += `</div></div>`;
      }

      // Section 7: Similar Flowers
      if (ai.similarFlowers && ai.similarFlowers.length) {
        html += `
          <div class="scanner-similar" style="margin-bottom:1.5rem;">
            <h3 style="font-size:1.1rem;margin-bottom:0.75rem;"><i class="bi bi-grid-3x3-gap"></i> Similar Flowers</h3>
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">`;
        ai.similarFlowers.forEach(flower => {
          const flowerLower = flower.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const fEmoji = getFlowerEmoji(flower);
          html += `<a href="flower-knowledge.html?slug=${flowerLower}" style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.4rem 0.85rem;background:var(--bg-light);border:1px solid var(--border-color);border-radius:50px;text-decoration:none;color:var(--text-main);font-size:0.9rem;transition:all 0.2s;">${fEmoji} ${flower}</a>`;
        });
        html += `</div></div>`;
      }

      // Section 8: Natural vs Artificial
      if (ai.isNatural !== undefined) {
        const natLabel = ai.isNatural ? 'Natural' : 'Artificial';
        const natColor = ai.isNatural ? 'var(--accent-green)' : 'var(--error-color)';
        const natBg = ai.isNatural ? 'var(--accent-green-light)' : '#fee2e2';
        html += `
          <div class="scanner-authenticity" style="margin-bottom:1.5rem;background:var(--bg-light);padding:1.25rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);">
            <h3 style="font-size:1.1rem;margin-bottom:0.75rem;"><i class="bi bi-shield-check"></i> Authenticity Analysis</h3>
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
              <span style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.35rem 0.85rem;border-radius:50px;font-weight:600;font-size:0.9rem;background:${natBg};color:${natColor};">
                <i class="bi ${ai.isNatural ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}"></i> ${natLabel}
              </span>
              <span style="font-size:0.9rem;color:var(--text-light);">${naturalPercent}% confidence</span>
            </div>
            <div style="background:var(--border-color);height:8px;border-radius:4px;overflow:hidden;margin-bottom:0.75rem;">
              <div style="width:${naturalPercent}%;height:100%;background:${natColor};border-radius:4px;transition:width 0.5s;"></div>
            </div>`;
        if (ai.naturalReasons && ai.naturalReasons.length) {
          html += `<ul class="feature-list" style="padding-left:0;margin-top:0.5rem;">`;
          ai.naturalReasons.forEach(r => {
            html += `<li><i class="bi bi-check2" style="color:var(--accent-green);"></i> ${r}</li>`;
          });
          html += `</ul>`;
        }
        if (ai.artificialReasons && ai.artificialReasons.length) {
          html += `<ul class="feature-list" style="padding-left:0;margin-top:0.5rem;">`;
          ai.artificialReasons.forEach(r => {
            html += `<li><i class="bi bi-x" style="color:var(--error-color);"></i> ${r}</li>`;
          });
          html += `</ul>`;
        }
        html += `</div>`;
      }

      // Section 9: Care Guide
      if (ai.careGuide) {
        const care = ai.careGuide;
        const careItems = [
          { key: 'sunlight', label: 'Sunlight', icon: careIcons.sunlight, value: care.sunlight },
          { key: 'water', label: 'Water', icon: careIcons.water, value: care.water },
          { key: 'soil', label: 'Soil', icon: careIcons.soil, value: care.soil },
          { key: 'temperature', label: 'Temperature', icon: careIcons.temperature, value: care.temperature }
        ].filter(c => c.value);
        if (careItems.length) {
          html += `
            <div class="scanner-care" style="margin-bottom:1.5rem;">
              <h3 style="font-size:1.1rem;margin-bottom:0.75rem;"><i class="bi bi-calendar-check"></i> Care Guide</h3>
              <div id="care-tips" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;">`;
          careItems.forEach(item => {
            html += `<div style="background:var(--bg-light);padding:1rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);text-align:center;">
              <i class="bi ${item.icon}" style="font-size:1.5rem;color:var(--primary-color);display:block;margin-bottom:0.5rem;"></i>
              <p style="font-weight:600;font-size:0.9rem;margin-bottom:0.25rem;">${item.label}</p>
              <p style="color:var(--text-light);font-size:0.9rem;">${item.value}</p>
            </div>`;
          });
          html += `</div></div>`;
        }
      }

      // Section 10: Learning Resources
      if (data.articles && data.articles.length) {
        html += `
          <div class="scanner-articles" style="margin-bottom:1.5rem;">
            <h3 style="font-size:1.1rem;margin-bottom:0.75rem;"><i class="bi bi-journal-text"></i> Learning Resources</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;">`;
        data.articles.forEach(article => {
          const articleUrl = article.slug ? `article-detail.html?id=${article.slug}` : '#';
          html += `<a href="${articleUrl}" style="background:var(--bg-light);padding:1rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);text-decoration:none;color:var(--text-main);transition:all 0.2s;display:block;">
            <p style="font-weight:600;font-size:0.95rem;margin-bottom:0.25rem;">${article.title || 'Article'}</p>
            ${article.excerpt ? `<p style="color:var(--text-light);font-size:0.85rem;margin:0;">${article.excerpt}</p>` : ''}
            <span style="color:var(--primary-color);font-size:0.85rem;margin-top:0.5rem;display:inline-flex;align-items:center;gap:0.25rem;">Read more <i class="bi bi-arrow-right"></i></span>
          </a>`;
        });
        html += `</div></div>`;
      }

      // Section 11: Community Questions
      if (data.questions && data.questions.length) {
        html += `
          <div class="scanner-questions" style="margin-bottom:1.5rem;">
            <h3 style="font-size:1.1rem;margin-bottom:0.75rem;"><i class="bi bi-chat-dots"></i> Community Questions</h3>
            <ul style="list-style:none;padding:0;margin:0;">`;
        data.questions.forEach(q => {
          const qUrl = q.slug ? `question-detail.html?id=${q.slug}` : '#';
          html += `<li style="padding:0.6rem 0;border-bottom:1px solid var(--border-light);display:flex;align-items:center;gap:0.5rem;">
            <i class="bi bi-question-circle" style="color:var(--primary-color);"></i>
            <a href="${qUrl}" style="text-decoration:none;color:var(--text-main);font-size:0.95rem;flex:1;">${q.title || 'View Question'}</a>
            ${q.answer_count ? `<span style="color:var(--text-light);font-size:0.8rem;white-space:nowrap;"><i class="bi bi-chat-left-text"></i> ${q.answer_count}</span>` : ''}
          </li>`;
        });
        html += `</ul></div>`;
      }

      // Section 12: References
      if (ai.references && ai.references.length) {
        html += `
          <div class="scanner-references" style="margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid var(--border-color);">
            <details>
              <summary style="cursor:pointer;font-size:1rem;font-weight:500;color:var(--text-light);display:flex;align-items:center;gap:0.5rem;">
                <i class="bi bi-book"></i> References (${ai.references.length} sources)
              </summary>
              <ul style="list-style:none;padding:0;margin:0.75rem 0 0;">`;
        ai.references.forEach(ref => {
          html += `<li style="padding:0.3rem 0;font-size:0.9rem;color:var(--text-light);"><i class="bi bi-check2" style="color:var(--accent-green);margin-right:0.4rem;"></i>${ref}</li>`;
        });
        html += `</ul></details></div>`;
      }

      resultSection.innerHTML = html;
      resultSection.style.display = 'block';
      if (loadingSection) loadingSection.style.display = 'none';

      // Add encyclopedia link at the end
      const name = (ai.flowerName || '').toLowerCase();
      const slug = name.replace(/[^a-z0-9]+/g, '-');
      const match = flowerKnowledge.find(f =>
        f.common_name.toLowerCase() === name ||
        (f.scientific_name || '').toLowerCase() === name ||
        f.common_name.toLowerCase().includes(name) ||
        name.includes(f.common_name.toLowerCase())
      );
      const linkSlug = match ? match.slug : slug;
      if (linkSlug) {
        const linkHtml = `<div style="margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid var(--border-color);text-align:center;">
          <a href="flower-knowledge.html?slug=${linkSlug}" style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.6rem 1.25rem;background:var(--bg-light);border-radius:10px;text-decoration:none;color:var(--primary-color);font-weight:500;font-size:0.9rem;">
            <i class="bi bi-book"></i> Learn More in Flower Encyclopedia →
          </a>
        </div>`;
        resultSection.innerHTML += linkHtml;
      }

    } catch (err) {
      console.error('AI Scanner error:', err);
      errorMsg.textContent = err.message || 'Failed to analyze image. Please try again.';
      errorMsg.style.display = 'block';
      if (loadingSection) loadingSection.style.display = 'none';
    } finally {
      analyzeBtn.innerHTML = '<i class="bi bi-stars" style="margin-right:0.5rem;"></i> Identify Flower';
      enableButton();
    }
  });
});
