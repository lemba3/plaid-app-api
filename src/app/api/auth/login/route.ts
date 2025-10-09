import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.password) {
      return NextResponse.json({ error: 'User has no password set' }, { status: 500 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

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
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
