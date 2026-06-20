import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'

let mainWindow: BrowserWindow | null = null

const getDataPath = () => {
  const userDataPath = app.getPath('userData')
  const dataDir = join(userDataPath, 'data')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
  return join(dataDir, 'pile-records.json')
}

const getProjectInfoPath = () => {
  const userDataPath = app.getPath('userData')
  const dataDir = join(userDataPath, 'data')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
  return join(dataDir, 'project-info.json')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '桩基施工记录系统',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('save-records', async (_event, records) => {
  try {
    const filePath = getDataPath()
    writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8')
    return { success: true }
  } catch (error: any) {
    console.error('保存记录失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('load-records', async () => {
  try {
    const filePath = getDataPath()
    if (existsSync(filePath)) {
      const data = readFileSync(filePath, 'utf-8')
      return { success: true, data: JSON.parse(data) }
    }
    return { success: true, data: [] }
  } catch (error: any) {
    console.error('加载记录失败:', error)
    return { success: false, error: error.message, data: [] }
  }
})

ipcMain.handle('save-file-dialog', async (_event, options) => {
  if (!mainWindow) return { canceled: true }
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options.title || '保存文件',
    defaultPath: options.defaultPath || 'export',
    filters: options.filters || [],
  })
  return result
})

ipcMain.handle('print-current-page', async () => {
  if (mainWindow) {
    mainWindow.webContents.print({
      silent: false,
      printBackground: true,
    })
  }
})

ipcMain.handle('save-project-info', async (_event, info) => {
  try {
    const filePath = getProjectInfoPath()
    writeFileSync(filePath, JSON.stringify(info, null, 2), 'utf-8')
    return { success: true }
  } catch (error: any) {
    console.error('保存项目信息失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('load-project-info', async () => {
  try {
    const filePath = getProjectInfoPath()
    if (existsSync(filePath)) {
      const data = readFileSync(filePath, 'utf-8')
      return { success: true, data: JSON.parse(data) }
    }
    return { success: true, data: null }
  } catch (error: any) {
    console.error('加载项目信息失败:', error)
    return { success: false, error: error.message, data: null }
  }
})
