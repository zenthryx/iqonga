import React, { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { agentService } from '@/services/agentService';
import toast from 'react-hot-toast';
import { Bot, Plus, Copy, Trash2, MessageCircle, Pencil, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import { getApiBaseUrl } from '@/utils/domain';

interface ChannelConnection {
  id: string;
  agent_id: string;
  agent_name?: string;
  channel: string;
  channel_connection_id: string;
  channel_metadata?: { phone_number_id?: string; access_token?: string; verify_token?: string; bot_token?: string; telegram_message_thread_id?: number | null };
  enabled_tool_categories: string[];
  allowed_peer_ids?: string[];
  receive_scheduled_signals?: boolean;
  session_policy: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AgentOption {
  id: string;
  name: string;
}

const TOOL_LABELS: Record<string, string> = {
  email: 'Email',
  calendar: 'Calendar',
  content_draft: 'Content draft',
  image: 'Image',
  web_search: 'Web search',
  scheduled_posts: 'Scheduled posts',
  company_knowledge: 'Company knowledge',
  music_lyrics: 'Music & lyrics',
  video: 'Video script',
  long_form: 'Long-form content',
  weather: 'Weather',
  market_data: 'Market data'
};

const AssistantConnections: React.FC = () => {
  const [connections, setConnections] = useState<ChannelConnection[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    agentId: string;
    enabledToolCategories: string[];
    allowedPeerIds: string;
    telegramChatId: string;
    telegramTopicId: string;
    receiveScheduledSignals: boolean;
    whatsappPhoneNumberId: string;
    whatsappAccessToken: string;
    whatsappVerifyToken: string;
  }>({ agentId: '', enabledToolCategories: [], allowedPeerIds: '', telegramChatId: '', telegramTopicId: '', receiveScheduledSignals: false, whatsappPhoneNumberId: '', whatsappAccessToken: '', whatsappVerifyToken: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showTelegramSetupGuide, setShowTelegramSetupGuide] = useState(false);
  const [form, setForm] = useState({
    agentId: '',
    channel: 'telegram' as 'telegram' | 'whatsapp' | 'teams' | 'discord' | 'slack',
    channelConnectionId: '',
    botToken: '',
    allowedPeerIds: '',
    whatsappPhoneNumberId: '',
    whatsappAccessToken: '',
    whatsappVerifyToken: '',
    enabledToolCategories: ['email', 'calendar', 'content_draft', 'image', 'web_search']
  });

  useEffect(() => {
    fetchConnections();
    fetchAgents();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const res = await apiService.get<{ success: boolean; data: ChannelConnection[] }>('assistant/connections');
      if (res?.success && Array.isArray(res?.data)) setConnections(res.data);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await agentService.getAgents();
      if (res?.success && Array.isArray(res?.agents)) {
        setAgents(res.agents.map((a: any) => ({ id: a.id, name: a.name })));
      }
    } catch (_) {}
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agentId || !form.channel) {
      toast.error('Select an agent and channel.');
      return;
    }
    if (form.channel === 'telegram' && !form.botToken.trim()) {
      toast.error('Bot token is required for Telegram. Create a bot with @BotFather and paste the token here.');
      return;
    }
    setSubmitting(true);
    try {
      const channelConnectionId = form.channelConnectionId.trim() || `conn-${Date.now()}`;
      const payload: any = {
        agentId: form.agentId,
        channel: form.channel,
        channelConnectionId,
        enabledToolCategories: form.enabledToolCategories,
        channelMetadata: {}
      };
      if (form.channel === 'telegram') payload.channelMetadata = { ...payload.channelMetadata, bot_token: form.botToken.trim() };
      else if (form.botToken.trim()) payload.channelMetadata = { ...payload.channelMetadata, bot_token: form.botToken.trim() };
      if (form.allowedPeerIds.trim()) {
        payload.allowedPeerIds = form.allowedPeerIds.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (form.channel === 'whatsapp') {
        if (form.whatsappPhoneNumberId.trim()) payload.channelMetadata.phone_number_id = form.whatsappPhoneNumberId.trim();
        if (form.whatsappAccessToken.trim()) payload.channelMetadata.access_token = form.whatsappAccessToken.trim();
        if (form.whatsappVerifyToken.trim()) payload.channelMetadata.verify_token = form.whatsappVerifyToken.trim();
      }
      const res = await apiService.post<ChannelConnection>('assistant/connections', payload);
      if (res?.success && res?.data) {
        toast.success('Connection created.');
        setConnections(prev => [res.data!, ...prev]);
        setShowForm(false);
        setForm(prev => ({ ...prev, agentId: '', channelConnectionId: '', botToken: '', allowedPeerIds: '', whatsappPhoneNumberId: '', whatsappAccessToken: '', whatsappVerifyToken: '' }));
      } else {
        toast.error('Failed to create connection.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (conn: ChannelConnection) => {
    setEditingId(conn.id);
    const meta = conn.channel_metadata || {};
    setEditForm({
      agentId: conn.agent_id,
      enabledToolCategories: conn.enabled_tool_categories?.length ? conn.enabled_tool_categories : ['email', 'calendar', 'content_draft', 'image', 'web_search'],
      allowedPeerIds: (conn.allowed_peer_ids || []).join(', '),
      telegramChatId: conn.channel_connection_id || '',
      telegramTopicId: conn.channel_metadata?.telegram_message_thread_id != null ? String(conn.channel_metadata.telegram_message_thread_id) : '',
      receiveScheduledSignals: !!conn.receive_scheduled_signals,
      whatsappPhoneNumberId: meta.phone_number_id || '',
      whatsappAccessToken: meta.access_token ? '********' : '',
      whatsappVerifyToken: meta.verify_token || ''
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSubmitting(true);
    try {
      const conn = connections.find(c => c.id === editingId);
      const payload: any = {
        enabled_tool_categories: editForm.enabledToolCategories,
        allowed_peer_ids: editForm.allowedPeerIds.trim() ? editForm.allowedPeerIds.split(',').map(s => s.trim()).filter(Boolean) : [],
        receive_scheduled_signals: editForm.receiveScheduledSignals
      };
      if (editForm.agentId) payload.agent_id = editForm.agentId;
      if (conn?.channel === 'telegram' && editForm.telegramChatId.trim()) payload.channel_connection_id = editForm.telegramChatId.trim();
      if (conn?.channel === 'telegram') {
        payload.channel_metadata = {
          ...conn.channel_metadata,
          telegram_message_thread_id: editForm.telegramTopicId.trim() ? parseInt(editForm.telegramTopicId.trim(), 10) : null
        };
      }
      if (conn?.channel === 'whatsapp') {
        payload.channel_metadata = {
          ...conn.channel_metadata,
          phone_number_id: editForm.whatsappPhoneNumberId.trim() || conn.channel_metadata?.phone_number_id,
          verify_token: editForm.whatsappVerifyToken.trim() || conn.channel_metadata?.verify_token
        };
        if (editForm.whatsappAccessToken && editForm.whatsappAccessToken !== '********')
          payload.channel_metadata.access_token = editForm.whatsappAccessToken;
      }
      const res = await apiService.patch<ChannelConnection>(`assistant/connections/${editingId}`, payload);
      if (res?.success && res?.data) {
        toast.success('Connection updated.');
        setConnections(prev => prev.map(c => c.id === editingId ? res.data! : c));
        setEditingId(null);
      } else {
        toast.error('Failed to update connection.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this channel connection?')) return;
    try {
      await apiService.delete(`assistant/connections/${id}`);
      toast.success('Connection removed.');
      setConnections(prev => prev.filter(c => c.id !== id));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    }
  };

  const webhookUrl = (connectionId: string, channel?: string) => {
    const base = getApiBaseUrl().replace(/\/$/, '');
    const ch = channel || 'telegram';
    return `${base}/assistant-webhook/${ch}/${connectionId}`;
  };

  const copyWebhook = (connectionId: string, channel?: string) => {
    const url = webhookUrl(connectionId, channel);
    navigator.clipboard.writeText(url);
    toast.success('Webhook URL copied to clipboard.');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Personal Assistant</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Telegram, Discord, Slack or Teams</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> Add connection
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New channel connection</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agent</label>
                <select
                  value={form.agentId}
                  onChange={e => setForm(f => ({ ...f, agentId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  required
                >
                  <option value="">Select an agent</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel</label>
                <select
                  value={form.channel}
                  onChange={e => setForm(f => ({ ...f, channel: e.target.value as any }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                >
                  <option value="telegram">Telegram</option>
                  <option value="discord" disabled>Discord (coming soon)</option>
                  <option value="slack" disabled>Slack (coming soon)</option>
                  <option value="teams" disabled>Microsoft Teams (coming soon)</option>
                </select>
              </div>
              {form.channel === 'telegram' && (
                <>
                  <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10 p-3">
                    <button
                      type="button"
                      onClick={() => setShowTelegramSetupGuide(!showTelegramSetupGuide)}
                      className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-800 dark:text-gray-200"
                    >
                      {showTelegramSetupGuide ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      How to set up your Telegram bot (personal AI assistant)
                    </button>
                    {showTelegramSetupGuide && (
                      <ol className="mt-3 ml-6 space-y-2 text-sm text-gray-700 dark:text-gray-300 list-decimal list-outside">
                        <li>Open Telegram and message <strong>@BotFather</strong>. Send <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">/newbot</code> and follow the prompts (name and username).</li>
                        <li>Copy the <strong>bot token</strong> BotFather gives you (e.g. <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">123456789:ABCdef...</code>). Paste it in the Bot token field below. Keep it secret.</li>
                        <li>Set the bot’s webhook so Telegram sends messages to this app: call <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">https://api.telegram.org/bot&lt;YOUR_TOKEN&gt;/setWebhook?url=&lt;YOUR_APP_URL&gt;/api/assistant-webhook/telegram/&lt;CONNECTION_ID&gt;</code>. Replace <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">&lt;YOUR_APP_URL&gt;</code> with your server base URL (e.g. <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">https://app.iqonga.org</code>) and <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">&lt;CONNECTION_ID&gt;</code> with this connection’s ID (shown after you create the connection).</li>
                        <li>For <strong>groups</strong>: add your bot to the group as a member. In the connection, set <strong>Connection ID</strong> (when editing) to the group’s Chat ID (e.g. get it by forwarding a message from the group to @userinfobot). In groups the bot only replies when @mentioned or when someone replies to the bot.</li>
                        <li>For <strong>DMs</strong>: only users listed in Allowed Telegram user IDs can use the bot in direct messages; others get an “unauthorized” message. Get a user’s ID from @userinfobot (they message the bot and it replies with their ID).</li>
                      </ol>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bot token (required)</label>
                    <input
                      type="password"
                      value={form.botToken}
                      onChange={e => setForm(f => ({ ...f, botToken: e.target.value }))}
                      placeholder="123456:ABC-DEF..."
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Your bot’s token from @BotFather. Required so this connection uses your personal bot instead of the platform bot.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Connection ID (optional)</label>
                    <input
                      type="text"
                      value={form.channelConnectionId}
                      onChange={e => setForm(f => ({ ...f, channelConnectionId: e.target.value }))}
                      placeholder="Leave blank to auto-generate"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Channel identifier for this connection. For Telegram: leave blank to auto-generate, then set the real Telegram Chat ID when editing (needed for sending messages and scheduled signals). Get group/channel ID e.g. by forwarding a message to @userinfobot.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allowed Telegram user IDs (optional)</label>
                    <input
                      type="text"
                      value={form.allowedPeerIds}
                      onChange={e => setForm(f => ({ ...f, allowedPeerIds: e.target.value }))}
                      placeholder="e.g. 123456789,987654321 — leave empty to allow anyone in DMs"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">In groups the bot answers when @mentioned or replied to (anyone). In direct messages only these user IDs can use the bot; others get an unauthorized message. Get your ID from @userinfobot. Comma-separated.</p>
                  </div>
                </>
              )}
              {form.channel === 'whatsapp' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number ID</label>
                    <input
                      type="text"
                      value={form.whatsappPhoneNumberId}
                      onChange={e => setForm(f => ({ ...f, whatsappPhoneNumberId: e.target.value }))}
                      placeholder="From Meta Developer Console → WhatsApp → API Setup"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Token</label>
                    <input
                      type="password"
                      value={form.whatsappAccessToken}
                      onChange={e => setForm(f => ({ ...f, whatsappAccessToken: e.target.value }))}
                      placeholder="Temporary or system user token from Meta"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Verify Token (optional)</label>
                    <input
                      type="text"
                      value={form.whatsappVerifyToken}
                      onChange={e => setForm(f => ({ ...f, whatsappVerifyToken: e.target.value }))}
                      placeholder="Same value you set in Meta webhook config"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Used for webhook verification. Can also be set via WHATSAPP_VERIFY_TOKEN env.</p>
                  </div>
                </>
              )}
              <div>
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tools (what the assistant can use)</span>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(TOOL_LABELS).map(([key, label]) => (
                    <label key={key} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.enabledToolCategories.includes(key)}
                        onChange={e => {
                          if (e.target.checked) setForm(f => ({ ...f, enabledToolCategories: [...f.enabledToolCategories, key] }));
                          else setForm(f => ({ ...f, enabledToolCategories: f.enabledToolCategories.filter(c => c !== key) }));
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {submitting ? 'Creating…' : 'Create connection'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
            </div>
          </form>
        )}

        {editingId && (
          <form onSubmit={handleUpdate} className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit connection</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agent</label>
                <select
                  value={editForm.agentId}
                  onChange={e => setEditForm(f => ({ ...f, agentId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  required
                >
                  <option value="">Select an agent</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tools</span>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(TOOL_LABELS).map(([key, label]) => (
                    <label key={key} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.enabledToolCategories.includes(key)}
                        onChange={e => {
                          if (e.target.checked) setEditForm(f => ({ ...f, enabledToolCategories: [...f.enabledToolCategories, key] }));
                          else setEditForm(f => ({ ...f, enabledToolCategories: f.enabledToolCategories.filter(c => c !== key) }));
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allowed Telegram user IDs</label>
                <input
                  type="text"
                  value={editForm.allowedPeerIds}
                  onChange={e => setEditForm(f => ({ ...f, allowedPeerIds: e.target.value }))}
                  placeholder="Comma-separated; leave empty to allow anyone"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                />
              </div>
              {editingId && connections.find(c => c.id === editingId)?.channel === 'telegram' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telegram Chat ID</label>
                    <input
                      type="text"
                      value={editForm.telegramChatId}
                      onChange={e => setEditForm(f => ({ ...f, telegramChatId: e.target.value }))}
                      placeholder="-1002216271239"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Required for sending messages (e.g. scheduled signals). Use the Telegram chat/channel id: group and channel ids are negative (e.g. -1002216271239). For a channel: add the bot as admin, then get the channel id e.g. by forwarding a channel message to @userinfobot or @getidsbot.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic / thread ID (optional)</label>
                    <input
                      type="text"
                      value={editForm.telegramTopicId}
                      onChange={e => setEditForm(f => ({ ...f, telegramTopicId: e.target.value }))}
                      placeholder="e.g. 12345"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">To send scheduled signals into a specific topic, set the topic&apos;s message thread id (a number). Get it from getUpdates after posting in that topic, or from the message when the bot receives a message in the topic.</p>
                  </div>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.receiveScheduledSignals}
                      onChange={e => setEditForm(f => ({ ...f, receiveScheduledSignals: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Receive scheduled trade signals (only when there is a trade; no message if no setup)</span>
                  </label>
                </>
              )}
              {editingId && connections.find(c => c.id === editingId)?.channel === 'whatsapp' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number ID</label>
                    <input
                      type="text"
                      value={editForm.whatsappPhoneNumberId}
                      onChange={e => setEditForm(f => ({ ...f, whatsappPhoneNumberId: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Token</label>
                    <input
                      type="password"
                      value={editForm.whatsappAccessToken}
                      onChange={e => setEditForm(f => ({ ...f, whatsappAccessToken: e.target.value }))}
                      placeholder="Leave blank to keep current token"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Verify Token</label>
                    <input
                      type="text"
                      value={editForm.whatsappVerifyToken}
                      onChange={e => setEditForm(f => ({ ...f, whatsappVerifyToken: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : connections.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No channel connections yet.</p>
            <p className="text-sm text-gray-500 mt-1">Add a connection to let your agent reply on Telegram (or WhatsApp/Teams later).</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {connections.map(conn => (
              <li key={conn.id} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{conn.agent_name || 'Agent'}</p>
                    <p className="text-sm text-gray-500 capitalize">{conn.channel}</p>
                    {['telegram', 'whatsapp', 'discord', 'slack'].includes(conn.channel) && (
                      <div className="mt-2 flex items-center gap-2">
                        <code className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 rounded truncate max-w-md">
                          {webhookUrl(conn.id, conn.channel)}
                        </code>
                        <button type="button" onClick={() => copyWebhook(conn.id, conn.channel)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600" title="Copy">
                          <Copy className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    )}
                    {conn.enabled_tool_categories?.length > 0 && (
                      <p className="text-xs text-gray-800 dark:text-gray-200 mt-1">
                        Tools: {conn.enabled_tool_categories.map(c => TOOL_LABELS[c] || c).join(', ')}
                      </p>
                    )}
                    {conn.allowed_peer_ids && conn.allowed_peer_ids.length > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Restricted to {conn.allowed_peer_ids.length} user(s)
                      </p>
                    )}
                    {conn.channel === 'telegram' && conn.receive_scheduled_signals && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        Receives scheduled trade signals
                      </p>
                    )}
                    {conn.channel === 'telegram' && conn.receive_scheduled_signals && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        Receives scheduled trade signals
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleEdit(conn)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg border border-gray-300 dark:border-gray-500" title="Edit connection">
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(conn.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Remove">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {connections.some(c => c.channel === 'telegram') && (
          <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">What to do on Telegram (after creating the bot)</p>
            <ol className="text-sm text-amber-700 dark:text-amber-300 mt-2 list-decimal list-inside space-y-1">
              <li>Copy the <strong>webhook URL</strong> shown above for this connection (click the copy icon).</li>
              <li>Set your bot’s webhook to that URL by opening this link in your browser (replace <code className="bg-amber-200/50 px-1 rounded text-gray-900 dark:text-gray-100">YOUR_BOT_TOKEN</code> and <code className="bg-amber-200/50 px-1 rounded text-gray-900 dark:text-gray-100">YOUR_WEBHOOK_URL</code> with your bot token and the copied URL, both URL-encoded):<br />
                <code className="block mt-1 text-xs break-all bg-amber-200/30 p-2 rounded text-gray-900 dark:text-gray-100">https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=YOUR_WEBHOOK_URL</code>
              </li>
              <li>Or use a tool like Postman: <code className="text-xs text-gray-900 dark:text-gray-100">GET https://api.telegram.org/bot&lt;token&gt;/setWebhook?url=&lt;encoded_webhook_url&gt;</code></li>
              <li>After that, when users message your bot on Telegram, the assistant will reply using the agent you linked.</li>
              <li><strong>Voice messages</strong> are supported: users can send voice notes and they will be transcribed automatically before the assistant replies.</li>
            </ol>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">You don’t need to create anything else on Telegram besides the bot and setting this webhook.</p>
          </div>
        )}

        {connections.some(c => c.channel === 'whatsapp') && (
          <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">What to do on WhatsApp (Meta Cloud API)</p>
            <ol className="text-sm text-green-700 dark:text-green-300 mt-2 list-decimal list-inside space-y-1">
              <li>Copy the <strong>webhook URL</strong> shown above for your WhatsApp connection (click the copy icon).</li>
              <li>In the <strong>Meta Developer Console</strong>: create an app (or use existing), add the <strong>WhatsApp</strong> product, and open <strong>API Setup</strong>.</li>
              <li>Get your <strong>Phone Number ID</strong> and <strong>Access Token</strong> (temporary or system user) and enter them in the connection form above.</li>
              <li>Set a <strong>Verify Token</strong> (any string you choose) in the connection form and in Meta: <em>App → WhatsApp → Configuration → Webhook → Edit → Verify token</em>. The same value must match, or set <code className="bg-green-200/50 px-1 rounded text-gray-900 dark:text-gray-100">WHATSAPP_VERIFY_TOKEN</code> in your backend env.</li>
              <li>In Meta <strong>Webhook</strong> configuration, set the <strong>Callback URL</strong> to the copied webhook URL and subscribe to <strong>messages</strong>.</li>
              <li>After verification, when users message your WhatsApp number, the assistant will reply using the linked agent.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantConnections;
