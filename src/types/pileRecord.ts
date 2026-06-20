export interface ProjectInfo {
  projectName: string
  constructionUnit: string
  supervisionUnit: string
  projectManager: string
  technicalDirector: string
  siteEngineer: string
  supervisionEngineer: string
  reportNo: string
}

export interface ArchiveBatch {
  id: string
  batchName: string
  reportDate: string
  remarks: string
  dateFrom: string
  dateTo: string
  pileNos: string[]
  pileIds: string[]
  exportedAt: string
}

export const defaultProjectInfo: ProjectInfo = {
  projectName: '',
  constructionUnit: '',
  supervisionUnit: '',
  projectManager: '',
  technicalDirector: '',
  siteEngineer: '',
  supervisionEngineer: '',
  reportNo: '',
}

export interface StratumRecord {
  depth: string
  stratum: string
  description?: string
}

export interface PileRecord {
  id: string
  pileNo: string
  drillDate: string
  drillStartTime: string
  drillEndTime: string
  machineType: string
  machineNo: string
  designPileDiameter: string
  designPileDepth: string
  actualPileDepth: string
  strata: StratumRecord[]
  rockEntryDepth: string
  rockEntryTime: string
  holeCleaningMethod: string
  holeCleaningStartTime: string
  holeCleaningEndTime: string
  mudDensityBefore: string
  mudDensityAfter: string
  sedimentThickness: string
  concreteGrade: string
  concreteVolume: string
  concreteStartDate: string
  concreteStartTime: string
  concreteEndDate: string
  concreteEndTime: string
  reinforcementCageLength: string
  reinforcementCageSections: string
  weldingMethod: string
  constructionTeam: string
  recorder: string
  remarks: string
  createdAt: string
  updatedAt: string
}

export const defaultPileRecord: PileRecord = {
  id: '',
  pileNo: '',
  drillDate: new Date().toISOString().split('T')[0],
  drillStartTime: '',
  drillEndTime: '',
  machineType: '',
  machineNo: '',
  designPileDiameter: '',
  designPileDepth: '',
  actualPileDepth: '',
  strata: [
    { depth: '', stratum: '', description: '' },
  ],
  rockEntryDepth: '',
  rockEntryTime: '',
  holeCleaningMethod: '',
  holeCleaningStartTime: '',
  holeCleaningEndTime: '',
  mudDensityBefore: '',
  mudDensityAfter: '',
  sedimentThickness: '',
  concreteGrade: '',
  concreteVolume: '',
  concreteStartDate: '',
  concreteStartTime: '',
  concreteEndDate: '',
  concreteEndTime: '',
  reinforcementCageLength: '',
  reinforcementCageSections: '',
  weldingMethod: '',
  constructionTeam: '',
  recorder: '',
  remarks: '',
  createdAt: '',
  updatedAt: '',
}

export const commonMachineTypes = [
  '旋挖钻机',
  '冲击钻机',
  '回转钻机',
  '长螺旋钻机',
  '潜水钻机',
  '冲孔桩机',
  '人工挖孔',
]

export const commonConcreteGrades = [
  'C25',
  'C30',
  'C35',
  'C40',
  'C45',
  'C50',
]

export const commonHoleCleaningMethods = [
  '正循环清孔',
  '反循环清孔',
  '抽浆法清孔',
  '换浆法清孔',
  '掏渣法清孔',
  '喷射清孔',
]

export const commonWeldingMethods = [
  '单面焊',
  '双面焊',
  '闪光对焊',
  '机械连接',
  '套筒连接',
]

export const commonStrata = [
  '素填土',
  '杂填土',
  '粉质黏土',
  '黏土',
  '粉土',
  '砂土',
  '圆砾',
  '卵石',
  '强风化岩',
  '中风化岩',
  '微风化岩',
  '花岗岩',
  '石灰岩',
  '砂岩',
  '泥岩',
]

export function naturalCompare(a: string, b: string): number {
  const reg = /(\d+)|(\D+)/g
  const aParts = a.match(reg) || [a]
  const bParts = b.match(reg) || [b]
  const len = Math.max(aParts.length, bParts.length)
  for (let i = 0; i < len; i++) {
    const ap = aParts[i] || ''
    const bp = bParts[i] || ''
    const an = parseInt(ap, 10)
    const bn = parseInt(bp, 10)
    if (!isNaN(an) && !isNaN(bn)) {
      if (an !== bn) return an - bn
    } else {
      const cmp = ap.localeCompare(bp, 'zh-Hans-CN')
      if (cmp !== 0) return cmp
    }
  }
  return 0
}

export function naturalInRange(value: string, start: string, end: string): boolean {
  if (start && naturalCompare(value, start) < 0) return false
  if (end && naturalCompare(value, end) > 0) return false
  return true
}
