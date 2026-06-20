import { PileRecord, ProjectInfo, ArchiveBatch } from '../types/pileRecord'

declare global {
  interface Window {
    electronAPI?: {
      saveRecords: (records: PileRecord[]) => Promise<any>
      loadRecords: () => Promise<any>
      saveProjectInfo: (info: ProjectInfo) => Promise<any>
      loadProjectInfo: () => Promise<any>
      saveArchiveBatches: (batches: ArchiveBatch[]) => Promise<any>
      loadArchiveBatches: () => Promise<any>
      showSaveDialog: (options: any) => Promise<any>
      printPage: () => Promise<void>
    }
  }
}

const STORAGE_KEY = 'pile-records'
const PROJECT_KEY = 'project-info'
const BATCHES_KEY = 'archive-batches'

export const storageService = {
  async saveRecords(records: PileRecord[]): Promise<boolean> {
    try {
      if (window.electronAPI) {
        return window.electronAPI.saveRecords(records).then((r: any) => r.success)
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
        return Promise.resolve(true)
      }
    } catch (error) {
      console.error('保存记录失败:', error)
      return Promise.resolve(false)
    }
  },

  async loadRecords(): Promise<PileRecord[]> {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.loadRecords()
        if (result.success) {
          return result.data || []
        }
        return []
      } else {
        const data = localStorage.getItem(STORAGE_KEY)
        return data ? JSON.parse(data) : []
      }
    } catch (error) {
      console.error('加载记录失败:', error)
      return []
    }
  },

  async saveProjectInfo(info: ProjectInfo): Promise<boolean> {
    try {
      if (window.electronAPI) {
        return window.electronAPI.saveProjectInfo(info).then((r: any) => r.success)
      } else {
        localStorage.setItem(PROJECT_KEY, JSON.stringify(info))
        return Promise.resolve(true)
      }
    } catch (error) {
      console.error('保存项目信息失败:', error)
      return Promise.resolve(false)
    }
  },

  async loadProjectInfo(): Promise<ProjectInfo | null> {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.loadProjectInfo()
        if (result.success) {
          return result.data || null
        }
        return null
      } else {
        const data = localStorage.getItem(PROJECT_KEY)
        return data ? JSON.parse(data) : null
      }
    } catch (error) {
      console.error('加载项目信息失败:', error)
      return null
    }
  },

  async showSaveDialog(options: any): Promise<any> {
    if (window.electronAPI) {
      return window.electronAPI.showSaveDialog(options)
    }
    return { canceled: true }
  },

  async printPage(): Promise<void> {
    if (window.electronAPI) {
      return window.electronAPI.printPage()
    } else {
      window.print()
    }
  },

  async saveArchiveBatches(batches: ArchiveBatch[]): Promise<boolean> {
    try {
      if (window.electronAPI) {
        return window.electronAPI.saveArchiveBatches(batches).then((r: any) => r.success)
      } else {
        localStorage.setItem(BATCHES_KEY, JSON.stringify(batches))
        return Promise.resolve(true)
      }
    } catch (error) {
      console.error('保存归档批次失败:', error)
      return Promise.resolve(false)
    }
  },

  async loadArchiveBatches(): Promise<ArchiveBatch[]> {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.loadArchiveBatches()
        if (result.success) {
          return result.data || []
        }
        return []
      } else {
        const data = localStorage.getItem(BATCHES_KEY)
        return data ? JSON.parse(data) : []
      }
    } catch (error) {
      console.error('加载归档批次失败:', error)
      return []
    }
  },
}

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
