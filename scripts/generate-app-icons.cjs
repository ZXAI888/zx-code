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

  // 生成 ICNS (macOS)
  console.log('\n🍎 Generating ICNS for macOS:\n');
  const icnsSizes = [
    { tag: 'ic07', size: 128 },
    { tag: 'ic08', size: 256 },
    { tag: 'ic09', size: 512 },
    { tag: 'ic10', size: 1024 },
    { tag: 'ic11', size: 32 },
    { tag: 'ic12', size: 64 },
    { tag: 'ic13', size: 256 },
    { tag: 'ic14', size: 512 },
  ];
  const icnsEntries = [];
  for (const { tag, size } of icnsSizes) {
    const buf = await orangeImage
      .clone()
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    icnsEntries.push({ tag, buffer: buf });
  }
  const icnsPath = path.join(OUTPUT_DIR, 'icon.icns');
  writeIcns(icnsEntries, icnsPath);
  console.log('  ✓ icon.icns (ic07/ic08/ic09/ic10/ic11/ic12/ic13/ic14)');

  // 生成 Android 图标
  console.log('\n🤖 Generating Android icons:\n');
  const androidDensities = [
    { folder: 'mipmap-mdpi',    size: 48 },
    { folder: 'mipmap-hdpi',    size: 72 },
    { folder: 'mipmap-xhdpi',   size: 96 },
    { folder: 'mipmap-xxhdpi',  size: 144 },
    { folder: 'mipmap-xxxhdpi', size: 192 },
  ];
  for (const { folder, size } of androidDensities) {
    const dir = path.join(OUTPUT_DIR, 'android', folder);
    fs.mkdirSync(dir, { recursive: true });
    for (const name of ['ic_launcher.png', 'ic_launcher_foreground.png', 'ic_launcher_round.png']) {
      const outPath = path.join(dir, name);
      const tmp = outPath + '.tmp.png';
      await orangeImage
        .clone()
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(tmp);
      fs.renameSync(tmp, outPath);
    }
    console.log(`  ✓ android/${folder}/ (${size}x${size})`);
  }

  // 生成 iOS 图标
  console.log('\n📱 Generating iOS icons:\n');
  const iosDir = path.join(OUTPUT_DIR, 'ios');
  fs.mkdirSync(iosDir, { recursive: true });
  // 解析已有文件名，按尺寸和倍率生成
  const iosIcons = [
    'AppIcon-20x20@1x.png',
    'AppIcon-20x20@2x.png',
    'AppIcon-20x20@2x-1.png',
    'AppIcon-20x20@3x.png',
    'AppIcon-29x29@1x.png',
    'AppIcon-29x29@2x.png',
    'AppIcon-29x29@2x-1.png',
    'AppIcon-29x29@3x.png',
    'AppIcon-40x40@1x.png',
    'AppIcon-40x40@2x.png',
    'AppIcon-40x40@2x-1.png',
    'AppIcon-40x40@3x.png',
    'AppIcon-50x50@1x.png',
    'AppIcon-50x50@2x.png',
    'AppIcon-512@2x.png',
    'AppIcon-57x57@1x.png',
    'AppIcon-57x57@2x.png',
    'AppIcon-60x60@2x.png',
    'AppIcon-60x60@3x.png',
    'AppIcon-72x72@1x.png',
    'AppIcon-72x72@2x.png',
    'AppIcon-76x76@1x.png',
    'AppIcon-76x76@2x.png',
    'AppIcon-83.5x83.5@2x.png',
  ];
  for (const filename of iosIcons) {
    const px = parseIosIconSize(filename);
    const outPath = path.join(iosDir, filename);
    const tmp = outPath + '.tmp.png';
    await orangeImage
      .clone()
      .resize(px, px, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(tmp);
    fs.renameSync(tmp, outPath);
    console.log(`  ✓ ios/${filename} (${px}x${px})`);
  }

  console.log('\n✅ All icons generated!\n');
}

// 解析 iOS 图标文件名中的实际像素尺寸
// AppIcon-WxH@Nx[-1].png → W * N (取整)
// AppIcon-512@2x.png → 512 * 2 = 1024
function parseIosIconSize(filename) {
  // 特殊格式：AppIcon-512@2x.png
  let m = filename.match(/AppIcon-(\d+(?:\.\d+)?)@(\d+)x/);
  if (m && !filename.match(/AppIcon-\d+x\d+/)) {
    return Math.round(parseFloat(m[1]) * parseInt(m[2]));
  }
  // 标准格式：AppIcon-WxH@Nx.png
  m = filename.match(/AppIcon-(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)@(\d+)x/);
  if (m) {
    return Math.round(parseFloat(m[1]) * parseInt(m[3]));
  }
  throw new Error(`Cannot parse iOS icon size from: ${filename}`);
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

// 手动构造 ICNS 文件（macOS 图标格式）
function writeIcns(entries, outputPath) {
  const chunks = [];
  for (const { tag, buffer } of entries) {
    // 每个 chunk: 4字节tag + 4字节长度(含header 8字节) + PNG数据
    const tagBuf = Buffer.from(tag, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(8 + buffer.length, 0);
    chunks.push(tagBuf, lenBuf, buffer);
  }
  const body = Buffer.concat(chunks);
  // ICNS 文件头: magic 'icns' + 4字节总长度
  const header = Buffer.alloc(8);
  header.write('icns', 0, 'ascii');
  header.writeUInt32BE(8 + body.length, 4);
  fs.writeFileSync(outputPath, Buffer.concat([header, body]));
}

generateIcons().catch(console.error);
