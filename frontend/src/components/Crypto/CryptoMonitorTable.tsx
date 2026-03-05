import React from 'react';
import { CryptoMonitor } from '../../services/cryptoService';

interface Props {
  monitors: CryptoMonitor[];
  onToggle: (monitor: CryptoMonitor) => void;
  onDelete?: (monitor: CryptoMonitor) => void;
}

const statusColor = (active: boolean) =>
  active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';

export const CryptoMonitorTable: React.FC<Props> = ({ monitors, onToggle, onDelete }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Monitors</h3>
        <span className="text-sm text-gray-400">{monitors.length} tracked</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-200">
          <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-2">Token</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Sentiment Δ%</th>
              <th className="px-4 py-2">Mentions</th>
              <th className="px-4 py-2">Auto-post</th>
              <th className="px-4 py-2">Channels</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {monitors.map((m) => (
              <tr key={m.id} className="border-b border-gray-700">
                <td className="px-4 py-2">
                  <div className="font-semibold text-white">{m.token_symbol}</div>
                  {m.token_name && <div className="text-xs text-gray-400">{m.token_name}</div>}
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${statusColor(m.is_active)}`}>
                    {m.is_active ? 'Active' : 'Paused'}
                  </span>
                </td>
                <td className="px-4 py-2">{m.sentiment_threshold}%</td>
                <td className="px-4 py-2">{m.mention_spike_threshold}x</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      m.auto_post_enabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {m.auto_post_enabled ? 'On' : 'Off'}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-gray-300">
                  {m.post_channels && m.post_channels.length ? m.post_channels.join(', ') : '—'}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onToggle(m)}
                      className="text-sm px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {m.is_active ? 'Pause' : 'Activate'}
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete the monitor for ${m.token_symbol}?`)) {
                            onDelete(m);
                          }
                        }}
                        className="text-sm px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
                        title="Delete monitor"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!monitors.length && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-400" colSpan={7}>
                  No monitors yet. Add a token to start tracking sentiment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

