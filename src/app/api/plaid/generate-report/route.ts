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
    const { amount, itemId, accountId, fullName, bankAccountName, purposeOfVerification } = body;

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'A valid positive amount is required' }, { status: 400 });
    }
    if (!itemId || !accountId || !fullName || !bankAccountName || !purposeOfVerification) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const plaidItem = await prisma.plaidItem.findFirst({
      where: { itemId: itemId, userId: userId },
    });

    if (!plaidItem) {
      return NextResponse.json({ error: 'Bank account not found or unauthorized' }, { status: 404 });
    }

    // First, find the internal account record to get its CUID
    const internalAccount = await prisma.account.findUnique({
      where: { plaidAccountId: accountId },
    });

    if (!internalAccount) {
      // This can happen if webhooks haven't synced the account yet.
      return NextResponse.json({ error: 'Internal account record not found. Please wait a moment and try again.' }, { status: 404 });
    }

    let targetAccount: AccountBase | undefined;
    const requestIds: string[] = [];
    let bankName = 'Unknown Bank';

    try {
      const decryptedAccessToken = decrypt(plaidItem.accessToken);
      const accountsResponse = await client.accountsGet({ access_token: decryptedAccessToken });
      requestIds.push(accountsResponse.data.request_id);
      targetAccount = accountsResponse.data.accounts.find(acc => acc.account_id === accountId);

      if (!targetAccount) {
        return NextResponse.json({ error: 'Specified account not found in Plaid' }, { status: 404 });
      }

      const institutionId = accountsResponse.data.item.institution_id;
      if (institutionId) {
        const institutionResponse = await client.institutionsGetById({
          institution_id: institutionId,
          country_codes: ['US' as CountryCode],
        });
        bankName = institutionResponse.data.institution.name;
      }
    } catch (error) {
      console.error(`Error fetching accounts for item ${plaidItem.id}:`, error);
      return NextResponse.json({ error: 'Failed to fetch account information' }, { status: 500 });
    }

    const availableBalance = targetAccount.balances.available || 0;
    const sufficient = availableBalance >= amount;

    const newReport = await prisma.report.create({
      data: {
        sufficient,
        requestIds,
        requestedAmount: amount,
        plaidItemId: plaidItem.id, // Internal DB ID for the item
        accountId: internalAccount.id, // Internal DB ID for the account
        fullName: fullName,
        bankAccountName: bankAccountName,
        purposeOfVerification: purposeOfVerification,
      },
    });

    const responseData = {
      sufficient,
      totalBalance: availableBalance,
      requestedAmount: amount,
      currency: targetAccount.balances.iso_currency_code || 'USD',
      requestIds,
      bankNames: [bankName],
      accounts: [{
        plaidAccountId: targetAccount.account_id,
        name: targetAccount.name,
        maskedNumber: targetAccount.mask,
        balance: targetAccount.balances.available,
        type: targetAccount.type,
        subtype: targetAccount.subtype,
        bankName: bankName,
      }],
      reportId: newReport.id,
      generatedAt: newReport.createdAt,
      fullName: newReport.fullName,
      bankAccountName: newReport.bankAccountName,
      purposeOfVerification: newReport.purposeOfVerification,
    };

    return new Response(JSON.stringify(responseData), {
      headers: { 'content-type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error verifying balance:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Error verifying balance', details: error.response?.data },
      { status: 500 }
    );
  }
}