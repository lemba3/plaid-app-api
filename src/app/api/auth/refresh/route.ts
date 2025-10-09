import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      // This should technically not be reached if middleware is set up correctly
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Generate a new access token
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      console.error('AUTH_SECRET is not defined');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    const secretKey = new TextEncoder().encode(secret);
    const alg = 'HS256';
    const accessToken = await new jose.SignJWT({ userId: user.id, email: user.email, name: user.name })
      .setProtectedHeader({ alg })
      .setExpirationTime('1d')
      .setIssuedAt()
      .sign(secretKey);

    return NextResponse.json({ accessToken }, { status: 200 });

  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}