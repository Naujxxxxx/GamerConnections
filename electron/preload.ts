import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  saveFile: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke('show-save-dialog', options),
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-action', (_, action) => callback(action))
  }
})

declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>
      saveFile: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>
      onMenuAction: (callback: (action: string) => void) => void
    }
  }
}