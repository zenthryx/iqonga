import React, { useState } from 'react';
import { CryptoAlert } from '../../services/cryptoService';
import { Share2 } from 'lucide-react';
import ShareSignalModal from '../Chat/ShareSignalModal';

interface Props {
  alerts: CryptoAlert[];
  onMarkRead: (id: string) => void;
}

const badgeColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-700';
    case 'high':
      return 'bg-orange-100 text-orange-700';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export const AlertsList: React.FC<Props> = ({ alerts, onMarkRead }) => {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<CryptoAlert | null>(null);

  const handleShare = (alert: CryptoAlert) => {
    setSelectedAlert(alert);
    setShareModalOpen(true);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Alerts</h3>
        <span className="text-sm text-gray-400">{alerts.length} total</span>
      </div>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="p-3 rounded-lg border border-gray-700 bg-gray-900 flex items-start justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs ${badgeColor(alert.severity)}`}>
                  {alert.severity}
                </span>
                <span className="text-xs uppercase text-gray-400">{alert.alert_type}</span>
              </div>
              <div className="text-white font-semibold mt-1">{alert.title}</div>
              <div className="text-gray-300 text-sm">{alert.message}</div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(alert.created_at).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleShare(alert)}
                className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1"
                title="Share to chat"
              >
                <Share2 className="h-3 w-3" />
                <span>Share</span>
              </button>
              {!alert.is_read && (
                <button
                  onClick={() => onMarkRead(alert.id)}
                  className="text-xs px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
        ))}
        {!alerts.length && (
          <div className="text-sm text-gray-400">No alerts yet. You’re all caught up.</div>
        )}
      </div>

      {selectedAlert && (
        <ShareSignalModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedAlert(null);
          }}
          signal={{
            type: selectedAlert.alert_type,
            token: selectedAlert.token_symbol || (selectedAlert.data?.token || 'UNKNOWN'),
            severity: selectedAlert.severity,
            data: selectedAlert.data || {}
          }}
        />
      )}
    </div>
  );
};

