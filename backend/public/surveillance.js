const socket = io();

const liveFeed = document.getElementById('live-feed');
const printQueueList = document.getElementById('print-queue');
const statProcessed = document.getElementById('stat-processed');
const statPrinted = document.getElementById('stat-printed');
const statErrors = document.getElementById('stat-errors');
const bulkPrintBtn = document.getElementById('bulk-print-btn');

let selectedImages = new Set();

function updateBulkPrintBtn() {
    if (selectedImages.size > 0) {
        bulkPrintBtn.textContent = `Print Selected (${selectedImages.size})`;
        bulkPrintBtn.disabled = false;
        bulkPrintBtn.style.background = '#FF6B35';
        bulkPrintBtn.style.color = '#fff';
        bulkPrintBtn.style.cursor = 'pointer';
    } else {
        bulkPrintBtn.textContent = `Print Selected (0)`;
        bulkPrintBtn.disabled = true;
        bulkPrintBtn.style.background = '#9E8BA6';
        bulkPrintBtn.style.color = '#150B19';
        bulkPrintBtn.style.cursor = 'not-allowed';
    }
}

bulkPrintBtn.addEventListener('click', () => {
    if (selectedImages.size === 0) return;
    
    const printWindow = window.open('', '_blank');
    let imagesHtml = '';
    selectedImages.forEach(img => {
        imagesHtml += `<img src="${img}" />`;
    });
    
    printWindow.document.write(`
        <html>
            <head>
                <title>Bulk Print Photo Strips</title>
                <style>
                    @page { margin: 0; size: auto; }
                    body { margin: 0; display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 10px; background: #fff; padding: 10px; }
                    img { height: 95vh; max-height: 5.8in; object-fit: contain; border: 1px solid #eee; } 
                </style>
            </head>
            <body>
                ${imagesHtml}
                <script>
                    window.onload = () => {
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 500);
                    };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
    
    // Clear selection
    selectedImages.clear();
    document.querySelectorAll('.feed-item img').forEach(img => {
        img.style.border = 'none';
        img.style.opacity = '1';
    });
    updateBulkPrintBtn();
});

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
        <img src="${event.image}" alt="Preview" style="box-sizing: border-box; transition: all 0.2s;">
        <div class="feed-details">
            <span class="badge ${badgeClass}">${badgeText}</span>
            <span style="color: #9E8BA6; font-size: 0.9rem; margin-left: 10px;">${time}</span>
            <p style="margin: 10px 0 0 0; font-size: 0.9rem;">Click to select for printing</p>
        </div>
    `;
    
    const imgElement = item.querySelector('img');
    imgElement.style.cursor = 'pointer';
    
    imgElement.addEventListener('click', () => {
        if (selectedImages.has(event.image)) {
            selectedImages.delete(event.image);
            imgElement.style.border = 'none';
            imgElement.style.opacity = '1';
        } else {
            selectedImages.add(event.image);
            imgElement.style.border = '4px solid #5ECB9A';
            imgElement.style.opacity = '0.7';
        }
        updateBulkPrintBtn();
    });
    
    liveFeed.prepend(item);
    
    if (liveFeed.children.length > 50) {
        liveFeed.removeChild(liveFeed.lastChild);
    }
});
