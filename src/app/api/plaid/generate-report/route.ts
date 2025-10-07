import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Configuration, PlaidApi, PlaidEnvironments, AccountBase } from 'plaid';

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
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await req.json();
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'A valid positive amount is required' }, { status: 400 });
    }

    const items = await prisma.plaidItem.findMany({
      where: { userId: user.userId },
    });

    if (items.length === 0) {
      return NextResponse.json({ error: 'No bank accounts connected' }, { status: 400 });
    }

    let totalAvailableBalance = 0;
    let allAccounts: AccountBase[] = [];
    const requestIds: string[] = [];

    for (const item of items) {
      try {
        const accountsResponse = await client.accountsGet({ access_token: item.accessToken });
        requestIds.push(accountsResponse.data.request_id);
        allAccounts.push(...accountsResponse.data.accounts);
        totalAvailableBalance += accountsResponse.data.accounts.reduce(
          (total, acc) => total + (acc.balances.available || 0),
          0
        );
      } catch (error) {
        // Log the error but continue to the next item if one token is invalid
        console.error(`Error fetching accounts for item ${item.id}:`, error);
      }
    }

    const sufficient = totalAvailableBalance >= amount;

    await prisma.report.create({
      data: {
        sufficient,
        requestIds,
        requestedAmount: amount,
        userId: user.userId,
      },
    });

    return NextResponse.json({
      sufficient,
      totalBalance: totalAvailableBalance,
      requestedAmount: amount,
      currency: 'USD', // Assuming USD
      requestIds,
      accounts: allAccounts.map(acc => ({
        name: acc.name,
        mask: acc.mask,
        balance: acc.balances.available,
      })),
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