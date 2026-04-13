

const { app, BrowserWindow, nativeImage, Tray } = require('electron')
const path = require('node:path')
const { shell } = require('electron/common')
const { Menu } = require('electron/main')

const config = {
    url:"https://teenage.engineering/apps/ep-sample-tool",
    update:"https://teenage.engineering/apps/update",
    dx: 960,
    dy: 720,
    preloadjs:"preload.js",
    icon:"res/icon.png"
}

const DEVICE_GUIDES = [
  ['TP-7', 'tp-7'],
  ['OP-XY', 'op-xy'],
  ['EP-1320', 'ep-1320'],
  ['EP-133', 'ep-133'],
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



const template = [
  ...(process.platform === 'darwin'
    ? [{ role: 'appMenu' }]
    : []),
  { role: 'fileMenu', 
    submenu: [
      {
        label: 'Update Tool',
        click: async () => {
        const appIcon = nativeImage.createFromPath(config.icon);
          createWindow(appIcon, config.update)
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




app.whenReady().then(() => {
    console.log('Hello from Electron 👋');
    console.log(`Loading ${config.url}...`);
    console.log(navigator.userAgent);
    const appIcon = nativeImage.createFromPath(config.icon);
    app.dock?.setIcon(appIcon)
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
    createWindow(appIcon,config.url)
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) { 
            createWindow()
            
        }
        app.setAboutPanelOptions({
            iconPath:config.icon
        })
    })
    
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit()
        }
    })
    
    
    
})