import express from 'express';
import { generateAiReport } from '../services/aiReportService.js';
import { queryAdmissionsCoreReport } from '../services/admissionsCoreService.js';
import { queryPatientFlowReport } from '../services/patientFlowService.js';

const router = express.Router();

router.get('/admissions-core', async (req, res) => {
  try {
    const { startDate, endDate, allTime } = req.query;
    const result = await queryAdmissionsCoreReport({
      startDate,
      endDate,
      allTime: allTime === 'true',
    });

    res.json({
      ok: true,
      reportType: 'admissions-core',
      ...result,
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message,
    });
  }
});

router.get('/patient-flow', async (req, res) => {
  try {
    const { startDate, endDate, department = 'all', allTime } = req.query;
    const result = await queryPatientFlowReport({
      startDate,
      endDate,
      department,
      allTime: allTime === 'true',
    });

    res.json({
      ok: true,
      reportType: 'patient-flow',
      ...result,
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message,
    });
  }
});

router.post('/ai-report', async (req, res) => {
  try {
    const result = await generateAiReport(req.body);

    res.json({
      ok: true,
      reportType: 'ai-report',
      report: result,
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message,
    });
  }
});

export default router;
