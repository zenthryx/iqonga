import React, { useState, useEffect } from 'react';

interface AccessRequirements {
  tokenAddress: string;
  requiredTokens: number;
  company: string;
  platform: string;
}

const AccessRequirements: React.FC = () => {
  const [requirements, setRequirements] = useState<AccessRequirements | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequirements();
  }, []);

  const fetchRequirements = async () => {
    try {
      const response = await fetch('/api/token-access/requirements');
      const data = await response.json();
      
      if (data.success) {
        setRequirements(data.data);
      }
    } catch (error) {
      console.error('Error fetching access requirements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading access requirements...</span>
      </div>
    );
  }

  if (!requirements) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load access requirements</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Platform Access Requirements
        </h2>
        <p className="text-gray-600">
          {requirements.platform}
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h3 className="ml-3 text-lg font-semibold text-blue-900">
            ZTR Token Required
          </h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-blue-800 font-medium">Required Tokens:</span>
            <span className="text-blue-900 font-bold">
              {requirements.requiredTokens.toLocaleString()} ZTR
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-blue-800 font-medium">Token Address:</span>
            <span className="text-blue-900 font-mono text-sm">
              {requirements.tokenAddress.slice(0, 8)}...{requirements.tokenAddress.slice(-8)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">How to Get Access:</h4>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Purchase ZTR tokens from a supported exchange</li>
          <li>Transfer tokens to your Solana wallet</li>
          <li>Connect your wallet to Ajentrix.com</li>
          <li>Your token balance will be automatically verified</li>
        </ol>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Powered by <span className="font-semibold">{requirements.company}</span>
        </p>
      </div>
    </div>
  );
};

export default AccessRequirements;
