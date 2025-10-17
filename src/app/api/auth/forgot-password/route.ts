import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // It's good practice not to reveal if an email is registered or not
      return NextResponse.json({ message: 'If an account with this email exists, a password reset link has been sent.' }, { status: 200 });
    }

    if (!user.password) {
      return NextResponse.json({ error: 'This account does not have a password set. Please log in with your social provider.' }, { status: 400 });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token expiry to 1 hour from now
    const passwordResetExpires = new Date(Date.now() + 3600000);

    await prisma.user.update({
      where: { email },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/deep-link-redirect?token=${resetToken}`;

    const emailHtml = `
      <div style="font-family: sans-serif; text-align: center;">
        <h2>Password Reset Request</h2>
        <p>You are receiving this email because a password reset request was made for your account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
        <p style="margin-top: 20px;">If you did not request a password reset, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html: emailHtml,
    });

    return NextResponse.json({ message: 'If an account with this email exists, a password reset link has been sent.' }, { status: 200 });

  } catch (error) {
    console.error('Forgot password error:', error);
    // Generic error message to avoid leaking information
    return NextResponse.json({ message: 'An error occurred. Please try again later.' }, { status: 500 });
  }
}
