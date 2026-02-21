import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-me';

interface JWTPayload {
  userId: string;
  theaterId: string;
  role: 'ADMIN' | 'STAFF';
  iat: number;
  exp: number;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(
  userId: string,
  theaterId: string,
  role: 'ADMIN' | 'STAFF'
): string {
  return jwt.sign(
    { userId, theaterId, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}
