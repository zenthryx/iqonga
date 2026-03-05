import React from 'react';
import { AlertCircle, CheckCircle, TrendingUp, TrendingDown, Users, X } from 'lucide-react';
import { KeywordAlert } from '../../services/keywordIntelligenceService';

interface AlertsListProps {
  alerts: KeywordAlert[];
  onMarkRead: (id: string) => void;
}

const AlertsList: React.FC<AlertsListProps> = ({ alerts, onMarkRead }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'sentiment_spike':
        return <TrendingUp className="h-5 w-5" />;
      case 'mention_surge':
        return <TrendingUp className="h-5 w-5" />;
      case 'influencer_activity':
        return <Users className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-12 text-center">
        <CheckCircle className="h-16 w-16 mx-auto mb-4 text-gray-600" />
        <h3 className="text-xl font-semibold mb-2">No Alerts</h3>
        <p className="text-gray-400">You're all caught up! New alerts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`bg-gray-800 rounded-lg p-4 border-l-4 ${
            alert.is_read ? 'opacity-60' : ''
          } ${getSeverityColor(alert.severity)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={`mt-1 ${getSeverityColor(alert.severity).split(' ')[1]}`}>
                {getAlertIcon(alert.alert_type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{alert.title}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  {alert.keyword && (
                    <span className="text-xs text-gray-400">
                      {alert.monitor_type === 'hashtag' ? '#' : ''}{alert.keyword}
                    </span>
                  )}
                </div>
                <p className="text-gray-300 text-sm mb-2">{alert.message}</p>
                {alert.change_percent !== null && alert.change_percent !== undefined && (
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    {alert.previous_value !== null && alert.previous_value !== undefined && (
                      <span>Previous: {alert.previous_value.toFixed(2)}</span>
                    )}
                    {alert.current_value !== null && alert.current_value !== undefined && (
                      <span>Current: {alert.current_value.toFixed(2)}</span>
                    )}
                    <span className={`flex items-center gap-1 ${
                      alert.change_percent >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {alert.change_percent >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(alert.change_percent).toFixed(1)}%
                    </span>
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(alert.created_at).toLocaleString()}
                </div>
              </div>
            </div>
            {!alert.is_read && (
              <button
                onClick={() => onMarkRead(alert.id)}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
                title="Mark as read"
              >
                <CheckCircle className="h-5 w-5 text-gray-400 hover:text-green-400" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertsList;

