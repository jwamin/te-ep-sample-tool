const {
  app,
  BrowserWindow,
  nativeImage,
  Tray,
  ipcMain,
  dialog,
  clipboard,
  Menu,
  shell
} = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')

const TING_GUIDE_EP2350 = 'https://teenage.engineering/guides/ep-2350'

const config = {
  url: 'https://teenage.engineering/apps/ep-sample-tool',
  update: 'https://teenage.engineering/apps/update',
  dx: 960,
  dy: 720,
  preloadjs: 'preload.js',
  icon: 'res/icon.png'
}

const DEVICE_GUIDES = [
  ['TP-7', 'tp-7'],
  ['OP-XY', 'op-xy'],
  ['EP-1320', 'ep-1320'],
  ['EP-133', 'ep-133'],
  ['EP-2350', 'ep-2350'],
  ['TX-6', 'tx-6'],
  ['CM-15', 'cm-15']
]

const createWindow = (icon,url) => {
    
    const win = new BrowserWindow({
        width: config.dx,
        height: config.dy,
        webPreferences: {
            preload: path.join(__dirname, config.preloadjs)
        },
        icon: icon
    })
    
    win.loadURL(url);
}

let tingConfigWindow = null

function openTingConfigWindow (appIcon) {
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
    icon: appIcon
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
          const appIcon = nativeImage.createFromPath(config.icon)
          createWindow(appIcon, config.update)
        }
      },
      { type: 'separator' },
      {
        label: 'Ting EP-2350 config builder…',
        click: () => {
          openTingConfigWindow(nativeImage.createFromPath(config.icon))
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
        submenu: DEVICE_GUIDES.map(([label, slug]) => ({
          label,
          click: () => {
            shell.openExternal(`https://teenage.engineering/guides/${slug}`)
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
  const appIcon = nativeImage.createFromPath(config.icon)
  app.dock?.setIcon(appIcon)
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  createWindow(appIcon, config.url)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(appIcon, config.url)
    }
    app.setAboutPanelOptions({
      iconPath: config.icon
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
})