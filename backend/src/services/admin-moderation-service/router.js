import express from 'express';
import { authenticateJWT, requireAdmin } from '../../middleware/authMiddleware.js';
import db from '../../../models/index.js';
import eventBus from '../../utils/eventBus.js';

const router = express.Router();

// POST /reports (File a new report - Placeholder for deprecation note)
router.post('/reports', authenticateJWT, (req, res) => {
  const { category, detail, rideId, urgency } = req.body;
  console.log('[Admin/Moderation Service] File report request received (Redirecting to /api/reports):', req.body);
  
  return res.status(307).json({
    status: 'error',
    message: 'This endpoint is deprecated. Please use POST /api/reports instead.'
  });
});

// GET /admin/reports-queue (Get admin reports queue - restricted access simulation)
router.get('/reports-queue', authenticateJWT, requireAdmin, (req, res) => {
  console.log('[Admin/Moderation Service] Admin queue requested by:', req.user?.id);
  
  // Simulated admin authorization check
  res.status(200).json({
    status: 'success',
    reports: [
      {
        id: 'report-8877-6655',
        reporter: { id: 'user-1', name: 'John Doe' },
        category: 'behavior',
        detail: 'Driver was speeding.',
        urgency: 'Standard',
        status: 'Received',
        createdAt: new Date().toISOString()
      }
    ]
  });
});

// GET /api/admin/ride-logs/:rideId (Assemble immutable ride log - admin only simulation)
router.get('/ride-logs/:rideId', authenticateJWT, requireAdmin, async (req, res) => {
  const rideId = parseInt(req.params.rideId, 10);
  console.log(`[Admin Service] Assembling full ride logs for ride ID: ${rideId} (Requested by user: ${req.user?.id})`);

  try {
    // 1. Fetch ride details (UNVERIFIED)
    const ride = await db.Ride.findByPk(rideId, {
      include: [
        { model: db.RideRoute, as: 'RideRoute' },
        { model: db.RideStop, as: 'Stops' },
        { model: db.User, as: 'Driver', attributes: ['user_id', 'phone_number', 'email', 'account_status'] }
      ]
    });

    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Ride not found'
      });
    }

    // 2. Fetch all bookings for the ride (UNVERIFIED)
    const bookings = await db.Booking.findAll({
      where: { ride_id: rideId },
      include: [
        { model: db.User, as: 'Passenger', attributes: ['user_id', 'phone_number', 'email', 'account_status'] }
      ]
    });

    // 3. Fetch all reports filed in the context of this ride (UNVERIFIED)
    const reports = await db.Report.findAll({
      where: { ride_id: rideId },
      include: [
        { model: db.User, as: 'Reporter', attributes: ['user_id', 'phone_number', 'email'] },
        { model: db.User, as: 'ReportedUser', attributes: ['user_id', 'phone_number', 'email'] }
      ]
    });

    // 4. Fetch all SOS emergency alerts triggered during this ride (UNVERIFIED)
    const emergencyAlerts = await db.EmergencyAlert.findAll({
      where: { ride_id: rideId },
      include: [
        { model: db.User, as: 'User', attributes: ['user_id', 'phone_number', 'email'] }
      ]
    });

    // 5. Fetch related audit logs (UNVERIFIED)
    const alertIds = emergencyAlerts.map(a => a.alert_id);
    let auditLogs = [];
    try {
      auditLogs = await db.AuditLog.findAll({
        where: {
          [db.Sequelize.Op.or]: [
            db.sequelize.where(
              db.sequelize.json('action_detail.ride_id'),
              rideId
            ),
            db.sequelize.where(
              db.sequelize.json('action_detail.alert_id'),
              {
                [db.Sequelize.Op.in]: alertIds.length > 0 ? alertIds : [-1]
              }
            )
          ]
        },
        order: [['created_at', 'DESC']]
      });
    } catch (jsonErr) {
      // Fallback query if JSON operators cause Dialect-specific failures in unverified environments
      console.warn('[Admin Service] JSON query failed, executing fallback query for audit logs:', jsonErr.message);
      auditLogs = await db.AuditLog.findAll({
        where: {
          action_type: ['SOS_TRIGGERED', 'SOS_CANCELLED_BY_USER']
        },
        order: [['created_at', 'DESC']]
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        ride_id: rideId,
        rideDetails: ride,
        bookings,
        reports,
        emergencyAlerts,
        auditLogs
      }
    });

  } catch (error) {
    console.error('[Admin Service] Error assembling ride logs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while assembling ride logs'
    });
  }
});

/* =========================================================================
   PUT /reports/:reportId/resolve
   Admin-only endpoint to resolve or transition a report status.
   Emits reportStatusChanged so the reporter is notified via US-10.2.
   ========================================================================= */
const VALID_STATUSES = ['under_review', 'resolved'];
const VALID_ACTIONS = ['no_action', 'warning_issued', 'suspended', 'banned'];

router.put('/reports/:reportId/resolve', authenticateJWT, requireAdmin, async (req, res) => {
  const reportId = parseInt(req.params.reportId, 10);
  const adminId = req.user.id;
  const { status, resolution_note, action_taken } = req.body;

  // 1. Validate status
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
    });
  }

  // 2. resolution_note is required when resolving
  if (status === 'resolved' && (!resolution_note || !resolution_note.trim())) {
    return res.status(400).json({
      status: 'error',
      message: 'resolution_note is required when resolving a report.'
    });
  }

  // 3. Validate action_taken when resolving
  if (status === 'resolved' && (!action_taken || !VALID_ACTIONS.includes(action_taken))) {
    return res.status(400).json({
      status: 'error',
      message: `action_taken is required when resolving. Must be one of: ${VALID_ACTIONS.join(', ')}`
    });
  }

  try {
    // 4. Fetch the report (UNVERIFIED)
    const report = await db.Report.findByPk(reportId);
    if (!report) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found.'
      });
    }

    // 5. Prevent re-resolving an already-resolved report
    if (report.status === 'resolved') {
      return res.status(409).json({
        status: 'error',
        message: 'This report has already been resolved.'
      });
    }

    // 6. Update the report record (UNVERIFIED)
    report.status = status;
    report.resolved_by_admin_id = adminId;
    if (status === 'resolved') {
      report.resolution_note = resolution_note.trim();
      report.resolved_at = new Date();
    } else {
      // under_review: optional note, no resolved_at
      if (resolution_note) {
        report.resolution_note = resolution_note.trim();
      }
    }
    await report.save();

    // 7. Write AuditLog entry (follows LOW_RATING_ALERT convention)
    await db.AuditLog.create({
      actor_user_id: adminId,
      target_user_id: report.reported_user_id,
      action_type: 'REPORT_RESOLVED',
      action_detail: {
        report_id: report.report_id,
        reporter_id: report.reporter_id,
        reported_user_id: report.reported_user_id,
        category: report.category,
        status,
        action_taken: action_taken || null,
        resolution_note: report.resolution_note || null,
        timestamp: new Date().toISOString()
      }
    });

    // 8. Emit reportStatusChanged for the Notification Dispatcher (US-10.2)
    //    Shape matches: { reportId, reporterId, status }
    eventBus.emit('reportStatusChanged', {
      reportId: report.report_id,
      reporterId: report.reporter_id,
      status
    });

    // 9. Conditional EmergencyAlert cross-update
    //    Only when resolving (not under_review) AND the report has a linked alert_id.
    //    Mapping:
    //      - action_taken === 'no_action' → alert marked as 'false_alarm' (investigation concluded, nothing actionable)
    //      - any other action → alert marked as 'resolved' (confirmed incident, action taken)
    let linkedAlertUpdate = null;
    if (status === 'resolved' && report.alert_id) {
      try {
        const alert = await db.EmergencyAlert.findByPk(report.alert_id);
        if (alert && alert.status === 'active') {
          const alertStatus = (action_taken === 'no_action') ? 'false_alarm' : 'resolved';
          alert.status = alertStatus;
          alert.resolved_at = new Date();
          await alert.save();
          linkedAlertUpdate = { alert_id: report.alert_id, new_status: alertStatus };
          console.log(`[Admin Service] Linked EmergencyAlert ${report.alert_id} updated to '${alertStatus}'.`);
        }
      } catch (alertErr) {
        // Non-fatal: don't fail the report resolution if alert update has an issue
        console.error(`[Admin Service] Failed to update linked EmergencyAlert ${report.alert_id}:`, alertErr);
      }
    }

    // Apply user action if suspended or banned
    if (status === 'resolved' && (action_taken === 'suspended' || action_taken === 'banned')) {
      const reportedUser = await db.User.findByPk(report.reported_user_id);
      if (reportedUser) {
        reportedUser.account_status = action_taken;
        await reportedUser.save();
        console.log(`[Admin Service] Updated reported user ${report.reported_user_id} status to ${action_taken}.`);
      }
    }

    console.log(`[Admin Service] Report ${reportId} updated to '${status}' by admin ${adminId}.`);

    res.status(200).json({
      status: 'success',
      message: `Report ${reportId} has been marked as '${status}'.`,
      data: {
        report_id: report.report_id,
        report_status: report.status,
        action_taken: action_taken || null,
        resolved_by_admin_id: report.resolved_by_admin_id,
        resolved_at: report.resolved_at,
        resolution_note: report.resolution_note,
        linked_alert_update: linkedAlertUpdate
      }
    });

  } catch (error) {
    console.error('[Admin Service] Error resolving report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while resolving report.'
    });
  }
});

// GET /users -> get all users for admin dashboard lookup
router.get('/users', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const users = await db.User.findAll({
      include: [
        { model: db.Profile, as: 'Profile' }
      ]
    });

    const formatted = await Promise.all(users.map(async (u) => {
      const ratingData = await db.Rating.findOne({
        where: { rated_user_id: u.user_id },
        attributes: [
          [db.sequelize.fn('AVG', db.sequelize.col('stars')), 'avgRating']
        ],
        raw: true
      });
      const avgRating = ratingData && ratingData.avgRating ? parseFloat(parseFloat(ratingData.avgRating).toFixed(2)) : 5.0;

      const completedBookingsCount = await db.Booking.count({
        where: { passenger_id: u.user_id, booking_status: 'completed' }
      });
      const completedRidesCount = await db.Ride.count({
        where: { driver_id: u.user_id, status: 'completed' }
      });

      const reportsReceived = await db.Report.count({
        where: { reported_user_id: u.user_id }
      });
      const reportsFiled = await db.Report.count({
        where: { reporter_id: u.user_id }
      });

      return {
        user_id: u.user_id,
        mobile: u.phone_number,
        name: u.Profile?.full_name || 'User',
        email: u.email,
        institutionName: u.Profile?.institution_name || 'None',
        role: u.role || 'user',
        account_status: u.account_status,
        rating: avgRating,
        ridesCount: completedBookingsCount + completedRidesCount,
        reportsFiled,
        reportsReceived
      };
    }));

    res.status(200).json({
      status: 'success',
      data: formatted
    });
  } catch (error) {
    console.error('[Admin Service] Error listing users:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// PUT /users/:id/status -> update user status
router.put('/users/:id/status', authenticateJWT, requireAdmin, async (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const { account_status, justification } = req.body;

  if (!account_status || !['active', 'suspended', 'banned'].includes(account_status)) {
    return res.status(400).json({
      status: 'error',
      message: "Invalid status. Must be one of: active, suspended, banned"
    });
  }

  try {
    const user = await db.User.findByPk(targetUserId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User account not found'
      });
    }

    user.account_status = account_status;
    await user.save();

    await db.AuditLog.create({
      actor_user_id: req.user.id,
      target_user_id: targetUserId,
      action_type: account_status === 'suspended' ? 'USER_SUSPENDED' : (account_status === 'banned' ? 'USER_BANNED' : 'USER_ACTIVATED'),
      action_detail: {
        justification: justification || 'Admin manual action',
        timestamp: new Date().toISOString()
      }
    });

    res.status(200).json({
      status: 'success',
      message: `User status updated to ${account_status} successfully.`
    });
  } catch (error) {
    console.error('[Admin Service] Error updating user status:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /metrics/safety -> safety dashboard metrics
router.get('/metrics/safety', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const sosCount = await db.EmergencyAlert.count();
    const activeRides = await db.Ride.count({ where: { status: 'ongoing' } });
    const verifiedUsersCount = await db.VerificationRecord.count({ where: { status: 'verified' } });
    const totalUsersCount = await db.User.count();
    const verificationRate = totalUsersCount > 0 ? parseFloat(((verifiedUsersCount / totalUsersCount) * 100).toFixed(1)) : 100;

    res.status(200).json({
      status: 'success',
      data: {
        sos_activations: sosCount,
        avg_resolution_time_mins: 24,
        verification_rate: verificationRate,
        active_rides: activeRides
      }
    });
  } catch (error) {
    console.error('[Admin Service] Error fetching safety metrics:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /verifications -> pending verifications queue
router.get('/verifications', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const verifications = await db.VerificationRecord.findAll({
      where: { status: 'pending' },
      include: [
        { 
          model: db.User, 
          as: 'User',
          include: [{ model: db.Profile, as: 'Profile' }]
        }
      ],
      order: [['submitted_at', 'ASC']]
    });

    const formatted = verifications.map(v => ({
      id: v.record_id || v.id,
      user_id: v.user_id,
      name: v.User?.Profile?.full_name || 'User',
      email: v.User?.email || '',
      domain: v.reference_value?.includes('@') ? '@' + v.reference_value.split('@')[1] : v.reference_value,
      role: v.verification_type === 'institutional' ? 'Driver/Passenger' : 'User',
      requestedAt: v.submitted_at ? new Date(v.submitted_at).toLocaleString() : 'Recent',
      status: v.status
    }));

    res.status(200).json({
      status: 'success',
      data: formatted
    });
  } catch (error) {
    console.error('[Admin Service] Error fetching verifications queue:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// PUT /verifications/:id -> approve or reject verification
router.put('/verifications/:id', authenticateJWT, requireAdmin, async (req, res) => {
  const verificationId = parseInt(req.params.id, 10);
  const { status, reject_reason } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid status. Must be one of: approved, rejected'
    });
  }

  try {
    const record = await db.VerificationRecord.findByPk(verificationId);
    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: 'Verification record not found'
      });
    }

    record.status = status === 'approved' ? 'verified' : 'rejected';
    if (status === 'approved') {
      record.verified_at = new Date();
    } else {
      record.resolution_note = reject_reason || 'Rejected by Admin';
    }
    await record.save();

    if (status === 'approved') {
      const user = await db.User.findByPk(record.user_id);
      if (user) {
        if (record.verification_type === 'email') {
          user.email_verified = true;
          await user.save();
        } else if (record.verification_type === 'institutional') {
          const profile = await db.Profile.findOne({ where: { user_id: record.user_id } });
          if (profile) {
            profile.institution_domain = record.reference_value?.includes('@') ? record.reference_value.split('@')[1] : record.reference_value;
            await profile.save();
          }
        }
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Verification ${status} successfully.`
    });
  } catch (error) {
    console.error('[Admin Service] Error processing verification:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /rides/:id -> get admin ride details (ride log lookup)
router.get('/rides/:id', authenticateJWT, requireAdmin, async (req, res) => {
  const rideId = parseInt(req.params.id, 10);
  try {
    const ride = await db.Ride.findByPk(rideId, {
      include: [
        { model: db.RideRoute, as: 'RideRoute' },
        { model: db.RideStop, as: 'Stops' },
        { model: db.User, as: 'Driver', attributes: ['user_id', 'phone_number', 'email', 'account_status'], include: [{ model: db.Profile, as: 'Profile' }] }
      ]
    });

    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Ride log not found'
      });
    }

    const bookings = await db.Booking.findAll({
      where: { ride_id: rideId },
      include: [
        { model: db.User, as: 'Passenger', attributes: ['user_id', 'phone_number', 'email', 'account_status'], include: [{ model: db.Profile, as: 'Profile' }] }
      ]
    });

    const reports = await db.Report.findAll({
      where: { ride_id: rideId }
    });

    res.status(200).json({
      status: 'success',
      data: {
        ride_id: ride.ride_id,
        driver_name: ride.Driver?.Profile?.full_name || 'Driver',
        driver_rating: 4.8,
        vehicle_name: ride.vehicle_name || 'Vehicle',
        ride_date: ride.ride_date,
        departure_time: ride.departure_time,
        source_label: ride.source_label,
        destination_label: ride.destination_label,
        estimated_total_cost: parseFloat(ride.estimated_cost_share || 0),
        status: ride.status,
        bookings: bookings.map(b => ({
          passenger_name: b.Passenger?.Profile?.full_name || 'Passenger',
          pickup_point: b.pickup_label,
          drop_point: b.drop_label,
          status: b.booking_status
        })),
        reports: reports.map(r => ({
          report_id: r.report_id,
          description: r.detail
        })),
        statusHistory: [
          { status: 'scheduled', time: 'Departure Scheduled at ' + ride.departure_time },
          { status: 'ongoing', time: 'Started ride departure at ' + ride.departure_time },
          { status: 'completed', time: 'Completed and finalized' }
        ]
      }
    });
  } catch (error) {
    console.error('[Admin Service] Error fetching ride log details:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /reports -> get all reports
router.get('/reports', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const reports = await db.Report.findAll({
      include: [
        { model: db.User, as: 'Reporter', include: [{ model: db.Profile, as: 'Profile' }] },
        { model: db.User, as: 'ReportedUser', include: [{ model: db.Profile, as: 'Profile' }] }
      ],
      order: [['created_at', 'DESC']]
    });

    const formatted = await Promise.all(reports.map(async (r) => {
      let actionTaken = 'no_action';
      if (r.status === 'resolved') {
        const audit = await db.AuditLog.findOne({
          where: {
            actor_user_id: r.resolved_by_admin_id,
            target_user_id: r.reported_user_id,
            action_type: 'REPORT_RESOLVED'
          }
        });
        if (audit && audit.action_detail) {
          try {
            const detail = typeof audit.action_detail === 'string' ? JSON.parse(audit.action_detail) : audit.action_detail;
            if (detail.report_id == r.report_id) {
              actionTaken = detail.action_taken || 'no_action';
            }
          } catch (e) {
            console.error('Failed to parse audit detail:', e);
          }
        }
      }

      return {
        report_id: r.report_id,
        category: r.category,
        reporter_name: r.Reporter?.Profile?.full_name || 'Anonymous',
        reported_user: r.ReportedUser?.Profile?.full_name || 'Anonymous',
        ride_id: r.ride_id,
        booking_id: r.booking_id,
        description: r.detail,
        timestamp: r.created_at ? new Date(r.created_at).toLocaleString() : 'Just now',
        status: r.status === 'received' ? 'Received' : (r.status === 'under_review' ? 'Under Review' : 'Resolved'),
        resolution_note: r.resolution_note || '',
        action_taken: actionTaken,
        urgency: r.urgency
      };
    }));

    res.status(200).json({
      status: 'success',
      reports: formatted
    });
  } catch (error) {
    console.error('[Admin Service] Error listing reports:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /health
router.get('/health', (req, res) => {
  res.json({ service: 'Admin and Moderation Service', status: 'OK' });
});

export default router;

