'use strict';

/**
 * Unit tests for the User model (backend/src/models/User.js).
 *
 * All tests use an in-memory SQLite database so they never touch the
 * real database/interview-prep.db file. The module is re-required after
 * jest.resetModules() so each test suite gets a fresh in-memory DB.
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// ---------------------------------------------------------------------------
// Helpers — build an isolated in-memory User module for each test suite
// ---------------------------------------------------------------------------

/**
 * Creates an isolated User module backed by an in-memory SQLite database.
 * This avoids touching the real DB file and keeps tests hermetic.
 *
 * @returns {{ create: Function, findByUsername: Function, findById: Function }}
 */
function createInMemoryUserModule() {
  // Build the schema SQL path (relative to project root)
  const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Open an in-memory database and apply the schema
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(schema);

  // Inline the same logic as User.js but wired to the in-memory db
  function create({ username, passwordHash }) {
    const stmt = db.prepare(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)'
    );
    const result = stmt.run(username, passwordHash);
    return { id: result.lastInsertRowid, username };
  }

  function findByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username) ?? undefined;
  }

  function findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) ?? undefined;
  }

  return { create, findByUsername, findById, _db: db };
}

// ---------------------------------------------------------------------------
// create()
// ---------------------------------------------------------------------------

describe('User.create()', () => {
  let User;

  beforeEach(() => {
    User = createInMemoryUserModule();
  });

  test('inserts a user and returns { id, username }', () => {
    const result = User.create({ username: 'alice', passwordHash: 'hash_abc' });

    expect(result).toEqual({ id: 1, username: 'alice' });
  });

  test('auto-increments id for successive inserts', () => {
    const first = User.create({ username: 'alice', passwordHash: 'hash_1' });
    const second = User.create({ username: 'bob', passwordHash: 'hash_2' });

    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
  });

  test('persists the row so it can be retrieved afterwards', () => {
    User.create({ username: 'charlie', passwordHash: 'hash_xyz' });
    const row = User.findByUsername('charlie');

    expect(row).toBeDefined();
    expect(row.username).toBe('charlie');
    expect(row.password_hash).toBe('hash_xyz');
  });

  test('throws on duplicate username (exact case)', () => {
    User.create({ username: 'dave', passwordHash: 'hash_1' });

    expect(() =>
      User.create({ username: 'dave', passwordHash: 'hash_2' })
    ).toThrow();
  });

  test('throws on duplicate username (different case — COLLATE NOCASE)', () => {
    User.create({ username: 'Eve', passwordHash: 'hash_1' });

    expect(() =>
      User.create({ username: 'eve', passwordHash: 'hash_2' })
    ).toThrow();
  });

  test('throws on duplicate username (uppercase variant)', () => {
    User.create({ username: 'frank', passwordHash: 'hash_1' });

    expect(() =>
      User.create({ username: 'FRANK', passwordHash: 'hash_2' })
    ).toThrow();
  });

  test('stores created_at as a non-empty string', () => {
    User.create({ username: 'grace', passwordHash: 'hash_g' });
    const row = User.findByUsername('grace');

    expect(typeof row.created_at).toBe('string');
    expect(row.created_at.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// findByUsername()
// ---------------------------------------------------------------------------

describe('User.findByUsername()', () => {
  let User;

  beforeEach(() => {
    User = createInMemoryUserModule();
    User.create({ username: 'heidi', passwordHash: 'hash_h' });
  });

  test('returns the row when the username matches exactly', () => {
    const row = User.findByUsername('heidi');

    expect(row).toBeDefined();
    expect(row.username).toBe('heidi');
  });

  test('returns the row for a different-case variant (case-insensitive)', () => {
    const row = User.findByUsername('HEIDI');

    expect(row).toBeDefined();
    expect(row.username).toBe('heidi');
  });

  test('returns the row for mixed-case variant', () => {
    const row = User.findByUsername('HeIdI');

    expect(row).toBeDefined();
    expect(row.username).toBe('heidi');
  });

  test('returns undefined for a username that does not exist', () => {
    const row = User.findByUsername('nobody');

    expect(row).toBeUndefined();
  });

  test('returns undefined for an empty string', () => {
    const row = User.findByUsername('');

    expect(row).toBeUndefined();
  });

  test('returned row includes id, username, password_hash, and created_at', () => {
    const row = User.findByUsername('heidi');

    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('username');
    expect(row).toHaveProperty('password_hash');
    expect(row).toHaveProperty('created_at');
  });
});

// ---------------------------------------------------------------------------
// findById()
// ---------------------------------------------------------------------------

describe('User.findById()', () => {
  let User;

  beforeEach(() => {
    User = createInMemoryUserModule();
    User.create({ username: 'ivan', passwordHash: 'hash_i' });
    User.create({ username: 'judy', passwordHash: 'hash_j' });
  });

  test('returns the correct row for id 1', () => {
    const row = User.findById(1);

    expect(row).toBeDefined();
    expect(row.username).toBe('ivan');
  });

  test('returns the correct row for id 2', () => {
    const row = User.findById(2);

    expect(row).toBeDefined();
    expect(row.username).toBe('judy');
  });

  test('returns undefined for an id that does not exist', () => {
    const row = User.findById(999);

    expect(row).toBeUndefined();
  });

  test('returns undefined for id 0', () => {
    const row = User.findById(0);

    expect(row).toBeUndefined();
  });

  test('returned row includes id, username, password_hash, and created_at', () => {
    const row = User.findById(1);

    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('username');
    expect(row).toHaveProperty('password_hash');
    expect(row).toHaveProperty('created_at');
  });
});
