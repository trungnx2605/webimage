#!/usr/bin/env node

/**
 * Thumbnail Generation Script
 * This script helps generate optimized thumbnails for your background images
 * 
 * Usage: node generate-thumbnails.js
 * 
 * Requirements:
 * npm install sharp fs-extra
 */

const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

const config = {
  inputDir: './image',
  outputDir: './image/thumb',
  sizes: [
    { width: 80, height: 80, suffix: '' },        // 1x (80x80px)
    { width: 160, height: 160, suffix: '@2x' }    // 2x (160x160px for retina)
  ],
  formats: ['jpg', 'webp', 'avif'],
  quality: {
    jpg: 85,
    webp: 80,
    avif: 70
  }
};

async function generateThumbnails() {
  try {
    // Ensure output directory exists
    await fs.ensureDir(config.outputDir);
    
    // Get all image files from input directory
    const files = await fs.readdir(config.inputDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });

    console.log(`📸 Found ${imageFiles.length} images to process`);
    console.log(`🎯 Output directory: ${config.outputDir}`);
    console.log(`📐 Generating sizes: ${config.sizes.map(s => `${s.width}x${s.height}${s.suffix}`).join(', ')}`);
    console.log(`🎨 Formats: ${config.formats.join(', ')}`);
    console.log('');

    let totalProcessed = 0;
    const startTime = Date.now();

    for (const file of imageFiles) {
      const basename = path.parse(file).name;
      const inputPath = path.join(config.inputDir, file);
      
      console.log(`🔄 Processing: ${file}`);

      for (const size of config.sizes) {
        for (const format of config.formats) {
          const outputFilename = `${basename}${size.suffix}.${format}`;
          const outputPath = path.join(config.outputDir, outputFilename);

          try {
            let pipeline = sharp(inputPath)
              .resize(size.width, size.height, {
                fit: 'cover',
                position: 'center'
              });

            // Apply format-specific options
            switch (format) {
              case 'jpg':
              case 'jpeg':
                pipeline = pipeline.jpeg({ 
                  quality: config.quality.jpg,
                  progressive: true,
                  mozjpeg: true
                });
                break;
              case 'webp':
                pipeline = pipeline.webp({ 
                  quality: config.quality.webp,
                  effort: 6
                });
                break;
              case 'avif':
                pipeline = pipeline.avif({ 
                  quality: config.quality.avif,
                  effort: 4
                });
                break;
            }

            await pipeline.toFile(outputPath);
            
            // Get file size for reporting
            const stats = await fs.stat(outputPath);
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
            
            console.log(`  ✅ ${outputFilename} (${sizeMB}MB)`);
            totalProcessed++;
            
          } catch (error) {
            console.log(`  ❌ Failed: ${outputFilename} - ${error.message}`);
          }
        }
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('');
    console.log(`🎉 Complete! Generated ${totalProcessed} thumbnails in ${duration}s`);
    console.log(`📁 Thumbnails saved to: ${config.outputDir}`);
    
    // Calculate potential savings
    const originalSizes = await Promise.all(
      imageFiles.map(async file => {
        const stats = await fs.stat(path.join(config.inputDir, file));
        return stats.size;
      })
    );
    const totalOriginalSize = originalSizes.reduce((sum, size) => sum + size, 0);
    
    const thumbFiles = await fs.readdir(config.outputDir);
    const thumbSizes = await Promise.all(
      thumbFiles.map(async file => {
        const stats = await fs.stat(path.join(config.outputDir, file));
        return stats.size;
      })
    );
    const totalThumbSize = thumbSizes.reduce((sum, size) => sum + size, 0);
    
    const savings = ((totalOriginalSize - totalThumbSize) / totalOriginalSize * 100).toFixed(1);
    console.log(`💾 Size reduction: ${(totalOriginalSize / 1024 / 1024).toFixed(1)}MB → ${(totalThumbSize / 1024 / 1024).toFixed(1)}MB (${savings}% smaller)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Performance testing function
async function benchmarkFormats() {
  const testImage = path.join(config.inputDir, '1.jpg');
  
  if (!await fs.pathExists(testImage)) {
    console.log('⚠️  Test image not found, skipping benchmark');
    return;
  }

  console.log('\n🏃‍♂️ Benchmarking formats...');
  
  const results = [];
  
  for (const format of config.formats) {
    const start = Date.now();
    const tempPath = `temp-test.${format}`;
    
    try {
      let pipeline = sharp(testImage).resize(80, 80, { fit: 'cover' });
      
      switch (format) {
        case 'jpg':
          pipeline = pipeline.jpeg({ quality: config.quality.jpg });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality: config.quality.webp });
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality: config.quality.avif });
          break;
      }
      
      await pipeline.toFile(tempPath);
      const stats = await fs.stat(tempPath);
      const duration = Date.now() - start;
      
      results.push({
        format,
        size: (stats.size / 1024).toFixed(1) + 'KB',
        time: duration + 'ms'
      });
      
      await fs.remove(tempPath);
      
    } catch (error) {
      results.push({
        format,
        size: 'Error',
        time: error.message
      });
    }
  }
  
  console.table(results);
}

if (require.main === module) {
  console.log('🖼️  Background Image Thumbnail Generator');
  console.log('=====================================\n');
  
  generateThumbnails()
    .then(() => benchmarkFormats())
    .catch(console.error);
}

module.exports = { generateThumbnails, config }; 