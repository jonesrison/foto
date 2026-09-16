const socket = io();

const liveFeed = document.getElementById('live-feed');
const printQueueList = document.getElementById('print-queue');
const statProcessed = document.getElementById('stat-processed');
const statPrinted = document.getElementById('stat-printed');
const statErrors = document.getElementById('stat-errors');

// Update stats
socket.on('stats_update', (stats) => {
    statProcessed.textContent = stats.processed;
    statPrinted.textContent = stats.printed;
    statErrors.textContent = stats.errors;
});

// Update queue
socket.on('queue_update', (queue) => {
    printQueueList.innerHTML = '';
    if (queue.length === 0) {
        printQueueList.innerHTML = '<li class="queue-item" style="border-left: none; color: #9E8BA6;">Queue is empty</li>';
        return;
    }
    queue.forEach(job => {
        const li = document.createElement('li');
        li.className = 'queue-item';
        li.innerHTML = `<strong>Job ID:</strong> ${job.id} <br> <strong>Status:</strong> ${job.status}`;
        printQueueList.appendChild(li);
    });
});

// Update live event feed
socket.on('live_event', (event) => {
    const item = document.createElement('div');
    item.className = 'feed-item';
    
    const badgeClass = event.type === 'process' ? 'process' : 'print';
    const badgeText = event.type === 'process' ? 'PROCESSING' : 'PRINTING';
    const time = new Date().toLocaleTimeString();

    item.innerHTML = `
        <img src="${event.image}" alt="Preview">
        <div class="feed-details">
            <span class="badge ${badgeClass}">${badgeText}</span>
            <span style="color: #9E8BA6; font-size: 0.9rem; margin-left: 10px;">${time}</span>
            <p style="margin: 10px 0 0 0; font-size: 0.9rem;">
                ${event.template ? `Template: ${event.template}` : ''}
                ${event.meta && event.meta.template ? `Template ID: ${event.meta.template}` : ''}
            </p>
        </div>
    `;
    
    liveFeed.prepend(item);
    
    // Keep only last 20 items to prevent memory bloat
    if (liveFeed.children.length > 20) {
        liveFeed.removeChild(liveFeed.lastChild);
    }
});
