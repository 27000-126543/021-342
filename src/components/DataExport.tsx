import { useState, useMemo, useRef } from 'react'
import { PileRecord } from '../types/pileRecord'
import { storageService } from '../services/storage'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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

  const handlePrint = () => {
    storageService.printPage()
  }

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    doc.setFontSize(16)
    doc.text('桩基施工记录', 105, 20, { align: 'center' })

    if (activeTab === 'single' && selectedRecord) {
      doc.setFontSize(12)
      doc.text(`桩号：${selectedRecord.pileNo}`, 20, 32)
      doc.text(`日期：${selectedRecord.drillDate}`, 130, 32)

      const tableData = [
        ['施工班组', selectedRecord.constructionTeam, '记录员', selectedRecord.recorder],
        ['钻机类型', selectedRecord.machineType, '钻机编号', selectedRecord.machineNo],
        ['设计桩径', `${selectedRecord.designPileDiameter} mm`, '设计桩长', `${selectedRecord.designPileDepth} m`],
        ['实际桩长', `${selectedRecord.actualPileDepth} m`, '入岩深度', `${selectedRecord.rockEntryDepth} m`],
        ['混凝土等级', selectedRecord.concreteGrade, '灌注方量', `${selectedRecord.concreteVolume} m³`],
        ['灌注开始', `${selectedRecord.concreteStartDate} ${selectedRecord.concreteStartTime}`, '灌注结束', `${selectedRecord.concreteEndDate} ${selectedRecord.concreteEndTime}`],
        ['清孔方式', selectedRecord.holeCleaningMethod, '沉渣厚度', `${selectedRecord.sedimentThickness} mm`],
        ['钢筋笼长度', `${selectedRecord.reinforcementCageLength} m`, '节数', selectedRecord.reinforcementCageSections],
        ['焊接方式', selectedRecord.weldingMethod, '', ''],
      ]

      autoTable(doc, {
        body: tableData,
        startY: 40,
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 30, fillColor: [240, 240, 240], fontStyle: 'bold' },
          1: { cellWidth: 60 },
          2: { cellWidth: 30, fillColor: [240, 240, 240], fontStyle: 'bold' },
          3: { cellWidth: 60 },
        },
        theme: 'grid',
      })

      const finalY = (doc as any).lastAutoTable.finalY || 120

      if (selectedRecord.strata.length > 0) {
        doc.setFontSize(12)
        doc.text('地层记录', 20, finalY + 10)

        const strataData = [
          ['序号', '层底深度(m)', '地层名称', '描述'],
          ...selectedRecord.strata.map((s, i) => [
            i + 1,
            s.depth,
            s.stratum,
            s.description || '',
          ]),
        ]

        autoTable(doc, {
          body: strataData,
          startY: finalY + 15,
          headStyles: { fillColor: [24, 144, 255] },
          styles: { fontSize: 10 },
          theme: 'grid',
        })
      }
    } else if (activeTab === 'concrete') {
      const concreteData = [
        ['序号', '桩号', '混凝土等级', '方量(m³)', '开始时间', '结束时间', '施工班组'],
        ...sortedRecords.map((r, i) => [
          i + 1,
          r.pileNo,
          r.concreteGrade,
          r.concreteVolume,
          `${r.concreteStartDate} ${r.concreteStartTime}`,
          `${r.concreteEndDate} ${r.concreteEndTime}`,
          r.constructionTeam,
        ]),
      ]

      autoTable(doc, {
        body: concreteData,
        startY: 30,
        headStyles: { fillColor: [24, 144, 255] },
        styles: { fontSize: 9 },
        theme: 'grid',
      })
    } else if (activeTab === 'daily') {
      doc.setFontSize(12)
      doc.text(`日期：${selectedDate}`, 20, 30)
      doc.text(`共 ${dailyRecords.length} 根桩`, 150, 30)

      const dailyData = [
        ['序号', '桩号', '钻机类型', '设计桩径', '实际桩长(m)', '入岩深度(m)', '混凝土方量(m³)', '施工班组'],
        ...dailyRecords.map((r, i) => [
          i + 1,
          r.pileNo,
          r.machineType,
          r.designPileDiameter,
          r.actualPileDepth,
          r.rockEntryDepth,
          r.concreteVolume,
          r.constructionTeam,
        ]),
      ]

      autoTable(doc, {
        body: dailyData,
        startY: 40,
        headStyles: { fillColor: [24, 144, 255] },
        styles: { fontSize: 9 },
        theme: 'grid',
      })

      const totalVolume = dailyRecords.reduce(
        (sum, r) => sum + (parseFloat(r.concreteVolume) || 0),
        0
      )
      const finalY = (doc as any).lastAutoTable.finalY || 150
      doc.setFontSize(10)
      doc.text(`合计混凝土方量：${totalVolume.toFixed(2)} m³`, 20, finalY + 10)
    }

    doc.save(`桩基记录_${new Date().toLocaleDateString()}.pdf`)
  }

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()

    if (activeTab === 'single' && selectedRecord) {
      const data = [
        ['桩基施工记录'],
        [],
        ['桩号', selectedRecord.pileNo, '钻孔日期', selectedRecord.drillDate],
        ['施工班组', selectedRecord.constructionTeam, '记录员', selectedRecord.recorder],
        ['钻机类型', selectedRecord.machineType, '钻机编号', selectedRecord.machineNo],
        ['设计桩径(mm)', selectedRecord.designPileDiameter, '设计桩长(m)', selectedRecord.designPileDepth],
        ['实际桩长(m)', selectedRecord.actualPileDepth, '入岩深度(m)', selectedRecord.rockEntryDepth],
        ['混凝土等级', selectedRecord.concreteGrade, '灌注方量(m³)', selectedRecord.concreteVolume],
        ['灌注开始', `${selectedRecord.concreteStartDate} ${selectedRecord.concreteStartTime}`, '灌注结束', `${selectedRecord.concreteEndDate} ${selectedRecord.concreteEndTime}`],
        ['清孔方式', selectedRecord.holeCleaningMethod, '沉渣厚度(mm)', selectedRecord.sedimentThickness],
        ['钢筋笼长度(m)', selectedRecord.reinforcementCageLength, '节数', selectedRecord.reinforcementCageSections],
        ['焊接方式', selectedRecord.weldingMethod, '', ''],
        ['备注', selectedRecord.remarks, '', ''],
        [],
        ['地层记录'],
        ['序号', '层底深度(m)', '地层名称', '描述'],
        ...selectedRecord.strata.map((s, i) => [
          i + 1,
          s.depth,
          s.stratum,
          s.description,
        ]),
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, '单桩记录')
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
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, '混凝土灌注记录')
    } else if (activeTab === 'daily') {
      const data = [
        ['桩基施工日汇总表'],
        [`日期：${selectedDate}`],
        [],
        ['序号', '桩号', '钻机类型', '钻机编号', '设计桩径(mm)', '设计桩长(m)', '实际桩长(m)', '入岩深度(m)', '混凝土等级', '方量(m³)', '施工班组', '记录员'],
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
        ['合计', '', '', '', '', '', '', '', '', dailyRecords.reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0).toFixed(2), '', ''],
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, '日汇总表')
    }

    XLSX.writeFile(wb, `桩基记录_${new Date().toLocaleDateString()}.xlsx`)
  }

  const renderSinglePile = () => {
    if (!selectedRecord) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">请选择要查看的桩号</div>
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
              <td>{selectedRecord.drillStartTime}</td>
              <th>钻孔结束</th>
              <td>{selectedRecord.drillEndTime}</td>
            </tr>
            <tr>
              <th>入岩时间</th>
              <td>{selectedRecord.rockEntryTime}</td>
              <th></th>
              <td></td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ fontSize: '14px', marginBottom: '8px', marginTop: '16px' }}>地层变化记录</h3>
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
            {selectedRecord.strata.map((s, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td>{s.depth}</td>
                <td>{s.stratum}</td>
                <td>{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ fontSize: '14px', marginBottom: '8px', marginTop: '16px' }}>清孔情况</h3>
        <table className="detail-table">
          <tbody>
            <tr>
              <th>清孔方式</th>
              <td>{selectedRecord.holeCleaningMethod}</td>
              <th>沉渣厚度</th>
              <td>{selectedRecord.sedimentThickness} mm</td>
            </tr>
            <tr>
              <th>清孔开始</th>
              <td>{selectedRecord.holeCleaningStartTime}</td>
              <th>清孔结束</th>
              <td>{selectedRecord.holeCleaningEndTime}</td>
            </tr>
            <tr>
              <th>清孔前泥浆比重</th>
              <td>{selectedRecord.mudDensityBefore}</td>
              <th>清孔后泥浆比重</th>
              <td>{selectedRecord.mudDensityAfter}</td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ fontSize: '14px', marginBottom: '8px', marginTop: '16px' }}>混凝土灌注</h3>
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

        <h3 style={{ fontSize: '14px', marginBottom: '8px', marginTop: '16px' }}>钢筋笼</h3>
        <table className="detail-table">
          <tbody>
            <tr>
              <th>钢筋笼长度</th>
              <td>{selectedRecord.reinforcementCageLength} m</td>
              <th>节数</th>
              <td>{selectedRecord.reinforcementCageSections}</td>
            </tr>
            <tr>
              <th>焊接方式</th>
              <td>{selectedRecord.weldingMethod}</td>
              <th></th>
              <td></td>
            </tr>
          </tbody>
        </table>

        {selectedRecord.remarks && (
          <>
            <h3 style={{ fontSize: '14px', marginBottom: '8px', marginTop: '16px' }}>备注</h3>
            <p style={{ fontSize: '13px', lineHeight: 1.6 }}>{selectedRecord.remarks}</p>
          </>
        )}

        <div className="signature-row">
          <div className="signature-item">
            <div className="signature-label">施工员</div>
            <div className="signature-line"></div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">质检员</div>
            <div className="signature-line"></div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">监理工程师</div>
            <div className="signature-line"></div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>签字</div>
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
        </div>
      )
    }

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
        </table>
        <div style={{ marginTop: '12px', fontSize: '13px', textAlign: 'right' }}>
          共 <strong>{sortedRecords.length}</strong> 根桩 · 总计{' '}
          <strong>
            {sortedRecords
              .reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0)
              .toFixed(2)}
          </strong>{' '}
          m³
        </div>
      </div>
    )
  }

  const renderDailySummary = () => {
    if (dailyRecords.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-text">当日无施工记录</div>
        </div>
      )
    }

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
              <td style={{ textAlign: 'center' }} colSpan={7}>
                合计
              </td>
              <td>
                {dailyRecords
                  .reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0)
                  .toFixed(2)}
              </td>
              <td>{dailyRecords.length} 根桩</td>
            </tr>
          </tfoot>
        </table>

        <div className="signature-row">
          <div className="signature-item">
            <div className="signature-label">记录员</div>
            <div className="signature-line"></div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">技术负责人</div>
            <div className="signature-line"></div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">监理工程师</div>
            <div className="signature-line"></div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>签字</div>
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
              style={{ minWidth: '150px' }}
            >
              <option value="">请选择</option>
              {sortedRecords.map(r => (
                <option key={r.id} value={r.id}>
                  {r.pileNo} - {r.drillDate}
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

        <button className="btn" onClick={handlePrint}>
          🖨 打印
        </button>
        <button className="btn btn-primary" onClick={handleExportPDF}>
          📄 导出PDF
        </button>
        <button className="btn btn-success" onClick={handleExportExcel}>
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
