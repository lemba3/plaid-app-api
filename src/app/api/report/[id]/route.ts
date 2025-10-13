import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    const { id } = params;

    const report = await prisma.report.findUnique({
      where: { id: id },
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const isAdmin = user.roles.includes('admin');
    if (!isAdmin && report.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract and format the needed parameters
    const responseData = {
      sufficient: report.sufficient,
      requestedAmount: report.requestedAmount,
      bankNames: report.bankNames,
      reportId: report.id,
      generatedAt: report.createdAt.toISOString(), // Convert Date to ISO string
      userName: report.user.name || 'User', // Fallback to 'User' if name is not available
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching report by ID:', error);
    return NextResponse.json({ error: 'Error fetching report' }, { status: 500 });
  }
}
