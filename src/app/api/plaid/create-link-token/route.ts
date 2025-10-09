import { NextRequest, NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
      'PLAID-SECRET': process.env.PLAID_SECRET || '',
    },
  },
});

const client = new PlaidApi(config);

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const userName = req.headers.get('x-user-name');

  // The middleware should have already handled unauthorized access, but as a safeguard
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('Authenticated user ID:', userId);

  try {
    const response = await client.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: userName || 'AppName',
      products: [Products.Auth, Products.Transactions, Products.Assets],
      country_codes: [CountryCode.Us],
      language: 'en',
      android_package_name: 'com.purui.app',
    });
    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Plaid link token error:', error);
    return NextResponse.json({ error: 'Error generating link token' }, { status: 500 });
  }
}