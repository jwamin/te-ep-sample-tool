/**
 * Pre-renders committed icon assets from res/icon.svg (build-time only).
 * - res/icon.png + res/icon@2x.png — window icon (Electron accepts string path + @2x sibling)
 * - res/icon.icns — macOS .app bundle (iconutil)
 */
const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

let sharp
try {
  sharp = require('sharp')
} catch {
  console.error('Install sharp: npm install')
  process.exit(1)
}

const root = path.join(__dirname, '..')
const res = path.join(root, 'res')
const svgPath = path.join(res, 'icon.svg')
const iconset = path.join(res, 'icon.iconset')

const SIZES = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024]
]

async function main () {
  const svg = fs.readFileSync(svgPath)

  await sharp(svg).resize(512, 512).png().toFile(path.join(res, 'icon.png'))
  await sharp(svg).resize(1024, 1024).png().toFile(path.join(res, 'icon@2x.png'))
  console.log('Wrote res/icon.png (512) and res/icon@2x.png (1024)')

  if (process.platform !== 'darwin') {
    console.warn('Skipping .icns (iconutil is macOS-only).')
    return
  }

  fs.rmSync(iconset, { recursive: true, force: true })
  fs.mkdirSync(iconset, { recursive: true })

  for (const [filename, px] of SIZES) {
    await sharp(svg)
      .resize(px, px)
      .png()
      .toFile(path.join(iconset, filename))
  }

  const icnsOut = path.join(res, 'icon.icns')
  execSync(`iconutil -c icns "${iconset}" -o "${icnsOut}"`, { stdio: 'inherit' })
  console.log('Wrote res/icon.icns')

  fs.rmSync(iconset, { recursive: true, force: true })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
