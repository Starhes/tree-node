const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Paths Configuration ---
const UPLOADS_DIR = path.join(__dirname, '../uploads');  // Separate from server code
const DB_PATH = path.join(__dirname, 'database.sqlite');
const DIST_DIR = path.join(__dirname, '../dist');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Serve Frontend Static Files
app.use(express.static(DIST_DIR));

// Rate Limiter (prevent abuse)
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,
    message: { error: 'Too many uploads, please try again later' }
});

// --- Database Setup ---
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error('DB Error:', err.message);
    else console.log('✓ Connected to SQLite DB');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS trees (
        id TEXT PRIMARY KEY,
        images TEXT,
        colors TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// --- File Upload Setup ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files allowed'));
    }
});

// --- API Routes ---

// POST /api/upload - Upload multiple images
app.post('/api/upload', uploadLimiter, upload.array('files', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    const { primary, accent, light } = req.body;
    if (!primary || !accent || !light) {
        // Cleanup on validation failure
        req.files.forEach(f => fs.unlinkSync(f.path));
        return res.status(400).json({ error: 'Missing color configuration' });
    }

    const treeId = uuidv4();
    const colors = JSON.stringify({ primary, accent, light });
    const imageFilenames = req.files.map(f => f.filename);

    db.run(
        'INSERT INTO trees (id, images, colors) VALUES (?, ?, ?)',
        [treeId, JSON.stringify(imageFilenames), colors],
        function (err) {
            if (err) {
                console.error('DB Insert Error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            console.log(`✓ Created tree ${treeId} with ${imageFilenames.length} images`);
            res.json({ id: treeId });
        }
    );
});

// GET /api/tree/:id - Get tree data
app.get('/api/tree/:id', (req, res) => {
    const { id } = req.params;

    // UUID format validation
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
    }

    db.get('SELECT * FROM trees WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Tree not found' });

        const colors = JSON.parse(row.colors);
        const filenames = row.images ? JSON.parse(row.images) : [];
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const imageUrls = filenames.map(f => `${baseUrl}/api/image/${f}`);

        res.json({
            id: row.id,
            colors,
            imageUrls,
            createdAt: row.created_at
        });
    });
});

// GET /api/image/:filename - Serve uploaded images
app.get('/api/image/:filename', (req, res) => {
    const { filename } = req.params;

    // Security: prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(403).json({ error: 'Invalid filename' });
    }

    const filepath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'Image not found' });
    }

    // Set cache headers for images
    res.set('Cache-Control', 'public, max-age=31536000');
    res.sendFile(filepath);
});

// Client-side Routing Catch-all (must be last)
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`\n🎄 Tree Server running on port ${PORT}`);
    console.log(`   Frontend: http://localhost:${PORT}`);
    console.log(`   API:      http://localhost:${PORT}/api\n`);
});
