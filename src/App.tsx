import { useState, useEffect, useRef } from 'react'
import RecordEntry from './components/RecordEntry'
import DataExport from './components/DataExport'
import { PileRecord } from './types/pileRecord'
import { storageService } from './services/storage'

type TabType = 'entry' | 'export'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('entry')
  const [records, setRecords] = useState<PileRecord[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadData = async () => {
      const data = await storageService.loadRecords()
      setRecords(data)
      setIsLoaded(true)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (isLoaded) {
      storageService.saveRecords(records)
    }
  }, [records, isLoaded])

  const handleSaveRecord = (record: PileRecord) => {
    setRecords(prev => {
      const index = prev.findIndex(r => r.id === record.id)
      if (index >= 0) {
        const updated = [...prev]
        updated[index] = record
        return updated
      } else {
        return [...prev, record]
      }
    })
  }

  const handleDeleteRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  const handleExportData = () => {
    const dataStr = JSON.stringify(records, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `桩基记录备份_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (Array.isArray(data)) {
          if (confirm(`确定要导入 ${data.length} 条记录吗？\n这将与现有数据合并。`)) {
            const existingIds = new Set(records.map(r => r.id))
            const newRecords = data.filter(r => !existingIds.has(r.id))
            setRecords(prev => [...prev, ...newRecords])
            alert(`成功导入 ${newRecords.length} 条新记录`)
          }
        } else {
          alert('文件格式不正确')
        }
      } catch (err) {
        alert('导入失败：文件格式错误')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-title">
          <h1>桩基施工记录系统</h1>
          <span className="app-subtitle">离线版 · 资料员专用</span>
        </div>
        <nav className="app-nav">
          <button
            className={`nav-btn ${activeTab === 'entry' ? 'active' : ''}`}
            onClick={() => setActiveTab('entry')}
          >
            记录录入
          </button>
          <button
            className={`nav-btn ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            资料导出
          </button>
        </nav>
        <div className="app-header-actions">
          <button className="header-btn" onClick={handleExportData} title="备份所有数据">
            💾 备份
          </button>
          <button className="header-btn" onClick={handleImportClick} title="从备份恢复">
            📂 恢复
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={handleImportData}
          />
          <div className="app-stats">
            已录入 <strong>{records.length}</strong> 根桩
          </div>
        </div>
      </header>

      <main className="app-main">
        {activeTab === 'entry' ? (
          <RecordEntry
            records={records}
            onSave={handleSaveRecord}
            onDelete={handleDeleteRecord}
          />
        ) : (
          <DataExport records={records} />
        )}
      </main>
    </div>
  )
}

export default App
