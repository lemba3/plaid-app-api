'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

export default function VerifyReport() {
  const [formData, setFormData] = useState({
    reportId: '',
    verificationCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const verifyReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/plaid/verify-report', formData);
      setVerificationResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Verify Funds Report</h1>

      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="reportId" className="block text-sm font-medium text-gray-700">
              Report ID
            </label>
            <input
              type="text"
              id="reportId"
              value={formData.reportId}
              onChange={(e) => setFormData({ ...formData, reportId: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Enter Report ID (e.g., REP-123...)"
            />
          </div>

          <div>
            <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
              Verification Code
            </label>
            <input
              type="text"
              id="verificationCode"
              value={formData.verificationCode}
              onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Enter Verification Code (e.g., VER-ABC...)"
            />
          </div>
        </div>

        <Button
          onClick={verifyReport}
          disabled={loading || !formData.reportId || !formData.verificationCode}
          className="w-full"
        >
          {loading ? 'Verifying...' : 'Verify Report'}
        </Button>

        {error && (
          <div className="bg-red-50 p-4 rounded-lg text-red-700 text-sm">
            <strong>Error: </strong>{error}
          </div>
        )}

        {verificationResult && (
          <div className={`mt-6 p-4 rounded-lg ${verificationResult.verified
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
            }`}>
            <h2 className="text-lg font-semibold mb-2">
              Verification {verificationResult.verified ? 'Successful' : 'Failed'}
            </h2>

            <dl className="mt-2 space-y-2">
              <div className="flex justify-between">
                <dt className="font-medium">Status:</dt>
                <dd>{verificationResult.status}</dd>
              </div>

              {verificationResult.verified && (
                <>
                  <div className="flex justify-between">
                    <dt className="font-medium">Verified At:</dt>
                    <dd>{new Date(verificationResult.verificationTimestamp).toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Report Status:</dt>
                    <dd>{verificationResult.details.status}</dd>
                  </div>
                </>
              )}

              <div className="pt-2 text-sm">
                {verificationResult.message}
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
