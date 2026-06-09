export const REPORT_TYPES = [
  {
    value: 'patient-flow',
    label: 'Báo cáo lưu lượng bệnh nhân',
    description: 'Tổng hợp lượt khám, thời gian chờ và tỷ lệ hoàn tất trong ngày từ BigQuery.',
  },
  {
    value: 'admissions-core',
    label: 'Báo cáo nhập viện và tái nhập viện',
    description: 'Phân tích tỷ lệ nhập viện, tỷ lệ tái nhập viện và các nhóm bệnh nhân chính.',
  },
];

export async function generateAiReport(formValues) {
  const response = await fetch('/api/reports/ai-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formValues),
  });

  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(response.ok
        ? 'Backend trả về dữ liệu không phải JSON.'
        : `Backend error ${response.status}: ${responseText.slice(0, 160)}`);
    }
  }

  if (!data) {
    throw new Error(
      response.ok
        ? 'Backend trả về response rỗng.'
        : `Backend error ${response.status}. Hãy kiểm tra server Express có đang chạy không.`,
    );
  }

  if (!response.ok || !data.ok) {
    throw new Error(data.message || 'Không tạo được báo cáo AI.');
  }

  return data.report;
}
