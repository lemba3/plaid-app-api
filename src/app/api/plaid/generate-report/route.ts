import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Configuration, PlaidApi, PlaidEnvironments, AccountBase, CountryCode } from 'plaid';
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

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount, itemId } = body;

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'A valid positive amount is required' }, { status: 400 });
    }
    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const plaidItem = await prisma.plaidItem.findFirst({
      where: {
        itemId: itemId,
        userId: userId // Ensure the item belongs to the user
      },
    });

    if (!plaidItem) {
      return NextResponse.json({ error: 'Bank account not found or unauthorized' }, { status: 404 });
    }

    let totalAvailableBalance = 0;
    let allAccounts: AccountBase[] = [];
    const requestIds: string[] = [];
    const bankNames = new Set<string>();

    try {
      const decryptedAccessToken = decrypt(plaidItem.accessToken);
      const accountsResponse = await client.accountsGet({ access_token: decryptedAccessToken });
      requestIds.push(accountsResponse.data.request_id);
      allAccounts = accountsResponse.data.accounts;
      const depositoryAccounts = allAccounts.filter(acc => acc.type === 'depository');
      totalAvailableBalance = depositoryAccounts.reduce(
        (total, acc) => total + (acc.balances.available || 0),
        0
      );

      const institutionId = accountsResponse.data.item.institution_id;
      if (institutionId) {
        try {
          const institutionResponse = await client.institutionsGetById({
            institution_id: institutionId,
            country_codes: ['US' as CountryCode],
          });
          bankNames.add(institutionResponse.data.institution.name);
        } catch (instError) {
          console.error(`Error fetching institution details for ID ${institutionId}:`, instError);
          bankNames.add('Unknown Bank'); // Fallback name
        }
      }
    } catch (error) {
      console.error(`Error fetching accounts for item ${plaidItem.id}:`, error);
      return NextResponse.json({
        error: 'Failed to fetch account information',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    const sufficient = totalAvailableBalance >= amount;

    const newReport = await prisma.report.create({
      data: {
        sufficient,
        requestIds,
        requestedAmount: amount,
        plaidItem: {
          connect: {
            itemId: itemId, // Connect by Plaid Item ID
          }
        }
      },
    });

    const responseData = {
      sufficient,
      totalBalance: totalAvailableBalance,
      requestedAmount: amount,
      currency: 'USD',
      requestIds,
      bankNames: Array.from(bankNames), // Now returning array of bank names
      accounts: allAccounts.map(acc => ({
        plaidAccountId: acc.account_id,
        name: acc.name,
        maskedNumber: acc.mask,
        balance: acc.balances.available,
        type: acc.type,
        subtype: acc.subtype,
        bankName: bankNames.size === 1 ? Array.from(bankNames)[0] : 'Multiple Banks', // Simplified bank name
      })),
      reportId: newReport.id,
      generatedAt: newReport.createdAt,
    };

    // Use Response instead of NextResponse
    return new Response(JSON.stringify(responseData), {
      headers: {
        'content-type': 'application/json',
      },
    });

  } catch (error: any) {
    console.error('Error verifying balance:', error.response?.data || error.message);
    return NextResponse.json(
      {
        error: 'Error verifying balance',
        details: error.response?.data,
      },
      { status: 500 }
    );
  }
}