import { cookies } from 'next/headers';
import { JwtPayload } from '@/types';
import { verifyToken, signToken } from './jwt';

const SESSION_COOKIE_NAME = 'session_token';

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;
  return verifyToken(token);
}

export async function setSession(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  const token = signToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });

  return token;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
