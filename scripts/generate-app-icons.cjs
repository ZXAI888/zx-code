const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_ICON = path.join(__dirname, '../src-tauri/icons/icon.png');
const OUTPUT_DIR = path.join(__dirname, '../src-tauri/icons');

// 需要生成的图标尺寸
const SIZES = [
  { name: '32x32.png', size: 32 },
  { name: '64x64.png', size: 64 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
  // Windows Store logos
  { name: 'Square30x30Logo.png', size: 30 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square89x89Logo.png', size: 89 },
  { name: 'Square107x107Logo.png', size: 107 },
  { name: 'Square142x142Logo.png', size: 142 },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square284x284Logo.png', size: 284 },
  { name: 'Square310x310Logo.png', size: 310 },
  { name: 'StoreLogo.png', size: 50 },
];

async function generateIcons() {
  console.log('🎨 Generating app icons with transparency...\n');

  // 读取原始图标
  const image = sharp(INPUT_ICON);
  const metadata = await image.metadata();

  console.log(`📷 Input: ${INPUT_ICON}`);
  console.log(`   Size: ${metadata.width}x${metadata.height}`);
  console.log(`   Format: ${metadata.format}`);
  console.log(`   Channels: ${metadata.channels} (${metadata.hasAlpha ? 'with alpha' : 'no alpha'})\n`);

  // 如果没有 alpha 通道，需要移除背景
  let processedImage;
  if (!metadata.hasAlpha) {
    console.log('⚠️  No alpha channel detected, removing background...\n');

    // 移除白色或接近白色的背景
    processedImage = sharp(INPUT_ICON)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        const pixels = new Uint8ClampedArray(data);
        const threshold = 240; // 接近白色的阈值

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];

          // 如果是接近白色或黑色的像素，设为透明
          if ((r > threshold && g > threshold && b > threshold) ||
              (r < 15 && g < 15 && b < 15)) {
            pixels[i + 3] = 0; // 设置 alpha 为 0（透明）
          }
        }

        return sharp(pixels, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4
          }
        }).png();
      });
  } else {
    processedImage = sharp(INPUT_ICON);
  }

  // 生成所有尺寸的图标
  console.log('📦 Generating icons:\n');

  for (const { name, size } of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, name);

    await (await processedImage)
      .clone()
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);

    console.log(`  ✓ ${name} (${size}x${size})`);
  }

  console.log('\n✅ All PNG icons generated successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Generate ICO file: pnpm tauri icon src-tauri/icons/icon.png');
  console.log('   2. Test the icons in your app');
  console.log('   3. Commit and push the changes\n');
}

generateIcons().catch(console.error);
