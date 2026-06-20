import { useState, useMemo } from 'react'
import { PileRecord, ArchiveBatch, naturalCompare } from '../types/pileRecord'

interface Props {
  records: PileRecord[]
  archiveBatches?: ArchiveBatch[]
  onSelectRecord: (id: string) => void
}

function LedgerView({ records, archiveBatches = [], onSelectRecord }: Props) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [machineFilter, setMachineFilter] = useState('')
  const [pileKeyword, setPileKeyword] = useState('')
  const [batchFilter, setBatchFilter] = useState('')

  const uniqueTeams = useMemo(() => {
    const s = new Set<string>()
    records.forEach(r => { if (r.constructionTeam) s.add(r.constructionTeam) })
    return Array.from(s).sort()
  }, [records])

  const uniqueMachines = useMemo(() => {
    const s = new Set<string>()
    records.forEach(r => { if (r.machineType) s.add(r.machineType) })
    return Array.from(s).sort()
  }, [records])

  const batchPileIds = useMemo(() => {
    if (!batchFilter) return null
    const b = archiveBatches.find(x => x.id === batchFilter)
    return b ? new Set(b.pileIds) : null
  }, [archiveBatches, batchFilter])

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (dateFrom && r.drillDate < dateFrom) return false
      if (dateTo && r.drillDate > dateTo) return false
      if (teamFilter && r.constructionTeam !== teamFilter) return false
      if (machineFilter && r.machineType !== machineFilter) return false
      if (pileKeyword && !r.pileNo.toLowerCase().includes(pileKeyword.toLowerCase())) return false
      if (batchPileIds && !batchPileIds.has(r.id)) return false
      return true
    }).sort((a, b) => {
      if (a.drillDate === b.drillDate) return naturalCompare(a.pileNo, b.pileNo)
      return a.drillDate.localeCompare(b.drillDate)
    })
  }, [records, dateFrom, dateTo, teamFilter, machineFilter, pileKeyword, batchPileIds])

  const stats = useMemo(() => {
    const total = filtered.length
    const totalVolume = filtered.reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0)
    const avgDepth = total > 0
      ? filtered.reduce((s, r) => s + (parseFloat(r.actualPileDepth) || 0), 0) / total
      : 0
    const totalRock = filtered.reduce((s, r) => s + (parseFloat(r.rockEntryDepth) || 0), 0)
    return { total, totalVolume, avgDepth, totalRock }
  }, [filtered])

  const handleReset = () => {
    setDateFrom('')
    setDateTo('')
    setTeamFilter('')
    setMachineFilter('')
    setPileKeyword('')
    setBatchFilter('')
  }

  const sortedBatches = useMemo(() => {
    return [...archiveBatches].sort((a, b) => b.exportedAt.localeCompare(a.exportedAt))
  }, [archiveBatches])

  const selectedBatch = batchFilter ? archiveBatches.find(b => b.id === batchFilter) : null

  return (
    <>
      {selectedBatch && (
        <div style={{ background: '#e6f4ff', border: '1px solid #91caff', padding: '10px 14px', borderRadius: '6px', margin: '12px 16px 0', fontSize: '13px' }}>
          <strong style={{ color: '#0958d9' }}>📋 批次回看：</strong>
          <span style={{ margin: '0 8px' }}>{selectedBatch.batchName}</span>
          {selectedBatch.reportDate && <span style={{ color: '#595959', marginRight: '8px' }}>报验日期：{selectedBatch.reportDate}</span>}
          <span style={{ color: '#595959', marginRight: '8px' }}>共 {selectedBatch.pileNos.length} 根桩</span>
          {selectedBatch.remarks && <span style={{ color: '#595959' }}>（{selectedBatch.remarks}）</span>}
        </div>
      )}
      <div className="ledger-toolbar">
        <label>
          施工日期
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            style={{ minWidth: '140px' }}
          />
        </label>
        <span style={{ color: '#8c8c8c' }}>至</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          style={{ minWidth: '140px' }}
        />

        <label>
          施工班组
          <select
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
          >
            <option value="">全部</option>
            {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label>
          钻机类型
          <select
            value={machineFilter}
            onChange={e => setMachineFilter(e.target.value)}
          >
            <option value="">全部</option>
            {uniqueMachines.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>

        <label>
          桩号
          <input
            type="text"
            placeholder="模糊搜索..."
            value={pileKeyword}
            onChange={e => setPileKeyword(e.target.value)}
            style={{ minWidth: '140px' }}
          />
        </label>

        <label>
          报验批次
          <select
            value={batchFilter}
            onChange={e => setBatchFilter(e.target.value)}
            style={{ minWidth: '170px' }}
          >
            <option value="">全部</option>
            {sortedBatches.map(b => (
              <option key={b.id} value={b.id}>
                {b.batchName}（{b.pileNos.length}根 · {b.reportDate || b.exportedAt.slice(0, 10)}）
              </option>
            ))}
          </select>
        </label>

        <div className="spacer" />

        <button className="btn btn-sm" onClick={handleReset}>重置筛选</button>
        <span style={{ color: '#595959', fontSize: '13px' }}>
          共 <strong style={{ color: '#1890ff' }}>{filtered.length}</strong> 条
        </span>
      </div>

      <div className="ledger-stats">
        <div className="stat-card">
          <div className="stat-label">总桩数</div>
          <div>
            <span className="stat-value">{stats.total}</span>
            <span className="stat-unit">根</span>
          </div>
        </div>
        <div className="stat-card secondary">
          <div className="stat-label">总灌注方量</div>
          <div>
            <span className="stat-value">{stats.totalVolume.toFixed(2)}</span>
            <span className="stat-unit">m³</span>
          </div>
        </div>
        <div className="stat-card tertiary">
          <div className="stat-label">平均桩长</div>
          <div>
            <span className="stat-value">{stats.avgDepth.toFixed(2)}</span>
            <span className="stat-unit">m</span>
          </div>
        </div>
        <div className="stat-card quaternary">
          <div className="stat-label">总入岩深度</div>
          <div>
            <span className="stat-value">{stats.totalRock.toFixed(2)}</span>
            <span className="stat-unit">m</span>
          </div>
        </div>
      </div>

      <div className="ledger-table-wrap">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>序号</th>
              <th>桩号</th>
              <th>钻孔日期</th>
              <th>施工班组</th>
              <th>钻机类型</th>
              <th>设计桩径</th>
              <th>实际桩长(m)</th>
              <th>入岩深度(m)</th>
              <th>混凝土等级</th>
              <th>方量(m³)</th>
              <th>灌注开始</th>
              <th>灌注结束</th>
              <th>记录员</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={13} className="empty-state-row">
                  暂无符合条件的记录，试试调整筛选条件
                </td>
              </tr>
            ) : filtered.map((r, idx) => (
              <tr key={r.id} onClick={() => onSelectRecord(r.id)} title="点击跳转到记录录入页继续编辑">
                <td>{idx + 1}</td>
                <td style={{ color: '#1890ff', fontWeight: 600 }}>{r.pileNo}</td>
                <td>{r.drillDate}</td>
                <td>{r.constructionTeam}</td>
                <td>{r.machineType}</td>
                <td>{r.designPileDiameter} mm</td>
                <td>{r.actualPileDepth}</td>
                <td>{r.rockEntryDepth}</td>
                <td>{r.concreteGrade}</td>
                <td style={{ fontWeight: 600 }}>{r.concreteVolume}</td>
                <td>{r.concreteStartDate} {r.concreteStartTime}</td>
                <td>{r.concreteEndDate} {r.concreteEndTime}</td>
                <td>{r.recorder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default LedgerView
