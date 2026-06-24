import express from 'express';
import { authenticateJWT } from '../../middleware/authMiddleware.js';
import db from '../../../models/index.js';

const router = express.Router();

// Helper: Mask phone number for privacy
const maskPhoneNumber = (phone) => {
  if (!phone) return null;
  if (phone.length <= 6) return '******';
  return phone.slice(0, 4) + '****' + phone.slice(-3);
};

// GET /profile/me
router.get('/me', authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await db.User.findByPk(userId, {
      include: [
        { model: db.Profile, as: 'Profile' },
        { model: db.Vehicle, as: 'Vehicles' }
      ]
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found'
      });
    }

    // Fetch verification records
    const verifications = await db.VerificationRecord.findAll({
      where: { user_id: userId }
    });

    // Aggregate rating
    const ratingData = await db.Rating.findOne({
      where: { rated_user_id: userId },
      attributes: [
        [db.sequelize.fn('AVG', db.sequelize.col('stars')), 'avgRating']
      ],
      raw: true
    });
    const avgRating = ratingData && ratingData.avgRating ? parseFloat(parseFloat(ratingData.avgRating).toFixed(2)) : 0;

    // Completed rides count (drove + passenger)
    const completedBookingsCount = await db.Booking.count({
      where: { passenger_id: userId, booking_status: 'completed' }
    });
    const completedRidesCount = await db.Ride.count({
      where: { driver_id: userId, status: 'completed' }
    });
    const totalCompletedRides = completedBookingsCount + completedRidesCount;

    res.status(200).json({
      status: 'success',
      data: {
        user_id: user.user_id,
        phone_number: user.phone_number,
        email: user.email,
        phone_verified: user.phone_verified,
        email_verified: user.email_verified,
        account_status: user.account_status,
        profile: user.Profile,
        vehicles: user.Vehicles,
        badges: {
          mobile_verified: user.phone_verified,
          email_verified: user.email_verified,
          institution_verified: verifications.some(v => v.verification_type === 'institutional' && v.status === 'verified'),
          gov_id_verified: verifications.some(v => v.verification_type === 'government_id' && v.status === 'verified')
        },
        aggregates: {
          rating: avgRating,
          completedRidesCount: totalCompletedRides
        }
      }
    });

  } catch (error) {
    console.error('[Profile Service] Error fetching own profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching profile'
    });
  }
});

// PUT /profile/me
router.put('/me', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { full_name, photo_url, gender, bio, institution_name, institution_domain, email } = req.body;

  try {
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User account not found'
      });
    }

    let profile = await db.Profile.findOne({ where: { user_id: userId } });
    if (!profile) {
      profile = await db.Profile.create({ user_id: userId, full_name: full_name || 'User' });
    }

    // Handle email update and re-verification
    if (email && email !== user.email) {
      const existing = await db.User.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({
          status: 'error',
          message: 'Email address is already in use by another account'
        });
      }
      user.email = email;
      user.email_verified = false;
      await user.save();

      // Create new pending VerificationRecord for email
      await db.VerificationRecord.create({
        user_id: userId,
        verification_type: 'email',
        status: 'pending',
        reference_value: email,
        submitted_at: new Date()
      });
    }

    // Handle institutional domain update and re-verification (FR-2.4)
    let domainChanged = false;
    if (institution_domain && institution_domain !== profile.institution_domain) {
      domainChanged = true;
      profile.institution_domain = institution_domain;

      // Deactivate/expire previous verified institutional records
      await db.VerificationRecord.update(
        { status: 'expired' },
        { where: { user_id: userId, verification_type: 'institutional', status: 'verified' } }
      );

      // Create a pending verification record for the new domain
      await db.VerificationRecord.create({
        user_id: userId,
        verification_type: 'institutional',
        status: 'pending',
        reference_value: institution_domain,
        submitted_at: new Date()
      });
      console.log(`[Profile Service] Institutional domain changed. Triggered re-verification for: ${institution_domain}`);
    }

    // Update profile fields
    if (full_name !== undefined) profile.full_name = full_name;
    if (photo_url !== undefined) profile.photo_url = photo_url;
    if (gender !== undefined) profile.gender = gender;
    if (bio !== undefined) profile.bio = bio;
    if (institution_name !== undefined) profile.institution_name = institution_name;

    await profile.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully' + (domainChanged ? '. Institutional verification required for the new domain.' : ''),
      data: {
        profile,
        email_verified: user.email_verified,
        institution_verified: !domainChanged
      }
    });

  } catch (error) {
    console.error('[Profile Service] Error updating profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating profile'
    });
  }
});

// GET /profile/:id
router.get('/:id', authenticateJWT, async (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const currentUserId = req.user.id;

  try {
    const targetUser = await db.User.findByPk(targetUserId, {
      include: [
        { model: db.Profile, as: 'Profile' }
      ]
    });

    if (!targetUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Profile not found'
      });
    }

    // Enforce Privacy Masking: revealed only if there's a confirmed mutual booking (NFR-3.3)
    let revealPhone = (targetUserId === currentUserId);

    if (!revealPhone) {
      const confirmedBooking = await db.Booking.findOne({
        where: {
          booking_status: ['confirmed', 'completed'],
          [db.Sequelize.Op.or]: [
            { passenger_id: currentUserId, '$Ride.driver_id$': targetUserId },
            { passenger_id: targetUserId, '$Ride.driver_id$': currentUserId }
          ]
        },
        include: [{
          model: db.Ride,
          as: 'Ride'
        }]
      });

      if (confirmedBooking) {
        revealPhone = true;
      }
    }

    const verifications = await db.VerificationRecord.findAll({
      where: { user_id: targetUserId }
    });

    // Rating aggregates
    const ratingData = await db.Rating.findOne({
      where: { rated_user_id: targetUserId },
      attributes: [
        [db.sequelize.fn('AVG', db.sequelize.col('stars')), 'avgRating']
      ],
      raw: true
    });
    const avgRating = ratingData && ratingData.avgRating ? parseFloat(parseFloat(ratingData.avgRating).toFixed(2)) : 0;

    // Completed rides count
    const completedBookingsCount = await db.Booking.count({
      where: { passenger_id: targetUserId, booking_status: 'completed' }
    });
    const completedRidesCount = await db.Ride.count({
      where: { driver_id: targetUserId, status: 'completed' }
    });
    const totalCompletedRides = completedBookingsCount + completedRidesCount;

    // Find active vehicle details
    const activeVehicle = await db.Vehicle.findOne({
      where: { user_id: targetUserId, is_active: true }
    });

    res.status(200).json({
      status: 'success',
      data: {
        user_id: targetUser.user_id,
        full_name: targetUser.Profile?.full_name,
        photo_url: targetUser.Profile?.photo_url,
        gender: targetUser.Profile?.gender,
        institution_name: targetUser.Profile?.institution_name,
        institution_domain: targetUser.Profile?.institution_domain,
        bio: targetUser.Profile?.bio,
        phone_number: revealPhone ? targetUser.phone_number : maskPhoneNumber(targetUser.phone_number),
        email: targetUser.email,
        badges: {
          mobile_verified: targetUser.phone_verified,
          email_verified: targetUser.email_verified,
          institution_verified: verifications.some(v => v.verification_type === 'institutional' && v.status === 'verified'),
          gov_id_verified: verifications.some(v => v.verification_type === 'government_id' && v.status === 'verified')
        },
        aggregates: {
          rating: avgRating,
          completedRidesCount: totalCompletedRides
        },
        active_vehicle: activeVehicle ? {
          make: activeVehicle.make,
          model: activeVehicle.model,
          color: activeVehicle.color,
          registration_number: revealPhone ? activeVehicle.registration_number : '******'
        } : null
      }
    });

  } catch (error) {
    console.error('[Profile Service] Error fetching public profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching public profile'
    });
  }
});

// POST /profile/verify-institution (Request email-based domain verification code)
router.post('/verify-institution', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({
      status: 'error',
      message: 'A valid email address is required'
    });
  }

  const domain = email.split('@')[1];

  try {
    const profile = await db.Profile.findOne({ where: { user_id: userId } });
    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'Profile details not found'
      });
    }

    // Set/verify domain match
    if (profile.institution_domain && profile.institution_domain !== domain) {
      return res.status(400).json({
        status: 'error',
        message: `Provided email domain (${domain}) does not match profile institutional domain (${profile.institution_domain})`
      });
    }

    // If profile didn't have a domain, we save this one
    if (!profile.institution_domain) {
      profile.institution_domain = domain;
      await profile.save();
    }

    // Generate mock verification code
    const mockCode = '123456';
    console.log(`\n==================================================`);
    console.log(`📨 [Email Service] SENDING INSTITUTIONAL OTP TO: ${email}`);
    console.log(`🔑 CODE: ${mockCode}`);
    console.log(`==================================================\n`);

    // Create or update VerificationRecord
    await db.VerificationRecord.create({
      user_id: userId,
      verification_type: 'institutional',
      status: 'pending',
      reference_value: email,
      submitted_at: new Date()
    });

    res.status(202).json({
      status: 'success',
      message: 'Institutional verification email sent. Please verify using code.',
      step: 'awaiting_institutional_code'
    });

  } catch (error) {
    console.error('[Profile Service] Error initiating institutional verification:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while requesting verification'
    });
  }
});

// POST /profile/verify-institution/confirm (Verify OTP code to complete institutional verification)
router.post('/verify-institution/confirm', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: email, code'
    });
  }

  // Hardcode verification code for testing simplicity
  if (code !== '123456') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid verification code'
    });
  }

  try {
    const record = await db.VerificationRecord.findOne({
      where: {
        user_id: userId,
        verification_type: 'institutional',
        status: 'pending',
        reference_value: email
      }
    });

    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: 'No pending verification record found for this email'
      });
    }

    record.status = 'verified';
    record.verified_at = new Date();
    await record.save();

    // Confirm domain on profile
    const profile = await db.Profile.findOne({ where: { user_id: userId } });
    if (profile) {
      profile.institution_domain = email.split('@')[1];
      await profile.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Institutional email verified successfully. Badge granted.'
    });

  } catch (error) {
    console.error('[Profile Service] Error confirming institutional verification:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during verification confirmation'
    });
  }
});


/* =========================================================================
   VEHICLE MANAGEMENT (FR-3)
   ========================================================================= */

// POST /profile/vehicles (Register a vehicle)
router.post('/vehicles', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { vehicle_type, make, model, registration_number, color, is_active } = req.body;

  // Validate fields
  if (!vehicle_type || !make || !model || !registration_number || !color) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: vehicle_type, make, model, registration_number, color'
    });
  }

  if (!['two_wheeler', 'car'].includes(vehicle_type)) {
    return res.status(400).json({
      status: 'error',
      message: "vehicle_type must be either 'two_wheeler' or 'car'"
    });
  }

  try {
    // Unique registration constraint check
    const existing = await db.Vehicle.findOne({ where: { registration_number } });
    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: 'A vehicle with this registration number is already registered'
      });
    }

    // Set other vehicles inactive if this one is active
    const activeState = is_active !== undefined ? is_active : true;
    if (activeState) {
      await db.Vehicle.update({ is_active: false }, { where: { user_id: userId } });
    }

    const vehicle = await db.Vehicle.create({
      user_id: userId,
      vehicle_type,
      make,
      model,
      registration_number,
      color,
      is_active: activeState
    });

    res.status(201).json({
      status: 'success',
      message: 'Vehicle registered successfully',
      data: vehicle
    });

  } catch (error) {
    console.error('[Profile Service] Vehicle registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while registering vehicle'
    });
  }
});

// GET /profile/vehicles (List registered vehicles)
router.get('/vehicles', authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  try {
    const vehicles = await db.Vehicle.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      status: 'success',
      data: vehicles
    });

  } catch (error) {
    console.error('[Profile Service] Error listing vehicles:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching vehicles'
    });
  }
});

// PUT /profile/vehicles/:id (Update vehicle details)
router.put('/vehicles/:id', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const vehicleId = parseInt(req.params.id, 10);
  const { make, model, registration_number, color, is_active } = req.body;

  try {
    const vehicle = await db.Vehicle.findOne({
      where: { vehicle_id: vehicleId, user_id: userId }
    });

    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found or does not belong to this account'
      });
    }

    if (registration_number && registration_number !== vehicle.registration_number) {
      const existing = await db.Vehicle.findOne({ where: { registration_number } });
      if (existing) {
        return res.status(409).json({
          status: 'error',
          message: 'A vehicle with this registration number is already registered'
        });
      }
      vehicle.registration_number = registration_number;
    }

    if (make !== undefined) vehicle.make = make;
    if (model !== undefined) vehicle.model = model;
    if (color !== undefined) vehicle.color = color;

    if (is_active !== undefined) {
      const activeState = !!is_active;
      if (activeState && !vehicle.is_active) {
        // Set all other vehicles to inactive
        await db.Vehicle.update({ is_active: false }, { where: { user_id: userId } });
      }
      vehicle.is_active = activeState;
    }

    await vehicle.save();

    res.status(200).json({
      status: 'success',
      message: 'Vehicle details updated successfully',
      data: vehicle
    });

  } catch (error) {
    console.error('[Profile Service] Error updating vehicle:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating vehicle'
    });
  }
});

// DELETE /profile/vehicles/:id (Delete or deactivate vehicle)
router.delete('/vehicles/:id', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const vehicleId = parseInt(req.params.id, 10);

  try {
    const vehicle = await db.Vehicle.findOne({
      where: { vehicle_id: vehicleId, user_id: userId }
    });

    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found or does not belong to this account'
      });
    }

    // Check if the vehicle is associated with any rides
    const associatedRidesCount = await db.Ride.count({ where: { vehicle_id: vehicleId } });

    if (associatedRidesCount > 0) {
      // Soft-deactivate the vehicle rather than hard-deleting
      vehicle.is_active = false;
      await vehicle.save();

      return res.status(200).json({
        status: 'success',
        message: 'Vehicle is linked to existing ride records. It has been deactivated (is_active = false) to preserve history.'
      });
    }

    // Hard-delete if no ride references exist
    await vehicle.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Vehicle deleted successfully'
    });

  } catch (error) {
    console.error('[Profile Service] Error deleting vehicle:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while deleting vehicle'
    });
  }
});

// GET /profile/emergency-contacts
router.get('/emergency-contacts', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  try {
    const contacts = await db.EmergencyContact.findAll({
      where: { user_id: userId }
    });
    res.status(200).json({
      status: 'success',
      data: contacts
    });
  } catch (error) {
    console.error('[Profile Service] Error fetching emergency contacts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching emergency contacts'
    });
  }
});

// POST /profile/emergency-contacts
router.post('/emergency-contacts', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { contact_name, contact_phone } = req.body;

  if (!contact_name || !contact_phone) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: contact_name, contact_phone'
    });
  }

  try {
    const contact = await db.EmergencyContact.create({
      user_id: userId,
      contact_name,
      contact_phone
    });
    res.status(201).json({
      status: 'success',
      message: 'Emergency contact added successfully',
      data: contact
    });
  } catch (error) {
    console.error('[Profile Service] Error adding emergency contact:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while adding emergency contact'
    });
  }
});

// DELETE /profile/emergency-contacts/:id
router.delete('/emergency-contacts/:id', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const contactId = parseInt(req.params.id, 10);

  try {
    const contact = await db.EmergencyContact.findOne({
      where: { contact_id: contactId, user_id: userId }
    });

    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Emergency contact not found or does not belong to this account'
      });
    }

    await contact.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Emergency contact deleted successfully'
    });
  } catch (error) {
    console.error('[Profile Service] Error deleting emergency contact:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while deleting emergency contact'
    });
  }
});

// GET /profile/health
router.get('/health', (req, res) => {
  res.json({ service: 'Profile and Verification Service', status: 'OK' });
});

export default router;
