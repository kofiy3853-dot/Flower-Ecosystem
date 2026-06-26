// Events Page - Calendar and registration handling

document.addEventListener('DOMContentLoaded', async () => {
    const events = await api.fetchEvents();
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
                Toast.show('Registered for event');
            });
        });
    }
});
