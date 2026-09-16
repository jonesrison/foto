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
// Serve photos folder statically so frontend can access historical images
app.use('/photos', express.static(path.join(__dirname, 'photos')));

// Ensure photos directory exists
const photosDir = path.join(__dirname, 'photos');
if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir);
}

const instance = new Bonjour();
instance.publish({ name: 'Retro Booth', type: 'http', port: 3000, host: 'retrobooth.local' });

// Load stats from disk if available
const statsFile = path.join(__dirname, 'stats.json');
let stats = { processed: 0, printed: 0, errors: 0 };
if (fs.existsSync(statsFile)) {
    try {
        stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    } catch(e){}
}
function saveStats() {
    fs.writeFileSync(statsFile, JSON.stringify(stats));
}

let printQueue = [];

io.on('connection', (socket) => {
    console.log('Surveillance client connected');
    socket.emit('stats_update', stats);
    socket.emit('queue_update', printQueue);
    
    // Load historical strips from disk and send them to the client
    fs.readdir(photosDir, (err, files) => {
        if (!err) {
            const strips = files.filter(f => f.startsWith('photo_strip_')).sort();
            const recent = strips.slice(-50); // Get up to 50 most recent strips
            recent.forEach(file => {
                socket.emit('live_event', {
                    type: 'process',
                    image: `/photos/${file}`,
                    historical: true
                });
            });
        }
    });
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
        saveStats();
        io.emit('stats_update', stats);
        io.emit('live_event', { type: 'process', image: image });
        
        // Return success
        setTimeout(() => {
            res.json({ success: true });
        }, 500);
    } catch (err) {
        stats.errors++;
        saveStats();
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
        
        // Simulate print job completion logic
        setTimeout(() => {
            printQueue = printQueue.filter(j => j.id !== jobId);
            stats.printed++;
            saveStats();
            io.emit('stats_update', stats);
            io.emit('queue_update', printQueue);
        }, 5000); // simulate 5 second print
        
        res.status(200).json({ success: true, jobId });
    } catch (err) {
        stats.errors++;
        saveStats();
        io.emit('stats_update', stats);
        res.status(500).json({ error: 'Print failed' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server listening on port ${PORT}`);
    console.log(`Surveillance UI: http://localhost:${PORT}/surveillance/surveillance.html`);
});
