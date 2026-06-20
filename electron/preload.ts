import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveRecords: (records: any[]) => ipcRenderer.invoke('save-records', records),
  loadRecords: () => ipcRenderer.invoke('load-records'),
  showSaveDialog: (options: any) => ipcRenderer.invoke('save-file-dialog', options),
  printPage: () => ipcRenderer.invoke('print-current-page'),
})
