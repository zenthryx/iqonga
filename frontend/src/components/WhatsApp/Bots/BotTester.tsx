import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';

const BotTester: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const { data: botData } = useQuery({
    queryKey: ['whatsapp-bot', id],
    queryFn: () => whatsappApi.getBot(id!),
    enabled: !!id,
  });

  const testMutation = useMutation({
    mutationFn: (message: string) => whatsappApi.testBot(id!, message),
    onSuccess: (result) => {
      setTestResult((result as any)?.data);
    },
  });

  const bot = (botData as any)?.data?.bot;

  const handleTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMessage.trim()) return;
    setTestResult(null);
    testMutation.mutate(testMessage);
  };

  if (!bot) {
    return (
      <div className="p-6">
        <p className="text-gray-400">Bot not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/whatsapp/bots')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Test Bot</h1>
          <p className="text-gray-400 text-sm mt-1">{bot.name}</p>
        </div>
      </div>

      {/* Bot Info */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Bot Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">Trigger Type</p>
            <p className="text-white font-medium capitalize">
              {bot.trigger_type?.replace('_', ' ')}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Trigger Text</p>
            <p className="text-white font-medium">{bot.trigger_text || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Reply Type</p>
            <p className="text-white font-medium capitalize">
              {bot.reply_type?.replace('_', ' ')}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Status</p>
            <p className={`font-medium ${bot.is_active ? 'text-green-400' : 'text-red-400'}`}>
              {bot.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      </div>

      {/* Test Form */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Test Message</h3>
        <form onSubmit={handleTest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enter a test message to see if the bot would trigger
            </label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Type a message here to test the bot trigger..."
              rows={4}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!testMessage.trim() || testMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Test Bot
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setTestMessage('');
                setTestResult(null);
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Test Result</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {testResult.matches ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <div>
                    <p className="text-green-400 font-semibold">Bot Would Trigger</p>
                    <p className="text-gray-400 text-sm">
                      The bot matches this message and would execute
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-red-400" />
                  <div>
                    <p className="text-red-400 font-semibold">Bot Would Not Trigger</p>
                    <p className="text-gray-400 text-sm">
                      The bot does not match this message
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="bg-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Trigger Type:</span>
                <span className="text-white font-medium capitalize">
                  {testResult.triggerType?.replace('_', ' ')}
                </span>
              </div>
              {testResult.triggerText && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Trigger Text:</span>
                  <span className="text-white font-medium">{testResult.triggerText}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Would Execute:</span>
                <span
                  className={`font-medium ${testResult.wouldExecute ? 'text-green-400' : 'text-red-400'}`}
                >
                  {testResult.wouldExecute ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {testResult.matches && (
              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-blue-400 font-semibold mb-1">Note</p>
                    <p className="text-gray-300 text-sm">
                      This is a simulation. The bot will only execute in real conversations if it's
                      active and matches the incoming message based on its trigger configuration.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate(`/whatsapp/bots/${id}/executions`)}
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          View Execution Log
        </button>
        <button
          onClick={() => navigate('/whatsapp/bots')}
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Back to Bots
        </button>
      </div>
    </div>
  );
};

export default BotTester;
