import { CheckCircle2, Database, FileText, LoaderCircle } from 'lucide-react';

const stepIcons = [Database, LoaderCircle, FileText];

const ProgressTimeline = ({ steps, currentStep, visible }) => {
  if (!visible) {
    return null;
  }

  return (
    <section className="ai-report-panel">
      <div className="ai-report-panel-header">
        <div>
          <p className="ai-report-eyebrow">Processing</p>
          <h2>Tiến trình xử lý</h2>
        </div>
      </div>

      <div className="ai-report-steps">
        {steps.map((step, index) => {
          const Icon = stepIcons[index] ?? LoaderCircle;
          const isDone = currentStep > index;
          const isActive = currentStep === index;

          return (
            <div
              key={step}
              className={`ai-report-step ${
                isDone ? 'is-complete' : isActive ? 'is-active' : ''
              }`}
            >
              <div className="ai-report-step-icon">
                {isDone ? (
                  <CheckCircle2 size={18} aria-hidden="true" />
                ) : (
                  <Icon
                    size={18}
                    aria-hidden="true"
                    className={isActive ? 'ai-report-spin' : undefined}
                  />
                )}
              </div>
              <div>
                <p>{step}</p>
                <small>
                  {isDone
                    ? 'Hoàn tất'
                    : isActive
                      ? 'Đang xử lý'
                      : 'Chờ thực hiện'}
                </small>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ProgressTimeline;
