import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Use a transaction to ensure all data is deleted or none at all
    await prisma.$transaction(async (tx) => {
      // 1. Find all PlaidItems linked to the user
      const itemsToDelete = await tx.plaidItem.findMany({
        where: { userId },
        select: { id: true },
      });
      const itemIds = itemsToDelete.map(item => item.id);

      if (itemIds.length > 0) {
        // 2. Delete all Reports linked to those PlaidItems
        await tx.report.deleteMany({
          where: { plaidItemId: { in: itemIds } },
        });

        // 3. Delete all Accounts linked to those PlaidItems
        await tx.account.deleteMany({
          where: { plaidItemId: { in: itemIds } },
        });

        // 4. Delete the PlaidItems themselves
        await tx.plaidItem.deleteMany({
          where: { userId },
        });
      }

      // 5. Finally, delete the user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return NextResponse.json({ message: 'Account deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'An error occurred while deleting the account.' }, { status: 500 });
  }
}
