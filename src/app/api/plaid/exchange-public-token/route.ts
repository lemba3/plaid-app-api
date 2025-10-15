import { NextRequest, NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const client = new PlaidApi(config);

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');

  // The middleware should have already handled unauthorized access, but as a safeguard
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('exhange public token Authenticated user ID:', userId);

  try {
    const { public_token } = await req.json();

    if (!public_token) {
      return NextResponse.json({ error: 'Public token is required' }, { status: 400 });
    }

    const response = await client.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = response.data;

    // Encrypt the access_token before saving it to the database
    const encryptedAccessToken = encrypt(access_token);

    // Save the encrypted access_token to the database
    await prisma.plaidItem.create({
      data: {
        itemId: item_id,
        accessToken: encryptedAccessToken,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error exchanging public token:', error.response?.data || error.message);
    return NextResponse.json(
      {
        error: 'Error exchanging public token',
        details: error.response?.data,
      },
      { status: 500 }
    );
  }
}
