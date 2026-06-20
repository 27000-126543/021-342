import { useState, useEffect } from 'react'
import { ProjectInfo, defaultProjectInfo } from '../types/pileRecord'

interface Props {
  visible: boolean
  initialValue: ProjectInfo
  onClose: () => void
  onSave: (info: ProjectInfo) => void
}

function ProjectInfoModal({ visible, initialValue, onClose, onSave }: Props) {
  const [form, setForm] = useState<ProjectInfo>(initialValue)

  useEffect(() => {
    setForm(initialValue)
  }, [initialValue, visible])

  if (!visible) return null

  const handleChange = (field: keyof ProjectInfo, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    onSave(form)
  }

  return (
    <div
      className="modal-mask"
      onClick={onClose}
    >
      <div
        className="modal-panel"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>项目基础信息设置</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="tips-box" style={{ marginBottom: '16px' }}>
            <span className="icon">ℹ️</span>
            <span>以下信息只需填写一次，所有导出资料（单桩记录、灌注记录、汇总表）会自动带出工程名称、参建单位、签字区。</span>
          </div>

          <div className="form-row">
            <div className="form-item" style={{ flex: 2 }}>
              <label><span className="required">*</span> 工程名称</label>
              <input
                type="text"
                value={form.projectName}
                onChange={e => handleChange('projectName', e.target.value)}
                placeholder="例如：XX市轨道交通1号线一期工程"
              />
            </div>
            <div className="form-item">
              <label>报告编号</label>
              <input
                type="text"
                value={form.reportNo}
                onChange={e => handleChange('reportNo', e.target.value)}
                placeholder="例如：JG-2025-001"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-item">
              <label><span className="required">*</span> 施工单位</label>
              <input
                type="text"
                value={form.constructionUnit}
                onChange={e => handleChange('constructionUnit', e.target.value)}
                placeholder="例如：中铁XX局集团有限公司"
              />
            </div>
            <div className="form-item">
              <label><span className="required">*</span> 监理单位</label>
              <input
                type="text"
                value={form.supervisionUnit}
                onChange={e => handleChange('supervisionUnit', e.target.value)}
                placeholder="例如：XX监理咨询有限公司"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-item">
              <label>项目经理</label>
              <input
                type="text"
                value={form.projectManager}
                onChange={e => handleChange('projectManager', e.target.value)}
                placeholder="施工单位项目经理"
              />
            </div>
            <div className="form-item">
              <label>技术负责人</label>
              <input
                type="text"
                value={form.technicalDirector}
                onChange={e => handleChange('technicalDirector', e.target.value)}
                placeholder="项目技术负责人"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-item">
              <label>施工员 / 现场工程师</label>
              <input
                type="text"
                value={form.siteEngineer}
                onChange={e => handleChange('siteEngineer', e.target.value)}
              />
            </div>
            <div className="form-item">
              <label>监理工程师</label>
              <input
                type="text"
                value={form.supervisionEngineer}
                onChange={e => handleChange('supervisionEngineer', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit}>保存设置</button>
        </div>
      </div>
    </div>
  )
}

export default ProjectInfoModal
