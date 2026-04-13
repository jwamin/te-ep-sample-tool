const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  clipboard,
  Menu,
  shell
} = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')

const TING_GUIDE_EP2350 = 'https://teenage.engineering/guides/ep-2350'

const APP_ICON = app.isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked', 'res', 'icon.png') : path.join(__dirname, 'res', 'icon.png')

const config = {
  url: 'https://teenage.engineering/apps/ep-sample-tool',
  update: 'https://teenage.engineering/apps/update',
  dx: 960,
  dy: 720,
  preloadjs: 'preload.js'
}

/** @type {{ name: string, code: string, slug: string }[]} */
const DEVICE_GUIDES = [
  { name: 'TP-7 field recorder', code: 'TP-7', slug: 'tp-7' },
  { name: 'OP-XY', code: 'OP-XY', slug: 'op-xy' },
  { name: 'EP-1320', code: 'EP-1320', slug: 'ep-1320' },
  { name: 'EP-133', code: 'EP-133', slug: 'ep-133' },
  { name: 'EP-2350 ting', code: 'EP-2350', slug: 'ep-2350' },
  { name: 'TX-6', code: 'TX-6', slug: 'tx-6' },
  { name: 'CM-15', code: 'CM-15', slug: 'cm-15' },
  { name: 'OP-1 original', code: 'OP-1', slug: 'op-1/original' }
]

/** Menu label: prefer product name; add (code) only when the name does not already carry the code clearly. */
function deviceGuideMenuLabel ({ name, code }) {
  const n = String(name).trim()
  const c = String(code).trim()
  if (!c) return n
  const nl = n.toLowerCase()
  const cl = c.toLowerCase()
  if (nl === cl || nl.startsWith(`${cl} `)) return n
  return `${n} (${c})`
}

const createWindow = (url) => {
  const win = new BrowserWindow({
    width: config.dx,
    height: config.dy,
    webPreferences: {
      preload: path.join(__dirname, config.preloadjs)
    },
    icon: APP_ICON
  })

  win.loadURL(url)
}

let tingConfigWindow = null

function openTingConfigWindow () {
  if (tingConfigWindow && !tingConfigWindow.isDestroyed()) {
    tingConfigWindow.focus()
    return
  }
  tingConfigWindow = new BrowserWindow({
    width: 1040,
    height: 820,
    minWidth: 720,
    minHeight: 560,
    title: 'EP-2350 ting · config.json',
    webPreferences: {
      preload: path.join(__dirname, 'ting-config-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    icon: APP_ICON
  })
  tingConfigWindow.on('closed', () => {
    tingConfigWindow = null
  })
  tingConfigWindow.loadFile(path.join(__dirname, 'ting-config', 'index.html'))
}

const template = [
  ...(process.platform === 'darwin'
    ? [{ role: 'appMenu' }]
    : []),
  { role: 'fileMenu',
    submenu: [
      {
        label: 'Update Tool',
        click: async () => {
          createWindow(config.update)
        }
      },
      { type: 'separator' },
      {
        label: 'Ting EP-2350 config builder…',
        click: () => {
          openTingConfigWindow()
        }
      }
    ]},
  { role: 'editMenu' },
  { role: 'viewMenu' },
  { role: 'windowMenu' },
  {
    role: 'help',
    submenu: [
      {
        label: 'Device guides',
        submenu: DEVICE_GUIDES.map((g) => ({
          label: deviceGuideMenuLabel(g),
          click: () => {
            shell.openExternal(`https://teenage.engineering/guides/${g.slug}`)
          }
        }))
      }
    ]
  }
]

ipcMain.handle('ting-config:pick-wav', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const { canceled, filePaths } = await dialog.showOpenDialog(win || tingConfigWindow || undefined, {
    filters: [{ name: 'WAV', extensions: ['wav'] }],
    properties: ['openFile']
  })
  if (canceled || !filePaths?.[0]) return null
  return filePaths[0]
})

ipcMain.handle('ting-config:save-json', async (event, jsonString) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const { canceled, filePath } = await dialog.showSaveDialog(win || tingConfigWindow || undefined, {
    defaultPath: 'config.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (canceled || !filePath) return { ok: false }
  await fs.writeFile(filePath, jsonString, 'utf8')
  return { ok: true, filePath }
})

ipcMain.handle('ting-config:export-pack', async (event, { jsonString, files }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const { canceled, filePaths } = await dialog.showOpenDialog(win || tingConfigWindow || undefined, {
    title: 'Folder for config.json and 1.wav–4.wav',
    properties: ['openDirectory', 'createDirectory']
  })
  if (canceled || !filePaths?.[0]) return { ok: false }
  const dir = filePaths[0]
  await fs.writeFile(path.join(dir, 'config.json'), jsonString, 'utf8')
  const list = Array.isArray(files) ? files : []
  for (let i = 0; i < 4; i++) {
    const src = list[i]
    if (!src) continue
    await fs.copyFile(src, path.join(dir, `${i + 1}.wav`))
  }
  return { ok: true, dir }
})

ipcMain.handle('ting-config:clipboard', (_event, text) => {
  clipboard.writeText(text || '')
  return true
})

ipcMain.handle('ting-config:open-guide', () => {
  shell.openExternal(TING_GUIDE_EP2350)
  return true
})

app.whenReady().then(() => {
  console.log('Hello from Electron 👋')
  console.log(`Loading ${config.url}...`)
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  createWindow(config.url)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(config.url)
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
})
