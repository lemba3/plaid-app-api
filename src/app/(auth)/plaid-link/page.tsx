"use client"
import { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import axios from 'axios';
import { Button } from '@/components/ui/button';
const PlaidLinkComponent = () => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  useEffect(() => {
    const createLinkToken = async () => {
      try {
        const response = await axios.post('/api/plaid/create-link-token', {
          client_user_id: 'your-unique-user-id', // Replace with actual user ID
        });
        setLinkToken(response.data.link_token);
      } catch (error) {
        console.error('Error generating link token:', error);
      }
    };
    createLinkToken();
  }, []);
  const onSuccess = async (public_token: string) => {
    try {
      const response = await axios.post('/api/plaid/exchange-token', {
        public_token,
      });
      // Store the access token
      localStorage.setItem('plaid_access_token', response.data.access_token);
      // Redirect to the report generation page
      window.location.href = '/generate-report';
    } catch (error) {
      console.error('Error exchanging public token:', error);
    }
  };
  const { open, ready } = usePlaidLink({
    token: linkToken!,
    onSuccess,
  });
  return (
    <div>
      {linkToken && (
        <Button onClick={() => open()} disabled={!ready}>
          Connect Bank
        </Button>
      )}
    </div>
  );
};
export default PlaidLinkComponent;