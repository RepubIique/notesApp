import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hashPassword, verifyPassword, generateToken, verifyToken } from './auth.js';

describe('Auth Service', () => {
  describe('Password Hashing', () => {
    it('should hash a password', () => {
      const password = 'test-password';
      const salt = '10';
      
      const hash = hashPassword(password, salt);
      
      assert.ok(hash);
      assert.ok(typeof hash === 'string');
      assert.ok(hash.startsWith('$2b$'));
    });

    it('should verify correct password', () => {
      const password = 'test-password';
      const salt = '10';
      const hash = hashPassword(password, salt);
      
      const isValid = verifyPassword(password, hash, salt);
      
      assert.strictEqual(isValid, true);
    });

    it('should reject incorrect password', () => {
      const password = 'test-password';
      const wrongPassword = 'wrong-password';
      const salt = '10';
      const hash = hashPassword(password, salt);
      
      const isValid = verifyPassword(wrongPassword, hash, salt);
      
      assert.strictEqual(isValid, false);
    });

    it('should never compare plaintext passwords', () => {
      const password = 'test-password';
      const salt = '10';
      const hash = hashPassword(password, salt);
      
      // Verify that the hash is not the plaintext password
      assert.notStrictEqual(hash, password);
      
      // Verify that the hash is cryptographically secure (bcrypt format)
      assert.ok(hash.startsWith('$2b$'));
      assert.ok(hash.length > 50);
    });
  });

  describe('JWT Token Management', () => {
    const secret = 'test-secret-key';

    it('should generate a JWT token with role', () => {
      const role = 'A';
      
      const token = generateToken(role, secret);
      
      assert.ok(token);
      assert.ok(typeof token === 'string');
      assert.ok(token.split('.').length === 3); // JWT has 3 parts
    });

    it('should generate token with 7-day expiry', () => {
      const role = 'A';
      
      const token = generateToken(role, secret);
      const decoded = verifyToken(token, secret);
      
      assert.ok(decoded);
      assert.ok(decoded.exp);
      assert.ok(decoded.iat);
      
      // Check that expiry is approximately 7 days from now
      const expiryTime = decoded.exp - decoded.iat;
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      
      // Allow 1 second tolerance
      assert.ok(Math.abs(expiryTime - sevenDaysInSeconds) <= 1);
    });

    it('should verify valid token and return payload', () => {
      const role = 'B';
      const token = generateToken(role, secret);
      
      const decoded = verifyToken(token, secret);
      
      assert.ok(decoded);
      assert.strictEqual(decoded.role, 'B');
      assert.ok(decoded.iat);
      assert.ok(decoded.exp);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      const decoded = verifyToken(invalidToken, secret);
      
      assert.strictEqual(decoded, null);
    });

    it('should return null for token with wrong secret', () => {
      const role = 'A';
      const token = generateToken(role, secret);
      const wrongSecret = 'wrong-secret';
      
      const decoded = verifyToken(token, wrongSecret);
      
      assert.strictEqual(decoded, null);
    });

    it('should include correct role in token payload', () => {
      const roleA = generateToken('A', secret);
      const roleB = generateToken('B', secret);
      
      const decodedA = verifyToken(roleA, secret);
      const decodedB = verifyToken(roleB, secret);
      
      assert.strictEqual(decodedA.role, 'A');
      assert.strictEqual(decodedB.role, 'B');
    });
  });
});
