import express from 'express';
import rateLimit from 'express-rate-limit';
import { verifyPassword, generateToken } from '../services/auth.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Rate limiter for login endpoint (10 attempts per minute per IP)
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window per IP
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    const PASSWORD_A_HASH = process.env.PASSWORD_A_HASH;
    const PASSWORD_B_HASH = process.env.PASSWORD_B_HASH;
    const HASH_SALT = process.env.HASH_SALT;
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!PASSWORD_A_HASH || !PASSWORD_B_HASH || !HASH_SALT || !JWT_SECRET) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    let role = null;
    
    // Check if password matches Password A
    if (verifyPassword(password, PASSWORD_A_HASH, HASH_SALT)) {
      role = 'A';
    }
    // Check if password matches Password B
    else if (verifyPassword(password, PASSWORD_B_HASH, HASH_SALT)) {
      role = 'B';
    }
    
    // If no match, return unauthorized
    if (!role) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Generate JWT token
    const token = generateToken(role, JWT_SECRET);
    
    // Set HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    // Return role in response
    return res.status(200).json({ role });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // Clear session cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  });
  
  return res.status(200).json({ success: true });
});

// GET /api/me
router.get('/me', authMiddleware, (req, res) => {
  // Return user role from req.user
  return res.status(200).json({ role: req.user.role });
});

export default router;
