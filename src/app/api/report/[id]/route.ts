import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Context = {
  params: Promise<{ id: string }> | { id: string }
}

export async function GET(
  req: NextRequest,
  context: Context
) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const params = await context.params;
    const { id } = params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        plaidItem: {
          include: {
            user: {
              select: { name: true, id: true }
            },
            accounts: {
              select: {
                plaidAccountId: true,
                name: true,
                maskedNumber: true,
                type: true,
                subtype: true,
                currency: true,
                bankName: true
              }
            }
          }
        }
      }
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const isAdmin = user.roles.includes('admin');
    if (!isAdmin && report.plaidItem.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract and format the needed parameters
    const responseData = {
      sufficient: report.sufficient,
      requestedAmount: report.requestedAmount,
      reportId: report.id,
      generatedAt: report.createdAt.toISOString(),
      userName: report.plaidItem.user.name || 'User',
      // New fields
      fullName: report.fullName,
      bankAccountName: report.bankAccountName,
      purposeOfVerification: report.purposeOfVerification,
      // Filter to show only the verified account
      accounts: report.plaidItem.accounts.filter(acc => acc.plaidAccountId === report.accountId),
      // Keep bankNames for compatibility, though it will be a single name
      bankNames: [...new Set(report.plaidItem.accounts.filter(acc => acc.plaidAccountId === report.accountId).map(acc => acc.bankName))],
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching report by ID:', error);
    return NextResponse.json({ error: 'Error fetching report' }, { status: 500 });
  }
}
