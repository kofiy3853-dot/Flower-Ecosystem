// Events Page - Calendar and registration handling
import { api } from '../shared/api.js';
import { toast } from '../shared/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
    const events = await api.getEvents();
    const container = document.getElementById('events-grid');
    if (container) {
        container.innerHTML = events.map(ev => `
            <div class="event-card">
                <h3>${ev.title}</h3>
                <p>${new Date(ev.date).toLocaleDateString()}</p>
                <button data-id="${ev.id}" class="register-btn">Register</button>
            </div>
        `).join('');
        document.querySelectorAll('.register-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                await api.registerEvent(btn.dataset.id);
                toast.show('Registered for event');
            });
        });
    }
});

export {};