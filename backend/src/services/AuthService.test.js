'use strict';

/**
 * Tests for AuthService.
 *
 * Covers:
 *   - Property-based tests: P2 (passwords stored as bcrypt hash),
 *     P5 (invalid username formats rejected), P9 (JWT claims + expiry)
 *   - Example-based unit tests: validateUsername boundary values,
 *     isPresent edge cases
 */

const jwt = require('jsonwebtoken');
const fc = require('fast-check');
const {
  hashPassword,
  verifyPassword,
  signToken,
  validateUsername,
  isPresent,
} = require('./AuthService');

// ─── Setup ────────────────────────────────────────────────────────────────────

const TEST_SECRET = 'test-secret-for-jest';

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

// ─── Property-Based Tests ─────────────────────────────────────────────────────

// Feature: basic-auth, Property 2: Passwords are stored as bcrypt hashes (never plaintext)
describe('P2 — hashPassword / verifyPassword', () => {
  /**
   * Validates: Requirements 1.2
   *
   * For any plaintext password, the stored hash must NOT equal the plaintext,
   * and bcrypt.compare(plaintext, hash) must return true.
   *
   * Note: bcrypt with cost factor 12 is intentionally slow (~200 ms/hash).
   * numRuns is reduced to 10 to keep the suite under 30 s while still
   * exercising the property across diverse inputs.
   */
  it(
    'hash is never equal to plaintext, and verifyPassword returns true',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Printable ASCII strings, length 1–72 (bcrypt max input is 72 bytes)
          fc.string({ minLength: 1, maxLength: 72 }),
          async (password) => {
            const hash = await hashPassword(password);

            // The stored value must not be the plaintext
            expect(hash).not.toBe(password);

            // bcrypt.compare must confirm the match
            const matches = await verifyPassword(password, hash);
            expect(matches).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    },
    60000 // 60 s timeout — bcrypt cost 12 takes ~200 ms per hash
  );

  it(
    'verifyPassword returns false for a wrong password',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 72 }),
          fc.string({ minLength: 1, maxLength: 72 }),
          async (password, wrongPassword) => {
            fc.pre(password !== wrongPassword);
            const hash = await hashPassword(password);
            const matches = await verifyPassword(wrongPassword, hash);
            expect(matches).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    },
    60000
  );
});

// Feature: basic-auth, Property 5: Invalid username formats are rejected with 400
describe('P5 — validateUsername rejects invalid formats', () => {
  /**
   * Validates: Requirements 1.5
   *
   * Any string shorter than 3 chars, longer than 30 chars, or containing
   * characters other than alphanumerics and underscores must be rejected.
   */
  it('rejects usernames shorter than 3 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 2 }),
        (username) => {
          const result = validateUsername(username);
          expect(result.valid).toBe(false);
          expect(result.message).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('rejects usernames longer than 30 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 31 }),
        (username) => {
          const result = validateUsername(username);
          expect(result.valid).toBe(false);
          expect(result.message).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('rejects usernames containing characters other than alphanumerics and underscores', () => {
    // Generate strings in the valid length range but containing at least one
    // character outside [a-zA-Z0-9_].
    // Strategy: build a valid-length prefix of safe chars, then inject a bad char.
    const badChars = [
      '-', '.', ' ', '!', '@', '#', '$', '%', '^', '&', '*',
      '(', ')', '+', '=', '[', ']', '{', '}', '|', '/',
      '?', '<', '>', ',', ';', ':', "'", '"', '`', '~',
    ];

    const invalidCharArb = fc
      .tuple(
        // A valid-looking base string (alphanumeric + underscore), length 2–29
        fc.stringMatching(/^[a-zA-Z0-9_]{2,29}$/),
        fc.constantFrom(...badChars),
      )
      .map(([base, badChar]) => {
        // Append the bad character so the result is 3–30 chars
        return base + badChar;
      })
      .filter((s) => s.length >= 3 && s.length <= 30);

    fc.assert(
      fc.property(invalidCharArb, (username) => {
        const result = validateUsername(username);
        expect(result.valid).toBe(false);
        expect(result.message).toBeDefined();
      }),
      { numRuns: 20 }
    );
  });
});

// Feature: basic-auth, Property 9: JWT payload contains correct claims and expiry
describe('P9 — signToken JWT claims and expiry', () => {
  /**
   * Validates: Requirements 3.2, 3.3
   *
   * For any user { id, username }, the returned JWT must decode to a payload
   * containing those exact values, and exp − iat must equal exactly 604 800 s (7 days).
   */
  it('JWT payload contains correct id, username, and 7-day expiry window', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 1_000_000 }),
          // Generate valid usernames: 3–30 chars, alphanumeric + underscore
          username: fc.stringMatching(/^[a-zA-Z0-9_]{3,30}$/),
        }),
        (user) => {
          const token = signToken(user);
          const decoded = jwt.verify(token, TEST_SECRET, { algorithms: ['HS256'] });

          expect(decoded.id).toBe(user.id);
          expect(decoded.username).toBe(user.username);

          // exp − iat must be exactly 7 days = 604 800 seconds
          expect(decoded.exp - decoded.iat).toBe(604800);
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ─── Example-Based Unit Tests ─────────────────────────────────────────────────

describe('validateUsername — boundary values', () => {
  it('rejects a username of 2 characters (below minimum)', () => {
    const result = validateUsername('ab');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/at least 3/i);
  });

  it('accepts a username of exactly 3 characters (minimum boundary)', () => {
    const result = validateUsername('abc');
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('accepts a username of exactly 30 characters (maximum boundary)', () => {
    const result = validateUsername('a'.repeat(30));
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('rejects a username of 31 characters (above maximum)', () => {
    const result = validateUsername('a'.repeat(31));
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/no more than 30/i);
  });

  it('accepts usernames with letters, digits, and underscores', () => {
    expect(validateUsername('Alice_42').valid).toBe(true);
    expect(validateUsername('_leading').valid).toBe(true);
    expect(validateUsername('trailing_').valid).toBe(true);
  });

  it('rejects usernames with spaces', () => {
    expect(validateUsername('bad name').valid).toBe(false);
  });

  it('rejects usernames with hyphens', () => {
    expect(validateUsername('bad-name').valid).toBe(false);
  });

  it('rejects usernames with special characters', () => {
    expect(validateUsername('user@name').valid).toBe(false);
  });
});

describe('isPresent', () => {
  it('returns false for undefined', () => {
    expect(isPresent(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isPresent(null)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isPresent('')).toBe(false);
  });

  it('returns false for a whitespace-only string (spaces)', () => {
    expect(isPresent('   ')).toBe(false);
  });

  it('returns false for a whitespace-only string (tabs and newlines)', () => {
    expect(isPresent('\t\n')).toBe(false);
  });

  it('returns true for a non-empty string', () => {
    expect(isPresent('hello')).toBe(true);
  });

  it('returns true for a string with surrounding whitespace but non-whitespace content', () => {
    expect(isPresent('  hi  ')).toBe(true);
  });

  it('returns false for a number (non-string type)', () => {
    expect(isPresent(42)).toBe(false);
  });
});
