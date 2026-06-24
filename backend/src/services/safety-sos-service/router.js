import express from 'express';
import { authenticateJWT } from '../../middleware/authMiddleware.js';
import db from '../../../models/index.js';
import { isWithinGracePeriod, parallelFanOut } from './safetyHelper.js';
import eventBus from '../../utils/eventBus.js';

const router = express.Router();

// Helper: Format coordinates from POINT object
const formatPoint = (loc) => {
  if (!loc) return null;
  if (loc.coordinates && Array.isArray(loc.coordinates)) {
    return {
      latitude: loc.coordinates[1],
      longitude: loc.coordinates[0]
    };
  }
  return loc;
};

// In-memory store for active live location sharing sessions (independent of SOS)
// Key: `${userId}_${rideId}`
// Value: { userId, rideId, contactId, startedAt }
export const activeLiveSharingSessions = new Map();

// Register push-based event listener for ride completion (decoupled push cleanup)
eventBus.on('rideCompleted', ({ rideId }) => {
  const rideIdNum = parseInt(rideId, 10);
  let cleanedCount = 0;
  for (const [key, value] of activeLiveSharingSessions.entries()) {
    if (value.rideId === rideIdNum) {
      activeLiveSharingSessions.delete(key);
      cleanedCount++;
    }
  }
  if (cleanedCount > 0) {
    console.log(`[Safety Service] Push-stopped and cleaned up ${cleanedCount} active sharing sessions for completed ride ID: ${rideIdNum}`);
  }
});

// Helper: Clean up sharing session if ride is completed in the database
export const checkAndCleanupSession = async (userId, rideId) => {
  const sessionKey = `${userId}_${rideId}`;
  if (!activeLiveSharingSessions.has(sessionKey)) {
    return null;
  }

  try {
    // UNVERIFIED: Database read of Ride status
    const ride = await db.Ride.findByPk(rideId);
    if (ride && (ride.status === 'completed' || ride.status === 'cancelled')) {
      activeLiveSharingSessions.delete(sessionKey);
      console.log(`[Safety Service] Active sharing session for user ${userId} on ride ${rideId} auto-stopped because ride status is ${ride.status}`);
      return null;
    }
  } catch (error) {
    console.error(`[Safety Service] Error checking ride status for session cleanup:`, error);
  }

  return activeLiveSharingSessions.get(sessionKey);
};

/* =========================================================================
   EMERGENCY CONTACTS (FR-11.2 / Business Gate)
   ========================================================================= */

// GET /api/safety/contacts (Get user's emergency contacts & check validation gate)
router.get('/contacts', authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  try {
    // UNVERIFIED: Database query for Emergency Contacts
    const contacts = await db.EmergencyContact.findAll({
      where: { user_id: userId }
    });

    res.status(200).json({
      status: 'success',
      contacts,
      has_emergency_contact: contacts.length > 0
    });

  } catch (error) {
    console.error('[Safety Service] Error fetching emergency contacts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching emergency contacts'
    });
  }
});

/* =========================================================================
   SOS ALERTS (FR-11.1, FR-11.2, FR-11.3)
   ========================================================================= */

// POST /api/safety/sos/trigger (Trigger SOS Alert)
router.post('/sos/trigger', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { location, rideId } = req.body; // Expects location: { latitude, longitude }, optional rideId

  if (!location || location.latitude === undefined || location.longitude === undefined) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required parameters: location (with latitude and longitude)'
    });
  }

  try {
    // 1. Mandatory emergency contacts check gate (GET /api/safety/contacts verification check)
    // UNVERIFIED: Database read
    const contacts = await db.EmergencyContact.findAll({
      where: { user_id: userId }
    });

    if (contacts.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'SOS trigger blocked. You must register at least one emergency contact before triggering SOS.'
      });
    }

    // 2. Write EmergencyAlert record immediately with status = 'active'
    // UNVERIFIED: Database write with Point geometry
    const trigger_location = db.sequelize.fn('ST_GeomFromText', `POINT(${location.latitude} ${location.longitude})`, 4326);
    
    const alert = await db.EmergencyAlert.create({
      user_id: userId,
      ride_id: rideId || null,
      trigger_location,
      status: 'active',
      triggered_at: new Date()
    });

    // 3. Parallel Fan-Out Alerting (SMS, Admin/Dashboard Logging, Socket updates)
    // UNVERIFIED: Database write inside fanout (AuditLog)
    const fanOutResults = await parallelFanOut({
      alertDetails: {
        alert_id: alert.alert_id,
        user_id: userId,
        ride_id: rideId || null,
        location,
        status: 'active',
        triggered_at: alert.triggered_at
      },
      contacts,
      db
    });

    // 4. Return alert confirmation containing exactly what was shared and with whom
    res.status(200).json({
      status: 'success',
      message: 'SOS Emergency Alert triggered and dispatched successfully.',
      alertDetails: {
        id: alert.alert_id,
        rideId: rideId || null,
        userId,
        location,
        status: 'active',
        timestamp: alert.triggered_at
      },
      dispatch: {
        shared_location: fanOutResults.shared_location,
        notified_contacts: fanOutResults.contacts_notified
      }
    });

  } catch (error) {
    console.error('[Safety Service] Error triggering SOS alert:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while processing SOS emergency alert'
    });
  }
});

// POST /api/safety/sos/:alertId/cancel (Grace-Period Cancel Mechanism)
router.post('/sos/:alertId/cancel', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const alertId = parseInt(req.params.alertId, 10);
  const now = new Date();

  try {
    // UNVERIFIED: Database read
    const alert = await db.EmergencyAlert.findByPk(alertId);

    if (!alert) {
      return res.status(404).json({
        status: 'error',
        message: 'Emergency alert record not found'
      });
    }

    if (alert.user_id !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized: Only the user who triggered the SOS alert can cancel it.'
      });
    }

    if (alert.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: `Alert cannot be cancelled because its current status is: ${alert.status}`
      });
    }

    // 10-second grace-period cancel mechanism
    if (!isWithinGracePeriod(alert.triggered_at, now, 10000)) {
      return res.status(400).json({
        status: 'error',
        message: 'Cancellation period has expired. This alert is already escalated and must be resolved by the platform admin team.'
      });
    }

    // Update alert status to 'resolved' (representing false alarm cancellation)
    alert.status = 'resolved';
    alert.resolved_at = now;
    alert.admin_notes = 'Cancelled by user within grace period.';
    
    // UNVERIFIED: Database write
    await alert.save();

    // Log user cancellation in AuditLog
    // UNVERIFIED: Database write
    await db.AuditLog.create({
      actor_user_id: userId,
      action_type: 'SOS_CANCELLED_BY_USER',
      action_detail: {
        alert_id: alertId,
        cancelled_at: now
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Emergency alert cancelled successfully within grace period.',
      data: {
        alert_id: alert.alert_id,
        status: alert.status,
        resolved_at: alert.resolved_at
      }
    });

  } catch (error) {
    console.error('[Safety Service] Error cancelling emergency alert:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while cancelling emergency alert'
    });
  }
});

/* =========================================================================
   LIVE LOCATION SHARING (FR-11.4)
   ========================================================================= */

// POST /api/safety/live-location/start (Start sharing live location)
router.post('/live-location/start', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { rideId, contactId } = req.body;

  if (!rideId || !contactId) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required parameters: rideId, contactId'
    });
  }

  try {
    // 1. Validate user has emergency contacts registered
    // UNVERIFIED: Database read
    const contacts = await db.EmergencyContact.findAll({
      where: { user_id: userId }
    });

    if (contacts.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Live location sharing blocked. You must register at least one emergency contact first.'
      });
    }

    const chosenContact = contacts.find(c => c.contact_id === parseInt(contactId, 10));
    if (!chosenContact) {
      return res.status(404).json({
        status: 'error',
        message: 'Selected emergency contact not found'
      });
    }

    // 2. Validate ride exists
    // UNVERIFIED: Database read
    const ride = await db.Ride.findByPk(rideId);
    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Associated ride not found'
      });
    }

    if (ride.status === 'completed' || ride.status === 'cancelled') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot start sharing location for a ride that is already ${ride.status}`
      });
    }

    // 3. Validate user is either driver or passenger on this ride
    const isDriver = (ride.driver_id === userId);
    let isPassenger = false;

    if (!isDriver) {
      // UNVERIFIED: Database read
      const booking = await db.Booking.findOne({
        where: {
          ride_id: rideId,
          passenger_id: userId,
          booking_status: 'confirmed'
        }
      });
      if (booking) {
        isPassenger = true;
      }
    }

    if (!isDriver && !isPassenger) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized: You are not a confirmed participant in this ride.'
      });
    }

    // Register active sharing session in-memory
    const sessionKey = `${userId}_${rideId}`;
    activeLiveSharingSessions.set(sessionKey, {
      userId,
      rideId: parseInt(rideId, 10),
      contactId: parseInt(contactId, 10),
      startedAt: new Date()
    });

    res.status(200).json({
      status: 'success',
      message: `Live location sharing started successfully for ride ${rideId}.`,
      data: {
        userId,
        rideId,
        contact_notified: {
          name: chosenContact.contact_name,
          phone: chosenContact.contact_phone
        },
        sharing: true
      }
    });

  } catch (error) {
    console.error('[Safety Service] Error starting live location sharing:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while starting live location sharing'
    });
  }
});

// POST /api/safety/live-location/stop (Stop sharing live location)
router.post('/live-location/stop', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { rideId } = req.body;

  if (!rideId) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required parameter: rideId'
    });
  }

  const sessionKey = `${userId}_${rideId}`;
  if (!activeLiveSharingSessions.has(sessionKey)) {
    return res.status(404).json({
      status: 'error',
      message: 'No active live location sharing session found for this ride'
    });
  }

  activeLiveSharingSessions.delete(sessionKey);

  res.status(200).json({
    status: 'success',
    message: `Live location sharing stopped successfully for ride ${rideId}.`,
    data: {
      userId,
      rideId,
      sharing: false
    }
  });
});

// GET /api/safety/live-location/status/:rideId (Check location sharing status with auto-stop verification)
router.get('/live-location/status/:rideId', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const rideId = parseInt(req.params.rideId, 10);

  // Hook validation: Clean up sharing session if ride is completed
  const session = await checkAndCleanupSession(userId, rideId);

  if (!session) {
    return res.status(200).json({
      status: 'success',
      sharing: false,
      message: 'No active location sharing session for this ride.'
    });
  }

  res.status(200).json({
    status: 'success',
    sharing: true,
    sessionDetails: session
  });
});

// GET /api/safety/health
router.get('/health', (req, res) => {
  res.json({ service: 'Safety and SOS Service', status: 'OK' });
});

export default router;
