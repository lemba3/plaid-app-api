import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as jose from 'jose';
import { jwtVerify, createRemoteJWKSet, decodeJwt } from 'jose';

const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';

interface AppleIdTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  at_hash?: string;
  email?: string;
  email_verified?: string;
  auth_time?: number;
  nonce_supported?: boolean;
  c_hash?: string;
  name?: string;
  // Add other claims as needed
}

async function verifyAppleIdToken(
  idToken: string,
  clientId: string,
  nonce?: string
): Promise<AppleIdTokenPayload> {
  if (!idToken) {
    throw new Error('Apple ID token is required.');
  }
  if (!clientId) {
    throw new Error('Client ID is required for Apple ID token verification.');
  }

  try {
    const decodedHeader = decodeJwt(idToken);
    if (!decodedHeader.kid) {
      throw new Error('Apple ID token header is missing "kid".');
    }

    const JWKS = createRemoteJWKSet(new URL(APPLE_JWKS_URI));

    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: APPLE_ISSUER,
      audience: clientId,
      ...(nonce && { nonce }),
    });

    return payload as AppleIdTokenPayload;
  } catch (error) {
    console.error('Apple ID token verification failed:', error);
    throw new Error(`Failed to verify Apple ID token: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: 'idToken is required' }, { status: 400 });
    }

    const appleClientId = process.env.APPLE_CLIENT_ID;
    if (!appleClientId) {
      console.error('APPLE_CLIENT_ID is not defined');
      return NextResponse.json({ error: 'Internal server error: Apple Client ID not configured' }, { status: 500 });
    }

    const appleIdTokenPayload = await verifyAppleIdToken(idToken, appleClientId);

    if (!appleIdTokenPayload || !appleIdTokenPayload.email) {
      return NextResponse.json({ error: 'Invalid ID token or missing email' }, { status: 401 });
    }

    const { email, sub: appleUserId } = appleIdTokenPayload;
    // Apple does not always provide a name in the ID token, so we might need to handle this.
    // For now, we'll use a generic name if not available.
    const name = appleIdTokenPayload.name || 'Apple User';

    // Find or create the user in the database
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name,
          roles: ['user'], // Default role
          appleUserId: appleUserId, // Store Apple's unique user ID
        },
      });
    } else if (!user.appleUserId) {
      // If user exists but doesn't have appleUserId, link it
      user = await prisma.user.update({
        where: { id: user.id },
        data: { appleUserId: appleUserId },
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
    console.error('Apple sign-in error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
