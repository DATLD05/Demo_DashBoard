function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderInlineMarkdown(text) {
  return escapeHtml(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function markdownToHtml(markdown) {
  const lines = String(markdown || '').split('\n');
  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (!line) {
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push(`<h2>${renderInlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push(`<h3>${renderInlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }

    if (/^- /.test(line)) {
      const items = [line.slice(2)];

      while (index + 1 < lines.length && /^- /.test(lines[index + 1].trim())) {
        index += 1;
        items.push(lines[index].trim().slice(2));
      }

      blocks.push(`
        <ul>
          ${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}
        </ul>
      `);
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items = [line.replace(/^\d+\. /, '')];

      while (index + 1 < lines.length && /^\d+\. /.test(lines[index + 1].trim())) {
        index += 1;
        items.push(lines[index].trim().replace(/^\d+\. /, ''));
      }

      blocks.push(`
        <ol>
          ${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}
        </ol>
      `);
      continue;
    }

    blocks.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  return blocks.join('\n');
}

function buildFileName(report, extension) {
  const safeType = String(report.type || 'ai-report')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return `${safeType || 'ai-report'}-${Date.now()}.${extension}`;
}

function buildReportHtml(report) {
  const metricsHtml = (report.metrics || [])
    .map((metric) => `
      <tr>
        <td>${escapeHtml(metric.label)}</td>
        <td class="metric-value">${escapeHtml(metric.value)}</td>
        <td>${escapeHtml(metric.trend || '')}</td>
      </tr>
    `)
    .join('');
  const preparedBy = escapeHtml(report.preparedBy || 'Hệ thống AI');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.type)}</title>
  <style>
    @page { margin: 18mm 16mm; }
    * {
      box-sizing: border-box;
      font-family: "Times New Roman", Times, serif;
    }
    body {
      margin: 0;
      color: #111827;
      font-family: "Times New Roman", Times, serif;
      font-size: 13pt;
      line-height: 1.5;
      background: #ffffff;
    }
    .report { max-width: 820px; margin: 0 auto; }
    .header {
      margin-bottom: 18px;
      text-align: center;
    }
    .document-type {
      margin: 0 0 6px;
      font-size: 15pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 19pt;
      line-height: 1.25;
      text-transform: uppercase;
    }
    .meta-line {
      margin: 4px 0;
      font-size: 11pt;
    }
    .summary-box {
      margin: 0 0 18px;
      padding: 12px 14px;
      border: 1px solid #9ca3af;
      background: #f8fafc;
    }
    .summary-label {
      margin: 0 0 8px;
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .headline {
      margin: 0;
      font-size: 13pt;
      font-weight: 700;
      line-height: 1.45;
    }
    .metrics-section-title {
      margin: 0 0 8px;
      font-size: 14pt;
      font-weight: 700;
    }
    .metrics-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 18px;
      font-size: 10.5pt;
    }
    .metrics-table th {
      padding: 8px 10px;
      background: #e5e7eb;
      color: #111827;
      text-align: left;
      font-weight: 700;
    }
    .metrics-table td {
      padding: 8px 10px;
      border: 1px solid #9ca3af;
      vertical-align: top;
    }
    .metric-value {
      font-size: 14pt;
      font-weight: 700;
      white-space: nowrap;
    }
    .content {
      padding-top: 2px;
    }
    .content h2 {
      margin: 18px 0 8px;
      font-size: 14pt;
      font-weight: 700;
      text-transform: none;
    }
    .content h3 {
      margin: 14px 0 6px;
      font-size: 12.5pt;
      font-weight: 700;
    }
    .content p {
      margin: 0 0 10px;
      text-align: justify;
    }
    .content ul,
    .content ol {
      margin: 0 0 12px;
      padding-left: 24px;
    }
    .content li {
      margin-bottom: 5px;
      text-align: justify;
    }
    .footer-note {
      margin-top: 20px;
      font-size: 10.5pt;
      color: #4b5563;
      text-align: right;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .report { max-width: none; }
    }
  </style>
</head>
<body>
  <main class="report">
    <header class="header">
      <p class="document-type">BÁO CÁO ĐIỀU HÀNH BỆNH VIỆN</p>
      <h1>${escapeHtml(report.type)}</h1>
      <p class="meta-line"><strong>Kỳ báo cáo:</strong> ${escapeHtml(report.periodLabel)} | <strong>Người lập:</strong> ${preparedBy}</p>
      <p class="meta-line"><strong>Thời điểm tạo:</strong> ${escapeHtml(report.generatedAt)}</p>
    </header>

    <section class="summary-box">
      <p class="summary-label">Tóm tắt nhanh</p>
      <p class="headline">${escapeHtml(report.headline)}</p>
    </section>

    <h2 class="metrics-section-title">Bảng chỉ số cốt lõi</h2>
    <table class="metrics-table">
      <thead>
        <tr>
          <th>Chỉ số</th>
          <th>Giá trị</th>
          <th>Ghi chú</th>
        </tr>
      </thead>
      <tbody>${metricsHtml}</tbody>
    </table>

    <section class="content">
      ${markdownToHtml(report.content)}
    </section>

    <p class="footer-note">Báo cáo được tạo từ hệ thống phân tích dữ liệu và AI hỗ trợ điều hành.</p>
  </main>
</body>
</html>`;
}

export function exportReportAsWord(report) {
  const html = buildReportHtml(report);
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = buildFileName(report, 'doc');
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportReportAsPdf(report) {
  const printWindow = window.open('', '_blank', 'width=1024,height=768');

  if (!printWindow) {
    throw new Error('Trình duyệt đã chặn cửa sổ in PDF. Hãy cho phép pop-up cho trang này.');
  }

  printWindow.document.open();
  printWindow.document.write(buildReportHtml(report));
  printWindow.document.close();

  printWindow.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
}
