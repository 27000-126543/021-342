import { useState, useMemo, useRef } from 'react'
import { PileRecord } from '../types/pileRecord'
import { storageService } from '../services/storage'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'

interface DataExportProps {
  records: PileRecord[]
}

type TabType = 'single' | 'concrete' | 'daily'

function DataExport({ records }: DataExportProps) {
  const [activeTab, setActiveTab] = useState<TabType>('single')
  const [selectedPileId, setSelectedPileId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [isExporting, setIsExporting] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => a.pileNo.localeCompare(b.pileNo))
  }, [records])

  const selectedRecord = useMemo(() => {
    return records.find(r => r.id === selectedPileId) || null
  }, [records, selectedPileId])

  const dailyRecords = useMemo(() => {
    return records
      .filter(r => r.drillDate === selectedDate)
      .sort((a, b) => a.pileNo.localeCompare(b.pileNo))
  }, [records, selectedDate])

  const canExport = useMemo(() => {
    if (activeTab === 'single') return !!selectedRecord
    if (activeTab === 'concrete') return sortedRecords.length > 0
    if (activeTab === 'daily') return dailyRecords.length > 0
    return false
  }, [activeTab, selectedRecord, sortedRecords, dailyRecords])

  const getEmptyTip = (): string => {
    if (activeTab === 'single' && !selectedRecord) return '请先选择桩号再导出'
    if (activeTab === 'concrete' && sortedRecords.length === 0) return '暂无灌注记录'
    if (activeTab === 'daily' && dailyRecords.length === 0) return '该日期无施工记录'
    return ''
  }

  const handlePrint = () => {
    if (!canExport) {
      alert(getEmptyTip())
      return
    }
    storageService.printPage()
  }

  const getExportFileName = (): string => {
    const dateStr = new Date().toISOString().split('T')[0]
    if (activeTab === 'single' && selectedRecord) {
      return `单桩施工记录_${selectedRecord.pileNo}_${dateStr}`
    } else if (activeTab === 'concrete') {
      return `混凝土灌注记录_${dateStr}`
    } else {
      return `桩基施工日汇总表_${selectedDate}`
    }
  }

  const handleExportPDF = async () => {
    if (!canExport) {
      alert(getEmptyTip())
      return
    }
    if (!printRef.current) return

    setIsExporting(true)
    try {
      const element = printRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = canvas.width
      const imgHeight = canvas.height

      const pdfWidth = 210
      const pdfHeight = 297
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 10

      let heightLeft = imgHeight * ratio
      let position = imgY

      const pdf = new jsPDF('p', 'mm', 'a4')
      pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio)
      heightLeft -= (pdfHeight - 20)

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight * ratio + 10
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio)
        heightLeft -= (pdfHeight - 20)
      }

      pdf.save(`${getExportFileName()}.pdf`)
    } catch (err) {
      console.error('PDF导出失败:', err)
      alert('PDF导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportExcel = () => {
    if (!canExport) {
      alert(getEmptyTip())
      return
    }

    const wb = XLSX.utils.book_new()

    if (activeTab === 'single' && selectedRecord) {
      const data = [
        ['桩基施工记录'],
        [],
        ['桩号', selectedRecord.pileNo, '', '钻孔日期', selectedRecord.drillDate],
        ['施工班组', selectedRecord.constructionTeam, '', '记录员', selectedRecord.recorder],
        ['钻机类型', selectedRecord.machineType, '', '钻机编号', selectedRecord.machineNo],
        ['设计桩径(mm)', selectedRecord.designPileDiameter, '', '设计桩长(m)', selectedRecord.designPileDepth],
        ['实际桩长(m)', selectedRecord.actualPileDepth, '', '入岩深度(m)', selectedRecord.rockEntryDepth],
        ['钻孔开始', selectedRecord.drillStartTime, '', '钻孔结束', selectedRecord.drillEndTime],
        ['入岩时间', selectedRecord.rockEntryTime, '', '', ''],
        [],
        ['地层变化记录'],
        ['序号', '层底深度(m)', '地层名称', '描述'],
        ...selectedRecord.strata.map((s, i) => [
          i + 1,
          s.depth,
          s.stratum,
          s.description || '',
        ]),
        [],
        ['清孔情况'],
        ['清孔方式', selectedRecord.holeCleaningMethod, '', '沉渣厚度(mm)', selectedRecord.sedimentThickness],
        ['清孔开始', selectedRecord.holeCleaningStartTime, '', '清孔结束', selectedRecord.holeCleaningEndTime],
        ['清孔前泥浆比重', selectedRecord.mudDensityBefore, '', '清孔后泥浆比重', selectedRecord.mudDensityAfter],
        [],
        ['混凝土灌注'],
        ['混凝土强度等级', selectedRecord.concreteGrade, '', '灌注方量(m³)', selectedRecord.concreteVolume],
        ['灌注开始', `${selectedRecord.concreteStartDate} ${selectedRecord.concreteStartTime}`, '', '', ''],
        ['灌注结束', `${selectedRecord.concreteEndDate} ${selectedRecord.concreteEndTime}`, '', '', ''],
        [],
        ['钢筋笼'],
        ['钢筋笼长度(m)', selectedRecord.reinforcementCageLength, '', '节数', selectedRecord.reinforcementCageSections],
        ['焊接方式', selectedRecord.weldingMethod, '', '', ''],
        [],
        ['备注', selectedRecord.remarks || ''],
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      ws['!cols'] = [
        { wch: 16 }, { wch: 18 }, { wch: 4 }, { wch: 16 }, { wch: 18 },
      ]
      XLSX.utils.book_append_sheet(wb, ws, '单桩施工记录')
    } else if (activeTab === 'concrete') {
      const data = [
        ['混凝土灌注记录表'],
        [],
        ['序号', '桩号', '混凝土等级', '方量(m³)', '开始日期', '开始时间', '结束日期', '结束时间', '施工班组'],
        ...sortedRecords.map((r, i) => [
          i + 1,
          r.pileNo,
          r.concreteGrade,
          r.concreteVolume,
          r.concreteStartDate,
          r.concreteStartTime,
          r.concreteEndDate,
          r.concreteEndTime,
          r.constructionTeam,
        ]),
        [],
        ['合计', '', '', sortedRecords.reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0).toFixed(2),
         '', '', '', '', `${sortedRecords.length}根桩`],
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      ws['!cols'] = [
        { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
        { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 14 },
      ]
      XLSX.utils.book_append_sheet(wb, ws, '混凝土灌注记录')
    } else if (activeTab === 'daily') {
      const data = [
        ['桩基施工日汇总表'],
        [`日期：${selectedDate}`],
        [],
        ['序号', '桩号', '钻机类型', '钻机编号', '设计桩径(mm)', '设计桩长(m)',
         '实际桩长(m)', '入岩深度(m)', '混凝土等级', '方量(m³)', '施工班组', '记录员'],
        ...dailyRecords.map((r, i) => [
          i + 1,
          r.pileNo,
          r.machineType,
          r.machineNo,
          r.designPileDiameter,
          r.designPileDepth,
          r.actualPileDepth,
          r.rockEntryDepth,
          r.concreteGrade,
          r.concreteVolume,
          r.constructionTeam,
          r.recorder,
        ]),
        [],
        ['合计', '', '', '', '', '', '', '', '',
         dailyRecords.reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0).toFixed(2),
         '', `${dailyRecords.length}根桩`],
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      ws['!cols'] = [
        { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
        { wch: 14 }, { wch: 10 },
      ]
      XLSX.utils.book_append_sheet(wb, ws, '日汇总表')
    }

    XLSX.writeFile(wb, `${getExportFileName()}.xlsx`)
  }

  const renderSinglePile = () => {
    if (!selectedRecord) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">请在上方"选择桩号"下拉框中选择要查看的桩</div>
          <div style={{ fontSize: '12px', color: '#bfbfbf', marginTop: '8px' }}>
            尚未选择桩号时，无法打印或导出资料
          </div>
        </div>
      )
    }

    return (
      <div>
        <h2 className="print-title">桩基施工记录</h2>
        <div className="print-info-row">
          <span>桩号：<strong>{selectedRecord.pileNo}</strong></span>
          <span>钻孔日期：{selectedRecord.drillDate}</span>
        </div>

        <table className="detail-table">
          <tbody>
            <tr>
              <th>施工班组</th>
              <td>{selectedRecord.constructionTeam}</td>
              <th>记录员</th>
              <td>{selectedRecord.recorder}</td>
            </tr>
            <tr>
              <th>钻机类型</th>
              <td>{selectedRecord.machineType}</td>
              <th>钻机编号</th>
              <td>{selectedRecord.machineNo}</td>
            </tr>
            <tr>
              <th>设计桩径</th>
              <td>{selectedRecord.designPileDiameter} mm</td>
              <th>设计桩长</th>
              <td>{selectedRecord.designPileDepth} m</td>
            </tr>
            <tr>
              <th>实际桩长</th>
              <td>{selectedRecord.actualPileDepth} m</td>
              <th>入岩深度</th>
              <td>{selectedRecord.rockEntryDepth} m</td>
            </tr>
            <tr>
              <th>钻孔开始</th>
              <td>{selectedRecord.drillStartTime || '-'}</td>
              <th>钻孔结束</th>
              <td>{selectedRecord.drillEndTime || '-'}</td>
            </tr>
            <tr>
              <th>入岩时间</th>
              <td>{selectedRecord.rockEntryTime || '-'}</td>
              <th></th>
              <td></td>
            </tr>
          </tbody>
        </table>

        <h3 className="section-h3">地层变化记录</h3>
        <table className="record-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>序号</th>
              <th>层底深度 (m)</th>
              <th>地层名称</th>
              <th>描述</th>
            </tr>
          </thead>
          <tbody>
            {selectedRecord.strata.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#8c8c8c' }}>
                  无地层记录
                </td>
              </tr>
            ) : selectedRecord.strata.map((s, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td>{s.depth || '-'}</td>
                <td>{s.stratum || '-'}</td>
                <td>{s.description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="section-h3">清孔情况</h3>
        <table className="detail-table">
          <tbody>
            <tr>
              <th>清孔方式</th>
              <td>{selectedRecord.holeCleaningMethod || '-'}</td>
              <th>沉渣厚度</th>
              <td>{selectedRecord.sedimentThickness ? `${selectedRecord.sedimentThickness} mm` : '-'}</td>
            </tr>
            <tr>
              <th>清孔开始</th>
              <td>{selectedRecord.holeCleaningStartTime || '-'}</td>
              <th>清孔结束</th>
              <td>{selectedRecord.holeCleaningEndTime || '-'}</td>
            </tr>
            <tr>
              <th>清孔前泥浆比重</th>
              <td>{selectedRecord.mudDensityBefore || '-'}</td>
              <th>清孔后泥浆比重</th>
              <td>{selectedRecord.mudDensityAfter || '-'}</td>
            </tr>
          </tbody>
        </table>

        <h3 className="section-h3">混凝土灌注</h3>
        <table className="detail-table">
          <tbody>
            <tr>
              <th>混凝土强度等级</th>
              <td>{selectedRecord.concreteGrade}</td>
              <th>灌注方量</th>
              <td>{selectedRecord.concreteVolume} m³</td>
            </tr>
            <tr>
              <th>灌注开始</th>
              <td colSpan={3}>
                {selectedRecord.concreteStartDate} {selectedRecord.concreteStartTime}
              </td>
            </tr>
            <tr>
              <th>灌注结束</th>
              <td colSpan={3}>
                {selectedRecord.concreteEndDate} {selectedRecord.concreteEndTime}
              </td>
            </tr>
          </tbody>
        </table>

        <h3 className="section-h3">钢筋笼</h3>
        <table className="detail-table">
          <tbody>
            <tr>
              <th>钢筋笼长度</th>
              <td>{selectedRecord.reinforcementCageLength ? `${selectedRecord.reinforcementCageLength} m` : '-'}</td>
              <th>节数</th>
              <td>{selectedRecord.reinforcementCageSections || '-'}</td>
            </tr>
            <tr>
              <th>焊接方式</th>
              <td>{selectedRecord.weldingMethod || '-'}</td>
              <th></th>
              <td></td>
            </tr>
          </tbody>
        </table>

        {selectedRecord.remarks && (
          <>
            <h3 className="section-h3">备注</h3>
            <p className="remarks-text">{selectedRecord.remarks}</p>
          </>
        )}

        <div className="signature-row">
          <div className="signature-item">
            <div className="signature-label">施工员</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">质检员</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">监理工程师</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
        </div>
      </div>
    )
  }

  const renderConcreteTable = () => {
    if (sortedRecords.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-text">暂无灌注记录</div>
          <div style={{ fontSize: '12px', color: '#bfbfbf', marginTop: '8px' }}>
            请先在"记录录入"中录入至少一根桩的灌注信息
          </div>
        </div>
      )
    }

    const totalVolume = sortedRecords.reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0)

    return (
      <div>
        <h2 className="print-title">混凝土灌注记录表</h2>
        <table className="record-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>序号</th>
              <th>桩号</th>
              <th>混凝土等级</th>
              <th>方量 (m³)</th>
              <th>开始时间</th>
              <th>结束时间</th>
              <th>施工班组</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((r, i) => (
              <tr key={r.id}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td>{r.pileNo}</td>
                <td>{r.concreteGrade}</td>
                <td>{r.concreteVolume}</td>
                <td>{r.concreteStartDate} {r.concreteStartTime}</td>
                <td>{r.concreteEndDate} {r.concreteEndTime}</td>
                <td>{r.constructionTeam}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', background: '#f5f5f5' }}>
              <td style={{ textAlign: 'center' }} colSpan={3}>合计</td>
              <td>{totalVolume.toFixed(2)}</td>
              <td colSpan={2}></td>
              <td>{sortedRecords.length} 根桩</td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  }

  const renderDailySummary = () => {
    if (dailyRecords.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-text">当日无施工记录</div>
          <div style={{ fontSize: '12px', color: '#bfbfbf', marginTop: '8px' }}>
            请选择其他日期，或先在"记录录入"中录入钻孔日期为该日的桩
          </div>
        </div>
      )
    }

    const totalVolume = dailyRecords.reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0)

    return (
      <div>
        <h2 className="print-title">桩基施工日汇总表</h2>
        <p className="print-subtitle">日期：{selectedDate}</p>

        <table className="record-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>序号</th>
              <th>桩号</th>
              <th>钻机类型</th>
              <th>设计桩径</th>
              <th>实际桩长 (m)</th>
              <th>入岩深度 (m)</th>
              <th>混凝土等级</th>
              <th>方量 (m³)</th>
              <th>施工班组</th>
            </tr>
          </thead>
          <tbody>
            {dailyRecords.map((r, i) => (
              <tr key={r.id}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td>{r.pileNo}</td>
                <td>{r.machineType}</td>
                <td>{r.designPileDiameter} mm</td>
                <td>{r.actualPileDepth}</td>
                <td>{r.rockEntryDepth}</td>
                <td>{r.concreteGrade}</td>
                <td>{r.concreteVolume}</td>
                <td>{r.constructionTeam}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', background: '#f5f5f5' }}>
              <td style={{ textAlign: 'center' }} colSpan={7}>合计</td>
              <td>{totalVolume.toFixed(2)}</td>
              <td>{dailyRecords.length} 根桩</td>
            </tr>
          </tfoot>
        </table>

        <div className="signature-row">
          <div className="signature-item">
            <div className="signature-label">记录员</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">技术负责人</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">监理工程师</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="export-container">
      <div className="export-toolbar no-print">
        <label>
          <span style={{ marginRight: '6px' }}>资料类型：</span>
        </label>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className={`tab-btn ${activeTab === 'single' ? 'active' : ''}`}
            onClick={() => setActiveTab('single')}
            style={{ border: 'none', background: 'none', padding: '8px 16px', cursor: 'pointer' }}
          >
            单桩施工记录
          </button>
          <button
            className={`tab-btn ${activeTab === 'concrete' ? 'active' : ''}`}
            onClick={() => setActiveTab('concrete')}
            style={{ border: 'none', background: 'none', padding: '8px 16px', cursor: 'pointer' }}
          >
            混凝土灌注记录
          </button>
          <button
            className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
            style={{ border: 'none', background: 'none', padding: '8px 16px', cursor: 'pointer' }}
          >
            当天汇总表
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {activeTab === 'single' && (
          <>
            <label>选择桩号：</label>
            <select
              value={selectedPileId}
              onChange={e => setSelectedPileId(e.target.value)}
              style={{ minWidth: '180px' }}
            >
              <option value="">请选择桩号</option>
              {sortedRecords.map(r => (
                <option key={r.id} value={r.id}>
                  {r.pileNo} · {r.drillDate} · {r.constructionTeam || '无班组'}
                </option>
              ))}
            </select>
          </>
        )}

        {activeTab === 'daily' && (
          <>
            <label>选择日期：</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </>
        )}

        {!canExport && (
          <span style={{ color: '#d48806', fontSize: '13px', marginRight: '8px' }}>
            ⚠ {getEmptyTip()}
          </span>
        )}

        <button
          className="btn"
          onClick={handlePrint}
          disabled={!canExport || isExporting}
          style={{ opacity: !canExport ? 0.5 : 1, cursor: !canExport ? 'not-allowed' : 'pointer' }}
        >
          🖨 打印
        </button>
        <button
          className="btn btn-primary"
          onClick={handleExportPDF}
          disabled={!canExport || isExporting}
          style={{ opacity: !canExport ? 0.5 : 1, cursor: !canExport ? 'not-allowed' : 'pointer' }}
        >
          {isExporting ? '⏳ 导出中...' : '📄 导出PDF'}
        </button>
        <button
          className="btn btn-success"
          onClick={handleExportExcel}
          disabled={!canExport || isExporting}
          style={{ opacity: !canExport ? 0.5 : 1, cursor: !canExport ? 'not-allowed' : 'pointer' }}
        >
          📊 导出Excel
        </button>
      </div>

      <div className="export-preview" ref={printRef}>
        {activeTab === 'single' && renderSinglePile()}
        {activeTab === 'concrete' && renderConcreteTable()}
        {activeTab === 'daily' && renderDailySummary()}
      </div>
    </div>
  )
}

export default DataExport
