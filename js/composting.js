// js/composting.js
// Composting Guide — methods, troubleshooting, interactive content

const compostingMethods = [
    {
        id: 'hot',
        icon: '🔥',
        iconBg: 'background:rgba(239,68,68,0.1);color:#ef4444;',
        name: 'Hot Composting',
        desc: 'Fast decomposition at 130-160°F. Requires regular turning and balanced inputs. Produces compost in 4-8 weeks.',
        time: '4-8 weeks',
        effort: 'High',
        best: 'Serious gardeners'
    },
    {
        id: 'cold',
        icon: '🌿',
        iconBg: 'background:rgba(16,185,129,0.1);color:#10b981;',
        name: 'Cold Composting',
        desc: 'Slow, passive decomposition. Simply pile materials and wait. Low maintenance but takes 6-12 months.',
        time: '6-12 months',
        effort: 'Low',
        best: 'Beginners'
    },
    {
        id: 'vermicomposting',
        icon: '🪱',
        iconBg: 'background:rgba(139,92,246,0.1);color:#8b5cf6;',
        name: 'Vermicomposting',
        desc: 'Worm-powered composting using red wigglers. Perfect for apartments and small spaces. Produces worm castings.',
        time: '3-6 months',
        effort: 'Medium',
        best: 'Indoor/apartment'
    },
    {
        id: 'bokashi',
        icon: '🪣',
        iconBg: 'background:rgba(245,158,11,0.1);color:#f59e0b;',
        name: 'Bokashi',
        desc: 'Anaerobic fermentation using bokashi bran. Can process meat and dairy. Two-stage: ferment then bury.',
        time: '2 weeks + 4 weeks',
        effort: 'Medium',
        best: 'Meat/dairy scraps'
    }
];

const troubleshootingData = [
    {
        icon: 'bi bi-emoji-frown',
        iconBg: 'background:rgba(239,68,68,0.1);color:#ef4444;',
        problem: 'Smells bad (rotten/anaerobic)',
        desc: 'Pile is too wet or lacks oxygen. Excessive nitrogen from too many greens.',
        fix: 'Turn the pile, add more brown materials (dry leaves, cardboard), and ensure proper drainage.'
    },
    {
        icon: 'bi bi-thermometer',
        iconBg: 'background:rgba(245,158,11,0.1);color:#f59e0b;',
        problem: 'Pile isn\'t heating up',
        desc: 'Not enough nitrogen, pile too small, or materials too dry.',
        fix: 'Add green materials (grass clippings, food scraps), ensure pile is at least 3x3x3 feet, and moisten if dry.'
    },
    {
        icon: 'bi bi-bug',
        iconBg: 'background:rgba(139,92,246,0.1);color:#8b5cf6;',
        problem: 'Pest attraction (rats, flies)',
        desc: 'Exposed food scraps or meat/dairy in the pile.',
        fix: 'Bury food scraps in the center of the pile, use a sealed bin, avoid meat/dairy in open systems.'
    },
    {
        icon: 'bi bi-droplet-half',
        iconBg: 'background:rgba(14,165,233,0.1);color:#0ea5e9;',
        problem: 'Too wet / slimy',
        desc: 'Excess moisture from rain or too many wet greens without browns.',
        fix: 'Add dry brown materials, turn the pile to aerate, cover with a lid or tarp during rain.'
    },
    {
        icon: 'bi bi-speedometer2',
        iconBg: 'background:rgba(16,185,129,0.1);color:#10b981;',
        problem: 'Decomposition is too slow',
        desc: 'Materials too large, pile too dry, or not enough nitrogen.',
        fix: 'Chop materials into smaller pieces (1-2 inches), add water to moisten, mix in green materials.'
    },
    {
        icon: 'bi bi-mouse',
        iconBg: 'background:rgba(239,68,68,0.1);color:#ef4444;',
        problem: 'Ants or rodents nesting',
        desc: 'Pile is too dry or has accessible food scraps near the surface.',
        fix: 'Water the pile, bury scraps deeper, surround with wire mesh, or switch to a sealed tumbler.'
    }
];

function initCompostingPage() {
    renderMethods();
    renderTroubleshooting();
}

function renderMethods() {
    const grid = document.getElementById('methodsGrid');
    if (!grid) return;

    grid.innerHTML = compostingMethods.map(m => `
        <div class="method-card" onclick="selectMethod('${m.id}')">
            <div class="method-icon" style="${m.iconBg}">${m.icon}</div>
            <h4>${m.name}</h4>
            <p>${m.desc}</p>
            <div class="method-meta">
                <span><i class="bi bi-clock"></i> ${m.time}</span>
                <span><i class="bi bi-speedometer"></i> ${m.effort}</span>
                <span><i class="bi bi-person"></i> ${m.best}</span>
            </div>
        </div>
    `).join('');
}

function selectMethod(id) {
    document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

function renderTroubleshooting() {
    const list = document.getElementById('troubleshootList');
    if (!list) return;

    list.innerHTML = troubleshootingData.map(t => `
        <div class="troubleshoot-card">
            <div class="troubleshoot-icon" style="${t.iconBg}"><i class="bi ${t.icon}"></i></div>
            <div class="troubleshoot-info">
                <h4>${t.problem}</h4>
                <p>${t.desc}</p>
                <div class="fix"><i class="bi bi-check-circle"></i> Fix: ${t.fix}</div>
            </div>
        </div>
    `).join('');
}
