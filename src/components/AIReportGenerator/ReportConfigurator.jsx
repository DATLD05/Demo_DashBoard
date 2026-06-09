import { Bot, CalendarRange, Sparkles } from 'lucide-react';

const ReportConfigurator = ({
  reportTypes,
  datePresets,
  formValues,
  selectedPreset,
  onChange,
  onPresetSelect,
  onSubmit,
  isLoading,
  error,
}) => {
  return (
    <section className="ai-report-panel ai-report-panel-strong">
      <div className="ai-report-panel-header">
        <div>
          <p className="ai-report-eyebrow">Input Configuration</p>
          <h2>Cấu hình báo cáo AI</h2>
        </div>
        <div className="ai-report-header-icon">
          <Bot size={20} aria-hidden="true" />
        </div>
      </div>

      <div className="ai-report-form-grid">
        <label className="ai-report-field">
          <span>Loại báo cáo</span>
          <div className="ai-report-input-shell">
            <Sparkles size={16} aria-hidden="true" />
            <select
              value={formValues.reportType}
              onChange={(event) => onChange('reportType', event.target.value)}
              disabled={isLoading}
            >
              {reportTypes.map((reportType) => (
                <option key={reportType.value} value={reportType.value}>
                  {reportType.label}
                </option>
              ))}
            </select>
          </div>
          <small>
            {
              reportTypes.find((reportType) => reportType.value === formValues.reportType)
                ?.description
            }
          </small>
        </label>

        <div className="ai-report-field">
          <span>Khoảng thời gian</span>
          <div className="ai-report-preset-grid">
            {datePresets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`ai-report-preset-button ${
                  selectedPreset === preset.value ? 'is-active' : ''
                }`}
                onClick={() => onPresetSelect(preset.value)}
                disabled={isLoading}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="ai-report-date-grid">
            <label className={`ai-report-date-field ${formValues.allTime ? 'is-disabled' : ''}`}>
              <span className="ai-report-date-label">Từ ngày</span>
              <div className="ai-report-input-shell">
                <CalendarRange size={16} aria-hidden="true" />
                <input
                  type="date"
                  value={formValues.startDate}
                  onChange={(event) => onChange('startDate', event.target.value)}
                  disabled={isLoading || formValues.allTime}
                  max={formValues.endDate}
                />
              </div>
            </label>

            <label className={`ai-report-date-field ${formValues.allTime ? 'is-disabled' : ''}`}>
              <span className="ai-report-date-label">Đến ngày</span>
              <div className="ai-report-input-shell">
                <CalendarRange size={16} aria-hidden="true" />
                <input
                  type="date"
                  value={formValues.endDate}
                  onChange={(event) => onChange('endDate', event.target.value)}
                  disabled={isLoading || formValues.allTime}
                  min={formValues.startDate}
                />
              </div>
            </label>
          </div>

          <small>
            Gợi ý: nếu bộ data cũ, dùng preset <strong>Tất cả</strong>, <strong>Năm trước</strong>
            {' '}hoặc chuyển sang <strong>Tùy chọn</strong> để nhảy nhanh về mốc lịch sử.
          </small>
        </div>
      </div>

      {error ? <p className="ai-report-error">{error}</p> : null}

      <button
        type="button"
        className="ai-report-primary-button"
        onClick={onSubmit}
        disabled={isLoading}
      >
        <Bot size={18} aria-hidden="true" />
        <span>{isLoading ? 'AI đang tạo báo cáo...' : 'Tạo báo cáo bằng AI'}</span>
      </button>
    </section>
  );
};

export default ReportConfigurator;
