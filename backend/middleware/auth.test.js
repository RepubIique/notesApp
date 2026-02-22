import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { authMiddleware } from './auth.js';
import { generateToken } from '../services/auth.js';

process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

describe('Auth Middleware', () => {
  it('should return 401 when no token is provided', () => {
    const req = {
      cookies: {}
    };
    const res = {
      status: mock.fn((code) => res),
      json: mock.fn()
    };
    const next = mock.fn();

    authMiddleware(req, res, next);

    assert.strictEqual(res.status.mock.calls.length, 1);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 401);
    assert.strictEqual(res.json.mock.calls.length, 1);
    assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], {
      error: 'Authentication required'
    });
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it('should return 401 for invalid token', () => {
    const req = {
      cookies: {
        token: 'invalid-token'
      }
    };
    const res = {
      status: mock.fn((code) => res),
      json: mock.fn()
    };
    const next = mock.fn();

    authMiddleware(req, res, next);

    assert.strictEqual(res.status.mock.calls.length, 1);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 401);
    assert.strictEqual(res.json.mock.calls.length, 1);
    assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], {
      error: 'Invalid or expired token'
    });
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it('should attach user role to req.user for valid token', () => {
    const token = generateToken('A', process.env.JWT_SECRET);
    const req = {
      cookies: {
        token
      }
    };
    const res = {
      status: mock.fn((code) => res),
      json: mock.fn()
    };
    const next = mock.fn();

    authMiddleware(req, res, next);

    assert.strictEqual(next.mock.calls.length, 1);
    assert.ok(req.user);
    assert.strictEqual(req.user.role, 'A');
    assert.strictEqual(res.status.mock.calls.length, 0);
    assert.strictEqual(res.json.mock.calls.length, 0);
  });

  it('should call next() for valid authentication', () => {
    const token = generateToken('B', process.env.JWT_SECRET);
    const req = {
      cookies: {
        token
      }
    };
    const res = {
      status: mock.fn((code) => res),
      json: mock.fn()
    };
    const next = mock.fn();

    authMiddleware(req, res, next);

    assert.strictEqual(next.mock.calls.length, 1);
    assert.strictEqual(req.user.role, 'B');
  });

  it('should handle missing cookies object', () => {
    const req = {};
    const res = {
      status: mock.fn((code) => res),
      json: mock.fn()
    };
    const next = mock.fn();

    authMiddleware(req, res, next);

    assert.strictEqual(res.status.mock.calls.length, 1);
    assert.strictEqual(res.status.mock.calls[0].arguments[0], 401);
    assert.strictEqual(next.mock.calls.length, 0);
  });
});
