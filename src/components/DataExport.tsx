import { useState, useMemo, useRef } from 'react'
import { PileRecord, ProjectInfo, ArchiveBatch, naturalCompare, naturalInRange } from '../types/pileRecord'
import { storageService, generateId } from '../services/storage'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

interface DataExportProps {
  records: PileRecord[]
  projectInfo: ProjectInfo
  onSaveArchiveBatch: (batch: ArchiveBatch) => void
}

type TabType = 'single' | 'concrete' | 'daily' | 'batch'

function ProjectHeader({ info, title, batchTag }: { info: ProjectInfo; title: string; batchTag?: string }) {
  return (
    <div className="project-header">
      {info.projectName && (
        <div className="project-name">{info.projectName}</div>
      )}
      <div style={{ fontSize: '16px', fontWeight: 600, color: '#262626', marginBottom: '6px' }}>
        {title}{batchTag ? ` · ${batchTag}` : ''}
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

function buildSinglePileHtml(r: PileRecord, info: ProjectInfo, batchTag?: string): string {
  const rockRows = r.strata
    .map((s, i) => `<tr><td style="padding:6px 8px;border:1px solid #d9d9d9;text-align:center;">${i + 1}</td><td style="padding:6px 8px;border:1px solid #d9d9d9;">${s.depth || '-'}</td><td style="padding:6px 8px;border:1px solid #d9d9d9;">${s.stratum || '-'}</td><td style="padding:6px 8px;border:1px solid #d9d9d9;">${s.description || '-'}</td></tr>`)
    .join('')
  const siteLabel = info.siteEngineer ? `施工员（${info.siteEngineer}）` : '施工员'
  const supLabel = info.supervisionEngineer ? `监理工程师（${info.supervisionEngineer}）` : '监理工程师'
  const titleHtml = batchTag ? `桩基施工记录 · ${batchTag}` : '桩基施工记录'
  return `
<div style="width:794px;padding:30px;background:#fff;font-family:'Microsoft YaHei','微软雅黑',sans-serif;color:#333;font-size:13px;box-sizing:border-box;">
  ${info.projectName ? `<div style="text-align:center;font-size:18px;font-weight:700;margin-bottom:6px;">${info.projectName}</div>` : ''}
  <div style="text-align:center;font-size:16px;font-weight:600;margin-bottom:6px;">${titleHtml}</div>
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
    </tbody>
  </table>
  <div style="font-size:14px;font-weight:600;margin:14px 0 6px;padding-left:8px;border-left:3px solid #1890ff;">地层变化记录</div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead><tr><th style="padding:6px 8px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">序号</th><th style="padding:6px 8px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">层底深度(m)</th><th style="padding:6px 8px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">地层名称</th><th style="padding:6px 8px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">描述</th></tr></thead>
    <tbody>${rockRows}</tbody>
  </table>
  <div style="display:flex;justify-content:space-around;margin-top:40px;padding-top:16px;border-top:1px solid #f0f0f0;">
    <div style="text-align:center;"><div>${siteLabel}</div><div style="width:110px;border-bottom:1px solid #999;margin:6px auto;"></div><div style="font-size:12px;color:#888;">签字</div></div>
    <div style="text-align:center;"><div>质检员</div><div style="width:110px;border-bottom:1px solid #999;margin:6px auto;"></div><div style="font-size:12px;color:#888;">签字</div></div>
    <div style="text-align:center;"><div>${supLabel}</div><div style="width:110px;border-bottom:1px solid #999;margin:6px auto;"></div><div style="font-size:12px;color:#888;">签字</div></div>
  </div>
</div>`
}

function buildBatchSummaryHtml(list: PileRecord[], info: ProjectInfo, batchInfo?: { batchName: string; reportDate: string; remarks: string }, dateRange?: { from: string; to: string }): string {
  const totalVolume = list.reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0)
  const rows = list
    .slice()
    .sort((a, b) => naturalCompare(a.pileNo, b.pileNo))
    .map((r, i) => `<tr><td style="padding:6px 8px;border:1px solid #d9d9d9;text-align:center;">${i + 1}</td><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.pileNo}</td><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.drillDate}</td><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.constructionTeam}</td><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.machineType}</td><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.actualPileDepth}</td><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.rockEntryDepth}</td><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.concreteGrade}</td><td style="padding:6px 8px;border:1px solid #d9d9d9;">${r.concreteVolume}</td></tr>`)
    .join('')
  const siteLabel = info.siteEngineer ? `施工员（${info.siteEngineer}）` : '施工员'
  const techLabel = info.technicalDirector ? `技术负责人（${info.technicalDirector}）` : '技术负责人'
  const supLabel = info.supervisionEngineer ? `监理工程师（${info.supervisionEngineer}）` : '监理工程师'
  const batchTag = batchInfo?.batchName ? ` · ${batchInfo.batchName}` : ''
  const dateStr = (dateRange?.from || '-') + ' 至 ' + (dateRange?.to || '-')
  return `
<div style="width:794px;padding:30px;background:#fff;font-family:'Microsoft YaHei','微软雅黑',sans-serif;color:#333;font-size:13px;box-sizing:border-box;">
  ${info.projectName ? `<div style="text-align:center;font-size:18px;font-weight:700;margin-bottom:6px;">${info.projectName}</div>` : ''}
  <div style="text-align:center;font-size:16px;font-weight:600;margin-bottom:6px;">批量单桩施工记录汇总表${batchTag}</div>
  <div style="display:flex;justify-content:space-between;font-size:12px;color:#595959;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #1890ff;flex-wrap:wrap;gap:8px;">
    ${info.constructionUnit ? `<span>施工单位：${info.constructionUnit}</span>` : ''}
    ${info.supervisionUnit ? `<span>监理单位：${info.supervisionUnit}</span>` : ''}
    <span>日期范围：${dateStr}</span>
    ${batchInfo?.reportDate ? `<span>报验日期：${batchInfo.reportDate}</span>` : ''}
  </div>
  ${batchInfo?.remarks ? `<div style="background:#fffbe6;border:1px solid #ffe58f;padding:6px 10px;margin-bottom:12px;font-size:12px;color:#613400;">报验备注：${batchInfo.remarks}</div>` : ''}
  <div style="font-weight:600;margin-bottom:8px;">共 ${list.length} 根桩，混凝土总方量：${totalVolume.toFixed(2)} m³</div>
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead><tr><th style="padding:6px 4px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">序号</th><th style="padding:6px 4px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">桩号</th><th style="padding:6px 4px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">日期</th><th style="padding:6px 4px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">班组</th><th style="padding:6px 4px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">钻机</th><th style="padding:6px 4px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">桩长(m)</th><th style="padding:6px 4px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">入岩(m)</th><th style="padding:6px 4px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">等级</th><th style="padding:6px 4px;border:1px solid #d9d9d9;background:#fafafa;font-weight:500;">方量(m³)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="display:flex;justify-content:space-around;margin-top:40px;padding-top:16px;border-top:1px solid #f0f0f0;">
    <div style="text-align:center;"><div>${siteLabel}</div><div style="width:110px;border-bottom:1px solid #999;margin:6px auto;"></div><div style="font-size:12px;color:#888;">签字</div></div>
    <div style="text-align:center;"><div>${techLabel}</div><div style="width:110px;border-bottom:1px solid #999;margin:6px auto;"></div><div style="font-size:12px;color:#888;">签字</div></div>
    <div style="text-align:center;"><div>${supLabel}</div><div style="width:110px;border-bottom:1px solid #999;margin:6px auto;"></div><div style="font-size:12px;color:#888;">签字</div></div>
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

async function htmlToPdfBlob(html: string): Promise<Blob> {
  const tempDiv = document.createElement('div')
  tempDiv.style.position = 'absolute'
  tempDiv.style.left = '-9999px'
  tempDiv.style.top = '-9999px'
  tempDiv.innerHTML = html
  document.body.appendChild(tempDiv)
  try {
    const pdf = new jsPDF('p', 'mm', 'a4')
    await elementToPdf(tempDiv, pdf, true)
    return pdf.output('blob')
  } finally {
    document.body.removeChild(tempDiv)
  }
}

interface BatchInfoForm {
  batchName: string
  reportDate: string
  remarks: string
}

function defaultBatchForm(): BatchInfoForm {
  return {
    batchName: '',
    reportDate: new Date().toISOString().split('T')[0],
    remarks: '',
  }
}

function DataExport({ records, projectInfo, onSaveArchiveBatch }: DataExportProps) {
  const [activeTab, setActiveTab] = useState<TabType>('single')
  const [selectedPileId, setSelectedPileId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [batchDateFrom, setBatchDateFrom] = useState<string>('')
  const [batchDateTo, setBatchDateTo] = useState<string>('')
  const [batchPileKeyword, setBatchPileKeyword] = useState<string>('')
  const [batchPileStart, setBatchPileStart] = useState<string>('')
  const [batchPileEnd, setBatchPileEnd] = useState<string>('')
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [pendingExport, setPendingExport] = useState<'merged_pdf' | 'separate_zip' | 'excel' | null>(null)
  const [batchForm, setBatchForm] = useState<BatchInfoForm>(defaultBatchForm())
  const previewWrapRef = useRef<HTMLDivElement>(null)
  const singlePileRef = useRef<HTMLDivElement>(null)

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => naturalCompare(a.pileNo, b.pileNo)),
    [records],
  )

  const selectedRecord = useMemo(
    () => records.find(r => r.id === selectedPileId) || null,
    [records, selectedPileId],
  )

  const dailyRecords = useMemo(
    () => records
      .filter(r => r.drillDate === selectedDate)
      .sort((a, b) => naturalCompare(a.pileNo, b.pileNo)),
    [records, selectedDate],
  )

  const batchCandidate = useMemo(() => {
    return sortedRecords.filter(r => {
      if (batchDateFrom && r.drillDate < batchDateFrom) return false
      if (batchDateTo && r.drillDate > batchDateTo) return false
      if (batchPileKeyword && !r.pileNo.toLowerCase().includes(batchPileKeyword.toLowerCase())) return false
      if (!naturalInRange(r.pileNo, batchPileStart, batchPileEnd)) return false
      return true
    })
  }, [sortedRecords, batchDateFrom, batchDateTo, batchPileKeyword, batchPileStart, batchPileEnd])

  const selectedBatchRecords = useMemo(
    () => sortedRecords.filter(r => selectedBatchIds.has(r.id)),
    [sortedRecords, selectedBatchIds],
  )

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

  const getBatchTag = () => batchForm.batchName?.trim() || ''

  const getExportFileName = (): string => {
    const dateStr = new Date().toISOString().split('T')[0]
    const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '')
    const tag = getBatchTag() ? `_${getBatchTag()}` : ''
    if (activeTab === 'single' && selectedRecord) return '单桩施工记录_' + selectedRecord.pileNo + '_' + dateStr
    if (activeTab === 'concrete') return '混凝土灌注记录_' + dateStr
    if (activeTab === 'daily') return '桩基施工日汇总表_' + selectedDate
    if (activeTab === 'batch') {
      const range = (batchDateFrom || '起始') + '_' + (batchDateTo || '截止')
      return `批量单桩记录_${range}${tag}_${dateStr}_${timeStr}`
    }
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

  const buildConcreteSignExcelRows = () => {
    const siteLabel = projectInfo.siteEngineer ? `施工员（${projectInfo.siteEngineer}）` : '施工员'
    const techLabel = projectInfo.technicalDirector ? `技术负责人（${projectInfo.technicalDirector}）` : '技术负责人'
    const supLabel = projectInfo.supervisionEngineer ? `监理工程师（${projectInfo.supervisionEngineer}）` : '监理工程师'
    return [
      [],
      ['签字栏'],
      [siteLabel, '', '', techLabel, '', '', supLabel, ''],
      ['签字：__________', '', '', '签字：__________', '', '', '签字：__________', ''],
    ]
  }

  const buildDailySignExcelRows = () => {
    const techLabel = projectInfo.technicalDirector ? `技术负责人（${projectInfo.technicalDirector}）` : '技术负责人'
    const supLabel = projectInfo.supervisionEngineer ? `监理工程师（${projectInfo.supervisionEngineer}）` : '监理工程师'
    return [
      [],
      ['签字栏'],
      ['记录员', '', '', techLabel, '', '', supLabel, ''],
      ['签字：__________', '', '', '签字：__________', '', '', '签字：__________', ''],
    ]
  }

  const buildBatchSignExcelRows = () => {
    const siteLabel = projectInfo.siteEngineer ? `施工员（${projectInfo.siteEngineer}）` : '施工员'
    const techLabel = projectInfo.technicalDirector ? `技术负责人（${projectInfo.technicalDirector}）` : '技术负责人'
    const supLabel = projectInfo.supervisionEngineer ? `监理工程师（${projectInfo.supervisionEngineer}）` : '监理工程师'
    return [
      [],
      ['签字栏'],
      [siteLabel, '', '', techLabel, '', '', supLabel, ''],
      ['签字：__________', '', '', '签字：__________', '', '', '签字：__________', ''],
    ]
  }

  const saveArchiveBatchNow = (selectedList: PileRecord[]) => {
    const batch: ArchiveBatch = {
      id: generateId(),
      batchName: batchForm.batchName.trim(),
      reportDate: batchForm.reportDate,
      remarks: batchForm.remarks.trim(),
      dateFrom: batchDateFrom,
      dateTo: batchDateTo,
      pileNos: selectedList.map(r => r.pileNo),
      pileIds: selectedList.map(r => r.id),
      exportedAt: new Date().toISOString(),
    }
    onSaveArchiveBatch(batch)
    return batch
  }

  const handleBatchMergedPDF = async () => {
    if (!canExportBatch) { alert(getEmptyTip()); return }
    setPendingExport('merged_pdf')
    setShowBatchModal(true)
  }

  const executeMergedPDF = async (withBatch: boolean) => {
    if (!canExportBatch) return
    setIsExporting(true)
    setShowBatchModal(false)
    try {
      const list = selectedBatchRecords
      const batchInfo = withBatch ? batchForm : undefined
      const dateRange = { from: batchDateFrom, to: batchDateTo }
      const tag = withBatch ? getBatchTag() : ''
      const pdf = new jsPDF('p', 'mm', 'a4')
      const summaryHtml = buildBatchSummaryHtml(list, projectInfo, batchInfo, dateRange)
      const summaryDiv = document.createElement('div')
      summaryDiv.style.position = 'absolute'
      summaryDiv.style.left = '-9999px'
      summaryDiv.style.top = '-9999px'
      summaryDiv.innerHTML = summaryHtml
      document.body.appendChild(summaryDiv)
      try {
        await elementToPdf(summaryDiv, pdf, true)
      } finally {
        document.body.removeChild(summaryDiv)
      }
      for (let i = 0; i < list.length; i++) {
        const r = list[i]
        const html = buildSinglePileHtml(r, projectInfo, tag)
        const tempDiv = document.createElement('div')
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '-9999px'
        tempDiv.innerHTML = html
        document.body.appendChild(tempDiv)
        try {
          await elementToPdf(tempDiv, pdf, false)
        } finally {
          document.body.removeChild(tempDiv)
        }
      }
      pdf.save(getExportFileName() + (withBatch ? '_合并版.pdf' : '_合并版.pdf'))
      if (withBatch) saveArchiveBatchNow(list)
    } catch (err) {
      console.error('批量PDF导出失败：', err)
      alert('批量导出失败，请重试')
    } finally {
      setIsExporting(false)
      setBatchForm(defaultBatchForm())
      setPendingExport(null)
    }
  }

  const handleBatchSeparatePDFZip = async () => {
    if (!canExportBatch) { alert(getEmptyTip()); return }
    setPendingExport('separate_zip')
    setShowBatchModal(true)
  }

  const executeSeparateZip = async (withBatch: boolean) => {
    if (!canExportBatch) return
    setIsExporting(true)
    setShowBatchModal(false)
    try {
      const list = selectedBatchRecords.slice().sort((a, b) => naturalCompare(a.pileNo, b.pileNo))
      const batchInfo = withBatch ? batchForm : undefined
      const tag = withBatch ? getBatchTag() : ''
      const dateRange = { from: batchDateFrom, to: batchDateTo }
      const zip = new JSZip()
      const folder = zip.folder('单桩施工记录')
      for (let i = 0; i < list.length; i++) {
        const r = list[i]
        const html = buildSinglePileHtml(r, projectInfo, tag)
        const blob = await htmlToPdfBlob(html)
        const fileName = `${r.drillDate}_${r.pileNo}_单桩施工记录.pdf`
        folder?.file(fileName, blob)
      }
      const summaryHtml = buildBatchSummaryHtml(list, projectInfo, batchInfo, dateRange)
      const summaryBlob = await htmlToPdfBlob(summaryHtml)
      const summaryName = `${batchDateFrom || '起始'}_${batchDateTo || '截止'}${tag ? '_' + tag : ''}_汇总表.pdf`
      folder?.file(summaryName, summaryBlob)
      const txtContent = [
        '批量导出说明',
        '==========================================',
        `工程名称：${projectInfo.projectName || '-'}`,
        `施工单位：${projectInfo.constructionUnit || '-'}`,
        `监理单位：${projectInfo.supervisionUnit || '-'}`,
        withBatch ? `报验批次：${batchForm.batchName}` : '',
        withBatch ? `报验日期：${batchForm.reportDate}` : '',
        withBatch ? `备注：${batchForm.remarks}` : '',
        `施工日期范围：${dateRange.from || '-'} 至 ${dateRange.to || '-'}`,
        `共 ${list.length} 根桩`,
        `导出时间：${new Date().toLocaleString()}`,
      ].filter(Boolean).join('\r\n')
      folder?.file('导出说明.txt', txtContent)
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = getExportFileName() + '_分桩包.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      if (withBatch) saveArchiveBatchNow(list)
    } catch (err) {
      console.error('分桩PDF打包失败：', err)
      alert('分桩打包失败，请重试')
    } finally {
      setIsExporting(false)
      setBatchForm(defaultBatchForm())
      setPendingExport(null)
    }
  }

  const handleBatchExcel = () => {
    if (!canExportBatch) { alert(getEmptyTip()); return }
    setPendingExport('excel')
    setShowBatchModal(true)
  }

  const executeBatchExcel = (withBatch: boolean) => {
    if (!canExportBatch) return
    setShowBatchModal(false)
    try {
      const list = selectedBatchRecords.slice().sort((a, b) => naturalCompare(a.pileNo, b.pileNo))
      const batchInfo = withBatch ? batchForm : undefined
      const wb = XLSX.utils.book_new()
      list.forEach(r => {
        const safeName = r.pileNo.substring(0, 28).replace(/[\\/?*\[\]:]/g, '_')
        const data = [
          [projectInfo.projectName || '桩基施工记录'],
          withBatch && batchInfo?.batchName ? ['报验批次：' + batchInfo.batchName] : [],
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
        ].filter(row => row.length > 0)
        const ws = XLSX.utils.aoa_to_sheet(data)
        XLSX.utils.book_append_sheet(wb, ws, safeName)
      })
      const totalVolume = list.reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0)
      const signRows = buildBatchSignExcelRows()
      const summary = [
        [projectInfo.projectName || '批量单桩施工记录汇总表'],
        batchInfo?.batchName ? ['报验批次：' + batchInfo.batchName] : [],
        batchInfo?.reportDate ? ['报验日期：' + batchInfo.reportDate] : [],
        batchInfo?.remarks ? ['备注：' + batchInfo.remarks] : [],
        ['施工单位', projectInfo.constructionUnit, '监理单位', projectInfo.supervisionUnit],
        ['导出时间', new Date().toLocaleString()],
        ['日期范围', (batchDateFrom || '-') + ' 至 ' + (batchDateTo || '-')],
        ['共', list.length + ' 根桩', '', '混凝土总方量(m3)', totalVolume.toFixed(2)],
        [],
        ['序号', '桩号', '桩径(mm)', '桩长(m)', '入岩(m)', '混凝土', '方量(m3)', '班组', '日期'],
        ...list.map((r, i) => [i + 1, r.pileNo, r.designPileDiameter, r.actualPileDepth, r.rockEntryDepth, r.concreteGrade, r.concreteVolume, r.constructionTeam, r.drillDate]),
        ...signRows,
      ].filter(row => row.length > 0)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), '汇总')
      XLSX.writeFile(wb, getExportFileName() + '.xlsx')
      if (withBatch) saveArchiveBatchNow(list)
    } catch (err) {
      console.error('Excel导出失败：', err)
      alert('Excel导出失败，请重试')
    } finally {
      setBatchForm(defaultBatchForm())
      setPendingExport(null)
    }
  }

  const handleExportExcel = () => {
    if (activeTab === 'batch') return handleBatchExcel()
    if (!canExport) { alert(getEmptyTip()); return }
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
      const signRows = buildConcreteSignExcelRows()
      const data = [
        [projectInfo.projectName || '混凝土灌注记录表'],
        ['施工单位', projectInfo.constructionUnit, '监理单位', projectInfo.supervisionUnit],
        [],
        ['序号', '桩号', '混凝土等级', '方量(m3)', '开始日期', '开始时间', '结束日期', '结束时间', '施工班组'],
        ...sortedRecords.map((r, i) => [i + 1, r.pileNo, r.concreteGrade, r.concreteVolume, r.concreteStartDate, r.concreteStartTime, r.concreteEndDate, r.concreteEndTime, r.constructionTeam]),
        [],
        ['合计', '', '', sortedRecords.reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0).toFixed(2), '', '', '', '', sortedRecords.length + '根桩'],
        ...signRows,
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, '混凝土灌注记录')
    } else if (activeTab === 'daily') {
      const totalVolume = dailyRecords.reduce((s, r) => s + (parseFloat(r.concreteVolume) || 0), 0).toFixed(2)
      const signRows = buildDailySignExcelRows()
      const data = [
        [projectInfo.projectName || '桩基施工日汇总表'],
        ['施工单位', projectInfo.constructionUnit, '监理单位', projectInfo.supervisionUnit],
        ['日期：' + selectedDate],
        [],
        ['序号', '桩号', '钻机类型', '钻机编号', '设计桩径(mm)', '设计桩长(m)', '实际桩长(m)', '入岩深度(m)', '混凝土等级', '方量(m3)', '施工班组', '记录员'],
        ...dailyRecords.map((r, i) => [i + 1, r.pileNo, r.machineType, r.machineNo, r.designPileDiameter, r.designPileDepth, r.actualPileDepth, r.rockEntryDepth, r.concreteGrade, r.concreteVolume, r.constructionTeam, r.recorder]),
        [],
        ['合计', '', '', '', '', '', '', '', '', totalVolume, '', dailyRecords.length + '根桩'],
        ...signRows,
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

  const toggleAllFiltered = () => {
    const filteredIds = batchCandidate.map(r => r.id)
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedBatchIds.has(id))
    setSelectedBatchIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        filteredIds.forEach(id => next.delete(id))
      } else {
        filteredIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  const allFilteredSelected = batchCandidate.length > 0 && batchCandidate.every(r => selectedBatchIds.has(r.id))

  const siteLabel = projectInfo.siteEngineer ? `施工员（${projectInfo.siteEngineer}）` : '施工员'
  const techLabel = projectInfo.technicalDirector ? `技术负责人（${projectInfo.technicalDirector}）` : '技术负责人'
  const supLabel = projectInfo.supervisionEngineer ? `监理工程师（${projectInfo.supervisionEngineer}）` : '监理工程师'

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
            <div className="signature-label">{siteLabel}</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">质检员</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">{supLabel}</div>
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

        <div className="signature-row">
          <div className="signature-item">
            <div className="signature-label">{siteLabel}</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">{techLabel}</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">{supLabel}</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
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
            <div className="signature-label">{techLabel}</div>
            <div className="signature-line"></div>
            <div className="signature-hint">签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-label">{supLabel}</div>
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
        <div>共 <strong>{batchCandidate.length}</strong> 根桩符合筛选条件，已勾选 <strong style={{ color: '#52c41a' }}>{selectedBatchIds.size}</strong> 根（全库共 {sortedRecords.length} 根）。
          批量导出支持：① 合并PDF；② 分桩PDF包（内含汇总表）；③ Excel（每桩一个 Sheet + 汇总 Sheet + 签字栏）。
          导出前可填写报验批次信息，台账中可按批次回看。
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap', rowGap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: '#595959' }}>施工日期：</label>
          <input type="date" value={batchDateFrom} onChange={e => setBatchDateFrom(e.target.value)} style={{ padding: '5px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px' }} />
          <span style={{ color: '#8c8c8c' }}>至</span>
          <input type="date" value={batchDateTo} onChange={e => setBatchDateTo(e.target.value)} style={{ padding: '5px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: '#595959' }}>桩号关键字：</label>
          <input
            type="text"
            placeholder="如：ZK"
            value={batchPileKeyword}
            onChange={e => setBatchPileKeyword(e.target.value)}
            style={{ padding: '5px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px', width: '120px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: '#595959' }}>桩号范围：</label>
          <input
            type="text"
            placeholder="如 ZK1"
            title="自然排序比较：ZK1 到 ZK10 会正确包含中间编号"
            value={batchPileStart}
            onChange={e => setBatchPileStart(e.target.value)}
            style={{ padding: '5px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px', width: '90px' }}
          />
          <span style={{ color: '#8c8c8c' }}>~</span>
          <input
            type="text"
            placeholder="如 ZK10"
            title="自然排序比较：ZK1 到 ZK10 会正确包含中间编号"
            value={batchPileEnd}
            onChange={e => setBatchPileEnd(e.target.value)}
            style={{ padding: '5px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px', width: '90px' }}
          />
        </div>

        <button
          className="btn btn-sm"
          onClick={() => { setBatchDateFrom(''); setBatchDateTo(''); setBatchPileKeyword(''); setBatchPileStart(''); setBatchPileEnd('') }}
        >
          清除筛选
        </button>

        <div style={{ flex: 1 }} />

        <button className="btn btn-sm" onClick={toggleAllFiltered}>
          {allFilteredSelected ? '取消全选' : '全选当前'}
        </button>
      </div>

      <table className="record-table" style={{ marginBottom: '16px' }}>
        <thead>
          <tr>
            <th style={{ width: '50px' }}>
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleAllFiltered}
                style={{ width: '16px', height: '16px' }}
              />
            </th>
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

  const confirmExportWithBatch = () => {
    if (!batchForm.batchName.trim()) {
      alert('请填写报验批次名称')
      return
    }
    if (pendingExport === 'merged_pdf') executeMergedPDF(true)
    else if (pendingExport === 'separate_zip') executeSeparateZip(true)
    else if (pendingExport === 'excel') executeBatchExcel(true)
  }

  const skipBatchExport = () => {
    if (pendingExport === 'merged_pdf') executeMergedPDF(false)
    else if (pendingExport === 'separate_zip') executeSeparateZip(false)
    else if (pendingExport === 'excel') executeBatchExcel(false)
  }

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

        {activeTab === 'batch' ? (
          <>
            <button
              className="btn btn-primary"
              onClick={handleBatchMergedPDF}
              disabled={!canExportBatch || isExporting}
              style={{ opacity: !canExportBatch ? 0.5 : 1, cursor: !canExportBatch ? 'not-allowed' : 'pointer' }}
            >
              {isExporting ? '⏳ 导出中...' : '📄 合并PDF'}
            </button>
            <button
              className="btn"
              onClick={handleBatchSeparatePDFZip}
              disabled={!canExportBatch || isExporting}
              style={{ opacity: !canExportBatch ? 0.5 : 1, cursor: !canExportBatch ? 'not-allowed' : 'pointer' }}
            >
              📦 分桩PDF包
            </button>
            <button
              className="btn btn-success"
              onClick={handleExportExcel}
              disabled={!canExportBatch || isExporting}
              style={{ opacity: !canExportBatch ? 0.5 : 1, cursor: !canExportBatch ? 'not-allowed' : 'pointer' }}
            >
              📊 导出Excel
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className="export-preview" ref={previewWrapRef}>
        {activeTab === 'single' && renderSinglePile()}
        {activeTab === 'concrete' && renderConcreteTable()}
        {activeTab === 'daily' && renderDailySummary()}
        {activeTab === 'batch' && renderBatch()}
      </div>

      {showBatchModal && (
        <div className="modal-mask no-print" onClick={() => !isExporting && (setShowBatchModal(false), setPendingExport(null), setBatchForm(defaultBatchForm()))}>
          <div className="modal-panel" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 归档批次信息（可选）</h3>
              <button className="modal-close" disabled={isExporting} onClick={() => { setShowBatchModal(false); setPendingExport(null); setBatchForm(defaultBatchForm()) }}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', padding: '10px 12px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px', color: '#0050b3' }}>
                填写后将在导出文件（汇总表标题、签字栏、文件名）中体现批次信息，并在台账中保存本次报验记录便于回看。
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '90px', fontSize: '13px', color: '#595959' }}>
                    <span style={{ color: '#ff4d4f' }}>*</span> 报验批次：
                  </label>
                  <input
                    type="text"
                    placeholder="如：第01批、5月上旬批次"
                    value={batchForm.batchName}
                    onChange={e => setBatchForm(prev => ({ ...prev, batchName: e.target.value }))}
                    style={{ flex: 1, padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '90px', fontSize: '13px', color: '#595959' }}>报验日期：</label>
                  <input
                    type="date"
                    value={batchForm.reportDate}
                    onChange={e => setBatchForm(prev => ({ ...prev, reportDate: e.target.value }))}
                    style={{ flex: 1, padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <label style={{ width: '90px', fontSize: '13px', color: '#595959', marginTop: '6px' }}>备注：</label>
                  <textarea
                    rows={3}
                    placeholder="如：共36根，分两次报验；含试桩3根"
                    value={batchForm.remarks}
                    onChange={e => setBatchForm(prev => ({ ...prev, remarks: e.target.value }))}
                    style={{ flex: 1, padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  本次选择：<strong>{selectedBatchRecords.length}</strong> 根桩，日期范围：
                  <strong>{batchDateFrom || '-'}</strong> 至 <strong>{batchDateTo || '-'}</strong>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" disabled={isExporting} onClick={skipBatchExport}>不填批次，直接导出</button>
              <button className="btn btn-primary" disabled={isExporting} onClick={confirmExportWithBatch}>
                {isExporting ? '⏳ 导出中...' : '填写批次并导出'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataExport
