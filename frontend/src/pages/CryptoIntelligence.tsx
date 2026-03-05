import React, { useEffect, useMemo, useState } from 'react';
import { cryptoService, CryptoMonitor, CryptoAlert, SentimentSnapshot, UsageSummary } from '../services/cryptoService';
import { CryptoMonitorTable } from '@/components/Crypto/CryptoMonitorTable';
import { SentimentHistoryChart } from '@/components/Crypto/SentimentHistoryChart';
import { AlertsList } from '@/components/Crypto/AlertsList';
import { UsageSummaryCard } from '@/components/Crypto/UsageSummaryCard';
import toast from 'react-hot-toast';

const defaultMonitor: Partial<CryptoMonitor> = {
  sentiment_threshold: 5,
  mention_spike_threshold: 5,
  auto_post_enabled: false,
  post_channels: ['twitter'],
  content_style: 'professional',
};

const CryptoIntelligence: React.FC = () => {
  const [monitors, setMonitors] = useState<CryptoMonitor[]>([]);
  const [alerts, setAlerts] = useState<CryptoAlert[]>([]);
  const [history, setHistory] = useState<SentimentSnapshot[]>([]);
  const [usage, setUsage] = useState<UsageSummary | undefined>();
  const [form, setForm] = useState(defaultMonitor);
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (selectedToken) {
      loadHistory(selectedToken);
    } else if (monitors.length) {
      setSelectedToken(monitors[0].token_symbol);
      loadHistory(monitors[0].token_symbol);
    }
  }, [monitors, selectedToken]);

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [mon, al, us] = await Promise.all([
        cryptoService.listMonitors(),
        cryptoService.listAlerts(),
        cryptoService.getUsageSummary('month'),
      ]);
      const monitors = mon.data || [];
      const alerts = al.data || [];
      const usage = us.data;
      setMonitors(monitors);
      setAlerts(alerts);
      setUsage(usage);
      if (!selectedToken && monitors.length) setSelectedToken(monitors[0].token_symbol);
    } catch (err) {
      // errors handled by interceptor/toast
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (token: string) => {
    try {
      const hist = await cryptoService.getSentimentHistory(token);
      setHistory(hist.data || []);
    } catch (err) {
      setHistory([]);
    }
  };

  const addMonitor = async () => {
    if (!form.token_symbol) {
      toast.error('Token symbol is required');
      return;
    }
    try {
      await cryptoService.createMonitor(form);
      toast.success('Monitor added');
      setForm(defaultMonitor);
      refreshAll();
    } catch (err) {
      // handled upstream
    }
  };

  const toggleMonitor = async (m: CryptoMonitor) => {
    try {
      if (m.is_active) {
        await cryptoService.deactivateMonitor(m.id);
      } else {
        await cryptoService.activateMonitor(m.id);
      }
      refreshAll();
    } catch (err) {
      // handled upstream
    }
  };

  const deleteMonitor = async (m: CryptoMonitor) => {
    try {
      await cryptoService.deleteMonitor(m.id);
      toast.success(`Monitor for ${m.token_symbol} deleted successfully`);
      refreshAll();
      // If deleted monitor was selected, clear selection
      if (selectedToken === m.token_symbol) {
        setSelectedToken(null);
        setHistory([]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete monitor');
    }
  };

  const markAlertRead = async (id: string) => {
    try {
      await cryptoService.markAlertRead(id);
      refreshAll();
    } catch (err) {
      // handled upstream
    }
  };

  const selectedHistory = useMemo(() => history, [history]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Crypto Intelligence</h1>
          <p className="text-gray-400 text-sm">Monitor X sentiment, alerts, and usage.</p>
        </div>
        {loading && <div className="text-sm text-gray-400">Refreshing…</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CryptoMonitorTable monitors={monitors} onToggle={toggleMonitor} onDelete={deleteMonitor} />
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">Add Monitor</h3>
          <div className="space-y-3">
            <input
              className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 text-white"
              placeholder="Token symbol (e.g., BTC)"
              value={form.token_symbol || ''}
              onChange={(e) => setForm({ ...form, token_symbol: e.target.value.toUpperCase() })}
            />
            <input
              className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 text-white"
              placeholder="Token name (optional)"
              value={form.token_name || ''}
              onChange={(e) => setForm({ ...form, token_name: e.target.value })}
            />
            <label className="text-xs text-gray-400">Sentiment change alert (%)</label>
            <input
              type="number"
              className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 text-white"
              value={form.sentiment_threshold}
              onChange={(e) => setForm({ ...form, sentiment_threshold: Number(e.target.value) })}
            />
            <label className="text-xs text-gray-400">Mention spike threshold (x)</label>
            <input
              type="number"
              className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 text-white"
              value={form.mention_spike_threshold}
              onChange={(e) => setForm({ ...form, mention_spike_threshold: Number(e.target.value) })}
            />
            <label className="inline-flex items-center space-x-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={form.auto_post_enabled}
                onChange={(e) => setForm({ ...form, auto_post_enabled: e.target.checked })}
                className="form-checkbox text-indigo-500"
              />
              <span>Enable auto-post</span>
            </label>
            <button
              onClick={addMonitor}
              className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Add Monitor
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {selectedToken && (
            <SentimentHistoryChart token={selectedToken} data={selectedHistory} />
          )}
          <AlertsList alerts={alerts} onMarkRead={markAlertRead} />
        </div>
        <div>
          <UsageSummaryCard summary={usage} />
          <div className="mt-4 bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">Tokens</h3>
            <div className="space-y-2 text-sm text-gray-200">
              {monitors.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedToken(m.token_symbol)}
                  className={`w-full text-left px-3 py-2 rounded border ${
                    selectedToken === m.token_symbol
                      ? 'border-indigo-500 bg-indigo-900/40 text-white'
                      : 'border-gray-700 bg-gray-900 text-gray-200'
                  }`}
                >
                  {m.token_symbol} <span className="text-xs text-gray-400">{m.token_name}</span>
                </button>
              ))}
              {!monitors.length && (
                <div className="text-gray-500 text-sm">Add a monitor to see sentiment.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoIntelligence;

