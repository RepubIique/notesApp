import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import authRouter from './auth.js';
import { generateToken } from '../services/auth.js';

// Mock environment variables
process.env.PASSWORD_A_HASH = '$2b$10$abcdefghijklmnopqrstuuXYZ123456789ABCDEFGHIJKLMNOPQR';
process.env.PASSWORD_B_HASH = '$2b$10$zyxwvutsrqponmlkjihgfedcba9876543210ZYXWVUTSRQPONMLK';
process.env.HASH_SALT = '10';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  return app;
};

describe('Authentication Routes', () => {
  let app;

  before(() => {
    app = createTestApp();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});
      
      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.error, 'Password is required');
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'wrong-password' });
      
      assert.strictEqual(response.status, 401);
      assert.strictEqual(response.body.error, 'Invalid password');
    });

    it('should not reveal which identity was attempted', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'invalid' });
      
      assert.strictEqual(response.status, 401);
      assert.strictEqual(response.body.error, 'Invalid password');
      assert.ok(!response.body.error.includes('A'));
      assert.ok(!response.body.error.includes('B'));
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear the session cookie', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({});
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      
      // Check that Set-Cookie header clears the token
      const setCookie = response.headers['set-cookie'];
      assert.ok(setCookie);
      assert.ok(setCookie[0].includes('token='));
    });
  });

  describe('GET /api/me', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .send();
      
      assert.strictEqual(response.status, 401);
      assert.strictEqual(response.body.error, 'Authentication required');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['token=invalid-token'])
        .send();
      
      assert.strictEqual(response.status, 401);
      assert.strictEqual(response.body.error, 'Invalid or expired token');
    });

    it('should return user role for valid token', async () => {
      const token = generateToken('A', process.env.JWT_SECRET);
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`token=${token}`])
        .send();
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.role, 'A');
    });
  });
});
