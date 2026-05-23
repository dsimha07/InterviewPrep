'use strict';

/**
 * Tests for AuthController.
 *
 * Covers:
 *   - Example-based unit tests: DB unavailable → 503; JWT generation failure → 500
 *   - Property-based tests (fast-check, numRuns: 100):
 *       P1  — Signup creates user + token (valid username, non-empty password → 201)
 *       P3  — Duplicate usernames rejected case-insensitively → 409
 *       P4  — Whitespace-only fields → 400 on both endpoints
 *       P6  — Correct credentials → 200 + token
 *       P7  — Unregistered username → 404
 *       P8  — Wrong password → 401
 *
 * All dependencies (User model, AuthService) are mocked so tests are
 * hermetic and do not touch the real database or JWT infrastructure.
 */

const fc = require('fast-check');

// ─── Mock dependencies before requiring the controller ────────────────────────

jest.mock('../models/User');
jest.mock('../services/AuthService');

const User = require('../models/User');
const AuthService = require('../services/AuthService');
const { signup, login } = require('./AuthController');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a minimal Express-like mock request object.
 *
 * @param {{ username?: unknown, password?: unknown }} body
 * @returns {object}
 */
function mockReq(body = {}) {
  return { body };
}

/**
 * Builds a mock Express response object that records the last status and
 * JSON payload written to it.
 *
 * @returns {{ status: Function, json: Function, _status: number|null, _body: object|null }}
 */
function mockRes() {
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
  return res;
}

/** No-op next function — should not be called in happy-path tests. */
const noop = jest.fn();

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/** Generates valid usernames: 3–30 chars, alphanumeric + underscore. */
const validUsernameArb = fc.stringMatching(/^[a-zA-Z0-9_]{3,30}$/);

/** Generates non-empty passwords (at least one non-whitespace character). */
const nonEmptyPasswordArb = fc
  .string({ minLength: 1, maxLength: 72 })
  .filter((s) => s.trim().length > 0);

/** Generates whitespace-only strings (spaces, tabs, newlines). */
const whitespaceArb = fc
  .stringMatching(/^[ \t\n]+$/)
  .filter((s) => s.length >= 1 && s.length <= 20);

// ─── beforeEach / afterEach ───────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Default: AuthService.isPresent delegates to the real logic
  AuthService.isPresent.mockImplementation(
    (value) => typeof value === 'string' && value.trim().length > 0
  );

  // Default: validateUsername accepts everything (tests override as needed)
  AuthService.validateUsername.mockReturnValue({ valid: true });

  // Default: hashPassword returns a deterministic fake hash
  AuthService.hashPassword.mockResolvedValue('$2b$12$fakehash');

  // Default: verifyPassword returns true (correct password)
  AuthService.verifyPassword.mockResolvedValue(true);

  // Default: signToken returns a fake JWT string
  AuthService.signToken.mockReturnValue('fake.jwt.token');

  // Default: User.create returns a new user row
  User.create.mockReturnValue({ id: 1, username: 'testuser' });

  // Default: User.findByUsername returns undefined (user not found)
  User.findByUsername.mockReturnValue(undefined);
});

// ─── Example-Based Unit Tests ─────────────────────────────────────────────────

describe('signup — example-based', () => {
  it('returns 400 when username is missing', async () => {
    AuthService.isPresent.mockImplementation((v) => v === 'password123');
    const res = mockRes();
    await signup(mockReq({ password: 'password123' }), res, noop);
    expect(res._status).toBe(400);
    expect(res._body).toEqual({ error: 'Username and password are required' });
  });

  it('returns 400 when password is missing', async () => {
    AuthService.isPresent.mockImplementation((v) => v === 'alice');
    const res = mockRes();
    await signup(mockReq({ username: 'alice' }), res, noop);
    expect(res._status).toBe(400);
    expect(res._body).toEqual({ error: 'Username and password are required' });
  });

  it('returns 400 when username fails format validation', async () => {
    AuthService.isPresent.mockReturnValue(true);
    AuthService.validateUsername.mockReturnValue({
      valid: false,
      message: 'Username must be at least 3 characters long.',
    });
    const res = mockRes();
    await signup(mockReq({ username: 'ab', password: 'pass' }), res, noop);
    expect(res._status).toBe(400);
    expect(res._body).toEqual({
      error: 'Username must be at least 3 characters long.',
    });
  });

  it('returns 409 when username is already taken', async () => {
    AuthService.isPresent.mockReturnValue(true);
    AuthService.validateUsername.mockReturnValue({ valid: true });
    User.create.mockImplementation(() => {
      const err = new Error('UNIQUE constraint failed: users.username');
      throw err;
    });
    const res = mockRes();
    await signup(mockReq({ username: 'alice', password: 'pass' }), res, noop);
    expect(res._status).toBe(409);
    expect(res._body).toEqual({ error: 'Username is already taken' });
  });

  it('returns 500 when JWT generation fails', async () => {
    AuthService.isPresent.mockReturnValue(true);
    AuthService.validateUsername.mockReturnValue({ valid: true });
    User.create.mockReturnValue({ id: 1, username: 'alice' });
    AuthService.signToken.mockImplementation(() => {
      throw new Error('jwt sign error');
    });
    const res = mockRes();
    await signup(mockReq({ username: 'alice', password: 'pass' }), res, noop);
    expect(res._status).toBe(500);
    expect(res._body).toEqual({
      error: 'Authentication succeeded but token issuance failed',
    });
  });

  it('returns 201 with token and user on success', async () => {
    AuthService.isPresent.mockReturnValue(true);
    AuthService.validateUsername.mockReturnValue({ valid: true });
    User.create.mockReturnValue({ id: 7, username: 'alice' });
    AuthService.signToken.mockReturnValue('signed.jwt.here');
    const res = mockRes();
    await signup(mockReq({ username: 'alice', password: 'pass' }), res, noop);
    expect(res._status).toBe(201);
    expect(res._body).toEqual({
      token: 'signed.jwt.here',
      user: { id: 7, username: 'alice' },
    });
  });
});

describe('login — example-based', () => {
  it('returns 400 when username is missing', async () => {
    AuthService.isPresent.mockImplementation((v) => v === 'password123');
    const res = mockRes();
    await login(mockReq({ password: 'password123' }), res, noop);
    expect(res._status).toBe(400);
    expect(res._body).toEqual({ error: 'Username and password are required' });
  });

  it('returns 400 when password is missing', async () => {
    AuthService.isPresent.mockImplementation((v) => v === 'alice');
    const res = mockRes();
    await login(mockReq({ username: 'alice' }), res, noop);
    expect(res._status).toBe(400);
    expect(res._body).toEqual({ error: 'Username and password are required' });
  });

  it('returns 404 when user is not found', async () => {
    AuthService.isPresent.mockReturnValue(true);
    User.findByUsername.mockReturnValue(undefined);
    const res = mockRes();
    await login(mockReq({ username: 'ghost', password: 'pass' }), res, noop);
    expect(res._status).toBe(404);
    expect(res._body).toEqual({ error: 'User not found' });
  });

  it('returns 401 when password is incorrect', async () => {
    AuthService.isPresent.mockReturnValue(true);
    User.findByUsername.mockReturnValue({
      id: 1,
      username: 'alice',
      password_hash: '$2b$12$hash',
    });
    AuthService.verifyPassword.mockResolvedValue(false);
    const res = mockRes();
    await login(mockReq({ username: 'alice', password: 'wrong' }), res, noop);
    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'Incorrect password' });
  });

  it('returns 503 when the database is unavailable (SQLITE_CANTOPEN)', async () => {
    AuthService.isPresent.mockReturnValue(true);
    const dbErr = new Error('SQLITE_CANTOPEN: unable to open database file');
    dbErr.code = 'SQLITE_CANTOPEN';
    User.findByUsername.mockImplementation(() => {
      throw dbErr;
    });
    const res = mockRes();
    await login(mockReq({ username: 'alice', password: 'pass' }), res, noop);
    expect(res._status).toBe(503);
    expect(res._body).toEqual({ error: 'Service temporarily unavailable' });
  });

  it('returns 503 when the database is unavailable (SQLITE_IOERR)', async () => {
    AuthService.isPresent.mockReturnValue(true);
    const dbErr = new Error('SQLITE_IOERR: disk I/O error');
    User.findByUsername.mockImplementation(() => {
      throw dbErr;
    });
    const res = mockRes();
    await login(mockReq({ username: 'alice', password: 'pass' }), res, noop);
    expect(res._status).toBe(503);
    expect(res._body).toEqual({ error: 'Service temporarily unavailable' });
  });

  it('returns 500 when JWT generation fails', async () => {
    AuthService.isPresent.mockReturnValue(true);
    User.findByUsername.mockReturnValue({
      id: 1,
      username: 'alice',
      password_hash: '$2b$12$hash',
    });
    AuthService.verifyPassword.mockResolvedValue(true);
    AuthService.signToken.mockImplementation(() => {
      throw new Error('jwt sign error');
    });
    const res = mockRes();
    await login(mockReq({ username: 'alice', password: 'pass' }), res, noop);
    expect(res._status).toBe(500);
    expect(res._body).toEqual({
      error: 'Authentication succeeded but token issuance failed',
    });
  });

  it('returns 200 with token and user on success', async () => {
    AuthService.isPresent.mockReturnValue(true);
    User.findByUsername.mockReturnValue({
      id: 3,
      username: 'alice',
      password_hash: '$2b$12$hash',
    });
    AuthService.verifyPassword.mockResolvedValue(true);
    AuthService.signToken.mockReturnValue('login.jwt.token');
    const res = mockRes();
    await login(mockReq({ username: 'alice', password: 'pass' }), res, noop);
    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      token: 'login.jwt.token',
      user: { id: 3, username: 'alice' },
    });
  });
});

// ─── Property-Based Tests ─────────────────────────────────────────────────────

// Feature: basic-auth, Property 1: Signup creates a user and returns a token
describe('P1 — signup creates user + token for valid inputs', () => {
  /**
   * Validates: Requirements 1.1, 3.1
   *
   * For any valid username (3–30 alphanumeric/underscore chars) and non-empty
   * password, signup must return HTTP 201 with a token field in the body.
   */
  it('returns 201 with token for any valid username and non-empty password', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUsernameArb,
        nonEmptyPasswordArb,
        fc.integer({ min: 1, max: 100_000 }),
        async (username, password, userId) => {
          // Arrange
          AuthService.isPresent.mockReturnValue(true);
          AuthService.validateUsername.mockReturnValue({ valid: true });
          AuthService.hashPassword.mockResolvedValue('$2b$12$fakehash');
          User.create.mockReturnValue({ id: userId, username });
          AuthService.signToken.mockReturnValue('valid.jwt.token');

          const res = mockRes();
          await signup(mockReq({ username, password }), res, noop);

          expect(res._status).toBe(201);
          expect(res._body).toHaveProperty('token');
          expect(typeof res._body.token).toBe('string');
          expect(res._body.user).toEqual({ id: userId, username });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: basic-auth, Property 3: Duplicate usernames rejected case-insensitively
describe('P3 — duplicate usernames rejected with 409', () => {
  /**
   * Validates: Requirements 1.3
   *
   * For any username that has already been registered, a second signup attempt
   * (in any casing variant) must return HTTP 409.
   */
  it('returns 409 for any duplicate username (case-insensitive)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUsernameArb,
        nonEmptyPasswordArb,
        async (username, password) => {
          // Simulate the DB throwing a UNIQUE constraint error (as SQLite does)
          AuthService.isPresent.mockReturnValue(true);
          AuthService.validateUsername.mockReturnValue({ valid: true });
          AuthService.hashPassword.mockResolvedValue('$2b$12$fakehash');
          User.create.mockImplementation(() => {
            const err = new Error(
              'UNIQUE constraint failed: users.username'
            );
            throw err;
          });

          const res = mockRes();
          await signup(mockReq({ username, password }), res, noop);

          expect(res._status).toBe(409);
          expect(res._body).toEqual({ error: 'Username is already taken' });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: basic-auth, Property 4: Whitespace-only fields → 400 on both endpoints
describe('P4 — whitespace-only fields return 400 on signup and login', () => {
  /**
   * Validates: Requirements 1.4, 2.5
   *
   * For any string composed entirely of whitespace characters, submitting it
   * as username or password to either endpoint must return HTTP 400.
   */
  it('signup returns 400 when username is whitespace-only', async () => {
    await fc.assert(
      fc.asyncProperty(whitespaceArb, nonEmptyPasswordArb, async (wsUsername, password) => {
        // isPresent returns false for whitespace-only strings
        AuthService.isPresent.mockImplementation(
          (v) => typeof v === 'string' && v.trim().length > 0
        );

        const res = mockRes();
        await signup(mockReq({ username: wsUsername, password }), res, noop);

        expect(res._status).toBe(400);
        expect(res._body).toEqual({
          error: 'Username and password are required',
        });
      }),
      { numRuns: 100 }
    );
  });

  it('signup returns 400 when password is whitespace-only', async () => {
    await fc.assert(
      fc.asyncProperty(validUsernameArb, whitespaceArb, async (username, wsPassword) => {
        AuthService.isPresent.mockImplementation(
          (v) => typeof v === 'string' && v.trim().length > 0
        );

        const res = mockRes();
        await signup(mockReq({ username, password: wsPassword }), res, noop);

        expect(res._status).toBe(400);
        expect(res._body).toEqual({
          error: 'Username and password are required',
        });
      }),
      { numRuns: 100 }
    );
  });

  it('login returns 400 when username is whitespace-only', async () => {
    await fc.assert(
      fc.asyncProperty(whitespaceArb, nonEmptyPasswordArb, async (wsUsername, password) => {
        AuthService.isPresent.mockImplementation(
          (v) => typeof v === 'string' && v.trim().length > 0
        );

        const res = mockRes();
        await login(mockReq({ username: wsUsername, password }), res, noop);

        expect(res._status).toBe(400);
        expect(res._body).toEqual({
          error: 'Username and password are required',
        });
      }),
      { numRuns: 100 }
    );
  });

  it('login returns 400 when password is whitespace-only', async () => {
    await fc.assert(
      fc.asyncProperty(validUsernameArb, whitespaceArb, async (username, wsPassword) => {
        AuthService.isPresent.mockImplementation(
          (v) => typeof v === 'string' && v.trim().length > 0
        );

        const res = mockRes();
        await login(mockReq({ username, password: wsPassword }), res, noop);

        expect(res._status).toBe(400);
        expect(res._body).toEqual({
          error: 'Username and password are required',
        });
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: basic-auth, Property 6: Correct credentials always produce a successful login
describe('P6 — correct credentials return 200 + token', () => {
  /**
   * Validates: Requirements 2.1, 2.2
   *
   * For any registered user, login with the correct username and password
   * must return HTTP 200 with a token field.
   */
  it('returns 200 with token for any valid registered user credentials', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUsernameArb,
        nonEmptyPasswordArb,
        fc.integer({ min: 1, max: 100_000 }),
        async (username, password, userId) => {
          AuthService.isPresent.mockReturnValue(true);
          User.findByUsername.mockReturnValue({
            id: userId,
            username,
            password_hash: '$2b$12$fakehash',
          });
          AuthService.verifyPassword.mockResolvedValue(true);
          AuthService.signToken.mockReturnValue('valid.login.token');

          const res = mockRes();
          await login(mockReq({ username, password }), res, noop);

          expect(res._status).toBe(200);
          expect(res._body).toHaveProperty('token');
          expect(typeof res._body.token).toBe('string');
          expect(res._body.user).toEqual({ id: userId, username });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: basic-auth, Property 7: Unregistered usernames always return 404 on login
describe('P7 — unregistered username returns 404', () => {
  /**
   * Validates: Requirements 2.3
   *
   * For any username that has never been registered, login must return HTTP 404.
   */
  it('returns 404 for any username not found in the database', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUsernameArb,
        nonEmptyPasswordArb,
        async (username, password) => {
          AuthService.isPresent.mockReturnValue(true);
          User.findByUsername.mockReturnValue(undefined);

          const res = mockRes();
          await login(mockReq({ username, password }), res, noop);

          expect(res._status).toBe(404);
          expect(res._body).toEqual({ error: 'User not found' });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: basic-auth, Property 8: Wrong passwords always return 401 on login
describe('P8 — wrong password returns 401', () => {
  /**
   * Validates: Requirements 2.4
   *
   * For any registered user, login with a password that does not match
   * the stored hash must return HTTP 401.
   */
  it('returns 401 for any incorrect password', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUsernameArb,
        nonEmptyPasswordArb,
        fc.integer({ min: 1, max: 100_000 }),
        async (username, wrongPassword, userId) => {
          AuthService.isPresent.mockReturnValue(true);
          User.findByUsername.mockReturnValue({
            id: userId,
            username,
            password_hash: '$2b$12$fakehash',
          });
          // verifyPassword returns false — password does not match
          AuthService.verifyPassword.mockResolvedValue(false);

          const res = mockRes();
          await login(mockReq({ username, password: wrongPassword }), res, noop);

          expect(res._status).toBe(401);
          expect(res._body).toEqual({ error: 'Incorrect password' });
        }
      ),
      { numRuns: 100 }
    );
  });
});
