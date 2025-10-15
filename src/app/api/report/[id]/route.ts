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
      bankNames: [...new Set(report.plaidItem.accounts.map(acc => acc.bankName))],
      reportId: report.id,
      generatedAt: report.createdAt.toISOString(), // Convert Date to ISO string
      userName: report.plaidItem.user.name || 'User', // Fallback to 'User' if name is not available
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching report by ID:', error);
    return NextResponse.json({ error: 'Error fetching report' }, { status: 500 });
  }
}
