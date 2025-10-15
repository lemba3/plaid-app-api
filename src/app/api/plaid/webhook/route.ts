import { NextRequest, NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments, CountryCode } from 'plaid';
import prisma from '@/lib/prisma';
import { decrypt, encrypt } from '@/lib/encryption';
import { pusher } from '@/lib/pusher';

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
  const body = await req.json();
  const userId = req.nextUrl.searchParams.get('userId'); // Extract userId from query params

  // console.log('Plaid Webhook Body:', body); // Log the entire body

  // TODO: Verify the webhook signature to ensure the request is from Plaid

  if (!userId) {
    console.error('Webhook received without userId in query parameters.');
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  let publicToken: string | undefined;

  if (body.webhook_type === 'LINK') {
    if (body.webhook_code === 'ITEM_ADD_RESULT') {
      publicToken = body.public_token;
    } else if (body.webhook_code === 'SESSION_FINISHED' && body.status === 'success') {
      publicToken = body.public_tokens?.[0];
    }
  }

  if (publicToken) {
    try {
      const response = await client.itemPublicTokenExchange({
        public_token: publicToken,
      });

      const { access_token, item_id } = response.data; // Get item_id from exchange response

      // Encrypt the access_token before saving it to the database
      const encryptedAccessToken = encrypt(access_token);

      // Check if PlaidItem already exists for this itemId
      const existingPlaidItem = await prisma.plaidItem.findUnique({
        where: { itemId: item_id },
      });

      if (existingPlaidItem) {
        // If it exists, update the access token
        await prisma.plaidItem.update({
          where: { itemId: item_id },
          data: { accessToken: encryptedAccessToken },
        });
        console.log(`Access token updated for item: ${item_id} and user: ${userId}`);
      } else {
        // If it doesn't exist, create a new one
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
        console.log(`Access token saved for item: ${item_id} and user: ${userId}`);

      }

    } catch (error: any) {
      console.error('Error exchanging public token from webhook:', error.response?.data || error.message);
    }
  }

  if (body.webhook_type === 'TRANSACTIONS') {
    const { webhook_code, item_id } = body;

    if (webhook_code === 'INITIAL_UPDATE' || webhook_code === 'HISTORICAL_UPDATE') {
      try {
        const plaidItem = await prisma.plaidItem.findUnique({
          where: { itemId: item_id },
        });

        if (plaidItem) {
          const decryptedAccessToken = decrypt(plaidItem.accessToken);
          const accountsResponse = await client.accountsGet({ access_token: decryptedAccessToken });
          const accounts = accountsResponse.data.accounts;

          const institutionId = accountsResponse.data.item.institution_id;
          let bankName = 'Unknown Bank';
          if (institutionId) {
            try {
              const institutionResponse = await client.institutionsGetById({
                institution_id: institutionId,
                country_codes: ['US' as CountryCode],
              });
              bankName = institutionResponse.data.institution.name;
            } catch (instError) {
              console.error(`Error fetching institution details for ID ${institutionId}:`, instError);
            }
          }

          const accountData = accounts.map(acc => ({
            plaidAccountId: acc.account_id,
            name: acc.name,
            maskedNumber: acc.mask || '',
            type: acc.type,
            subtype: acc.subtype || '',
            currency: acc.balances.iso_currency_code || '',
            bankName: bankName,
            plaidItemId: plaidItem.id,
          }));

          await prisma.account.createMany({
            data: accountData,
            skipDuplicates: true,
          });

          console.log(`Successfully created/updated accounts for item: ${item_id}`);

          // Trigger Pusher event after accounts are created/updated
          console.log('Triggering Pusher event for item-added');
          await pusher.trigger(`user-${userId}`, 'item-added', {
            message: 'A new bank item has been added. Please refresh your UI.',
          });
        }
      } catch (error) {
        console.error(`Error handling transactions update for item ${item_id}:`, error);
      }
    }
  }

  return NextResponse.json({ status: 'ok' });
}
