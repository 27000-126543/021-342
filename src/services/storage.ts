import { PileRecord } from '../types/pileRecord'

declare global {
  interface Window {
    electronAPI?: {
      saveRecords: (records: PileRecord[]) => Promise<any>
      loadRecords: () => Promise<any>
      showSaveDialog: (options: any) => Promise<any>
      printPage: () => Promise<void>
    }
  }
}

const STORAGE_KEY = 'pile-records'

export const storageService = {
  async saveRecords(records: PileRecord[]): Promise<boolean> {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.saveRecords(records)
        return result.success
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
        return true
      }
    } catch (error) {
      console.error('保存记录失败:', error)
      return false
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
}

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
