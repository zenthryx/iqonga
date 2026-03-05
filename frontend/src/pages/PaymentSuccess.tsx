import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const transactionId = searchParams.get('transaction_id');
  const packageId = searchParams.get('package_id');

  useEffect(() => {
    // Show success message
    toast.success('Payment successful! Credits have been added to your account.');
    
    // Redirect to credits page after 3 seconds
    const timer = setTimeout(() => {
      navigate('/credits');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your payment has been processed successfully. Credits have been added to your account.
        </p>
        {transactionId && (
          <p className="text-sm text-gray-500 mb-4">
            Transaction ID: <span className="font-mono">{transactionId}</span>
          </p>
        )}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/credits')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
          >
            Go to Credits
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-md transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

