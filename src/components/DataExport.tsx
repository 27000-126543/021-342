import { useState, useMemo, useRef } from 'react'
import { PileRecord, ProjectInfo } from '../types/pileRecord'
import { storageService } from '../services/storage'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'

interface DataExportProps {
  records: PileRecord[]
  projectInfo: ProjectInfo
}

type TabType = 'single' | 'concrete' | 'daily' | 'batch'

function ProjectHeader({ info, title }: { info: ProjectInfo; title: string }) {
  return (
    <div className="project-header">
      {info.projectName && (
        <div className="project-name">{info.projectName}</div>
      )}
      <div style={{ fontSize: '16px', fontWeight: 600, color: '#262626', marginBottom: '6px' }}>
        {title}
      </div>
      <div className="project-meta">
        {info.constructionUnit && <span>施工单位：{info.constructionUnit}</span>}
        {info.supervisionUnit && <span>监理单位：{info.supervisionUnit}</span>}
        {info.reportNo && <span>编号：{info.reportNo}</span>}
        {info.projectManager && <span>项目经理：{info.projectManager}</span>}
      </div>
    </div>
  )
}

function buildSinglePileHtml(r: PileRecord, info: ProjectInfo): string {
  const rockRows = r.strata
    .map((s, i) => `<tr><td style="padding:6px 8px;border:1px solid #d9d9d9;text-align:center;">${i + 1}</td><td style="padding:6px 8px;border:1px solid #d9d9d9;">${s.depth || '-'}</td><td style="padding:6px 8px;border:1px solid #d9d9d9;">${s.stratum || '-'}</td><td style="padding:6px 8px;border:1px solid #d9d9d9;">${s.description || '-'}</td></tr>`)
    .join('')
  return `
<div style="width:794px;padding:30px;background:#fff;font-family:'Microsoft YaHei','微软雅黑',sans-serif;color:#333;font-size:13px;box-sizing:border-box;">
  ${info.projectName ? `<div style="text-align:center;font-size:18px;font-weight:700;margin-bottom:6px;">${info.projectName}</div>` : ''}
  <div style="text-align:center;font-size:16px;font-weight:600;margin-bottom:6px;">桩基施工记录</div>
  <div style="display:flex;justify-content:space-between;font-size:12px;color:#595959;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #1890ff;flex-wrap:wrap;gap:8px;">
    ${info.constructionUnit ? `<span>施工单位：${info.constructionUnit}</span>` : ''}
    ${info.supervisionUnit ? `<span>监理单位：${info.supervisionUnit}</span>` : ''}
    ${info.reportNo ? `<span>编号：${info.reportNo}</span>` : ''}
  </div>
  <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-weight:600;">
    <span>桩号：${r.pileNo}</span>
    <span>钻孔日期：${r.drillDate}</span>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <tbody>
      <tr><th style="width:100px;text-align:right;background:#fafafa;padding:6px 8px;border:1px solid #d9d9d9;font-weight:500;">施工班组</th><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.constructionTeam}</td><th style="width:100px;text-align:right;background:#fafafa;padding:6px 8px;border:1px solid #d9d9d9;font-weight:500;">记录员</th><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.recorder}</td></tr>
      <tr><th style="text-align:right;background:#fafafa;padding:6px 8px;border:1px solid #d9d9d9;font-weight:500;">钻机类型</th><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.machineType}</td><th style="text-align:right;background:#fafafa;padding:6px 8px;border:1px solid #d9d9d9;font-weight:500;">钻机编号</th><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.machineNo || '-'}</td></tr>
      <tr><th style="text-align:right;background:#fafafa;padding:6px 8px;border:1px solid #d9d9d9;font-weight:500;">设计桩径</th><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.designPileDiameter} mm</td><th style="text-align:right;background:#fafafa;padding:6px 8px;border:1px solid #d9d9d9;font-weight:500;">设计桩长</th><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.designPileDepth} m</td></tr>
      <tr><th style="text-align:right;background:#fafafa;padding:6px 8px;border:1px solid #d9d9d9;font-weight:500;">实际桩长</th><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.actualPileDepth} m</td><th style="text-align:right;background:#fafafa;padding:6px 8px;border:1px solid #d9d9d9;font-weight:500;">入岩深度</th><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.rockEntryDepth} m</td></tr>
      <tr><th style="text-align:right;background:#fafafa;padding:6px 8px;border:1px solid #d9d9d9;font-weight:500;">混凝土等级</th><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.concreteGrade}</td><th style="text-align:right;background:#fafafa;padding:6px 8px;border:1px solid #d9d9d9;font-weight:500;">灌注方量</th><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.concreteVolume} m&sup3;</td></tr>
      <tr><th style="text-align:right;background:#fafafa;padding:6px 8px;border:1px solid #d9d9d9;font-weight:500;">灌注开始</th><td colspan="3" style="padding:6px 8px;border:1px solid #d9d9d9;">${r.concreteStartDate} ${r.concreteStartTime}</td></tr>
      <tr><th style="text-align:right;background:#fafafa;padding:6px 8px;border:1px solid #d9d9d9;font-weight:500;">灌注结束</th><td colspan="3" style="padding:6px 8px;border:1px solid #d9d9d9;">${r.concreteEndDate} ${r.concreteEndTime}</td></tr>
    </tbody>
  </table>
  <div style="font-size:14px;font-weight:600;margin:14px 0 6px;padding-left:8px;border-left:3px solid #1890ff;">地层变化记录</div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead><tr><th style="padding:6px 8px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">序号</th><th style="padding:6px 8px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">层底深度(m)</th><th style="padding:6px 8px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">地层名称</th><th style="padding:6px 8px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">描述</th></tr></thead>
    <tbody>${rockRows}</tbody>
  </table>
  <div style="display:flex;justify-content:space-around;margin-top:40px;padding-top:16px;border-top:1px solid #f0f0f0;">
    <div style="text-align:center;"><div>施工员${info.siteEngineer ? '（' + info.siteEngineer + '）' : ''}</div><div style="width:110px;border-bottom:1px solid #999;margin:6px auto;"></div><div style="font-size:12px;color:#888;">签字</div></div>
    <div style="text-align:center;"><div>质检员</div><div style="width:110px;border-bottom:1px solid #999;margin:6px auto;"></div><div style="font-size:12px;color:#888;">签字</div></div>
    <div style="text-align:center;"><div>监理工程师${info.supervisionEngineer ? '（' + info.supervisionEngineer + '）' : ''}</div><div style="width:110px;border-bottom:1px solid #999;margin:6px auto;"></div><div style="font-size:12px;color:#888;">签字</div></div>
  </div>
</div>`
}

async function elementToPdf(element: HTMLElement, pdf: jsPDF, firstPage: boolean): Promise<boolean> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })
  const imgData = canvas.toDataURL('image/png')
  const imgWidthPx = canvas.width
  const imgHeightPx = canvas.height
  const pdfWidthMm = 210
  const pdfHeightMm = 297
  const marginX = 10
  const marginTop = 10
  const usableWidth = pdfWidthMm - 2 * marginX
  const scale = usableWidth / imgWidthPx
  const imgHeightMm = imgHeightPx * scale
  if (!firstPage) pdf.addPage()
  pdf.addImage(imgData, 'PNG', marginX, marginTop, imgWidthPx * scale, imgHeightMm)
  let heightLeft = imgHeightMm - (pdfHeightMm - 2 * marginTop)
  while (heightLeft >= 0) {
    pdf.addPage()
    const position = heightLeft - imgHeightMm + marginTop
    pdf.addImage(imgData, 'PNG', marginX, position, imgWidthPx * scale, imgHeightMm)
    heightLeft -= (pdfHeightMm - 2 * marginTop)
  }
  return true
}

function DataExport({ records, projectInfo }: DataExportProps) {
  const [activeTab, setActiveTab] = useState<TabType>('single')
  const [selectedPileId, setSelectedPileId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [batchDateFrom, setBatchDateFrom] = useState<string>('')
  const [batchDateTo, setBatchDateTo] = useState<string>('')
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const previewWrapRef = useRef<HTMLDivElement>(null)
  const singlePileRef = useRef<HTMLDivElement>(null)

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => a.pileNo.localeCompare(b.pileNo)),
    [records],
  )

  const selectedRecord = useMemo(
    () => records.find(r => r.id === selectedPileId) || null,
    [records, selectedPileId],
  )

  const dailyRecords = useMemo(
    () => records
      .filter(r => r.drillDate === selectedDate)
      .sort((a, b) => a.pileNo.localeCompare(b.pileNo)),
    [records, selectedDate],
  )

  const batchCandidate = useMemo(() => {
    return sortedRecords.filter(r => {
      if (batchDateFrom && r.drillDate < batchDateFrom) return false
      if (batchDateTo && r.drillDate > batchDateTo) return false
      return true
    })
  }, [sortedRecords, batchDateFrom, batchDateTo])

  const canExportSingle = activeTab === 'single' && !!selectedRecord
  const canExportConcrete = activeTab === 'concrete' && sortedRecords.length > 0
  const canExportDaily = activeTab === 'daily' && dailyRecords.length > 0
  const canExportBatch = activeTab === 'batch' && selectedBatchIds.size > 0
  const canExport = canExportSingle || canExportConcrete || canExportDaily || canExportBatch

  const getEmptyTip = (): string => {
    if (activeTab === 'single' && !selectedRecord) return '请先选择桩号再导出'
    if (activeTab === 'concrete' && sortedRecords.length === 0) return '暂无灌注记录'
    if (activeTab === 'daily' && dailyRecords.length === 0) return '该日期无施工记录'
    if (activeTab === 'batch' && selectedBatchIds.size === 0) return '请勾选至少一根桩再批量导出'
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
    if (activeTab === 'single' && selectedRecord) return '单桩施工记录_' + selectedRecord.pileNo + '_' + dateStr
    if (activeTab === 'concrete') return '混凝土灌注记录_' + dateStr
    if (activeTab === 'daily') return '桩基施工日汇总表_' + selectedDate
    if (activeTab === 'batch') return '批量单桩记录_' + (batchDateFrom || '起始') + '_' + (batchDateTo || '截止') + '_' + dateStr
    return '桩基记录_' + dateStr
  }

  const handleExportSinglePDF = async () => {
    if (!canExportSingle || !singlePileRef.current) {
      alert(getEmptyTip())
      return
    }
    setIsExporting(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      await elementToPdf(singlePileRef.current, pdf, true)
      pdf.save(getExportFileName() + '.pdf')
    } catch (err) {
      console.error('PDF导出失败：', err)
      alert('PDF导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPDF = async () => {
    if (activeTab === 'single') return handleExportSinglePDF()
    if (!canExport || !previewWrapRef.current) {
      alert(getEmptyTip())
      return
    }
    setIsExporting(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      await elementToPdf(previewWrapRef.current, pdf, true)
      pdf.save(getExportFileName() + '.pdf')
    } catch (err) {
      console.error('PDF导出失败：', err)
      alert('PDF导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }

  const handleBatchPDF = async () => {
    if (!canExportBatch) {
      alert(getEmptyTip())
      return
    }
    setIsExporting(true)
    try {
      const list = sortedRecords.filter(r => selectedBatchIds.has(r.id))
      const pdf = new jsPDF('p', 'mm', 'a4')
      for (let i = 0; i < list.length; i++) {
        const r = list[i]
        const tempDiv = document.createElement('div')
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '-9999px'
        tempDiv.innerHTML = buildSinglePileHtml(r, projectInfo)
        document.body.appendChild(tempDiv)
        try {
          await elementToPdf(tempDiv, pdf, i === 0)
        } finally {
          document.body.removeChild(tempDiv)
        }
      }
      pdf.save(getExportFileName() + '.pdf')
    } catch (err) {
      console.error('批量PDF导出失败：', err)
      alert('批量导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }

  const handleBatchExcel = () => {
    if (!canExportBatch) {
      alert(getEmptyTip())
      return
    }
    const wb = XLSX.utils.book_new()
    const list = sortedRecords.filter(r => selectedBatchIds.has(r.id))
    list.forEach(r => {
      const safeName = r.pileNo.substring(0, 28).replace(/[\\/?*\[\]:]/g, '_')
      const data = [
        [projectInfo.projectName || '桩基施工记录'],
        ['施工单位', projectInfo.constructionUnit, '监理单位', projectInfo.supervisionUnit, '报告编号', projectInfo.reportNo],
        [],
        ['桩号', r.pileNo, '', '钻孔日期', r.drillDate],
        ['施工班组', r.constructionTeam, '', '记录员', r.recorder],
        ['钻机类型', r.machineType, '', '钻机编号', r.machineNo],
        ['设计桩径(mm)', r.designPileDiameter, '', '设计桩长(m)', r.designPileDepth],
        ['实际桩长(m)', r.actualPileDepth, '', '入岩深度(m)', r.rockEntryDepth],
        ['混凝土等级', r.concreteGrade, '', '方量(m3)', r.concreteVolume],
        ['灌注开始', r.concreteStartDate + ' ' + r.concreteStartTime],
        ['灌注结束', r.concreteEndDate + ' ' + r.concreteEndTime],
        [],
        ['地层变化记录'],
        ['序号', '层底深度(m)', '地层名称', '描述'],
        ...r.strata.map((s, i) => [i + 1, s.depth, s.stratum, s.description || '']),
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, safeName)
    })
    const totalVolume = list.reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0)
    const summary = [
      ['批量单桩施工记录汇总表'],
      ['导出时间', new Date().toLocaleString()],
      ['日期范围', (batchDateFrom || '-') + ' 至 ' + (batchDateTo || '-')],
      ['共', list.length + ' 根桩', '', '混凝土总方量(m3)', totalVolume.toFixed(2)],
      [],
      ['序号', '桩号', '桩径(mm)', '桩长(m)', '入岩(m)', '混凝土', '方量(m3)', '班组', '日期'],
      ...list.map((r, i) => [i + 1, r.pileNo, r.designPileDiameter, r.actualPileDepth, r.rockEntryDepth, r.concreteGrade, r.concreteVolume, r.constructionTeam, r.drillDate]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), '汇总')
    XLSX.writeFile(wb, getExportFileName() + '.xlsx')
  }

  const handleExportExcel = () => {
    if (activeTab === 'batch') return handleBatchExcel()
    if (!canExport) {
      alert(getEmptyTip())
      return
    }
    const wb = XLSX.utils.book_new()
    if (activeTab === 'single' && selectedRecord) {
      const data = [
        [projectInfo.projectName || '桩基施工记录'],
        ['施工单位', projectInfo.constructionUnit, '监理单位', projectInfo.supervisionUnit, '报告编号', projectInfo.reportNo],
        [],
        ['桩号', selectedRecord.pileNo, '', '钻孔日期', selectedRecord.drillDate],
        ['施工班组', selectedRecord.constructionTeam, '', '记录员', selectedRecord.recorder],
        ['钻机类型', selectedRecord.machineType, '', '钻机编号', selectedRecord.machineNo],
        ['设计桩径(mm)', selectedRecord.designPileDiameter, '', '设计桩长(m)', selectedRecord.designPileDepth],
        ['实际桩长(m)', selectedRecord.actualPileDepth, '', '入岩深度(m)', selectedRecord.rockEntryDepth],
        ['混凝土强度等级', selectedRecord.concreteGrade, '', '灌注方量(m3)', selectedRecord.concreteVolume],
        ['灌注开始', selectedRecord.concreteStartDate + ' ' + selectedRecord.concreteStartTime],
        ['灌注结束', selectedRecord.concreteEndDate + ' ' + selectedRecord.concreteEndTime],
        [],
        ['地层变化记录'],
        ['序号', '层底深度(m)', '地层名称', '描述'],
        ...selectedRecord.strata.map((s, i) => [i + 1, s.depth, s.stratum, s.description || '']),
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, '单桩施工记录')
    } else if (activeTab === 'concrete') {
      const data = [
        [projectInfo.projectName || '混凝土灌注记录表'],
        ['施工单位', projectInfo.constructionUnit, '监理单位', projectInfo.supervisionUnit],
        [],
        ['序号', '桩号', '混凝土等级', '方量(m3)', '开始日期', '开始时间', '结束日期', '结束时间', '施工班组'],
        ...sortedRecords.map((r, i) => [i + 1, r.pileNo, r.concreteGrade, r.concreteVolume, r.concreteStartDate, r.concreteStartTime, r.concreteEndDate, r.concreteEndTime, r.constructionTeam]),
        [],
        ['合计', '', '', sortedRecords.reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0).toFixed(2), '', '', '', '', sortedRecords.length + '根桩'],
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, '混凝土灌注记录')
    } else if (activeTab === 'daily') {
      const totalVolume = dailyRecords.reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0).toFixed(2)
      const data = [
        [projectInfo.projectName || '桩基施工日汇总表'],
        ['施工单位', projectInfo.constructionUnit, '监理单位', projectInfo.supervisionUnit],
        ['日期：' + selectedDate],
        [],
        ['序号', '桩号', '钻机类型', '钻机编号', '设计桩径(mm)', '设计桩长(m)', '实际桩长(m)', '入岩深度(m)', '混凝土等级', '方量(m3)', '施工班组', '记录员'],
        ...dailyRecords.map((r, i) => [i + 1, r.pileNo, r.machineType, r.machineNo, r.designPileDiameter, r.designPileDepth, r.actualPileDepth, r.rockEntryDepth, r.concreteGrade, r.concreteVolume, r.constructionTeam, r.recorder]),
        [],
        ['合计', '', '', '', '', '', '', '', '', totalVolume, '', dailyRecords.length + '根桩'],
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, '日汇总表')
    }
    XLSX.writeFile(wb, getExportFileName() + '.xlsx')
  }

  const toggleBatchId = (id: string) => {
    setSelectedBatchIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllBatch = () => {
    if (selectedBatchIds.size === batchCandidate.length && batchCandidate.length > 0) {
      setSelectedBatchIds(new Set())
    } else {
      setSelectedBatchIds(new Set(batchCandidate.map(r => r.id)))
    }
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
      <div ref={singlePileRef}>
        <ProjectHeader info={projectInfo} title="桩基施工记录" />
        <div className="print-info-row">
          <span>桩号：<strong>{selectedRecord.pileNo}</strong></span>
          <span>钻孔日期：{selectedRecord.drillDate}</span>
        </div>
        <table className="detail-table">
          <tbody>
            <tr><th>施工班组</th><td>{selectedRecord.constructionTeam}</td><th>记录员</th><td>{selectedRecord.recorder}</td></tr>
            <tr><th>钻机类型</th><td>{selectedRecord.machineType}</td><th>钻机编号</th><td>{selectedRecord.machineNo || '-'}</td></tr>
            <tr><th>设计桩径</th><td>{selectedRecord.designPileDiameter} mm</td><th>设计桩长</th><td>{selectedRecord.designPileDepth} m</td></tr>
            <tr><th>实际桩长</th><td>{selectedRecord.actualPileDepth} m</td><th>入岩深度</th><td>{selectedRecord.rockEntryDepth} m</td></tr>
            <tr><th>钻孔开始</th><td>{selectedRecord.drillStartTime || '-'}</td><th>钻孔结束</th><td>{selectedRecord.drillEndTime || '-'}</td></tr>
            <tr><th>入岩时间</th><td>{selectedRecord.rockEntryTime || '-'}</td><th></th><td></td></tr>
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
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#8c8c8c' }}>无地层记录</td></tr>
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
            <tr><th>清孔方式</th><td>{selectedRecord.holeCleaningMethod || '-'}</td><th>沉渣厚度</th><td>{selectedRecord.sedimentThickness ? selectedRecord.sedimentThickness + ' mm' : '-'}</td></tr>
            <tr><th>清孔开始</th><td>{selectedRecord.holeCleaningStartTime || '-'}</td><th>清孔结束</th><td>{selectedRecord.holeCleaningEndTime || '-'}</td></tr>
            <tr><th>清孔前泥浆比重</th><td>{selectedRecord.mudDensityBefore || '-'}</td><th>清孔后泥浆比重</th><td>{selectedRecord.mudDensityAfter || '-'}</td></tr>
          </tbody>
        </table>

        <h3 className="section-h3">混凝土灌注</h3>
        <table className="detail-table">
          <tbody>
            <tr><th>混凝土强度等级</th><td>{selectedRecord.concreteGrade}</td><th>灌注方量</th><td>{selectedRecord.concreteVolume} m³</td></tr>
            <tr><th>灌注开始</th><td colSpan={3}>{selectedRecord.concreteStartDate} {selectedRecord.concreteStartTime}</td></tr>
            <tr><th>灌注结束</th><td colSpan={3}>{selectedRecord.concreteEndDate} {selectedRecord.concreteEndTime}</td></tr>
          </tbody>
        </table>

        <h3 className="section-h3">钢筋笼</h3>
        <table className="detail-table">
          <tbody>
            <tr><th>钢筋笼长度</th><td>{selectedRecord.reinforcementCageLength ? selectedRecord.reinforcementCageLength + ' m' : '-'}</td><th>节数</th><td>{selectedRecord.reinforcementCageSections || '-'}</td></tr>
            <tr><th>焊接方式</th><td>{selectedRecord.weldingMethod || '-'}</td><th></th><td></td></tr>
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
            <div className="signature-label">施工员{projectInfo.siteEngineer ? '（' + projectInfo.siteEngineer + '）' : ''}</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">质检员</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">监理工程师{projectInfo.supervisionEngineer ? '（' + projectInfo.supervisionEngineer + '）' : ''}</div>
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
        </div>
      )
    }
    const totalVolume = sortedRecords.reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0)
    return (
      <div>
        <ProjectHeader info={projectInfo} title="混凝土灌注记录表" />
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
        </div>
      )
    }
    const totalVolume = dailyRecords.reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0)
    return (
      <div>
        <ProjectHeader info={projectInfo} title="桩基施工日汇总表" />
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
            <div className="signature-label">技术负责人{projectInfo.technicalDirector ? '（' + projectInfo.technicalDirector + '）' : ''}</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">监理工程师{projectInfo.supervisionEngineer ? '（' + projectInfo.supervisionEngineer + '）' : ''}</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
        </div>
      </div>
    )
  }

  const renderBatch = () => (
    <div>
      <ProjectHeader info={projectInfo} title="批量导出单桩施工记录" />
      <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
        <div>筛选出 <strong>{batchCandidate.length}</strong> 根桩，已勾选 <strong style={{ color: '#52c41a' }}>{selectedBatchIds.size}</strong> 根。
          批量导出会把选中的所有桩合并成一份 PDF（每根桩一页），并生成每桩一个 Sheet 的 Excel 文件。</div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '13px', color: '#595959' }}>施工日期：</label>
        <input type="date" value={batchDateFrom} onChange={e => setBatchDateFrom(e.target.value)} />
        <span style={{ color: '#8c8c8c' }}>至</span>
        <input type="date" value={batchDateTo} onChange={e => setBatchDateTo(e.target.value)} />
        <button className="btn btn-sm" onClick={() => { setBatchDateFrom(''); setBatchDateTo('') }}>清除日期</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={toggleAllBatch}>
          {selectedBatchIds.size === batchCandidate.length && batchCandidate.length > 0 ? '取消全选' : '全选'}
        </button>
      </div>

      <table className="record-table" style={{ marginBottom: '16px' }}>
        <thead>
          <tr>
            <th style={{ width: '50px' }}>选择</th>
            <th>桩号</th>
            <th>钻孔日期</th>
            <th>施工班组</th>
            <th>钻机类型</th>
            <th>实际桩长(m)</th>
            <th>混凝土</th>
            <th>方量(m³)</th>
          </tr>
        </thead>
        <tbody>
          {batchCandidate.length === 0 ? (
            <tr><td colSpan={8} className="empty-state-row">暂无符合条件的桩记录</td></tr>
          ) : batchCandidate.map(r => (
            <tr key={r.id}>
              <td style={{ textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedBatchIds.has(r.id)}
                  onChange={() => toggleBatchId(r.id)}
                  style={{ width: '16px', height: '16px' }}
                />
              </td>
              <td style={{ fontWeight: 600, color: '#1890ff' }}>{r.pileNo}</td>
              <td>{r.drillDate}</td>
              <td>{r.constructionTeam}</td>
              <td>{r.machineType}</td>
              <td>{r.actualPileDepth}</td>
              <td>{r.concreteGrade}</td>
              <td>{r.concreteVolume}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const tabBtnStyle = (tab: TabType) => ({
    border: 'none',
    background: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    borderBottom: activeTab === tab ? '2px solid #1890ff' : '2px solid transparent',
    marginBottom: '-2px',
    color: activeTab === tab ? '#1890ff' : '#595959',
    fontWeight: activeTab === tab ? 500 : 400,
    fontFamily: 'inherit',
    fontSize: '14px',
  })

  return (
    <div className="export-container">
      <div className="export-toolbar no-print">
        <label>
          <span style={{ marginRight: '6px' }}>资料类型：</span>
        </label>
        <div style={{ display: 'flex', gap: '2px', borderBottom: '2px solid #f0f0f0' }}>
          <button style={tabBtnStyle('single')} onClick={() => setActiveTab('single')}>单桩施工记录</button>
          <button style={tabBtnStyle('concrete')} onClick={() => setActiveTab('concrete')}>混凝土灌注记录</button>
          <button style={tabBtnStyle('daily')} onClick={() => setActiveTab('daily')}>当天汇总表</button>
          <button style={tabBtnStyle('batch')} onClick={() => setActiveTab('batch')}>批量导出</button>
        </div>

        <div style={{ flex: 1 }} />

        {activeTab === 'single' && (
          <>
            <label>选择桩号：</label>
            <select
              value={selectedPileId}
              onChange={e => setSelectedPileId(e.target.value)}
              style={{ minWidth: '220px', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '6px', fontSize: '13px' }}
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
              style={{ padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '6px', fontSize: '13px' }}
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
          onClick={activeTab === 'batch' ? handleBatchPDF : handleExportPDF}
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

      <div className="export-preview" ref={previewWrapRef}>
        {activeTab === 'single' && renderSinglePile()}
        {activeTab === 'concrete' && renderConcreteTable()}
        {activeTab === 'daily' && renderDailySummary()}
        {activeTab === 'batch' && renderBatch()}
      </div>
    </div>
  )
}

export default DataExport
