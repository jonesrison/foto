const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const Bonjour = require('bonjour-service');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/surveillance', express.static(path.join(__dirname, 'public')));

// Ensure photos directory exists
const photosDir = path.join(__dirname, 'photos');
if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir);
}

const instance = new Bonjour();
instance.publish({ name: 'Photobooth', type: 'http', port: 3000, host: 'photobooth.local' });

let stats = { processed: 0, printed: 0, errors: 0 };
let printQueue = [];

io.on('connection', (socket) => {
    console.log('Surveillance client connected');
    socket.emit('stats_update', stats);
    socket.emit('queue_update', printQueue);
});

// Discovery Endpoint
app.get('/ping', (req, res) => {
    res.json({ status: "ok", device: "photobooth-backend" });
});

// Pipeline Process Endpoint
app.post('/process', (req, res) => {
    try {
        const { image, originals } = req.body;
        const timestamp = Date.now();
        
        // Save the main photo strip
        if (image) {
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            const filename = `photo_strip_${timestamp}.jpg`;
            fs.writeFileSync(path.join(photosDir, filename), base64Data, 'base64');
        }

        // Save the individual original shots
        if (originals && Array.isArray(originals)) {
            originals.forEach((orig, index) => {
                const bData = orig.replace(/^data:image\/\w+;base64,/, "");
                const fname = `photo_${timestamp}_orig_${index + 1}.jpg`;
                fs.writeFileSync(path.join(photosDir, fname), bData, 'base64');
            });
        }
        
        stats.processed++;
        io.emit('stats_update', stats);
        io.emit('live_event', { type: 'process', image: image });
        
        // Return success
        setTimeout(() => {
            res.json({ success: true });
        }, 500);
    } catch (err) {
        stats.errors++;
        io.emit('stats_update', stats);
        res.status(500).json({ error: 'Processing failed' });
    }
});

// Printer Endpoint
app.post('/print', (req, res) => {
    try {
        const { image, copies, meta } = req.body;
        const jobId = Date.now().toString();
        
        printQueue.push({ id: jobId, status: 'printing', meta });
        io.emit('queue_update', printQueue);
        io.emit('live_event', { type: 'print', image, meta });
        
        // Simulate print job completion logic here (e.g., calling system print command or saving to a hot folder)
        setTimeout(() => {
            printQueue = printQueue.filter(j => j.id !== jobId);
            stats.printed++;
            io.emit('stats_update', stats);
            io.emit('queue_update', printQueue);
        }, 5000); // simulate 5 second print
        
        res.status(200).json({ success: true, jobId });
    } catch (err) {
        stats.errors++;
        io.emit('stats_update', stats);
        res.status(500).json({ error: 'Print failed' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server listening on port ${PORT}`);
    console.log(`Surveillance UI: http://localhost:${PORT}/surveillance/surveillance.html`);
});
