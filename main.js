

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
    role: 'help'
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