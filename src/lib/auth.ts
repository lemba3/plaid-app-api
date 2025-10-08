import { NextRequest } from 'next/server';
import jwt, { TokenExpiredError } from 'jsonwebtoken';

interface UserPayload {
  userId: string;
  name: string;
  email: string;
  iat: number;
  exp: number;
}

export function getUserFromRequest(req: NextRequest): UserPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error);
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    return null;
  }
}
