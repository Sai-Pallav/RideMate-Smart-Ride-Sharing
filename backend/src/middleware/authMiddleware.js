import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('[AuthMiddleware] Token verification failed:', err.message);
        return res.status(403).json({
          status: 'error',
          message: 'Forbidden: Invalid or expired token'
        });
      }

      req.user = {
        id: parseInt(decoded.user_id || decoded.id || '0', 10),
        email: decoded.email,
        phone_number: decoded.phone_number,
        role: decoded.role || 'user'
      };
      
      console.log('[AuthMiddleware] Token verified successfully for user:', req.user.id);
      next();
    });
  } else {
    console.warn('[AuthMiddleware] Access denied: No bearer token provided');
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Access token is missing'
    });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Authentication required before checking admin role'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Forbidden: Admin authorization required'
    });
  }

  next();
};
