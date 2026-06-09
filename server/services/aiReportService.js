import { getServerConfig } from '../config/env.js';
import { queryAdmissionsCoreReport } from './admissionsCoreService.js';
import { queryPatientFlowReport } from './patientFlowService.js';

const REPORT_TYPES = {
  'patient-flow': 'Báo cáo lưu lượng bệnh nhân',
  'admissions-core': 'Báo cáo nhập viện và tái nhập viện',
};

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const generatedAtFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDateLabel(dateValue) {
  return dateFormatter.format(new Date(`${dateValue}T00:00:00`));
}

function toIsoDate(dateValue, fieldName) {
  if (!dateValue) {
    throw new Error(`${fieldName} is required.`);
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format.`);
  }

  return dateValue;
}

function validateReportInput({ reportType, startDate, endDate, allTime = false }) {
  const normalizedReportType = reportType || 'patient-flow';

  if (!REPORT_TYPES[normalizedReportType]) {
    throw new Error(`Unsupported reportType: ${normalizedReportType}`);
  }

  if (allTime) {
    return {
      reportType: normalizedReportType,
      startDate: null,
      endDate: null,
      allTime: true,
    };
  }

  const normalizedStartDate = toIsoDate(startDate, 'startDate');
  const normalizedEndDate = toIsoDate(endDate, 'endDate');

  if (normalizedStartDate > normalizedEndDate) {
    throw new Error('startDate cannot be greater than endDate.');
  }

  return {
    reportType: normalizedReportType,
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    allTime: false,
  };
}

function buildMetric(label, value, trend = '') {
  return { label, value, trend };
}

function compactTrendRows(rows = []) {
  return rows.slice(0, 40).map((row) => ({
    date: row.date,
    department: row.department,
    totalEncounters: row.totalEncounters,
    averageWaitMinutes: row.averageWaitMinutes,
    sameDayCompletionRate: row.sameDayCompletionRate,
    admissionRate: row.admissionRate,
  }));
}

function summarizePatientFlowData(data) {
  const { summary } = data;
  const trend = compactTrendRows(summary.trend);

  return {
    metrics: [
      buildMetric('Tổng lượt khám', summary.totalEncounters.toLocaleString('vi-VN')),
      buildMetric('Thời gian chờ TB', `${summary.averageWaitMinutes} phút`),
      buildMetric('Hoàn tất trong ngày', `${summary.completedSameDayRate}%`),
    ],
    aiData: {
      reportKind: 'patient-flow',
      source: data.source,
      summary: {
        totalEncounters: summary.totalEncounters,
        averageWaitMinutes: summary.averageWaitMinutes,
        completedSameDayRate: summary.completedSameDayRate,
        admittedRate: summary.admittedRate,
      },
      trend,
    },
    details: {
      filters: data.filters,
      source: data.source,
      summary: data.summary,
      rowCount: data.rows.length,
      rowsSample: data.rows.slice(0, 100),
    },
  };
}

function summarizeAdmissionsData(data) {
  const { summary, breakdowns } = data;

  return {
    metrics: [
      buildMetric('Tổng bệnh nhân', summary.totalPatients.toLocaleString('vi-VN')),
      buildMetric('Tổng số lần nhập viện', summary.totalAdmissions.toLocaleString('vi-VN')),
      buildMetric('Tỷ lệ nhập viện', `${summary.admissionRate}%`),
      buildMetric('Tỷ lệ tái nhập viện', `${summary.readmission30dRate}%`),
    ],
    aiData: {
      reportKind: 'admissions-core',
      source: data.source,
      summary,
      breakdowns: {
        byMonth: breakdowns.byMonth,
        byAgeGroup: breakdowns.byAgeGroup.slice(0, 12),
        byGender: breakdowns.byGender,
        byRace: breakdowns.byRace.slice(0, 12),
      },
    },
    details: {
      filters: data.filters,
      source: data.source,
      summary: data.summary,
      breakdowns: data.breakdowns,
    },
  };
}

async function queryReportData({ reportType, startDate, endDate, allTime }) {
  if (reportType === 'patient-flow') {
    const data = await queryPatientFlowReport({
      startDate,
      endDate,
      department: 'all',
      allTime,
    });

    return summarizePatientFlowData(data);
  }

  const data = await queryAdmissionsCoreReport({
    startDate,
    endDate,
    allTime,
  });
  return summarizeAdmissionsData(data);
}

function parseAiJson(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error('AI response did not contain valid JSON.');
    }

    return JSON.parse(match[0]);
  }
}

function buildAiPrompt({ reportTypeLabel, periodLabel, aiData }) {
  return JSON.stringify({
    task:
      'Tạo báo cáo điều hành bệnh viện bằng tiếng Việt có dấu. Trả về JSON hợp lệ với các khóa headline và content. content phải là Markdown bám theo biểu mẫu báo cáo điều hành với đúng các mục: ## 1. Tóm tắt điều hành (Executive Summary), ## 2. Phân tích chi tiết (Detailed Analysis), ### 2.1. Chỉ số hiệu suất nổi bật, ### 2.2. Xu hướng và biến động chính, ### 2.3. Rủi ro hoặc điểm nghẽn vận hành, ## 3. Đánh giá & Khuyến nghị (Insights & Recommendations), ### 3.1. Đánh giá hiệu suất (Insights), ### 3.2. Khuyến nghị chiến lược từ Chuyên gia (Recommendations). Không bỏ dấu tiếng Việt.',
    reportType: reportTypeLabel,
    periodLabel,
    data: aiData,
  });
}

function validateAiNarrative(parsed) {
  if (!parsed.headline || !parsed.content) {
    throw new Error('AI response is missing headline or content.');
  }

  return {
    headline: parsed.headline,
    content: parsed.content,
  };
}

function extractGeminiText(responseData) {
  return (responseData.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || '')
    .join('\n')
    .trim();
}

async function requestGeminiNarrative({ reportTypeLabel, periodLabel, aiData }) {
  const { gemini } = getServerConfig();

  if (!gemini.apiKey) {
    throw new Error('Missing GEMINI_API_KEY. Add it to .env before generating AI reports.');
  }

  const prompt = `
  Bạn là một Chuyên gia phân tích dữ liệu y tế. Hãy viết một Báo cáo điều hành bệnh viện bằng tiếng Việt dựa trên các số liệu tổng hợp dưới đây.

  YÊU CẦU NGHIÊM NGẶT:
  1. Chỉ sử dụng số liệu được cung cấp. Tuyệt đối KHÔNG bịa đặt số liệu, bệnh nhân hay khoa phòng.
  2. Giọng văn: Chuyên nghiệp, trực quan, phục vụ cho Ban giám đốc (Leadership).
  3. Nội dung báo cáo (content) phải được viết bằng định dạng Markdown và bám theo bố cục của biểu mẫu "bieu_mau_bao_cao_dieu_hanh".
  4. Dùng đúng hệ thống đề mục sau:
    - ## 1. Tóm tắt điều hành (Executive Summary)
    - ## 2. Phân tích chi tiết (Detailed Analysis)
    - ### 2.1. Chỉ số hiệu suất nổi bật
    - ### 2.2. Xu hướng và biến động chính
    - ### 2.3. Rủi ro hoặc điểm nghẽn vận hành
    - ## 3. Đánh giá & Khuyến nghị (Insights & Recommendations)
    - ### 3.1. Đánh giá hiệu suất (Insights)
    - ### 3.2. Khuyến nghị chiến lược từ Chuyên gia (Recommendations)
  5. Mỗi mục phải viết ngắn gọn, có nhận định điều hành rõ ràng, ưu tiên bullet list khi cần. Không dùng bảng Markdown.
  6. headline phải là một dòng tóm tắt điều hành ngắn, phù hợp để đưa vào ô nổi bật đầu báo cáo.
  7. Đầu ra CHỈ là một chuỗi JSON hợp lệ, tuyệt đối không bọc trong ký tự \`\`\`json.

  CẤU TRÚC JSON MONG MUỐN:
  {
    "headline": "Tiêu đề báo cáo (String)",
    "content": "Nội dung báo cáo định dạng Markdown (String)"
  }

  DỮ LIỆU ĐẦU VÀO:
  ${buildAiPrompt({ reportTypeLabel, periodLabel, aiData })}
  `;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${gemini.model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': gemini.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                'You are a Vietnamese hospital operations analyst. Write concise, executive-ready analysis. Return valid JSON only.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  const responseText = await response.text();

  let responseData;

  try {
    responseData = responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new Error(`Gemini returned non-JSON response: ${responseText.slice(0, 160)}`);
  }

  if (!response.ok) {
    const message = responseData?.error?.message || 'Gemini request failed.';
    throw new Error(message);
  }

  const text = extractGeminiText(responseData);
  const parsed = validateAiNarrative(parseAiJson(text));

  return {
    headline: parsed.headline,
    content: parsed.content,
    model: `gemini:${gemini.model}`,
  };
}

export async function generateAiReport(input) {
  const filters = validateReportInput(input);
  const reportTypeLabel = REPORT_TYPES[filters.reportType];
  const periodLabel = filters.allTime
    ? 'Tất cả thời gian'
    : `${formatDateLabel(filters.startDate)} - ${formatDateLabel(filters.endDate)}`;
  const { metrics, aiData, details } = await queryReportData(filters);
  const aiNarrative = await requestGeminiNarrative({
    reportTypeLabel,
    periodLabel,
    aiData,
  });

  return {
    id: filters.allTime
      ? `${filters.reportType}-all-time`
      : `${filters.reportType}-${filters.startDate}-${filters.endDate}`,
    type: reportTypeLabel,
    periodLabel,
    generatedAt: generatedAtFormatter.format(new Date()),
    metrics,
    headline: aiNarrative.headline,
    content: aiNarrative.content.trim(),
    source: aiData.source,
    model: aiNarrative.model,
    details,
  };
}
