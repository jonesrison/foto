const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Bonjour = require('bonjour-service');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/surveillance', express.static(path.join(__dirname, 'public')));

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
        const { image, template } = req.body;
        // In a real app, perform heavy processing here (e.g., using sharp or calling a python script). 
        // For now, just return the image to simulate a successful processing step.
        const processedImage = image; 
        
        stats.processed++;
        io.emit('stats_update', stats);
        io.emit('live_event', { type: 'process', image: processedImage, template });
        
        // Simulate processing time
        setTimeout(() => {
            res.json({ image: processedImage });
        }, 1000);
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
