import { verifyToken } from '../services/auth.js';

export const authMiddleware = (req, res, next) => {
  // Extract JWT from HttpOnly cookie or Authorization header
  let token = req.cookies?.token;
  
  // If no cookie, check Authorization header
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  
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
