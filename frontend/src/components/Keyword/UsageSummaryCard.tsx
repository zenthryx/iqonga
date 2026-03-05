import React, { useState, useEffect } from 'react';
import { BarChart3, CreditCard, Activity } from 'lucide-react';
import { keywordIntelligenceService, UsageSummary } from '../../services/keywordIntelligenceService';
import toast from 'react-hot-toast';

const UsageSummaryCard: React.FC = () => {
  const [usage, setUsage] = useState<UsageSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    setLoading(true);
    try {
      const response = await keywordIntelligenceService.getUsageSummary();
      if (response.data) {
        setUsage(response.data);
      }
    } catch (error: any) {
      toast.error('Failed to load usage summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const totalCredits = usage.reduce((sum, op) => sum + (parseFloat(op.total_credits?.toString()) || 0), 0);
  const totalOperations = usage.reduce((sum, op) => sum + (op.operation_count || 0), 0);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-blue-400" />
        <h2 className="text-xl font-semibold">Usage Summary</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-400">Total Operations</span>
          </div>
          <div className="text-2xl font-bold">{totalOperations}</div>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-400">Total Credits Used</span>
          </div>
          <div className="text-2xl font-bold">{totalCredits.toFixed(2)}</div>
        </div>
      </div>

      {usage.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300 mb-2">By Operation Type</h3>
          {usage.map((op) => (
            <div
              key={op.operation_type}
              className="bg-gray-700 rounded-lg p-3 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-white">{op.operation_type.replace(/_/g, ' ')}</div>
                <div className="text-xs text-gray-400">
                  {op.operation_count} operations • {op.total_api_calls || 0} API calls
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-blue-400">
                  {parseFloat(op.total_credits?.toString() || '0').toFixed(2)} credits
                </div>
                <div className="text-xs text-gray-400">
                  {op.total_tokens || 0} tokens
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <p>No usage data available</p>
        </div>
      )}
    </div>
  );
};

export default UsageSummaryCard;

