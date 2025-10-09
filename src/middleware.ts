import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// Define a type for the user payload in the JWT
interface UserPayload {
  userId: string;
  email: string;
  name?: string;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
  }

  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error('AUTH_SECRET is not defined');
    }
    const secretKey = new TextEncoder().encode(secret);

    const newHeaders = new Headers(request.headers);

    if (pathname === '/api/auth/refresh') {
      // For refresh, the token is the refresh token.
      // We just verify it and pass the userId along.
      const { payload } = await jose.jwtVerify(token, secretKey);
      if (!payload.userId) {
        return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
      }
      newHeaders.set('x-user-id', payload.userId as string);
    } else { // This covers /api/plaid/*
      // For other protected routes, the token is the access token.
      const { payload } = await jose.jwtVerify(token, secretKey);
      const decoded = payload as unknown as UserPayload;

      newHeaders.set('x-user-id', decoded.userId);
      newHeaders.set('x-user-email', decoded.email);
      if (decoded.name) {
        newHeaders.set('x-user-name', decoded.name);
      }
    }

    return NextResponse.next({
      request: {
        headers: newHeaders,
      },
    });

  } catch (error: any) {
    console.error('Token verification error:', error);
    if (pathname === '/api/auth/refresh') {
      // If refresh token is invalid/expired
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }
    if (error.code === 'ERR_JWT_EXPIRED') {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
  }
}

// Specify the paths for which this middleware should run
export const config = {
  matcher: ['/api/plaid/:path*', '/api/auth/refresh', '/api/report/:path*'],
};