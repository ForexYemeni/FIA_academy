import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fia-academy-secure-secret-key-2026-change-in-production'
const JWT_EXPIRES_IN = '7d'

export interface JwtPayload {
  sub: string // user id
  email: string
  role: 'admin' | 'trainer' | 'student' | 'team'
  name: string
  iat?: number
  exp?: number
}

// Hash a plain-text password using bcrypt
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(plain, salt)
}

// Verify a plain-text password against a bcrypt hash.
// Also accepts plain-text stored passwords for backward compatibility —
// in that case it returns true if the strings match exactly AND then
// returns true so the caller can rehash on next login.
export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!stored) return { valid: false, needsRehash: false }

  // Detect bcrypt hashes by the $2a$ / $2b$ / $2y$ prefix
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    const valid = await bcrypt.compare(plain, stored)
    return { valid, needsRehash: false }
  }

  // Legacy plain-text password — compare directly
  if (stored === plain) {
    return { valid: true, needsRehash: true }
  }
  return { valid: false, needsRehash: false }
}

// Sign a JWT for a logged-in user
export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// Verify a JWT. Returns null if invalid or expired.
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    return decoded
  } catch {
    return null
  }
}

// Extract the JWT from a request's Authorization header
export function extractToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || ''
  if (auth.startsWith('Bearer ')) return auth.substring(7)
  return null
}
