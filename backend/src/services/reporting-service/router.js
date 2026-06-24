import express from 'express';
import { authenticateJWT } from '../../middleware/authMiddleware.js';
import db from '../../../models/index.js';
import { 
  validateSelfReport, 
  shouldMerge, 
  getMergedDetail, 
  findActiveSosAlert 
} from './reportingHelper.js';

const router = express.Router();

// Helper to handle report creation/merging logic (shared between POST / and POST /urgent)
const processReportCreation = async (req, res, forcedUrgency = null) => {
  const reporterId = req.user.id;
  const { 
    reported_user_id, 
    category, 
    detail, 
    ride_id, 
    booking_id, 
    urgency = 'standard' 
  } = req.body;

  const finalUrgency = forcedUrgency || urgency;

  // 1. Basic validation
  if (!reported_user_id || !category || !detail) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required parameters: reported_user_id, category, detail'
    });
  }

  const validCategories = ['unsafe_driving', 'misbehavior', 'fake_account', 'harassment', 'no_show', 'other'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      status: 'error',
      message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
    });
  }

  try {
    // 2. Enforce: reporter_id cannot equal reported_user_id (block self-reports)
    try {
      validateSelfReport(reporterId, reported_user_id);
    } catch (validationError) {
      return res.status(400).json({
        status: 'error',
        message: validationError.message
      });
    }

    // 3. Deduplicate / Merge Check
    // UNVERIFIED: Database query for existing reports within the 24-hour window
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingReports = await db.Report.findAll({
      where: {
        reporter_id: reporterId,
        reported_user_id,
        category,
        status: ['received', 'under_review'],
        created_at: {
          [db.Sequelize.Op.gte]: oneDayAgo
        }
      }
    });

    // Check if any report matches the exact ride/booking context
    const queryParams = { reporter_id: reporterId, reported_user_id, category, ride_id, booking_id };
    const reportToMerge = existingReports.find(r => shouldMerge(r, queryParams));

    if (reportToMerge) {
      // Merge: append new detail and save
      reportToMerge.detail = getMergedDetail(reportToMerge.detail, detail);
      
      // UNVERIFIED: Database update
      await reportToMerge.save();

      console.log(`[Reporting Service] Merged duplicate report from user ${reporterId} into existing report ID: ${reportToMerge.report_id}`);

      return res.status(200).json({
        status: 'success',
        message: 'Report submitted successfully (merged into your existing active report for this incident).',
        data: {
          report_id: reportToMerge.report_id,
          category: reportToMerge.category,
          urgency: reportToMerge.urgency,
          status: reportToMerge.status,
          detail: reportToMerge.detail
        }
      });
    }

    // 4. Link to Active EmergencyAlert if urgent
    let linkedAlertId = null;
    if (finalUrgency === 'urgent' && ride_id) {
      // UNVERIFIED: Database lookup for active SOS alert
      const activeAlert = await db.EmergencyAlert.findOne({
        where: {
          ride_id,
          status: 'active'
        }
      });
      if (activeAlert) {
        linkedAlertId = activeAlert.alert_id;
        console.log(`[Reporting Service] Urgent report automatically linked to active SOS alert ID: ${linkedAlertId}`);
      }
    }

    // 5. Create immutable Report record
    // UNVERIFIED: Database insert
    const report = await db.Report.create({
      reporter_id: reporterId,
      reported_user_id,
      ride_id: ride_id || null,
      booking_id: booking_id || null,
      category,
      detail,
      urgency: finalUrgency,
      status: 'received',
      alert_id: linkedAlertId // Linked SOS reference column
    });

    console.log(`[Reporting Service] Created new report record. ID: ${report.report_id}, Urgency: ${finalUrgency}, Linked Alert: ${linkedAlertId || 'None'}`);

    res.status(201).json({
      status: 'success',
      message: 'Report filed successfully.',
      data: {
        report_id: report.report_id,
        category: report.category,
        urgency: report.urgency,
        status: report.status,
        ride_id: report.ride_id,
        booking_id: report.booking_id,
        alert_id: report.alert_id
      }
    });

  } catch (error) {
    console.error('[Reporting Service] Error processing report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while processing user report'
    });
  }
};

/* =========================================================================
   ROUTES
   ========================================================================= */

// POST /api/reports (File a standard/urgent report)
router.post('/', authenticateJWT, async (req, res) => {
  await processReportCreation(req, res);
});

// POST /api/reports/urgent (In-ride urgent reporting path)
router.post('/urgent', authenticateJWT, async (req, res) => {
  await processReportCreation(req, res, 'urgent');
});

// GET /api/reports/mine (Track own reports' statuses securely)
router.get('/mine', authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  try {
    // UNVERIFIED: Database query
    const reports = await db.Report.findAll({
      where: { reporter_id: userId },
      order: [['created_at', 'DESC']]
    });

    // Enforce: Expose only safe columns (status only, NO admin notes or other reporters' data)
    const safeReports = reports.map(r => ({
      report_id: r.report_id,
      category: r.category,
      urgency: r.urgency,
      status: r.status,
      created_at: r.created_at
    }));

    res.status(200).json({
      status: 'success',
      reports: safeReports
    });

  } catch (error) {
    console.error('[Reporting Service] Error fetching personal reports:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching your reports'
    });
  }
});

// GET /api/reports/health
router.get('/health', (req, res) => {
  res.json({ service: 'Reporting Service', status: 'OK' });
});

export default router;
