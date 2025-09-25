import { NextRequest, NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

// Helper function to get user-friendly error messages
function getDisplayMessage(errorCode: string): string {
  switch (errorCode) {
    case 'INVALID_ACCESS_TOKEN':
      return 'Your bank connection has expired. Please reconnect your bank account.';
    case 'INVALID_PRODUCT':
      return 'Asset report generation is not enabled for this bank connection. Please reconnect your bank with assets enabled.';
    case 'PRODUCT_NOT_READY':
      return 'The report is still being generated. Please try again in a few moments.';
    case 'ASSETS_PRODUCT_NOT_ENABLED':
      return 'The assets product is not enabled for your account. Please contact Plaid support.';
    default:
      return 'An error occurred while generating the report. Please try again.';
  }
}

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
    const { access_token, amount, buyerName, reason } = await req.json();

    // Get account and balance information
    const accountsResponse = await client.accountsGet({ access_token });
    const accounts = accountsResponse.data.accounts;

    // Calculate total available balance from all accounts
    const totalAvailableBalance = accounts.reduce((total, acc) => total + (acc.balances.available || 0), 0);
    const totalCurrentBalance = accounts.reduce((total, acc) => total + (acc.balances.current || 0), 0);

    // Check if combined balance is sufficient
    if (totalAvailableBalance < amount) {
      return NextResponse.json({
        error: 'Insufficient Funds',
        message: `This verification requires ${amount.toFixed(2)}, but your combined available balance is ${totalAvailableBalance.toFixed(2)}`,
        details: {
          requiredAmount: amount,
          availableBalance: totalAvailableBalance,
          currentBalance: totalCurrentBalance,
        },
      }, { status: 400 });
    }

    // Generate a unique report ID (timestamp + random numbers)
    const reportId = `REP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generate verification code (simulating a barcode number)
    const verificationCode = `VER-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    console.log('Creating asset report with token:', access_token);

    // Create an asset report
    const assetReportResponse = await client.assetReportCreate({
      access_tokens: [access_token],
      days_requested: 30,
      options: {
        client_report_id: `report-${Date.now()}`,
      },
    });

    console.log('Asset report creation response:', {
      hasToken: !!assetReportResponse.data.asset_report_token,
      requestId: assetReportResponse.data.request_id
    });

    const asset_report_token = assetReportResponse.data.asset_report_token;

    // Wait for the report to be ready (you might want to implement polling in the frontend)
    let reportReady = false;
    let retries = 0;
    let report;

    while (!reportReady && retries < 10) {
      try {
        report = await client.assetReportGet({
          asset_report_token,
          include_insights: true,
        });
        reportReady = true;
      } catch (error: any) {
        if (error.response?.data?.error_code === 'PRODUCT_NOT_READY') {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
          retries++;
        } else {
          throw error;
        }
      }
    }

    if (!report) {
      throw new Error('Report generation timed out');
    }

    // Get a PDF version of the report
    const pdfResponse = await client.assetReportPdfGet({
      asset_report_token,
    });

    // Convert the PDF buffer to base64
    const pdfBuffer = Buffer.from(pdfResponse.data);
    const pdfBase64 = pdfBuffer.toString('base64');

    // Create a verification report
    const verificationReport = {
      reportId,
      verificationCode,
      timestamp: new Date().toISOString(),
      status: 'VERIFIED',
      details: {
        buyerName,
        amount,
        reason,
        accounts: accounts.map(account => ({
          bankName: account.name,
          accountMask: account.mask,
          accountType: account.type,
        })),
        verificationTimestamp: new Date().toISOString(),
        balanceVerification: {
          availableBalance: totalAvailableBalance,
          currentBalance: totalCurrentBalance,
          sufficientFunds: true,
          verifiedAmount: amount,
          verificationTime: new Date().toISOString()
        }
      },
      report: report.data
    };

    return NextResponse.json({
      message: 'Report generated successfully',
      verificationReport,
      pdf: pdfBase64,
    });

  } catch (error: any) {
    // Log the full error for debugging
    console.error('Error generating report:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      response: {
        data: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      },
      plaidError: error.response?.data?.error_code,
      plaidMessage: error.response?.data?.error_message,
      plaidRequestId: error.response?.data?.request_id
    });

    // Check if it's a Plaid API error
    if (error.response?.data?.error_code) {
      return NextResponse.json(
        {
          error: 'Plaid API Error',
          code: error.response.data.error_code,
          message: error.response.data.error_message,
          displayMessage: getDisplayMessage(error.response.data.error_code)
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Error generating report',
        message: error.message,
        details: error.response?.data
      },
      { status: 500 }
    );
  }
}
