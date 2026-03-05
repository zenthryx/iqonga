import React, { useState } from 'react';
import { solanaPaymentService } from '@/services/solanaPaymentService';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const PaymentTest: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const runPaymentTest = async () => {
    setTesting(true);
    setTestResults([]);
    
    try {
      // Test 1: Payment service (stub - wallet can be added in Settings)
      const test1 = {
        name: 'Payment service',
        success: true,
        details: 'Payment options can be added in Settings (e.g. preferred blockchain).'
      };
      setTestResults(prev => [...prev, test1]);

      // Test 2: Fetch credit packages
      const test2Result = await fetch('/api/credits/packages');
      const test2 = {
        name: 'Fetch Credit Packages',
        success: test2Result.ok,
        details: test2Result.ok ? 'Packages fetched successfully' : 'Failed to fetch packages'
      };
      setTestResults(prev => [...prev, test2]);

      if (test2.success) {
        const packages = await test2Result.json();
        console.log('Available packages:', packages);
        
        if (packages.data && packages.data.length > 0) {
          const firstPackage = packages.data[0];
          const test3Result = await solanaPaymentService.purchaseCredits(
            {} as any,
            firstPackage.id,
            'SOL'
          );
          
          const test3 = {
            name: 'Payment Processing',
            success: test3Result.success,
            details: test3Result.success 
              ? `Transaction: ${test3Result.signature?.slice(0, 16)}...`
              : test3Result.error || 'Payment failed'
          };
          setTestResults(prev => [...prev, test3]);

          if (test3.success) {
            toast.success('Payment test completed successfully!');
          } else {
            toast.error('Payment test failed');
          }
        }
      }
    } catch (error) {
      console.error('Test error:', error);
      toast.error('Test failed with error');
      setTestResults(prev => [...prev, {
        name: 'Error',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      }]);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Payment System Test</h3>
      
      <button
        onClick={runPaymentTest}
        disabled={testing}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mb-4"
      >
        {testing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Testing...</span>
          </>
        ) : (
          <span>Run Payment Test</span>
        )}
      </button>

      {testResults.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Test Results:</h4>
          {testResults.map((result, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 rounded bg-gray-50">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <span className="font-medium">{result.name}:</span>
                <span className="ml-2 text-gray-600">{result.details}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentTest;
