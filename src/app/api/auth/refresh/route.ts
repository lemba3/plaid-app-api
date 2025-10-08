import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

interface RefreshTokenPayload {
  userId: string;
  iat: number;
  exp: number;
}

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    let payload: RefreshTokenPayload;

    try {
      payload = jwt.verify(refreshToken, jwtSecret) as RefreshTokenPayload;
    } catch (error) {
      // This catches errors like expired refresh token
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Generate a new access token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      jwtSecret,
      { expiresIn: '1d' } // Keep consistent with your login endpoint
    );

    return NextResponse.json({ accessToken }, { status: 200 });

  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
