import { NextResponse } from 'next/server';

const privacyPolicyContent = [
  { type: 'title', text: 'Funds Verified LLC – Privacy Policy & Terms and Conditions' },
  { type: 'heading', text: 'Privacy Policy' },
  { type: 'paragraph', text: 'Funds Verified LLC (“Funds Verified,” “we,” “our,” or “us”) respects your privacy and is committed to protecting your personal and financial information. This Privacy Policy describes how we collect, use, and share information through our app and services (“Services”), including the $2 USD fee per proof of funds report.' },
  { type: 'subheading', text: '1. Information We Collect' },
  { type: 'paragraph', text: 'We collect personal and financial information including your name, email, phone number, bank account data, and verification details provided via our third-party provider, Plaid Inc. We may also collect device data, IP address, and app usage analytics.' },
  { type: 'subheading', text: '2. Use of Information' },
  { type: 'paragraph', text: `We use collected information to:
- Verify your financial capacity and generate proof of funds documentation (each report costs $2 USD)
- Facilitate secure connections to your financial institution via Plaid
- Improve our Services, ensure compliance, and provide customer support` },
  { type: 'subheading', text: '3. Data Sharing' },
  { type: 'paragraph', text: `We share information only with:
- Plaid, to enable secure access to your financial accounts
- Regulatory or legal authorities when required by law
- Service providers under strict confidentiality obligations` },
  { type: 'subheading', text: '4. Security' },
  { type: 'paragraph', text: 'We implement technical and organizational safeguards to protect your information from unauthorized access or misuse. However, no system is completely secure, and you acknowledge that use of the internet carries inherent risks.' },
  { type: 'subheading', text: '5. User Rights' },
  { type: 'paragraph', text: 'You may request access, correction, or deletion of your data by contacting us at support@fundsverified.com.' },
  { type: 'subheading', text: '6. Data Retention' },
  { type: 'paragraph', text: 'We retain user data as required by law or business necessity to provide the Services and meet compliance requirements.' },
  { type: 'subheading', text: '7. Fees' },
  { type: 'paragraph', text: `The app is free to download.
Each verified proof of funds report costs $2 USD, payable through your app store account. Users must confirm purchase before any fee is charged. Refunds are subject to app store policies.` },
  { type: 'subheading', text: '8. Compliance' },
  { type: 'paragraph', text: 'Funds Verified LLC operates under U.S. data protection laws, including the California Consumer Privacy Act (CCPA) and Gramm-Leach-Bliley Act (GLBA).' },
  { type: 'subheading', text: '9. Contact' },
  { type: 'paragraph', text: 'Questions or concerns may be directed to: support@fundsverified.com' },
  { type: 'heading', text: 'Terms and Conditions' },
  { type: 'paragraph', text: 'By using Funds Verified LLC’s app or website (“Services”), you agree to the following Terms and Conditions. If you do not agree, do not access or use the Services.' },
  { type: 'subheading', text: '1. Services' },
  { type: 'paragraph', text: 'Funds Verified provides financial verification tools that allow users to securely connect their bank accounts through Plaid to verify funds and generate official proof of funds documentation. We do not provide financial advice, lending, or banking services.' },
  { type: 'subheading', text: '2. Eligibility' },
  { type: 'paragraph', text: 'You must be at least 18 years old and legally able to enter into binding agreements under applicable law.' },
  { type: 'subheading', text: '3. Fees and Payment' },
  { type: 'paragraph', text: `The app is free to download.
Each verified proof of funds report costs $2 USD.
Payment is collected through your app store account, and users must confirm purchase before charges.
Refunds are subject to app store policies.` },
  { type: 'subheading', text: '4. Third-Party Services' },
  { type: 'paragraph', text: 'Funds Verified uses Plaid Inc. to connect your financial accounts. By using our Services, you consent to Plaid’s privacy policy and terms. Funds Verified is not responsible for Plaid’s services or any errors in third-party systems.' },
  { type: 'subheading', text: '5. No Warranty' },
  { type: 'paragraph', text: 'Our Services are provided “as is” without any warranties of any kind, express or implied, including but not to accuracy, reliability, or fitness for a particular purpose.' },
  { type: 'subheading', text: '6. Limitation of Liability' },
  { type: 'paragraph', text: 'Funds Verified LLC, its affiliates, or officers shall not be liable for any direct, indirect, incidental, or consequential damages resulting from your use of or inability to use the Services.' },
  { type: 'subheading', text: '7. Indemnification' },
  { type: 'paragraph', text: 'You agree to indemnify and hold harmless Funds Verified LLC and its representatives from any claims, damages, or expenses arising from your use of the Services or violation of these Terms.' },
  { type: 'subheading', text: '8. Governing Law' },
  { type: 'paragraph', text: 'These Terms shall be governed by and construed in accordance with the laws of the State of Wyoming, without regard to conflicts of law principles.' },
  { type: 'subheading', text: '9. Modifications' },
  { type: 'paragraph', text: 'Funds Verified reserves the right to modify this Privacy Policy and Terms at any time. Updates will be posted in the app or at www.fundsverified.com.' },
  { type: 'subheading', text: 'Effective Date: October 25, 2025' },
];

export async function GET() {
  return NextResponse.json({ content: privacyPolicyContent });
}
