'use client';

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { generateState } from "@/lib/utils";

interface ConnectBankButtonProps {
  className?: string;
}

export function ConnectBankButton({ className }: ConnectBankButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const state = generateState();
      // Store state in sessionStorage for verification when user returns
      sessionStorage.setItem('truelayer_state', state);
      
      const authUrl = new URL('https://auth.truelayer.com/');
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', process.env.NEXT_PUBLIC_TRUELAYER_CLIENT_ID!);
      authUrl.searchParams.append('redirect_uri', `${window.location.origin}/api/callback/truelayer`);
      authUrl.searchParams.append('scope', 'accounts transactions');
      authUrl.searchParams.append('state', state);

      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('Failed to initiate bank connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleConnect} 
      disabled={isLoading}
      className={className}
    >
      {isLoading ? 'Connecting...' : 'Connect Bank'}
    </Button>
  );
} 