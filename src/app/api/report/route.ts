import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
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

    const isAdmin = user.roles.includes('admin');
    const whereClause = isAdmin ? {} : { plaidItem: { userId: userId } };

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

    const skip = (page - 1) * pageSize;

    const [reports, total] = await prisma.$transaction([
      prisma.report.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          plaidItem: {
            include: {
              user: {
                select: { id: true, email: true, name: true }
              },
            }
          }
        },
      }),
      prisma.report.count({
        where: whereClause,
      }),
    ]);

    // Manually add bankNames to each report for consistency
    const reportsWithDetails = reports.map(report => ({
      ...report,
      bankNames: [], // This can be enhanced later if needed
      userName: report.plaidItem.user.name,
    }));

    return NextResponse.json({
      reports: reportsWithDetails,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Error fetching reports' }, { status: 500 });
  }
}