import { verifyToken } from '../services/auth.js';

export const authMiddleware = (req, res, next) => {
  // Extract JWT from HttpOnly cookie
  const token = req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Verify token
  const JWT_SECRET = process.env.JWT_SECRET;
  const decoded = verifyToken(token, JWT_SECRET);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  // Attach user role to req.user
  req.user = { role: decoded.role };
  
  next();
};
