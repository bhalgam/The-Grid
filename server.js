const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const COVER_PATH = path.join(UPLOAD_DIR, 'cover.jpg');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();

// Serve static files (Main.html, Main.js, styles.css, etc.)
app.use(express.static(__dirname));

const upload = multer({ dest: UPLOAD_DIR, limits: { fileSize: 6 * 1024 * 1024 } });

app.post('/upload', upload.single('cover'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  // normalize to cover.jpg
  fs.rename(req.file.path, COVER_PATH, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

app.post('/remove', (req, res) => {
  fs.unlink(COVER_PATH, err => {
    if (err && err.code !== 'ENOENT') return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

app.get('/cover', (req, res) => {
  if (fs.existsSync(COVER_PATH)) return res.sendFile(COVER_PATH);

  // Default inline SVG when no cover image uploaded
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400">
    <defs>
      <linearGradient id="g" x1="0" x2="1">
        <stop offset="0" stop-color="#08303b"/>
        <stop offset="1" stop-color="#05202a"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="50%" font-family="Garamond, Roboto, Arial" font-size="36" fill="#6fd9cb" dominant-baseline="middle" text-anchor="middle">Focus — Your Study Space</text>
  </svg>`;
  res.set('Content-Type', 'image/svg+xml');
  res.send(svg);
});

const PORT = process.env.PORT || 9001;
app.listen(PORT, () => console.log(`Focus server listening: http://localhost:${PORT}`));
