import { useEffect, useRef, useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import ReportConfigurator from '../components/AIReportGenerator/ReportConfigurator';
import ProgressTimeline from '../components/AIReportGenerator/ProgressTimeline';
import ReportPreview from '../components/AIReportGenerator/ReportPreview';
import { generateAiReport, REPORT_TYPES } from '../services/aiReportsApi';
import { exportReportAsPdf, exportReportAsWord } from '../services/reportExport';

const LOADING_STEPS = [
  'Đang truy vấn database và gom dữ liệu vận hành...',
  'Đang chuẩn hóa chỉ số, phát hiện xu hướng bất thường...',
  'AI đang phân tích và viết báo cáo điều hành...',
];

const DATE_PRESETS = [
  { value: 'all-time', label: 'Tất cả' },
  { value: 'last-30', label: '30 ngày' },
  { value: 'last-90', label: '90 ngày' },
  { value: 'this-year', label: 'Năm nay' },
  { value: 'last-year', label: 'Năm trước' },
  { value: 'custom', label: 'Tùy chọn' },
];

function toInputDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getRelativeDateRange(days) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (days - 1));

  return {
    startDate: toInputDate(startDate),
    endDate: toInputDate(endDate),
  };
}

function getCurrentYearRange() {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), 0, 1);

  return {
    startDate: toInputDate(startDate),
    endDate: toInputDate(today),
  };
}

function getLastYearRange() {
  const year = new Date().getFullYear() - 1;

  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

function getDefaultDateRange() {
  return getRelativeDateRange(30);
}

function getPresetValues(preset, currentValues) {
  switch (preset) {
    case 'all-time':
      return {
        ...currentValues,
        allTime: true,
      };
    case 'last-30':
      return {
        ...currentValues,
        ...getRelativeDateRange(30),
        allTime: false,
      };
    case 'last-90':
      return {
        ...currentValues,
        ...getRelativeDateRange(90),
        allTime: false,
      };
    case 'this-year':
      return {
        ...currentValues,
        ...getCurrentYearRange(),
        allTime: false,
      };
    case 'last-year':
      return {
        ...currentValues,
        ...getLastYearRange(),
        allTime: false,
      };
    case 'custom':
    default:
      return {
        ...currentValues,
        ...(currentValues.startDate && currentValues.endDate ? {} : getDefaultDateRange()),
        allTime: false,
      };
  }
}

const ToolsReportsPage = () => {
  const [formValues, setFormValues] = useState({
    reportType: REPORT_TYPES[0].value,
    allTime: true,
    ...getDefaultDateRange(),
  });
  const [selectedPreset, setSelectedPreset] = useState('all-time');
  const [status, setStatus] = useState('idle');
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const handleChange = (field, value) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
      allTime:
        field === 'startDate' || field === 'endDate'
          ? false
          : currentValues.allTime,
    }));

    if (field === 'startDate' || field === 'endDate') {
      setSelectedPreset('custom');
    }

    setError('');
  };

  const handlePresetSelect = (preset) => {
    setFormValues((currentValues) => getPresetValues(preset, currentValues));
    setSelectedPreset(preset);
    setError('');
  };

  const handleGenerateReport = async () => {
    if (!formValues.allTime && (!formValues.startDate || !formValues.endDate)) {
      setError('Vui lòng chọn đầy đủ khoảng thời gian để tạo báo cáo.');
      return;
    }

    if (!formValues.allTime && formValues.startDate > formValues.endDate) {
      setError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }

    clearTimers();
    setError('');
    setStatus('loading');
    setCurrentStep(0);
    setReport(null);

    const stepTimings = [0, 1100, 2200];

    stepTimings.forEach((delay, index) => {
      const timerId = window.setTimeout(() => {
        setCurrentStep(index);
      }, delay);

      timersRef.current.push(timerId);
    });

    try {
      const generatedReport = await generateAiReport(formValues);

      clearTimers();
      setReport(generatedReport);
      setCurrentStep(LOADING_STEPS.length);
      setStatus('success');
    } catch (requestError) {
      clearTimers();
      setError(requestError.message);
      setCurrentStep(-1);
      setStatus('idle');
    }
  };

  const handleExport = (fileType) => {
    if (!report) {
      return;
    }

    try {
      if (fileType === 'docx') {
        exportReportAsWord(report);
        return;
      }

      exportReportAsPdf(report);
    } catch (exportError) {
      setError(exportError.message);
    }
  };

  return (
    <div className="tools-reports-page ai-report-page">
      <section className="ai-report-hero">
        <div className="ai-report-hero-copy">
          <span className="ai-report-badge">
            <Sparkles size={14} aria-hidden="true" />
            AI-powered executive reporting
          </span>
          <h1>AI Report Generator</h1>
          <p>
            Tự động tổng hợp dữ liệu vận hành, để AI viết nhận xét y tế bằng tiếng
            Việt và xuất ra bản báo cáo.
          </p>
        </div>

        <div className="ai-report-hero-card">
          <div className="ai-report-hero-icon">
            <Bot size={28} aria-hidden="true" />
          </div>
          <strong>Luồng xử lý</strong>
          <p>Database Query → Metric Analysis → AI Narrative → Preview & Export</p>
        </div>
      </section>

      <div className="ai-report-layout">
        <div className="ai-report-left-column">
          <ReportConfigurator
            reportTypes={REPORT_TYPES}
            datePresets={DATE_PRESETS}
            formValues={formValues}
            selectedPreset={selectedPreset}
            onChange={handleChange}
            onPresetSelect={handlePresetSelect}
            onSubmit={handleGenerateReport}
            isLoading={status === 'loading'}
            error={error}
          />
          <ProgressTimeline
            steps={LOADING_STEPS}
            currentStep={currentStep}
            visible={status === 'loading' || status === 'success'}
          />
        </div>

        <ReportPreview
          report={report}
          onExport={handleExport}
          isVisible={status === 'success' && Boolean(report)}
        />
      </div>
    </div>
  );
};

export default ToolsReportsPage;
