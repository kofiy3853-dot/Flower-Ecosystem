const express = require('express');
const router = express.Router();
const { upload, uploadVideo, requireAuth, getFileUrl } = require('./middleware');

router.post('/', requireAuth, upload.array('images', 10), (req, res) => {
    try {
        if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });
        const images = req.files.map(f => getFileUrl(f));
        res.json({ images });
    } catch (err) {
        console.error('Upload error:', err.message);
        res.status(500).json({ error: 'Upload failed' });
    }
});

router.post('/video', requireAuth, uploadVideo.single('video'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No video uploaded' });
        res.json({ url: getFileUrl(req.file) });
    } catch (err) {
        console.error('Video upload error:', err.message);
        res.status(500).json({ error: 'Video upload failed' });
    }
});

module.exports = router;
