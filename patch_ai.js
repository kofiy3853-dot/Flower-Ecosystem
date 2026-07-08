const fs = require('fs');
let html = fs.readFileSync('components/ai-assistant.html', 'utf8');

// Replace var declarations
html = html.replace(
    'var aiChatOpen = false;\nvar conversationHistory = [];',
    `var aiChatOpen = sessionStorage.getItem('floraAiOpen') === 'true';\nvar conversationHistory = JSON.parse(sessionStorage.getItem('floraAiHistory') || '[]');`
);

// Update initAIAssistant to restore UI state
html = html.replace(
    /if \(toggle\) \{/,
    `if (aiChatOpen && toggle) {
        document.getElementById('aiChatWindow').style.display = 'flex';
        toggle.innerHTML = '<i class="bi bi-x-lg"></i>';
    }

    var c = document.getElementById('aiMessages');
    if (conversationHistory.length > 0) {
        c.innerHTML = '';
        conversationHistory.forEach(msg => {
            aiAddMsg(msg.content, msg.role === 'user' ? 'user' : 'bot', true);
        });
        setTimeout(() => c.scrollTop = c.scrollHeight, 100);
    }

    if (toggle) {`
);

// Update toggle.onclick
html = html.replace(
    'aiChatOpen = !aiChatOpen;\n            document.getElementById',
    `aiChatOpen = !aiChatOpen;\n            sessionStorage.setItem('floraAiOpen', aiChatOpen);\n            document.getElementById`
);

// Update closeBtn.onclick
html = html.replace(
    'aiChatOpen = false;\n            document.getElementById',
    `aiChatOpen = false;\n            sessionStorage.setItem('floraAiOpen', 'false');\n            document.getElementById`
);

// Update aiSendMsg user push
html = html.replace(
    `conversationHistory.push({ role: 'user', content: msg });\n    inp.value = '';`,
    `conversationHistory.push({ role: 'user', content: msg });\n    sessionStorage.setItem('floraAiHistory', JSON.stringify(conversationHistory));\n    inp.value = '';`
);

// Update aiSendMsg bot push
html = html.replace(
    `conversationHistory.push({ role: 'assistant', content: data.reply });\n            aiAddMsg(data.reply, 'bot');`,
    `conversationHistory.push({ role: 'assistant', content: data.reply });\n            sessionStorage.setItem('floraAiHistory', JSON.stringify(conversationHistory));\n            aiAddMsg(data.reply, 'bot');`
);

// Update aiAddMsg to not scroll if skipScroll is true
html = html.replace(
    `function aiAddMsg(text, sender) {`,
    `function aiAddMsg(text, sender, skipScroll) {`
);
html = html.replace(
    `c.scrollTop = c.scrollHeight;\n}`,
    `if (!skipScroll) c.scrollTop = c.scrollHeight;\n}`
);

fs.writeFileSync('components/ai-assistant.html', html);
console.log('Patched ai-assistant.html');
