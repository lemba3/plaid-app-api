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

    const { amount } = await req.json();
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'A valid positive amount is required' }, { status: 400 });
    }

    const items = await prisma.plaidItem.findMany({
      where: { userId: userId },
    });

    if (items.length === 0) {
      return NextResponse.json({ error: 'No bank accounts connected' }, { status: 400 });
    }

    let totalAvailableBalance = 0;
    let allAccounts: AccountBase[] = [];
    const requestIds: string[] = [];
    const bankNames = new Set<string>();

    for (const item of items) {
      try {
        const decryptedAccessToken = decrypt(item.accessToken);
        const accountsResponse = await client.accountsGet({ access_token: decryptedAccessToken });
        requestIds.push(accountsResponse.data.request_id);
        allAccounts.push(...accountsResponse.data.accounts);
        totalAvailableBalance += accountsResponse.data.accounts.reduce(
          (total, acc) => total + (acc.balances.available || 0),
          0
        );

        const institutionId = accountsResponse.data.item.institution_id;
        if (institutionId) {
          try {
            const institutionResponse = await client.institutionsGetById({
              institution_id: institutionId,
              country_codes: ['US' as CountryCode], // Adjust country codes as needed
            });
            bankNames.add(institutionResponse.data.institution.name);
          } catch (instError) {
            console.error(`Error fetching institution details for ID ${institutionId}:`, instError);
          }
        }
      } catch (error) {
        // Log the error but continue to the next item if one token is invalid
        console.error(`Error fetching accounts for item ${item.id}:`, error);
      }
    }

    const sufficient = totalAvailableBalance >= amount;

    const newReport = await prisma.report.create({
      data: {
        sufficient,
        requestIds,
        requestedAmount: amount,
        userId: userId,
        bankNames: Array.from(bankNames),
      },
    });

    return NextResponse.json({
      sufficient,
      totalBalance: totalAvailableBalance,
      requestedAmount: amount,
      currency: 'USD', // Assuming USD
      requestIds,
      bankNames: Array.from(bankNames),
      accounts: allAccounts.map(acc => ({
        name: acc.name,
        mask: acc.mask,
        balance: acc.balances.available,
      })),
      reportId: newReport.id,
      generatedAt: newReport.createdAt,
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