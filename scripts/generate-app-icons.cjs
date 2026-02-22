const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 使用 icon-source.png 作为源文件，避免被输出覆盖
const INPUT_ICON = path.join(__dirname, '../src-tauri/icons/icon-source.png');
const OUTPUT_DIR = path.join(__dirname, '../src-tauri/icons');
const ASSETS_ICON = path.join(__dirname, '../src/assets/icons/app-icon.png');

// 统一橙色（参考 Claude 图标色）
const ORANGE = { r: 217, g: 119, b: 87 };

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

// 从白底黑字的源图生成橙色透明图标
// 白色背景 → 透明，黑色/深色前景 → 橙色
async function makeOrangeTransparent(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8ClampedArray(data);

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    // 亮度判断：亮的是背景，暗的是 logo
    const brightness = (r + g + b) / 3;

    if (brightness > 200) {
      // 白色/浅色背景 → 透明
      pixels[i + 3] = 0;
    } else {
      // 深色前景（logo）→ 橙色，完全不透明
      pixels[i] = ORANGE.r;
      pixels[i + 1] = ORANGE.g;
      pixels[i + 2] = ORANGE.b;
      pixels[i + 3] = 255;
    }
  }

  return sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 }
  });
}

async function generateIcons() {
  console.log('🎨 Generating orange app icons...\n');

  const metadata = await sharp(INPUT_ICON).metadata();
  console.log(`📷 Source: ${INPUT_ICON}`);
  console.log(`   Size: ${metadata.width}x${metadata.height}`);
  console.log(`   Channels: ${metadata.channels} (${metadata.hasAlpha ? 'with alpha' : 'no alpha'})\n`);

  // 从源图生成橙色透明版本
  const orangeImage = await makeOrangeTransparent(INPUT_ICON);

  // 生成所有 PNG 尺寸图标
  console.log('📦 Generating PNG icons:\n');
  for (const { name, size } of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, name);
    const tmpPath = outputPath + '.tmp.png';
    await orangeImage
      .clone()
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(tmpPath);
    fs.renameSync(tmpPath, outputPath);
    console.log(`  ✓ ${name} (${size}x${size})`);
  }

  // 生成 ICO
  console.log('\n🪟 Generating ICO for Windows:\n');
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoBuffers = [];
  for (const sz of icoSizes) {
    const buf = await orangeImage
      .clone()
      .resize(sz, sz, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    icoBuffers.push({ size: sz, buffer: buf });
  }

  const icoPath = path.join(OUTPUT_DIR, 'icon.ico');
  writeIco(icoBuffers, icoPath);
  console.log('  ✓ icon.ico (multi-size: 16/24/32/48/64/128/256)');

  // About 页面图标
  console.log('\n📱 Updating app-icon.png:\n');
  await orangeImage
    .clone()
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(ASSETS_ICON);
  console.log('  ✓ app-icon.png (128x128)');

  console.log('\n✅ All icons generated!\n');
}

// 手动构造 ICO 文件
function writeIco(entries, outputPath) {
  const count = entries.length;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirSize = count * 16;
  const directory = Buffer.alloc(dirSize);

  let offset = 6 + dirSize;
  const imageBuffers = [];

  entries.forEach(({ size, buffer }, i) => {
    const base = i * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, base);
    directory.writeUInt8(size >= 256 ? 0 : size, base + 1);
    directory.writeUInt8(0, base + 2);
    directory.writeUInt8(0, base + 3);
    directory.writeUInt16LE(1, base + 4);
    directory.writeUInt16LE(32, base + 6);
    directory.writeUInt32LE(buffer.length, base + 8);
    directory.writeUInt32LE(offset, base + 12);
    offset += buffer.length;
    imageBuffers.push(buffer);
  });

  fs.writeFileSync(outputPath, Buffer.concat([header, directory, ...imageBuffers]));
}

generateIcons().catch(console.error);
