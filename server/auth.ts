import { randomBytes, scryptSync, timingSafeEqual, createHmac, createHash } from 'crypto';

// ---------- Password hashing ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

// Supports old plain-text passwords (legacy: true) so existing accounts keep working
// and get upgraded to a hash the next time they log in.
export function verifyPassword(password: string, stored: string | undefined): { ok: boolean; legacy: boolean } {
  if (!stored) return { ok: false, legacy: false };
  if (stored.startsWith('scrypt$')) {
    const [, salt, hash] = stored.split('$');
    if (!salt || !hash) return { ok: false, legacy: false };
    const test = scryptSync(password, salt, 32);
    const real = Buffer.from(hash, 'hex');
    return { ok: real.length === test.length && timingSafeEqual(real, test), legacy: false };
  }
  return { ok: safeEqual(password, stored), legacy: true };
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// ---------- Signed login tokens ----------
// The signing secret comes from AUTH_SECRET if set, otherwise from the database URL (private to the server).
const SECRET = createHash('sha256')
  .update('remedi-auth:' + (process.env.AUTH_SECRET || process.env.DATABASE_URL || process.env.POSTGRES_URL || 'dev-only-secret'))
  .digest();

const TOKEN_DAYS = 30;

export function signToken(userId: string): string {
  const body = `${userId}.${Date.now() + TOKEN_DAYS * 24 * 3600 * 1000}`;
  const sig = createHmac('sha256', SECRET).update(body).digest('hex');
  return `${Buffer.from(body).toString('base64url')}.${sig}`;
}

export function verifyToken(token: string): string | null {
  const [b64, sig] = String(token || '').split('.');
  if (!b64 || !sig) return null;
  let body = '';
  try {
    body = Buffer.from(b64, 'base64url').toString();
  } catch {
    return null;
  }
  const expected = createHmac('sha256', SECRET).update(body).digest('hex');
  if (!safeEqual(sig, expected)) return null;
  const dot = body.lastIndexOf('.');
  const userId = body.slice(0, dot);
  const exp = Number(body.slice(dot + 1));
  if (!userId || !exp || Date.now() > exp) return null;
  return userId;
}
