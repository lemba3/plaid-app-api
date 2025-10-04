import { NextRequest, NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { getUserFromRequest } from '@/lib/auth';

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
  const user = getUserFromRequest(req);

  console.log('Authenticated user:', user);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await client.linkTokenCreate({
      user: { client_user_id: user.userId },
      client_name: user.name || 'AppName',
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