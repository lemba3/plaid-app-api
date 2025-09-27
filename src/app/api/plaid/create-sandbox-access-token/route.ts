import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Configuration, PlaidApi, PlaidEnvironments, Products } from 'plaid';

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
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Create a sandbox public token
    const publicTokenResponse = await client.sandboxPublicTokenCreate({
      institution_id: 'ins_109508', // A common sandbox institution
      initial_products: [Products.Assets],
    });

    const public_token = publicTokenResponse.data.public_token;

    // Exchange the public token for an access token
    const exchangeResponse = await client.itemPublicTokenExchange({
      public_token,
    });

    const access_token = exchangeResponse.data.access_token;

    return NextResponse.json({ access_token });

  } catch (error: any) {
    console.error('Error creating sandbox access token:', error.response?.data || error.message);
    return NextResponse.json(
      {
        error: 'Error creating sandbox access token',
        details: error.response?.data,
      },
      { status: 500 }
    );
  }
}
