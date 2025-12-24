import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sqlite3Pkg from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const sqlite3 = sqlite3Pkg.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- Paths Configuration (updated for root directory deployment) ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_PATH = path.join(__dirname, 'database.sqlite');
const DIST_DIR = path.join(__dirname, 'dist');

// --- Image Compression Settings ---
const COMPRESSION_CONFIG = {
    maxWidth: 1920,      // Max width in pixels
    maxHeight: 1920,     // Max height in pixels
    quality: 80,         // JPEG/WebP quality (1-100)
    format: 'webp'       // Output format (webp for best compression)
};

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

// --- File Upload Setup (memory storage for compression) ---
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file (before compression)
    fileFilter: (req, file, cb) => {
        // Security: Only allow specific image types
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
        }
    }
});

// --- Image Compression Function ---
async function compressAndSaveImage(buffer, originalName) {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webp`;
    const outputPath = path.join(UPLOADS_DIR, uniqueName);

    try {
        await sharp(buffer)
            .resize(COMPRESSION_CONFIG.maxWidth, COMPRESSION_CONFIG.maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ quality: COMPRESSION_CONFIG.quality })
            .toFile(outputPath);

        const stats = fs.statSync(outputPath);
        console.log(`  ✓ Compressed ${originalName} → ${uniqueName} (${(stats.size / 1024).toFixed(1)}KB)`);

        return uniqueName;
    } catch (err) {
        console.error(`  ✗ Failed to compress ${originalName}:`, err.message);
        throw err;
    }
}

// --- API Routes ---

// POST /api/upload - Upload multiple images (max 20)
app.post('/api/upload', uploadLimiter, upload.array('files', 20), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    const { primary, accent, light } = req.body;
    if (!primary || !accent || !light) {
        return res.status(400).json({ error: 'Missing color configuration' });
    }

    try {
        console.log(`\n📤 Processing ${req.files.length} images...`);

        // Compress all images in parallel
        const compressionPromises = req.files.map(file =>
            compressAndSaveImage(file.buffer, file.originalname)
        );
        const imageFilenames = await Promise.all(compressionPromises);

        const treeId = uuidv4();
        const colors = JSON.stringify({ primary, accent, light });

        db.run(
            'INSERT INTO trees (id, images, colors) VALUES (?, ?, ?)',
            [treeId, JSON.stringify(imageFilenames), colors],
            function (err) {
                if (err) {
                    console.error('DB Insert Error:', err);
                    // Cleanup compressed files on DB error
                    imageFilenames.forEach(f => {
                        const filepath = path.join(UPLOADS_DIR, f);
                        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
                    });
                    return res.status(500).json({ error: 'Database error' });
                }
                console.log(`✓ Created tree ${treeId} with ${imageFilenames.length} compressed images\n`);
                res.json({ id: treeId });
            }
        );
    } catch (err) {
        console.error('Upload processing error:', err);
        return res.status(500).json({ error: 'Failed to process images' });
    }
});

// GET /api/tree/:id - Get tree data
app.get('/api/tree/:id', (req, res) => {
    const { id } = req.params;

    // UUID format validation (security)
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

    // Security: prevent path traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(403).json({ error: 'Invalid filename' });
    }

    // Security: validate filename format (timestamp-random.webp)
    if (!/^\d+-[a-z0-9]+\.webp$/i.test(filename)) {
        return res.status(400).json({ error: 'Invalid filename format' });
    }

    const filepath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'Image not found' });
    }

    // Set cache headers for images
    res.set('Cache-Control', 'public, max-age=31536000');
    res.set('Content-Type', 'image/webp');
    res.sendFile(filepath);
});

// Error handling middleware for multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large (max 10MB)' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files (max 20)' });
        }
        return res.status(400).json({ error: err.message });
    }
    if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
});

// Client-side Routing Catch-all (must be last)
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`\n🎄 Tree Server running on port ${PORT}`);
    console.log(`   Frontend: http://localhost:${PORT}`);
    console.log(`   API:      http://localhost:${PORT}/api`);
    console.log(`   Compression: WebP @ ${COMPRESSION_CONFIG.quality}% quality, max ${COMPRESSION_CONFIG.maxWidth}px\n`);
});
