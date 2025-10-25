import { NextResponse } from 'next/server';

const aboutText = `About Funds Verified
Funds Verified is a secure fintech app that provides instant, bank-verified proof of funds.
We connect directly to your financial institution using Plaid, ensuring your information is protected with bank-level encryption at all times.
Whether you’re buying real estate, applying for financing, or verifying liquidity, Funds Verified helps you generate trusted and professional proof of funds documents in seconds — right from your phone.
The app is free to download, and each proof of funds report costs $2 USD.
Built in Wyoming, USA, by Funds Verified LLC, our mission is to make financial verification fast, transparent, and secure.
Secure • Instant • Verified
For support or inquiries, contact: support@fundsverified.com`;

export async function GET() {
  return NextResponse.json({ content: aboutText });
}
