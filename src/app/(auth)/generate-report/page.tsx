'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function ReportGenerator() {
  const [formData, setFormData] = useState({
    amount: '',
    buyerName: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const access_token = localStorage.getItem('plaid_access_token');
    setIsConnected(!!access_token);
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      // You should store the access_token securely after linking
      // This is just an example - replace with your actual access token storage method
      const access_token = localStorage.getItem('plaid_access_token');

      if (!access_token) {
        throw new Error('No access token found. Please connect your bank first.');
      }

      const response = await axios.post('/api/plaid/generate-report', {
        access_token,
        amount: parseFloat(formData.amount),
        buyerName: formData.buyerName,
        reason: formData.reason
      });

      setReport(response.data);

      // If you want to display the PDF
      if (response.data.pdf) {
        const pdfWindow = window.open();
        if (pdfWindow) {
          pdfWindow.document.write(
            `<iframe width='100%' height='100%' src='data:application/pdf;base64,${response.data.pdf}'></iframe>`
          );
        }
      }
    } catch (err: any) {
      console.error('Generate Report Error:', {
        error: err,
        response: err.response?.data,
        displayMessage: err.response?.data?.displayMessage
      });
      setError(err.response?.data?.displayMessage || err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Generate Financial Report</h1>

      {!isConnected ? (
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Connect Your Bank First</h2>
          <p className="mb-4 text-gray-600">You need to connect your bank account before generating a report.</p>
          <Button onClick={() => router.push('/plaid-link')}>
            Connect Bank Account
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg mb-4">
            <p className="text-green-700">✓ Bank account connected</p>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Amount
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                id="amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="pl-7 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <Button
            onClick={generateReport}
            disabled={loading || !formData.amount || parseFloat(formData.amount) <= 0}
            className="w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Report...
              </span>
            ) : 'Generate Report'}
          </Button>

          {error && (
            <div className="bg-red-50 p-4 rounded-lg text-red-700 text-sm mt-2">
              <strong>Error: </strong>{error}
            </div>
          )}

          {report && (
            <div className="mt-6 bg-white shadow rounded-lg divide-y divide-gray-200">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-semibold mb-4">Report Generated Successfully</h2>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500">Report Summary</h3>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-900 max-h-96 overflow-auto">
                      {JSON.stringify(report, null, 2)}
                    </pre>
                  </div>

                  {report.pdf && (
                    <Button
                      onClick={() => {
                        const pdfWindow = window.open();
                        if (pdfWindow) {
                          pdfWindow.document.write(
                            `<iframe width='100%' height='100%' src='data:application/pdf;base64,${report.pdf}'></iframe>`
                          );
                        }
                      }}
                      className="w-full"
                    >
                      View PDF Report
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
