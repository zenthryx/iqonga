import React from 'react';
import { UsageSummary } from '../../services/cryptoService';

interface Props {
  summary?: UsageSummary;
}

export const UsageSummaryCard: React.FC<Props> = ({ summary }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-3">Usage (this period)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-200">
        <Stat label="Operations" value={summary?.total_operations ?? 0} />
        <Stat label="API Calls" value={summary?.total_calls ?? 0} />
        <Stat label="Credits Used" value={summary?.credits_used ?? 0} />
        <Stat label="Est. Cost (USD)" value={(summary?.estimated_cost ?? 0).toFixed(2)} />
      </div>
      <div className="mt-4">
        <div className="text-xs text-gray-400 mb-1">By operation</div>
        <div className="space-y-1 text-sm text-gray-200">
          {(summary?.by_operation || []).map((op: UsageSummary['by_operation'][number]) => (
            <div key={op.operation_type} className="flex justify-between">
              <span className="text-gray-300">{op.operation_type}</span>
              <span className="text-gray-100">
                {op.credits ?? 0} credits ({op.calls ?? 0} calls)
              </span>
            </div>
          ))}
          {(!summary?.by_operation || summary.by_operation.length === 0) && (
            <div className="text-gray-500 text-sm">No usage yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-lg bg-gray-900 border border-gray-700 p-3">
    <div className="text-xs text-gray-400">{label}</div>
    <div className="text-xl font-semibold text-white">{value}</div>
  </div>
);

