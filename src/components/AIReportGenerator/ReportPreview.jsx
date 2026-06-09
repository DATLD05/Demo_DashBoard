import { Database, Download, FileText } from 'lucide-react';
import MarkdownPreview from './MarkdownPreview';

const ReportPreview = ({ report, onExport, isVisible }) => {
  if (!isVisible) {
    return (
      <section className="ai-report-panel ai-report-empty-state">
        <div className="ai-report-empty-copy">
          <p className="ai-report-eyebrow">Output Preview</p>
          <h2>Báo cáo AI sẽ hiển thị ở đây</h2>
          <p>
            Chọn loại báo cáo, khoảng thời gian rồi bấm tạo để xem bản nhận xét
            dành cho ban lãnh đạo.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="ai-report-panel">
      <div className="ai-report-preview-topbar">
        <div>
          <p className="ai-report-eyebrow">Output Preview</p>
          <h2>{report.type}</h2>
          <p className="ai-report-preview-meta">
            Kỳ báo cáo: {report.periodLabel} • Tạo lúc {report.generatedAt}
          </p>
        </div>

        <div className="ai-report-actions">
          <button
            type="button"
            className="ai-report-secondary-button"
            onClick={() => onExport('docx')}
          >
            <Download size={18} aria-hidden="true" />
            <span>Tải file Word (.doc)</span>
          </button>
          <button
            type="button"
            className="ai-report-secondary-button ai-report-secondary-button-dark"
            onClick={() => onExport('pdf')}
          >
            <FileText size={18} aria-hidden="true" />
            <span>Tải file PDF (.pdf)</span>
          </button>
        </div>
      </div>

      <div className="ai-report-metrics">
        {report.metrics.map((metric) => (
          <article key={metric.label} className="ai-report-metric-card">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            {metric.trend ? <small>{metric.trend}</small> : null}
          </article>
        ))}
      </div>

      <div className="ai-report-preview-card">
        <div className="ai-report-preview-header">
          <h3>{report.headline}</h3>
        </div>

        <MarkdownPreview content={report.content} />
      </div>

      {report.details ? (
        <details className="ai-report-details">
          <summary>
            <Database size={18} aria-hidden="true" />
            <span>Details: dữ liệu query trả về</span>
          </summary>
          <pre>{JSON.stringify(report.details, null, 2)}</pre>
        </details>
      ) : null}
    </section>
  );
};

export default ReportPreview;
