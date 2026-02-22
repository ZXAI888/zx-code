const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_ICON = path.join(__dirname, '../src-tauri/icons/icon.png');
const OUTPUT_DIR = path.join(__dirname, '../src-tauri/icons');
const ASSETS_ICON = path.join(__dirname, '../src/assets/icons/app-icon.png');

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

// 处理原始图标：确保有透明通道，移除白色/黑色背景
async function prepareTransparentImage(inputPath) {
  const metadata = await sharp(inputPath).metadata();

  if (!metadata.hasAlpha) {
    console.log('⚠️  No alpha channel detected, removing background...\n');
    const { data, info } = await sharp(inputPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Uint8ClampedArray(data);
    const threshold = 240;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      if ((r > threshold && g > threshold && b > threshold) ||
          (r < 15 && g < 15 && b < 15)) {
        pixels[i + 3] = 0;
      }
    }

    return sharp(Buffer.from(pixels), {
      raw: { width: info.width, height: info.height, channels: 4 }
    });
  }

  return sharp(inputPath);
}

// 生成白色前景版本（透明背景，所有不透明像素变为白色）
// 用于 Windows 任务栏深色模式下图标可见
async function makeWhiteVersion(baseImage) {
  const { data, info } = await baseImage
    .clone()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8ClampedArray(data);

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha > 0) {
      // 保留透明度，将颜色替换为白色
      pixels[i] = 255;     // R
      pixels[i + 1] = 255; // G
      pixels[i + 2] = 255; // B
    }
  }

  return sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 }
  });
}

async function generateIcons() {
  console.log('🎨 Generating app icons with transparency...\n');

  const metadata = await sharp(INPUT_ICON).metadata();
  console.log(`📷 Input: ${INPUT_ICON}`);
  console.log(`   Size: ${metadata.width}x${metadata.height}`);
  console.log(`   Format: ${metadata.format}`);
  console.log(`   Channels: ${metadata.channels} (${metadata.hasAlpha ? 'with alpha' : 'no alpha'})\n`);

  // 准备透明底图
  const baseImage = await prepareTransparentImage(INPUT_ICON);

  // 生成所有 PNG 尺寸图标
  console.log('📦 Generating PNG icons:\n');
  for (const { name, size } of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, name);
    const tmpPath = outputPath + '.tmp.png';
    await baseImage
      .clone()
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(tmpPath);
    fs.renameSync(tmpPath, outputPath);
    console.log(`  ✓ ${name} (${size}x${size})`);
  }

  // 生成白色版本的 ICO（用于 Windows 深色模式任务栏/标题栏）
  console.log('\n🪟 Generating white ICO for Windows dark theme:\n');
  const whiteImage = await makeWhiteVersion(baseImage);
  // 以 256x256 PNG 写入临时文件，再由 Tauri CLI 打包为 ICO
  // 注意：Tauri CLI 负责最终 ICO 的打包，这里只替换 icon.png 为白色版本后调用 CLI 会覆盖所有图标
  // 所以改为：先生成白色 PNG 临时文件，再用 sharp 的多分辨率输出写 ICO
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoBuffers = [];
  for (const sz of icoSizes) {
    const buf = await whiteImage
      .clone()
      .resize(sz, sz, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    icoBuffers.push({ size: sz, buffer: buf });
  }

  // 手动写 ICO 格式（支持多分辨率 + alpha 通道）
  const icoPath = path.join(OUTPUT_DIR, 'icon.ico');
  writeIco(icoBuffers, icoPath);
  console.log('  ✓ icon.ico (white, multi-size: 16/24/32/48/64/128/256)');

  // 同步更新 About 页面用的 app-icon.png（用透明版本的 128x128）
  console.log('\n📱 Updating src/assets/icons/app-icon.png:\n');
  await baseImage
    .clone()
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(ASSETS_ICON);
  console.log('  ✓ app-icon.png (128x128, transparent)');

  console.log('\n✅ All icons generated successfully!\n');
}

// 手动构造 ICO 文件（包含多分辨率 PNG 图像 + alpha 通道）
function writeIco(entries, outputPath) {
  const count = entries.length;

  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Type: 1 = ICO
  header.writeUInt16LE(count, 4); // Image count

  // Directory: 16 bytes per entry
  const dirSize = count * 16;
  const directory = Buffer.alloc(dirSize);

  // Image data starts after header + directory
  let offset = 6 + dirSize;
  const imageBuffers = [];

  entries.forEach(({ size, buffer }, i) => {
    const base = i * 16;
    // Width/height: 0 means 256
    directory.writeUInt8(size >= 256 ? 0 : size, base);
    directory.writeUInt8(size >= 256 ? 0 : size, base + 1);
    directory.writeUInt8(0, base + 2);   // Color count (0 for >8bpp)
    directory.writeUInt8(0, base + 3);   // Reserved
    directory.writeUInt16LE(1, base + 4); // Color planes
    directory.writeUInt16LE(32, base + 6); // Bits per pixel
    directory.writeUInt32LE(buffer.length, base + 8); // Image size
    directory.writeUInt32LE(offset, base + 12);       // Offset
    offset += buffer.length;
    imageBuffers.push(buffer);
  });

  fs.writeFileSync(outputPath, Buffer.concat([header, directory, ...imageBuffers]));
}

generateIcons().catch(console.error);
