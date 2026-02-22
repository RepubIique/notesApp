import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Password hashing utilities
export const hashPassword = (password, salt) => {
  const saltRounds = parseInt(salt, 10);
  return bcrypt.hashSync(password, saltRounds);
};

export const verifyPassword = (password, hash, salt) => {
  const hashedPassword = hashPassword(password, salt);
  return bcrypt.compareSync(password, hash);
};

// JWT utilities
export const generateToken = (role, secret) => {
  const payload = {
    role,
    iat: Math.floor(Date.now() / 1000),
  };
  
  // 7-day expiry
  const expiresIn = '7d';
  
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = (token, secret) => {
  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    return null;
  }
};
