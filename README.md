# Hospital Leadership Dashboard

Dashboard theo dõi vận hành bệnh viện, kết hợp:

- các trang Power BI embed cho chỉ số điều hành
- API Express để truy vấn dữ liệu từ BigQuery
- module AI Report Generator để tạo báo cáo điều hành bằng tiếng Việt
- xuất báo cáo ra Word và PDF theo biểu mẫu điều hành

## Mục tiêu

Project này phục vụ nhu cầu theo dõi và tổng hợp dữ liệu điều hành bệnh viện ở một giao diện duy nhất. Ngoài các màn hình dashboard, hệ thống còn hỗ trợ tạo báo cáo điều hành bằng AI dựa trên dữ liệu thực tế lấy từ BigQuery.

## Tính năng chính

- Sidebar điều hướng giữa các màn hình dashboard
- Nhúng các báo cáo Power BI:
  - `Encounters - Non Admissions`
  - `Admissions and Readmissions`
  - `Procedures`
- Trang `Tools & Reports` để:
  - chọn loại báo cáo
  - chọn khoảng thời gian hoặc preset thời gian
  - gọi backend tổng hợp dữ liệu
  - sinh báo cáo điều hành bằng Gemini
  - preview nội dung báo cáo
  - xuất file Word và PDF

## Công nghệ sử dụng

- Frontend: React 19, React Router, Vite, Lucide Icons
- Backend: Node.js, Express
- Data warehouse: Google BigQuery
- AI: Gemini API

## Cấu trúc thư mục

```text
.
|-- src/
|   |-- components/AIReportGenerator/
|   |-- pages/
|   |-- services/
|   |-- main.jsx
|   `-- styles.css
|-- server/
|   |-- config/
|   |-- lib/
|   |-- routes/
|   `-- services/
|-- secrets/
|-- dist/
|-- .env.example
|-- bieu_mau_bao_cao_dieu_hanh.docx
|-- bieu_mau_bao_cao_dieu_hanh.pdf
|-- package.json
`-- vite.config.js
```

## Yêu cầu môi trường

- Node.js 18+ hoặc mới hơn
- npm
- quyền truy cập BigQuery
- service account JSON cho Google Cloud
- Gemini API key

## Biến môi trường

Tạo file `.env` từ `.env.example`:

```powershell
Copy-Item .env.example .env
```

Các biến đang dùng:

```env
PORT=3000

# BigQuery connection
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=asia-southeast1
BIGQUERY_DATASET=your_dataset
GOOGLE_APPLICATION_CREDENTIALS=./secrets/service-account.json

# Gemini analysis
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash

# Star schema tables in BigQuery
BIGQUERY_FACT_ENCOUNTER_METRICS=Fact_Encounter_Metrics
BIGQUERY_DIM_DATE=Dim_Date
BIGQUERY_DIM_PROVIDER=Dim_Provider
BIGQUERY_DIM_ENCOUNTER=Dim_Encounter
```

## Cài đặt

```powershell
npm install
```

## Chạy local

Chạy backend:

```powershell
npm start
```

Chạy frontend dev server ở terminal khác:

```powershell
npm run dev
```

URL mặc định:

- Frontend dev: `http://localhost:5173`
- Backend API: `http://localhost:3000`

Lưu ý:

- Vite đã cấu hình proxy `/api` sang `http://localhost:3000`
- khi chạy production local, cần build frontend trước rồi mới chạy server Express

## Build production

```powershell
npm run build
npm start
```

Sau khi build:

- frontend static được xuất vào thư mục `dist/`
- Express sẽ serve `dist/index.html` và toàn bộ static assets

## API hiện có

### `GET /api/health`

Kiểm tra backend đang chạy.

Ví dụ response:

```json
{ "status": "ok" }
```

### `GET /api/reports/patient-flow`

Lấy dữ liệu báo cáo lưu lượng bệnh nhân.

Query params:

- `startDate`: `YYYY-MM-DD`
- `endDate`: `YYYY-MM-DD`
- `department`: mặc định `all`
- `allTime`: `true` hoặc `false`

Ví dụ:

```text
/api/reports/patient-flow?startDate=2024-01-01&endDate=2024-01-31&department=all
```

### `GET /api/reports/admissions-core`

Lấy dữ liệu báo cáo nhập viện và tái nhập viện.

Query params:

- `startDate`: `YYYY-MM-DD`
- `endDate`: `YYYY-MM-DD`
- `allTime`: `true` hoặc `false`

### `POST /api/reports/ai-report`

Sinh báo cáo điều hành bằng AI.

Ví dụ request body:

```json
{
  "reportType": "patient-flow",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "allTime": false
}
```

Các `reportType` đang hỗ trợ:

- `patient-flow`
- `admissions-core`

## Luồng xử lý báo cáo AI

1. Frontend gửi request đến `POST /api/reports/ai-report`
2. Backend validate loại báo cáo và khoảng thời gian
3. Backend truy vấn BigQuery theo service tương ứng:
   - `queryPatientFlowReport`
   - `queryAdmissionsCoreReport`
4. Dữ liệu tổng hợp được chuẩn hóa thành metrics và payload cho AI
5. Backend gọi Gemini để viết nội dung báo cáo điều hành
6. Frontend hiển thị preview
7. Người dùng có thể export ra Word hoặc PDF

## Nguồn dữ liệu BigQuery

Hiện tại backend dùng các bảng theo star schema:

- fact:
  - `BIGQUERY_FACT_ENCOUNTER_METRICS`
- dimensions:
  - `BIGQUERY_DIM_DATE`
  - `BIGQUERY_DIM_PROVIDER`
  - `BIGQUERY_DIM_ENCOUNTER`

## Ghi chú về báo cáo điều hành

- File mẫu tham chiếu đang có trong repo:
  - `bieu_mau_bao_cao_dieu_hanh.docx`
  - `bieu_mau_bao_cao_dieu_hanh.pdf`
- Template export hiện đã được chỉnh theo form báo cáo điều hành bệnh viện
- Nội dung AI được ràng buộc theo bố cục:
  - Tóm tắt điều hành
  - Phân tích chi tiết
  - Đánh giá và khuyến nghị

