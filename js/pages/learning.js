// Learning Page - Tabs, filters, video player
import { api } from '../shared/api.js';

document.addEventListener('DOMContentLoaded', () => {
    // Simple tab switcher
    const tabs = document.querySelectorAll('.learning-tab');
    const panels = document.querySelectorAll('.learning-panel');
    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            panels[i].classList.add('active');
        });
    });
});