import { NextRequest, NextResponse } from 'next/server';
import { Configuration, CountryCode, PlaidApi, PlaidEnvironments } from 'plaid';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

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
          const decryptedAccessToken = decrypt(item.accessToken);
          const itemResponse = await client.itemGet({ access_token: decryptedAccessToken });
          const institutionId = itemResponse.data.item.institution_id;
          const authResponse = await client.authGet({
            access_token: decryptedAccessToken,
          });
          const accounts = authResponse.data.accounts.map((acc) => ({
            name: acc.name,
            mask: acc.mask,
            subtype: acc.subtype,
            account_id: acc.account_id,
          }));

          if (!institutionId) {
            return {
              itemId: item.id, // Use database id for frontend reference
              institution: { name: 'Institution not found' },
              accounts: [],
            };
          }

          const institutionResponse = await client.institutionsGetById({
            institution_id: institutionId,
            country_codes: ['US' as CountryCode], // Adjust country codes as needed
            options: { include_optional_metadata: true, include_status: true },
          });

          return {
            itemId: item.id,
            institution: institutionResponse.data.institution,
            accounts,
            last_sync: item.updatedAt,
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
