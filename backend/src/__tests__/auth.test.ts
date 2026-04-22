/**
 * auth.test.ts — Integration tests for /api/auth routes.
 *
 * Uses an in-memory SQLite DB so tests are fully isolated and fast.
 * No real HTTP server is started — we test route logic directly.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Minimal in-memory DB + bcrypt mock ──────────────────────────────────────
// We stub the db and bcrypt so tests don't need a real SQLite file or slow hashing.

const users = new Map<string, { id: string; email: string; display_name: string; password_hash: string }>();

vi.mock('../db/database.js', () => ({
  db: {
    prepare: (sql: string) => ({
      get: (...args: unknown[]) => {
        if (sql.includes('WHERE email =')) {
          return users.get(args[0] as string) ?? undefined;
        }
        if (sql.includes('WHERE id =')) {
          return [...users.values()].find(u => u.id === args[0]);
        }
        return undefined;
      },
      run: (...args: unknown[]) => {
        // INSERT INTO users
        if (sql.includes('INSERT INTO users')) {
          const [id, email, display_name, password_hash] = args as string[];
          users.set(email, { id, email, display_name, password_hash });
        }
      },
    }),
  },
  initDatabase: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: async (pw: string) => `hashed:${pw}`,
    compare: async (pw: string, hash: string) => hash === `hashed:${pw}`,
  },
}));

vi.mock('../middleware/auth.js', async () => {
  const actual = await vi.importActual('../middleware/auth.js') as Record<string, unknown>;
  return {
    ...actual,
    signToken: (userId: string, email: string) => `mock-token:${userId}:${email}`,
  };
});

// ─── Minimal request/response mocks ──────────────────────────────────────────

function mockRes() {
  const res = {
    _status: 200,
    _body: {} as Record<string, unknown>,
    status(code: number) { this._status = code; return this; },
    json(body: Record<string, unknown>) { this._body = body; return this; },
  };
  return res;
}

// ─── Import router under test ─────────────────────────────────────────────────

const { authRouter } = await import('../routes/authRoutes.js');

function findRoute(method: string, path: string) {
  const layer = (authRouter.stack as { route?: { path: string; methods: Record<string, boolean>; stack: { handle: Function }[] } }[])
    .find(l => l.route?.path === path && l.route?.methods[method]);
  return layer?.route?.stack[layer.route.stack.length - 1].handle;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  beforeEach(() => users.clear());

  it('creates user and returns token for valid input', async () => {
    const handler = findRoute('post', '/register');
    const req = { body: { email: 'test@example.de', password: 'password123', displayName: 'Test User' } };
    const res = mockRes();
    await handler!(req, res, () => {});
    expect(res._status).toBe(201);
    expect(res._body.success).toBe(true);
    expect((res._body.data as { token: string }).token).toContain('mock-token:');
  });

  it('rejects missing fields', async () => {
    const handler = findRoute('post', '/register');
    const req = { body: { email: 'test@example.de' } };
    const res = mockRes();
    await handler!(req, res, () => {});
    expect(res._status).toBe(400);
    expect(res._body.success).toBe(false);
  });

  it('rejects invalid email format', async () => {
    const handler = findRoute('post', '/register');
    const req = { body: { email: 'not-an-email', password: 'password123', displayName: 'Test' } };
    const res = mockRes();
    await handler!(req, res, () => {});
    expect(res._status).toBe(400);
  });

  it('rejects password shorter than 8 characters', async () => {
    const handler = findRoute('post', '/register');
    const req = { body: { email: 'test@x.de', password: 'short', displayName: 'Test' } };
    const res = mockRes();
    await handler!(req, res, () => {});
    expect(res._status).toBe(400);
  });

  it('rejects duplicate email', async () => {
    const handler = findRoute('post', '/register');
    const req = { body: { email: 'dup@example.de', password: 'password123', displayName: 'Test' } };
    const res1 = mockRes();
    await handler!(req, res1, () => {});
    expect(res1._status).toBe(201);

    const res2 = mockRes();
    await handler!(req, res2, () => {});
    expect(res2._status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    users.clear();
    users.set('existing@example.de', {
      id: 'user-1',
      email: 'existing@example.de',
      display_name: 'Existing User',
      password_hash: 'hashed:correctpassword',
    });
  });

  it('returns token for correct credentials', async () => {
    const handler = findRoute('post', '/login');
    const req = { body: { email: 'existing@example.de', password: 'correctpassword' } };
    const res = mockRes();
    await handler!(req, res, () => {});
    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
  });

  it('rejects wrong password', async () => {
    const handler = findRoute('post', '/login');
    const req = { body: { email: 'existing@example.de', password: 'wrongpassword' } };
    const res = mockRes();
    await handler!(req, res, () => {});
    expect(res._status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const handler = findRoute('post', '/login');
    const req = { body: { email: 'unknown@example.de', password: 'password123' } };
    const res = mockRes();
    await handler!(req, res, () => {});
    expect(res._status).toBe(401);
  });
});
