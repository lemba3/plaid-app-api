import { pusher } from '@/lib/pusher';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { channel, event, data } = await req.json();
  await pusher.trigger(channel, event, data);
  return NextResponse.json({ message: 'Pusher event triggered' });
}
