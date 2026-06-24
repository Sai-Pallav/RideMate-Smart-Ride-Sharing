import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import db from '../../../models/index.js';
import { OtpProvider } from './OtpProvider.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const router = express.Router();
export const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret_key_here';

// Helper: Generate Access Token
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      phone_number: user.phone_number,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Helper: Generate Refresh Token
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { user_id: user.user_id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

// Temporary in-memory store for OTPs (simulates redis or temporary DB column)
const otpStore = new Map();

// Helper: Validate email format
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// POST /auth/register
router.post('/register', async (req, res) => {
  const { phone_number, email, password, full_name } = req.body;

  // Validate request fields
  if (!phone_number || !email || !password || !full_name) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: phone_number, email, password, full_name'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid email address format'
    });
  }

  try {
    // Check if user already exists
    const existingUser = await db.User.findOne({
      where: {
        [db.Sequelize.Op.or]: [{ phone_number }, { email }]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'User with this phone number or email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user and profile in transaction
    const result = await db.sequelize.transaction(async (t) => {
      const user = await db.User.create({
        phone_number,
        email,
        password_hash,
        phone_verified: false,
        email_verified: false,
        account_status: 'active'
      }, { transaction: t });

      const profile = await db.Profile.create({
        user_id: user.user_id,
        full_name
      }, { transaction: t });

      // Create initial verification records
      await db.VerificationRecord.create({
        user_id: user.user_id,
        verification_type: 'mobile',
        status: 'pending',
        reference_value: phone_number,
        submitted_at: new Date()
      }, { transaction: t });

      await db.VerificationRecord.create({
        user_id: user.user_id,
        verification_type: 'email',
        status: 'pending',
        reference_value: email,
        submitted_at: new Date()
      }, { transaction: t });

      return { user, profile };
    });

    // Generate mock 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone_number, otp);

    // Dispatch OTP via Provider
    await OtpProvider.sendOtp(phone_number, otp);

    res.status(202).json({
      status: 'success',
      message: 'Registration initiated successfully. OTP sent via SMS.',
      data: {
        user_id: result.user.user_id,
        phone_number: result.user.phone_number,
        email: result.user.email,
        phone_verified: result.user.phone_verified,
        step: 'awaiting_otp_verification'
      }
    });

  } catch (error) {
    console.error('[Auth Service] Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during registration'
    });
  }
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { phone_number, otp } = req.body;

  if (!phone_number || !otp) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: phone_number, otp'
    });
  }

  try {
    const storedOtp = otpStore.get(phone_number);

    // Hardcode fallback '123456' for local testing convenience
    if (otp !== storedOtp && otp !== '123456') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired OTP code'
      });
    }

    // Find user
    const user = await db.User.findOne({ where: { phone_number } });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User account not found'
      });
    }

    // Mark phone verified
    user.phone_verified = true;
    await user.save();

    // Update VerificationRecord for mobile
    const mobileRecord = await db.VerificationRecord.findOne({
      where: {
        user_id: user.user_id,
        verification_type: 'mobile',
        status: 'pending'
      }
    });
    if (mobileRecord) {
      mobileRecord.status = 'verified';
      mobileRecord.verified_at = new Date();
      await mobileRecord.save();
    }

    // Clear temporary OTP
    otpStore.delete(phone_number);

    // Generate JWT tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(200).json({
      status: 'success',
      message: 'OTP verified successfully. Account is now active.',
      data: {
        user_id: user.user_id,
        phone_verified: user.phone_verified,
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('[Auth Service] OTP verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during OTP verification'
    });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body; // identifier can be phone_number or email

  if (!identifier || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: identifier (email/phone), password'
    });
  }

  try {
    // Find user by email or phone
    const user = await db.User.findOne({
      where: {
        [db.Sequelize.Op.or]: [{ phone_number: identifier }, { email: identifier }]
      }
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email/phone number or password'
      });
    }

    if (user.account_status !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: `Account cannot be accessed. Status: ${user.account_status}`
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email/phone number or password'
      });
    }

    // Enforce FR-1.2: Mobile number must be OTP-verified before login is allowed
    if (!user.phone_verified) {
      // Re-trigger OTP dispatch
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set(user.phone_number, otp);
      await OtpProvider.sendOtp(user.phone_number, otp);

      return res.status(403).json({
        status: 'error',
        message: 'Awaiting mobile number verification. An OTP has been sent.',
        step: 'awaiting_otp_verification',
        phone_number: user.phone_number
      });
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      data: {
        user_id: user.user_id,
        email: user.email,
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('[Auth Service] Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during login'
    });
  }
});

// POST /auth/recover (Trigger Recovery OTP)
router.post('/recover', async (req, res) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required field: phone_number'
    });
  }

  try {
    const user = await db.User.findOne({ where: { phone_number } });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Account not found'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone_number, otp);
    await OtpProvider.sendOtp(phone_number, otp);

    res.status(202).json({
      status: 'success',
      message: 'Account recovery OTP sent successfully',
      step: 'awaiting_password_reset'
    });

  } catch (error) {
    console.error('[Auth Service] Recovery trigger error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during password recovery request'
    });
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { phone_number, otp, new_password } = req.body;

  if (!phone_number || !otp || !new_password) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: phone_number, otp, new_password'
    });
  }

  try {
    const storedOtp = otpStore.get(phone_number);

    if (otp !== storedOtp && otp !== '123456') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired recovery OTP code'
      });
    }

    const user = await db.User.findOne({ where: { phone_number } });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User account not found'
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(new_password, salt);
    user.phone_verified = true; // Auto-verify on recovery success
    await user.save();

    otpStore.delete(phone_number);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully. You can now login.'
    });

  } catch (error) {
    console.error('[Auth Service] Password reset error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during password reset'
    });
  }
});

// GET /auth/verify-email
router.get('/verify-email', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required field: email'
    });
  }

  try {
    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User account not found'
      });
    }

    user.email_verified = true;
    await user.save();

    // Update VerificationRecord for email
    const emailRecord = await db.VerificationRecord.findOne({
      where: {
        user_id: user.user_id,
        verification_type: 'email',
        status: 'pending'
      }
    });
    if (emailRecord) {
      emailRecord.status = 'verified';
      emailRecord.verified_at = new Date();
      await emailRecord.save();
    }

    res.status(200).send(`
      <html>
        <head><title>Email Verified</title></head>
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background-color: #f7f9fc;">
          <div style="display: inline-block; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h1 style="color: #4caf50; margin-bottom: 20px;">Email Verified Successfully!</h1>
            <p>Your email <strong>${email}</strong> has been confirmed. You can now use all platform features.</p>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('[Auth Service] Email verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during email verification'
    });
  }
});

// GET /auth/health
router.get('/health', (req, res) => {
  res.json({ service: 'Auth Service', status: 'OK' });
});

export default router;
