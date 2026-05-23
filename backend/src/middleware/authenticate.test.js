'use strict';

/**
 * Tests for authenticate middleware.
 *
 * Covers:
 *   - Missing Authorization header → 401
 *   - Malformed header (no "Bearer " prefix) → 401
 *   - Expired token → 401
 *   - Invalid / tampered token → 401
 *   - Valid token → req.user populated, next() called
 */

const jwt = require('jsonwebtoken');
const authenticate = require('./authenticate');

const TEST_SECRET = 'test-secret-for-authenticate-middleware';

// Helper: build a minimal Express-like req/res/next triple
function makeReqResNext(authHeader) {
  const req = {
    headers: authHeader !== undefined ? { authorization: authHeader } : {},
    method: 'GET',
    originalUrl: '/api/protected',
  };

  const res = {
    _status: null,
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
  };

  const next = jest.fn();

  return { req, res, next };
}

beforeEach(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

afterEach(() => {
  delete process.env.JWT_SECRET;
});

// ── Missing / malformed header ────────────────────────────────────────────────

describe('authenticate — missing or malformed Authorization header', () => {
  test('returns 401 when Authorization header is absent', () => {
    const { req, res, next } = makeReqResNext(undefined);
    authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(res._body).toHaveProperty('error');
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when Authorization header is empty string', () => {
    const { req, res, next } = makeReqResNext('');
    authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(res._body).toHaveProperty('error');
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when Authorization header lacks "Bearer " prefix', () => {
    const token = jwt.sign({ id: 1, username: 'alice' }, TEST_SECRET);
    const { req, res, next } = makeReqResNext(`Token ${token}`);
    authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(res._body).toHaveProperty('error');
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when header is just "Bearer" with no token', () => {
    const { req, res, next } = makeReqResNext('Bearer');
    authenticate(req, res, next);

    // "Bearer" does not start with "Bearer " (note the space), so it's rejected
    expect(res._status).toBe(401);
    expect(res._body).toHaveProperty('error');
    expect(next).not.toHaveBeenCalled();
  });
});

// ── Invalid / expired tokens ──────────────────────────────────────────────────

describe('authenticate — invalid or expired token', () => {
  test('returns 401 for a token signed with a different secret', () => {
    const token = jwt.sign({ id: 1, username: 'alice' }, 'wrong-secret');
    const { req, res, next } = makeReqResNext(`Bearer ${token}`);
    authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(res._body).toHaveProperty('error');
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for a malformed / arbitrary string token', () => {
    const { req, res, next } = makeReqResNext('Bearer not.a.jwt');
    authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(res._body).toHaveProperty('error');
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 with "expired" message for an expired token', () => {
    // Sign a token that expired 1 second ago
    const token = jwt.sign({ id: 1, username: 'alice' }, TEST_SECRET, {
      expiresIn: -1,
    });
    const { req, res, next } = makeReqResNext(`Bearer ${token}`);
    authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(res._body.error).toMatch(/expired/i);
    expect(next).not.toHaveBeenCalled();
  });
});

// ── Valid token ───────────────────────────────────────────────────────────────

describe('authenticate — valid token', () => {
  test('calls next() and attaches decoded payload to req.user', () => {
    const payload = { id: 42, username: 'alice_dev' };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '7d' });
    const { req, res, next } = makeReqResNext(`Bearer ${token}`);

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(42);
    expect(req.user.username).toBe('alice_dev');
    // Should not have sent a response
    expect(res._status).toBeNull();
  });

  test('req.user contains iat and exp claims from the JWT', () => {
    const token = jwt.sign({ id: 1, username: 'bob' }, TEST_SECRET, {
      expiresIn: '7d',
    });
    const { req, res, next } = makeReqResNext(`Bearer ${token}`);

    authenticate(req, res, next);

    expect(req.user).toHaveProperty('iat');
    expect(req.user).toHaveProperty('exp');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
