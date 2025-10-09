import { NextRequest, NextResponse } from 'next/server';
import { Configuration, CountryCode, PlaidApi, PlaidEnvironments } from 'plaid';
import prisma from '@/lib/prisma';

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

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await prisma.plaidItem.findMany({
      where: { userId: userId },
    });

    const itemDetails = await Promise.all(
      items.map(async (item) => {
        try {
          const itemResponse = await client.itemGet({ access_token: item.accessToken });
          const institutionId = itemResponse.data.item.institution_id;

          if (!institutionId) {
            return {
              itemId: item.id,
              institution: { name: 'Institution not found' },
            };
          }

          const institutionResponse = await client.institutionsGetById({
            institution_id: institutionId,
            country_codes: ['US' as CountryCode], // Adjust country codes as needed
          });

          return {
            itemId: item.id,
            institution: institutionResponse.data.institution,
          };
        } catch (error) {
          console.error(`Error fetching details for item ${item.id}:`, error);
          return {
            itemId: item.id,
            institution: { name: 'Error fetching institution' },
          };
        }
      })
    );

    return NextResponse.json(itemDetails);

  } catch (error) {
    console.error('Error fetching Plaid items:', error);
    return NextResponse.json({ error: 'Error fetching items' }, { status: 500 });
  }
}
