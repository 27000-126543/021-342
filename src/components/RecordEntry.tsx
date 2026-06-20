import { useState, useEffect, useMemo } from 'react'
import {
  PileRecord,
  StratumRecord,
  defaultPileRecord,
  commonMachineTypes,
  commonConcreteGrades,
  commonHoleCleaningMethods,
  commonWeldingMethods,
  commonStrata,
} from '../types/pileRecord'
import { generateId } from '../services/storage'

interface RecordEntryProps {
  records: PileRecord[]
  onSave: (record: PileRecord) => void
  onDelete: (id: string) => void
}

const requiredFields: (keyof PileRecord)[] = [
  'pileNo',
  'drillDate',
  'machineType',
  'designPileDiameter',
  'designPileDepth',
  'actualPileDepth',
  'rockEntryDepth',
  'concreteGrade',
  'concreteVolume',
  'concreteStartDate',
  'concreteStartTime',
  'concreteEndDate',
  'concreteEndTime',
  'constructionTeam',
  'recorder',
]

interface FormErrors {
  [key: string]: string
}

function RecordEntry({ records, onSave, onDelete }: RecordEntryProps) {
  const [currentRecord, setCurrentRecord] = useState<PileRecord>({
    ...defaultPileRecord,
    id: generateId(),
  })
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [searchText, setSearchText] = useState('')
  const [showTips, setShowTips] = useState(true)

  const filteredRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      if (a.drillDate === b.drillDate) {
        return a.pileNo.localeCompare(b.pileNo)
      }
      return b.drillDate.localeCompare(a.drillDate)
    })
    if (!searchText) return sorted
    return sorted.filter(
      r =>
        r.pileNo.toLowerCase().includes(searchText.toLowerCase()) ||
        r.constructionTeam.includes(searchText)
    )
  }, [records, searchText])

  const handleInputChange = (field: keyof PileRecord, value: string) => {
    setCurrentRecord(prev => ({
      ...prev,
      [field]: value,
    }))
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleStrataChange = (index: number, field: keyof StratumRecord, value: string) => {
    setCurrentRecord(prev => {
      const newStrata = [...prev.strata]
      newStrata[index] = { ...newStrata[index], [field]: value }
      return { ...prev, strata: newStrata }
    })
  }

  const addStrata = () => {
    setCurrentRecord(prev => ({
      ...prev,
      strata: [...prev.strata, { depth: '', stratum: '', description: '' }],
    }))
  }

  const removeStrata = (index: number) => {
    if (currentRecord.strata.length <= 1) return
    setCurrentRecord(prev => ({
      ...prev,
      strata: prev.strata.filter((_, i) => i !== index),
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    requiredFields.forEach(field => {
      const value = currentRecord[field]
      if (!value || value.toString().trim() === '') {
        newErrors[field] = '此项为必填项'
      }
    })
    if (currentRecord.strata.length === 0 || !currentRecord.strata.some(s => s.stratum)) {
      newErrors.strata = '请至少填写一层地层记录'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validateForm()) {
      setShowTips(true)
      return
    }
    const now = new Date().toISOString()
    const record: PileRecord = {
      ...currentRecord,
      updatedAt: now,
      createdAt: currentRecord.createdAt || now,
    }
    onSave(record)
    setActiveRecordId(record.id)
    alert('保存成功！')
  }

  const handleNewRecord = () => {
    setCurrentRecord({
      ...defaultPileRecord,
      id: generateId(),
    })
    setActiveRecordId(null)
    setErrors({})
  }

  const handleCopyLast = () => {
    const sorted = [...records].sort((a, b) =>
      (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)
    )
    if (sorted.length === 0) {
      alert('还没有任何记录可复制')
      return
    }
    const last = sorted[0]
    setCurrentRecord({
      ...last,
      id: generateId(),
      pileNo: '',
      createdAt: '',
      updatedAt: '',
    })
    setActiveRecordId(null)
    setErrors({})
  }

  const handleSelectRecord = (record: PileRecord) => {
    setCurrentRecord({ ...record })
    setActiveRecordId(record.id)
    setErrors({})
  }

  const handleDelete = () => {
    if (!activeRecordId) return
    if (
      confirm(`确定要删除桩号为 ${currentRecord.pileNo} 的记录吗？`)
    ) {
      onDelete(activeRecordId)
      handleNewRecord()
    }
  }

  const errorCount = Object.keys(errors).length

  return (
    <div className="record-entry-container">
      <div className="record-list">
        <div className="record-list-header">
          <h3>桩记录列表</h3>
          <button className="btn btn-primary btn-sm" onClick={handleNewRecord}>
            新增
          </button>
        </div>
        <div style={{ padding: '8px 12px' }}>
          <div className="search-box">
            <input
              type="text"
              placeholder="搜索桩号或班组..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
        </div>
        <div className="record-list-body">
          {filteredRecords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">暂无记录</div>
            </div>
          ) : (
            filteredRecords.map(record => (
              <div
                key={record.id}
                className={`record-item ${activeRecordId === record.id ? 'active' : ''}`}
                onClick={() => handleSelectRecord(record)}
              >
                <div className="pile-no">{record.pileNo}</div>
                <div className="pile-info">
                  {record.drillDate} · {record.constructionTeam || '未填写班组'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="record-form">
        <div className="form-toolbar">
          <button className="btn btn-sm" onClick={handleNewRecord}>
            ✚ 新建
          </button>
          <button className="btn btn-sm" onClick={handleCopyLast}>
            📋 复制上一根
          </button>
          <div className="spacer" />
          {errorCount > 0 && (
            <span style={{ color: '#ff4d4f', fontSize: '13px' }}>
              ⚠ 有 {errorCount} 项未填写
            </span>
          )}
          {activeRecordId && (
            <button className="btn btn-sm btn-link danger" onClick={handleDelete}>
              删除
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            💾 保存
          </button>
        </div>

        {showTips && errorCount > 0 && (
          <div className="tips-box">
            <span className="icon">💡</span>
            <div>
              <div style={{ marginBottom: '4px' }}>
                以下项目为必填项，漏填将无法保存。使用"复制上一根"功能可快速复用相同参数。
              </div>
              <button
                className="btn btn-link"
                style={{ padding: 0 }}
                onClick={() => setShowTips(false)}
              >
                知道了
              </button>
            </div>
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div className="form-section">
            <div className="section-title">基本信息</div>
            <div className="section-body">
              <div className="form-row">
                <div className="form-item">
                  <label>
                    <span className="required">*</span> 桩号
                  </label>
                  <input
                    type="text"
                    value={currentRecord.pileNo}
                    onChange={e => handleInputChange('pileNo', e.target.value)}
                    placeholder="例如：ZK-001"
                    className={errors.pileNo ? 'error' : ''}
                  />
                  {errors.pileNo && (
                    <span className="error-message">{errors.pileNo}</span>
                  )}
                </div>
                <div className="form-item">
                  <label>
                    <span className="required">*</span> 钻孔日期
                  </label>
                  <input
                    type="date"
                    value={currentRecord.drillDate}
                    onChange={e => handleInputChange('drillDate', e.target.value)}
                    className={errors.drillDate ? 'error' : ''}
                  />
                  {errors.drillDate && (
                    <span className="error-message">{errors.drillDate}</span>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-item">
                  <label>钻孔开始时间</label>
                  <input
                    type="time"
                    value={currentRecord.drillStartTime}
                    onChange={e => handleInputChange('drillStartTime', e.target.value)}
                  />
                </div>
                <div className="form-item">
                  <label>钻孔结束时间</label>
                  <input
                    type="time"
                    value={currentRecord.drillEndTime}
                    onChange={e => handleInputChange('drillEndTime', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-item">
                  <label>
                    <span className="required">*</span> 施工班组
                  </label>
                  <input
                    type="text"
                    value={currentRecord.constructionTeam}
                    onChange={e => handleInputChange('constructionTeam', e.target.value)}
                    placeholder="例如：张三班组"
                    className={errors.constructionTeam ? 'error' : ''}
                  />
                  {errors.constructionTeam && (
                    <span className="error-message">{errors.constructionTeam}</span>
                  )}
                </div>
                <div className="form-item">
                  <label>
                    <span className="required">*</span> 记录员
                  </label>
                  <input
                    type="text"
                    value={currentRecord.recorder}
                    onChange={e => handleInputChange('recorder', e.target.value)}
                    className={errors.recorder ? 'error' : ''}
                  />
                  {errors.recorder && (
                    <span className="error-message">{errors.recorder}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">钻机设备</div>
            <div className="section-body">
              <div className="form-row">
                <div className="form-item">
                  <label>
                    <span className="required">*</span> 钻机类型
                  </label>
                  <select
                    value={currentRecord.machineType}
                    onChange={e => handleInputChange('machineType', e.target.value)}
                    className={errors.machineType ? 'error' : ''}
                  >
                    <option value="">请选择</option>
                    {commonMachineTypes.map(type => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {errors.machineType && (
                    <span className="error-message">{errors.machineType}</span>
                  )}
                </div>
                <div className="form-item">
                  <label>钻机编号</label>
                  <input
                    type="text"
                    value={currentRecord.machineNo}
                    onChange={e => handleInputChange('machineNo', e.target.value)}
                    placeholder="例如：01号"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-item">
                  <label>
                    <span className="required">*</span> 设计桩径 (mm)
                  </label>
                  <input
                    type="text"
                    value={currentRecord.designPileDiameter}
                    onChange={e => handleInputChange('designPileDiameter', e.target.value)}
                    placeholder="例如：800"
                    className={errors.designPileDiameter ? 'error' : ''}
                  />
                  {errors.designPileDiameter && (
                    <span className="error-message">{errors.designPileDiameter}</span>
                  )}
                </div>
                <div className="form-item">
                  <label>
                    <span className="required">*</span> 设计桩长 (m)
                  </label>
                  <input
                    type="text"
                    value={currentRecord.designPileDepth}
                    onChange={e => handleInputChange('designPileDepth', e.target.value)}
                    placeholder="例如：25.5"
                    className={errors.designPileDepth ? 'error' : ''}
                  />
                  {errors.designPileDepth && (
                    <span className="error-message">{errors.designPileDepth}</span>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-item">
                  <label>
                    <span className="required">*</span> 实际桩长 (m)
                  </label>
                  <input
                    type="text"
                    value={currentRecord.actualPileDepth}
                    onChange={e => handleInputChange('actualPileDepth', e.target.value)}
                    placeholder="例如：26.2"
                    className={errors.actualPileDepth ? 'error' : ''}
                  />
                  {errors.actualPileDepth && (
                    <span className="error-message">{errors.actualPileDepth}</span>
                  )}
                </div>
                <div className="form-item">
                  <label>
                    <span className="required">*</span> 入岩深度 (m)
                  </label>
                  <input
                    type="text"
                    value={currentRecord.rockEntryDepth}
                    onChange={e => handleInputChange('rockEntryDepth', e.target.value)}
                    placeholder="例如：2.0"
                    className={errors.rockEntryDepth ? 'error' : ''}
                  />
                  {errors.rockEntryDepth && (
                    <span className="error-message">{errors.rockEntryDepth}</span>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-item">
                  <label>入岩时间</label>
                  <input
                    type="time"
                    value={currentRecord.rockEntryTime}
                    onChange={e => handleInputChange('rockEntryTime', e.target.value)}
                  />
                </div>
                <div className="form-item">
                  <label>入岩深度：从桩底到岩面的距离</label>
                  <div style={{ height: '32px' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">地层变化记录</div>
            <div className="section-body">
              {errors.strata && (
                <div className="tips-box" style={{ marginBottom: '12px' }}>
                  <span className="icon">⚠</span>
                  <span>{errors.strata}</span>
                </div>
              )}
              <table className="strata-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>序号</th>
                    <th>层底深度 (m)</th>
                    <th>地层名称</th>
                    <th>描述</th>
                    <th style={{ width: '60px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecord.strata.map((stratum, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td>
                      <input
                        type="text"
                        value={stratum.depth}
                        onChange={e => handleStrataChange(index, 'depth', e.target.value)}
                        placeholder="例如：3.5"
                      />
                    </td>
                    <td>
                      <select
                        value={stratum.stratum}
                        onChange={e => handleStrataChange(index, 'stratum', e.target.value)}
                      >
                        <option value="">请选择</option>
                        {commonStrata.map(s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={stratum.description || ''}
                        onChange={e => handleStrataChange(index, 'description', e.target.value)}
                        placeholder="可选描述"
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-link danger"
                        onClick={() => removeStrata(index)}
                        disabled={currentRecord.strata.length <= 1}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
              <button className="add-strata-btn" onClick={addStrata}>
                + 添加地层
              </button>
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">清孔情况</div>
            <div className="section-body">
              <div className="form-row">
                <div className="form-item">
                  <label>清孔方式</label>
                  <select
                    value={currentRecord.holeCleaningMethod}
                    onChange={e => handleInputChange('holeCleaningMethod', e.target.value)}
                  >
                    <option value="">请选择</option>
                    {commonHoleCleaningMethods.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-item">
                  <label>沉渣厚度 (mm)</label>
                  <input
                    type="text"
                    value={currentRecord.sedimentThickness}
                    onChange={e => handleInputChange('sedimentThickness', e.target.value)}
                    placeholder="例如：50"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-item">
                  <label>清孔开始时间</label>
                  <input
                    type="time"
                    value={currentRecord.holeCleaningStartTime}
                    onChange={e => handleInputChange('holeCleaningStartTime', e.target.value)}
                  />
                </div>
                <div className="form-item">
                  <label>清孔结束时间</label>
                  <input
                    type="time"
                    value={currentRecord.holeCleaningEndTime}
                    onChange={e => handleInputChange('holeCleaningEndTime', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-item">
                  <label>清孔前泥浆比重</label>
                  <input
                    type="text"
                    value={currentRecord.mudDensityBefore}
                    onChange={e => handleInputChange('mudDensityBefore', e.target.value)}
                    placeholder="例如：1.20"
                  />
                </div>
                <div className="form-item">
                  <label>清孔后泥浆比重</label>
                  <input
                    type="text"
                    value={currentRecord.mudDensityAfter}
                    onChange={e => handleInputChange('mudDensityAfter', e.target.value)}
                    placeholder="例如：1.05"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">混凝土灌注</div>
            <div className="section-body">
              <div className="form-row">
                <div className="form-item">
                  <label>
                    <span className="required">*</span> 混凝土强度等级
                  </label>
                  <select
                    value={currentRecord.concreteGrade}
                    onChange={e => handleInputChange('concreteGrade', e.target.value)}
                    className={errors.concreteGrade ? 'error' : ''}
                  >
                    <option value="">请选择</option>
                    {commonConcreteGrades.map(g => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  {errors.concreteGrade && (
                    <span className="error-message">{errors.concreteGrade}</span>
                  )}
                </div>
                <div className="form-item">
                  <label>
                    <span className="required">*</span> 灌注方量 (m³)
                  </label>
                  <input
                    type="text"
                    value={currentRecord.concreteVolume}
                    onChange={e => handleInputChange('concreteVolume', e.target.value)}
                    placeholder="例如：12.5"
                    className={errors.concreteVolume ? 'error' : ''}
                  />
                  {errors.concreteVolume && (
                    <span className="error-message">{errors.concreteVolume}</span>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-item">
                  <label>
                    <span className="required">*</span> 灌注开始日期
                  </label>
                  <input
                    type="date"
                    value={currentRecord.concreteStartDate}
                    onChange={e => handleInputChange('concreteStartDate', e.target.value)}
                    className={errors.concreteStartDate ? 'error' : ''}
                  />
                  {errors.concreteStartDate && (
                    <span className="error-message">{errors.concreteStartDate}</span>
                  )}
                </div>
                <div className="form-item">
                  <label>
                    <span className="required">*</span> 灌注开始时间
                  </label>
                  <input
                    type="time"
                    value={currentRecord.concreteStartTime}
                    onChange={e => handleInputChange('concreteStartTime', e.target.value)}
                    className={errors.concreteStartTime ? 'error' : ''}
                  />
                  {errors.concreteStartTime && (
                    <span className="error-message">{errors.concreteStartTime}</span>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-item">
                  <label>
                    <span className="required">*</span> 灌注结束日期
                  </label>
                  <input
                    type="date"
                    value={currentRecord.concreteEndDate}
                    onChange={e => handleInputChange('concreteEndDate', e.target.value)}
                    className={errors.concreteEndDate ? 'error' : ''}
                  />
                  {errors.concreteEndDate && (
                    <span className="error-message">{errors.concreteEndDate}</span>
                  )}
                </div>
                <div className="form-item">
                  <label>
                    <span className="required">*</span> 灌注结束时间
                  </label>
                  <input
                    type="time"
                    value={currentRecord.concreteEndTime}
                    onChange={e => handleInputChange('concreteEndTime', e.target.value)}
                    className={errors.concreteEndTime ? 'error' : ''}
                  />
                  {errors.concreteEndTime && (
                    <span className="error-message">{errors.concreteEndTime}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">钢筋笼</div>
            <div className="section-body">
              <div className="form-row">
                <div className="form-item">
                  <label>钢筋笼长度 (m)</label>
                  <input
                    type="text"
                    value={currentRecord.reinforcementCageLength}
                    onChange={e => handleInputChange('reinforcementCageLength', e.target.value)}
                    placeholder="例如：24.0"
                  />
                </div>
                <div className="form-item">
                  <label>钢筋笼节数</label>
                  <input
                    type="text"
                    value={currentRecord.reinforcementCageSections}
                    onChange={e => handleInputChange('reinforcementCageSections', e.target.value)}
                    placeholder="例如：3节"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-item">
                  <label>焊接方式</label>
                  <select
                    value={currentRecord.weldingMethod}
                    onChange={e => handleInputChange('weldingMethod', e.target.value)}
                  >
                    <option value="">请选择</option>
                    {commonWeldingMethods.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-item" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">备注</div>
            <div className="section-body">
              <div className="form-row">
                <div className="form-item">
                  <textarea
                    value={currentRecord.remarks}
                    onChange={e => handleInputChange('remarks', e.target.value)}
                    placeholder="其他需要说明的情况..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecordEntry
