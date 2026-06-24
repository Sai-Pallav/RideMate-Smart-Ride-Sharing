import express from 'express';
import { authenticateJWT } from '../../middleware/authMiddleware.js';
import db from '../../../models/index.js';
import { getDefaultPreferences } from './notificationHelper.js';
import { initNotificationListeners } from './notificationDispatcher.js';

const router = express.Router();

// 1. GET /api/notifications - Get paginated user notifications
router.get('/', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  try {
    const { count, rows } = await db.Notification.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    const formattedNotifications = rows.map(n => ({
      notification_id: parseInt(n.notification_id, 10),
      user_id: parseInt(n.user_id, 10),
      notification_type: n.notification_type,
      title: n.title,
      body: n.body,
      is_read: n.is_read,
      metadata: n.metadata ? (typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata) : null,
      created_at: n.created_at
    }));

    res.status(200).json({
      status: 'success',
      data: {
        notifications: formattedNotifications,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('[Notification Router] Error fetching user notifications:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching notifications'
    });
  }
});

// 2. PUT /api/notifications/:id/read - Mark specific notification as read
router.put('/:id/read', authenticateJWT, async (req, res) => {
  const notificationId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  try {
    const notification = await db.Notification.findOne({
      where: {
        notification_id: notificationId,
        user_id: userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    notification.is_read = true;
    await notification.save();

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read',
      data: {
        notification_id: notification.notification_id,
        is_read: notification.is_read
      }
    });

  } catch (error) {
    console.error('[Notification Router] Error marking notification as read:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while marking notification as read'
    });
  }
});

// 3. PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  try {
    await db.Notification.update(
      { is_read: true },
      { where: { user_id: userId, is_read: false } }
    );

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('[Notification Router] Error marking all notifications as read:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while marking all notifications as read'
    });
  }
});

// 4. GET /api/notifications/preferences - Retrieve user notification preferences
router.get('/preferences', authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User account not found'
      });
    }

    const preferences = user.notification_preferences || getDefaultPreferences();

    // Ensure safety_alert is always returned as true in preferences response
    preferences.safety_alert = true;

    res.status(200).json({
      status: 'success',
      data: {
        user_id: userId,
        preferences
      }
    });

  } catch (error) {
    console.error('[Notification Router] Error fetching user preferences:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching notification preferences'
    });
  }
});

// 5. PUT /api/notifications/preferences - Update user notification preferences
router.put('/preferences', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { preferences } = req.body;

  if (!preferences || typeof preferences !== 'object') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid preferences payload: Expected an object'
    });
  }

  try {
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User account not found'
      });
    }

    // Prepare updated preferences, filtering out any attempts to toggle safety_alert off
    const cleanPreferences = {
      ride_reminder: preferences.ride_reminder !== false,
      booking_status: preferences.booking_status !== false,
      rating_prompt: preferences.rating_prompt !== false,
      system_alert: preferences.system_alert !== false
    };

    user.notification_preferences = cleanPreferences;
    await user.save();

    // Hardcode safety_alert to true for the API response
    const responsePreferences = { ...cleanPreferences, safety_alert: true };

    res.status(200).json({
      status: 'success',
      message: 'Notification preferences updated successfully',
      data: {
        user_id: userId,
        preferences: responsePreferences
      }
    });

  } catch (error) {
    console.error('[Notification Router] Error updating user preferences:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating notification preferences'
    });
  }
});

// GET /notifications/health (Compatibility stub)
router.get('/health', (req, res) => {
  res.json({ service: 'Notification Service', status: 'OK' });
});

// Initialize listeners immediately when the router is loaded
initNotificationListeners();

export default router;
