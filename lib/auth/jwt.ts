import jwt from 'jsonwebtoken';
import { JwtPayload } from '@/types';

const rawSecret = process.env.JWT_SECRET;
if (!rawSecret) {
  throw new Error(
    'JWT_SECRET environment variable is required but not set. ' +
    'Set it in .env.local or your Vercel environment variables.'
  );
}
const JWT_SECRET: string = rawSecret;
const JWT_EXPIRES_IN = '24h';

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}
