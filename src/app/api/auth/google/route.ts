import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as jose from 'jose';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: 'idToken is required' }, { status: 400 });
    }

    // Verify the ID token with Google
    const ticket = await client.verifyIdToken({
        idToken,
        audience: [
            process.env.GOOGLE_CLIENT_ID,
            process.env.ANDROID_CLIENT_ID,
            process.env.IOS_CLIENT_ID
        ].filter(Boolean) as string[],
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
        return NextResponse.json({ error: 'Invalid ID token' }, { status: 401 });
    }

    const { email, name } = payload;

    // Find or create the user in the database
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || 'User',
          roles: ['user'], // Default role
        },
      });
    }

    // Generate JWT tokens (accessToken and refreshToken)
    const jwtSecret = process.env.AUTH_SECRET;
    if (!jwtSecret) {
      console.error('AUTH_SECRET is not defined');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const secretKey = new TextEncoder().encode(jwtSecret);
    const alg = 'HS256';

    const accessToken = await new jose.SignJWT({ userId: user.id, email: user.email, name: user.name })
      .setProtectedHeader({ alg })
      .setExpirationTime('1d')
      .setIssuedAt()
      .sign(secretKey);

    const refreshToken = await new jose.SignJWT({ userId: user.id })
      .setProtectedHeader({ alg })
      .setExpirationTime('7d')
      .setIssuedAt()
      .sign(secretKey);

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        name: userWithoutPassword.name,
      },
      token: {
        accessToken,
        refreshToken,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Google sign-in error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
