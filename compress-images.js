const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imagesDir = path.join(__dirname, 'images');

async function compressImages() {
    const files = fs.readdirSync(imagesDir);
    let totalSaved = 0;

    for (const file of files) {
        if (!file.match(/\.(jpg|jpeg|png|webp)$/i)) continue;
        
        const filePath = path.join(imagesDir, file);
        const stats = fs.statSync(filePath);
        const sizeMB = stats.size / (1024 * 1024);
        
        // Only process files larger than 1MB
        if (sizeMB > 1.0) {
            console.log(`Processing ${file} (${sizeMB.toFixed(2)} MB)...`);
            const tempPath = path.join(imagesDir, `temp_${file}`);
            
            try {
                await sharp(filePath)
                    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true }) // Max 1920px
                    .jpeg({ quality: 80, progressive: true }) // Convert/Compress
                    .toFile(tempPath);
                
                const newStats = fs.statSync(tempPath);
                const newSizeMB = newStats.size / (1024 * 1024);
                
                // Replace original
                fs.renameSync(tempPath, filePath);
                
                const saved = sizeMB - newSizeMB;
                totalSaved += saved;
                console.log(`  -> Reduced to ${newSizeMB.toFixed(2)} MB (saved ${saved.toFixed(2)} MB)`);
            } catch (err) {
                console.error(`  -> Failed: ${err.message}`);
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            }
        }
    }
    console.log(`\nDone! Total space saved: ${totalSaved.toFixed(2)} MB`);
}

compressImages();
