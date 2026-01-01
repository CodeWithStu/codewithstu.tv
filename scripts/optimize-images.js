import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const staticDir = join(__dirname, '..', 'static');

const sizes = [100, 200, 400];

async function optimizeImages() {
  const inputPath = join(staticDir, 'profile.png');

  for (const size of sizes) {
    // Generate WebP
    await sharp(inputPath)
      .resize(size, size)
      .webp({ quality: 85 })
      .toFile(join(staticDir, `profile-${size}w.webp`));

    // Generate PNG fallback
    await sharp(inputPath)
      .resize(size, size)
      .png({ quality: 85, compressionLevel: 9 })
      .toFile(join(staticDir, `profile-${size}w.png`));

    console.log(`Generated ${size}x${size} images`);
  }

  console.log('Image optimization complete');
}

optimizeImages().catch(console.error);
