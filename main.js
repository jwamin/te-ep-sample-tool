

const { app, BrowserWindow, nativeImage, Tray } = require('electron')
const path = require('node:path')

const config = {
    url:"https://teenage.engineering/apps/ep-sample-tool",
    dx: 960,
    dy: 720,
    preloadjs:"preload.js",
    icon:"res/icon.png"
}

const createWindow = (icon) => {
    
    const win = new BrowserWindow({
        width: config.dx,
        height: config.dy,
        webPreferences: {
            preload: path.join(__dirname, config.preloadjs)
        },
        icon: icon
    })
    
    win.loadURL(config.url);
}



app.whenReady().then(() => {
    console.log('Hello from Electron 👋');
    console.log(`Loading ${config.url}...`);
    console.log(navigator.userAgent);
    const appIcon = nativeImage.createFromPath(config.icon);
    app.dock?.setIcon(appIcon)
    
    createWindow(appIcon)
    
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