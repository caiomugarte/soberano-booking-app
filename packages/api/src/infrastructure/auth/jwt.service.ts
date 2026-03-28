import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

interface TokenPayload {
  barberId: string;
}

export function generateAccessToken(barberId: string): string {
  return jwt.sign({ barberId } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: '1h',
  });
}

export function generateRefreshToken(barberId: string): string {
  return jwt.sign({ barberId } satisfies TokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}
