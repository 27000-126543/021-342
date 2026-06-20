import { useState, useEffect, useRef } from 'react'
import RecordEntry from './components/RecordEntry'
import DataExport from './components/DataExport'
import ProjectInfoModal from './components/ProjectInfoModal'
import { PileRecord, ProjectInfo, defaultProjectInfo } from './types/pileRecord'
import { storageService } from './services/storage'

type TabType = 'entry' | 'ledger' | 'export'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('entry')
  const [records, setRecords] = useState<PileRecord[]>([])
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(defaultProjectInfo)
  const [isLoaded, setIsLoaded] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadData = async () => {
      const [recordsData, projectData] = await Promise.all([
        storageService.loadRecords(),
        storageService.loadProjectInfo(),
      ])
      setRecords(recordsData)
      if (projectData) {
        setProjectInfo(projectData)
      }
      setIsLoaded(true)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (isLoaded) {
      storageService.saveRecords(records)
    }
  }, [records, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      storageService.saveProjectInfo(projectInfo)
    }
  }, [projectInfo, isLoaded])

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

  const handleSelectRecord = (id: string) => {
    setActiveRecordId(id)
    setActiveTab('entry')
  }

  const handleSaveProjectInfo = (info: ProjectInfo) => {
    setProjectInfo(info)
    setShowProjectModal(false)
    alert('项目信息已保存，导出资料将自动带出。')
  }

  const handleExportData = () => {
    const exportObj = {
      projectInfo,
      records,
      exportedAt: new Date().toISOString(),
      version: 1,
    }
    const dataStr = JSON.stringify(exportObj, null, 2)
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
        const parsed = JSON.parse(e.target?.result as string)
        let importedRecords: PileRecord[] = []
        let importedProject: ProjectInfo | null = null

        if (parsed && Array.isArray(parsed.records)) {
          importedRecords = parsed.records
          if (parsed.projectInfo) importedProject = parsed.projectInfo
        } else if (Array.isArray(parsed)) {
          importedRecords = parsed
        }

        if (importedRecords.length > 0) {
          if (confirm(`确定要导入 ${importedRecords.length} 条记录吗？\n这将与现有数据合并。`)) {
            const existingIds = new Set(records.map(r => r.id))
            const newRecords = importedRecords.filter(r => !existingIds.has(r.id))
            setRecords(prev => [...prev, ...newRecords])
            if (importedProject && !projectInfo.projectName) {
              setProjectInfo(importedProject)
            }
            alert(`成功导入 ${newRecords.length} 条新记录`)
          }
        } else {
          alert('文件中没有可导入的记录')
        }
      } catch (err) {
        alert('导入失败：文件格式错误')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const needProjectSetup = !projectInfo.projectName || !projectInfo.constructionUnit

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
            className={`nav-btn ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            施工台账
          </button>
          <button
            className={`nav-btn ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            资料导出
          </button>
        </nav>
        <div className="app-header-actions">
          <button
            className="header-btn"
            onClick={() => setShowProjectModal(true)}
            title="工程名称、施工单位、监理单位等基础信息"
          >
            🏗 项目信息{needProjectSetup && <span style={{ color: '#ff4d4f' }}>*</span>}
          </button>
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

      {needProjectSetup && (
        <div className="tips-box no-print" style={{ borderRadius: 0, margin: 0, border: 'none', borderBottom: '1px solid #ffe58f' }}>
          <span className="icon">💡</span>
          <div>
            还未设置项目基础信息（工程名称、施工/监理单位等）。
            <button className="btn btn-link" style={{ color: '#1890ff', padding: '0 4px' }} onClick={() => setShowProjectModal(true)}>
              立即填写
            </button>
            （导出资料会自动带出这些信息）
          </div>
        </div>
      )}

      <main className="app-main">
        {activeTab === 'entry' && (
          <RecordEntry
            records={records}
            onSave={handleSaveRecord}
            onDelete={handleDeleteRecord}
            activeRecordId={activeRecordId}
          />
        )}
        {activeTab === 'ledger' && (
          <div className="form-section" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="section-title">施工台账</div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <LedgerView
                records={records}
                onSelectRecord={handleSelectRecord}
              />
            </div>
          </div>
        )}
        {activeTab === 'export' && (
          <DataExport
            records={records}
            projectInfo={projectInfo}
          />
        )}
      </main>

      <ProjectInfoModal
        visible={showProjectModal}
        initialValue={projectInfo}
        onClose={() => setShowProjectModal(false)}
        onSave={handleSaveProjectInfo}
      />
    </div>
  )
}

import LedgerView from './components/LedgerView'
export default App
