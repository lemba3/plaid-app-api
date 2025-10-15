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

    const plaidItems = await prisma.plaidItem.findMany({
      where: { userId: userId },
      include: {
        accounts: true, // Include the related accounts
      },
    });

    const connectedBanks = await Promise.all(plaidItems.map(async (item) => {
      const decryptedAccessToken = decrypt(item.accessToken);
      const itemResponse = await client.itemGet({ access_token: decryptedAccessToken });
      const institutionId = itemResponse.data.item.institution_id;

      let institution = null;
      if (institutionId) {
        try {
          const institutionResponse = await client.institutionsGetById({
            institution_id: institutionId,
            country_codes: ['US' as CountryCode],
            options: {
              include_optional_metadata: true,
            },
          });
          institution = institutionResponse.data.institution;
        } catch (instError) {
          console.error(`Error fetching institution details for ID ${institutionId}:`, instError);
        }
      }

      return {
        itemId: item.itemId, // Use Plaid Item ID
        institution: institution ? {
          institution_id: institution.institution_id,
          name: institution.name,
          logo: institution.logo,
          primary_color: institution.primary_color,
        } : {
          institution_id: 'unknown',
          name: 'Unknown Institution',
          logo: null,
          primary_color: null,
        },
        accounts: item.accounts.map(acc => ({
          account_id: acc.plaidAccountId,
          name: acc.name,
          mask: acc.maskedNumber,
          subtype: acc.subtype,
          type: acc.type,
          balances: {
            available: null,
            current: null,
            iso_currency_code: acc.currency,
            limit: null,
            unofficial_currency_code: null,
          }
        })),
        last_sync: item.updatedAt,
      };
    }));

    return NextResponse.json(connectedBanks);

  } catch (error) {
    console.error('Error fetching Plaid items:', error);
    return NextResponse.json({ error: 'Error fetching items' }, { status: 500 });
  }
}
