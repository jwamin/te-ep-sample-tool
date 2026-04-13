const { contextBridge, ipcRenderer } = require('electron')

let getPathForFile = null
try {
  const { webUtils } = require('electron/renderer')
  if (webUtils && typeof webUtils.getPathForFile === 'function') {
    getPathForFile = (file) => webUtils.getPathForFile(file)
  }
} catch (_) {
  try {
    const electron = require('electron')
    if (electron.webUtils) getPathForFile = (file) => electron.webUtils.getPathForFile(file)
  } catch (_) {}
}

contextBridge.exposeInMainWorld('tingConfig', {
  getPathForFile: (file) => (getPathForFile ? getPathForFile(file) : null),
  pickWav: () => ipcRenderer.invoke('ting-config:pick-wav'),
  saveJson: (jsonString) => ipcRenderer.invoke('ting-config:save-json', jsonString),
  exportPack: (payload) => ipcRenderer.invoke('ting-config:export-pack', payload),
  copyJson: (text) => ipcRenderer.invoke('ting-config:clipboard', text),
  openGuide: () => ipcRenderer.invoke('ting-config:open-guide')
})
