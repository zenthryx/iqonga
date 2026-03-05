/**
 * Email Connection Settings Component
 * Allows users to connect email accounts via Gmail OAuth or IMAP/SMTP
 */

import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Mail, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Loader2, 
  Eye, 
  EyeOff,
  Settings,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Inbox,
  ArrowLeft,
  Star,
  StarOff,
  Clock,
  User,
  Paperclip
} from 'lucide-react';

interface EmailProvider {
  name: string;
  display_name: string;
  icon: string;
  imap_host: string;
  imap_port: number;
  smtp_host: string;
  smtp_port: number;
  requires_app_password: boolean;
  app_password_url: string | null;
  notes: string;
}

interface EmailConnection {
  id: number;
  email_address: string;
  provider: string;
  connection_type: string;
  display_name: string;
  connection_status: string;
  is_active: boolean;
  is_primary: boolean;
  last_sync_at: string | null;
  created_at: string;
}

interface Email {
  id: number;
  subject: string;
  from_email: string;
  from_name: string;
  snippet: string;
  body_text: string;
  body_html: string;
  is_read: boolean;
  is_starred: boolean;
  received_at: string;
  has_attachments: boolean;
  ai_category?: string;
  ai_priority?: string;
}

const providerIcons: Record<string, string> = {
  gmail: '📧',
  outlook: '📬',
  yahoo: '📩',
  icloud: '☁️',
  aol: '📮',
  zoho: '📨',
  protonmail: '🔒',
  fastmail: '⚡',
  gmx: '📪',
  custom: '⚙️'
};

const EmailConnectionSettings: React.FC = () => {
  const [connections, setConnections] = useState<EmailConnection[]>([]);
  const [providers, setProviders] = useState<EmailProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [addingConnection, setAddingConnection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Email viewing state
  const [viewingConnection, setViewingConnection] = useState<EmailConnection | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailStats, setEmailStats] = useState({ total: 0, unread: 0 });

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    provider: 'gmail',
    imapHost: '',
    imapPort: 993,
    imapSecure: true,
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true
  });

  const [testResult, setTestResult] = useState<{
    success: boolean;
    imap: { success: boolean; message: string };
    smtp: { success: boolean; message: string };
  } | null>(null);

  useEffect(() => {
    fetchConnections();
    fetchProviders();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await apiService.get('/email-connections');
      if (response.success) {
        setConnections(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching email connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await apiService.get('/email-connections/presets');
      if (response.success) {
        setProviders(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const handleProviderChange = (providerName: string) => {
    const provider = providers.find(p => p.name === providerName);
    if (provider && providerName !== 'custom') {
      setFormData({
        ...formData,
        provider: providerName,
        imapHost: provider.imap_host,
        imapPort: provider.imap_port,
        smtpHost: provider.smtp_host,
        smtpPort: provider.smtp_port
      });
    } else {
      setFormData({
        ...formData,
        provider: providerName,
        imapHost: '',
        imapPort: 993,
        smtpHost: '',
        smtpPort: 587
      });
    }
    setTestResult(null);
  };

  const testConnection = async () => {
    if (!formData.email || !formData.password) {
      toast.error('Please enter email and password');
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    try {
      const response = await apiService.post('/email-connections/test', {
        email: formData.email,
        password: formData.password,
        provider: formData.provider,
        imapHost: formData.imapHost,
        imapPort: formData.imapPort,
        imapSecure: formData.imapSecure,
        smtpHost: formData.smtpHost,
        smtpPort: formData.smtpPort,
        smtpSecure: formData.smtpSecure
      });

      setTestResult(response.data);
      
      if (response.success) {
        toast.success('Connection test successful!');
      } else {
        toast.error('Connection test failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Connection test failed');
      setTestResult({
        success: false,
        imap: { success: false, message: error.message || 'Test failed' },
        smtp: { success: false, message: error.message || 'Test failed' }
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const addConnection = async () => {
    if (!formData.email || !formData.password) {
      toast.error('Please enter email and password');
      return;
    }

    setAddingConnection(true);

    try {
      const response = await apiService.post('/email-connections', {
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName || formData.email.split('@')[0],
        provider: formData.provider,
        imapHost: formData.imapHost,
        imapPort: formData.imapPort,
        imapSecure: formData.imapSecure,
        smtpHost: formData.smtpHost,
        smtpPort: formData.smtpPort,
        smtpSecure: formData.smtpSecure
      });

      if (response.success) {
        toast.success('Email account connected successfully!');
        setShowAddModal(false);
        resetForm();
        fetchConnections();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add email connection');
    } finally {
      setAddingConnection(false);
    }
  };

  const deleteConnection = async (id: number) => {
    if (!confirm('Are you sure you want to remove this email connection?')) {
      return;
    }

    try {
      await apiService.delete(`/email-connections/${id}`);
      toast.success('Email connection removed');
      fetchConnections();
    } catch (error) {
      toast.error('Failed to remove email connection');
    }
  };

  const syncEmails = async (id: number, days: number = 30) => {
    const toastId = toast.loading(`Syncing emails from last ${days} days...`);
    
    try {
      const response = await apiService.post(`/email-connections/${id}/sync`, {
        folder: 'INBOX',
        limit: 100,
        days: days
      });

      if (response.success) {
        toast.success(`Synced ${response.data.synced} emails from last ${days} days`, { id: toastId });
        fetchConnections();
        return response.data;
      }
    } catch (error: any) {
      toast.error(error.message || 'Sync failed', { id: toastId });
      throw error;
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      displayName: '',
      provider: 'gmail',
      imapHost: '',
      imapPort: 993,
      imapSecure: true,
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: true
    });
    setTestResult(null);
    setShowPassword(false);
  };

  const selectedProvider = providers.find(p => p.name === formData.provider);

  // Fetch emails for a connection
  const viewEmails = async (connection: EmailConnection) => {
    setViewingConnection(connection);
    setLoadingEmails(true);
    setSelectedEmail(null);

    try {
      const response = await apiService.get(`/email-connections/${connection.id}/messages?limit=50`);
      if (response.success) {
        setEmails(response.data.emails || []);
        setEmailStats({
          total: response.data.total || 0,
          unread: response.data.unread || 0
        });
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast.error('Failed to fetch emails');
    } finally {
      setLoadingEmails(false);
    }
  };

  // Mark email as read/unread
  const toggleEmailRead = async (email: Email) => {
    if (!viewingConnection) return;

    try {
      await apiService.patch(`/email-connections/${viewingConnection.id}/messages/${email.id}/read`, {
        is_read: !email.is_read
      });
      setEmails(emails.map(e => 
        e.id === email.id ? { ...e, is_read: !e.is_read } : e
      ));
    } catch (error) {
      toast.error('Failed to update email');
    }
  };

  // Star/unstar email
  const toggleEmailStar = async (email: Email) => {
    if (!viewingConnection) return;

    try {
      await apiService.patch(`/email-connections/${viewingConnection.id}/messages/${email.id}/star`, {
        is_starred: !email.is_starred
      });
      setEmails(emails.map(e => 
        e.id === email.id ? { ...e, is_starred: !e.is_starred } : e
      ));
      if (selectedEmail?.id === email.id) {
        setSelectedEmail({ ...selectedEmail, is_starred: !email.is_starred });
      }
    } catch (error) {
      toast.error('Failed to update email');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // If viewing emails, show inbox view
  if (viewingConnection) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setViewingConnection(null); setSelectedEmail(null); setEmails([]); }}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Connections</span>
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {emailStats.unread} unread of {emailStats.total} emails
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    await syncEmails(viewingConnection.id, 7);
                    await viewEmails(viewingConnection);
                  } catch (e) {}
                }}
                className="px-3 py-1.5 bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500 transition-colors text-sm"
              >
                7 days
              </button>
              <button
                onClick={async () => {
                  try {
                    await syncEmails(viewingConnection.id, 30);
                    await viewEmails(viewingConnection);
                  } catch (e) {}
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                30 days
              </button>
              <button
                onClick={async () => {
                  try {
                    await syncEmails(viewingConnection.id, 90);
                    await viewEmails(viewingConnection);
                  } catch (e) {}
                }}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
              >
                90 days
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {/* Account info bar */}
          <div className="px-4 py-3 bg-gray-700/50 border-b border-gray-600 flex items-center gap-3">
            <div className="text-2xl">{providerIcons[viewingConnection.provider] || '📧'}</div>
            <div>
              <h3 className="font-medium text-white">{viewingConnection.display_name || viewingConnection.email_address}</h3>
              <p className="text-xs text-gray-400">{viewingConnection.email_address}</p>
            </div>
          </div>

          {loadingEmails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Emails Yet</h3>
              <p className="text-gray-400 mb-4">Click "Sync" to fetch your latest emails from the last 30 days</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={async () => {
                    try {
                      await syncEmails(viewingConnection.id, 30);
                      await viewEmails(viewingConnection);
                    } catch (e) {}
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Sync Last 30 Days
                </button>
                <button
                  onClick={async () => {
                    try {
                      await syncEmails(viewingConnection.id, 90);
                      await viewEmails(viewingConnection);
                    } catch (e) {}
                  }}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Sync Last 90 Days
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-[500px]">
              {/* Email list */}
              <div className={`${selectedEmail ? 'w-2/5 border-r border-gray-700' : 'w-full'} overflow-y-auto`}>
                {emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => {
                      setSelectedEmail(email);
                      if (!email.is_read) toggleEmailRead(email);
                    }}
                    className={`px-4 py-3 border-b border-gray-700 cursor-pointer transition-colors ${
                      selectedEmail?.id === email.id
                        ? 'bg-blue-500/20'
                        : email.is_read
                        ? 'hover:bg-gray-700/50'
                        : 'bg-gray-700/30 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleEmailStar(email); }}
                        className="mt-1 text-gray-400 hover:text-yellow-400"
                      >
                        {email.is_starred ? (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${!email.is_read ? 'font-semibold text-white' : 'text-gray-300'}`}>
                            {email.from_name || email.from_email}
                          </span>
                          <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
                            {email.has_attachments && <Paperclip className="h-3 w-3" />}
                            {formatDate(email.received_at)}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${!email.is_read ? 'font-medium text-white' : 'text-gray-400'}`}>
                          {email.subject || '(No Subject)'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{email.snippet}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Email detail */}
              {selectedEmail && (
                <div className="w-3/5 overflow-y-auto p-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <h2 className="text-xl font-semibold text-white">{selectedEmail.subject || '(No Subject)'}</h2>
                      <button
                        onClick={() => toggleEmailStar(selectedEmail)}
                        className="p-1 text-gray-400 hover:text-yellow-400"
                      >
                        {selectedEmail.is_starred ? (
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <Star className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 pb-4 border-b border-gray-700">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{selectedEmail.from_name || selectedEmail.from_email}</p>
                        <p className="text-sm text-gray-400">{selectedEmail.from_email}</p>
                      </div>
                      <div className="ml-auto text-sm text-gray-400 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(selectedEmail.received_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="prose prose-invert max-w-none">
                      {selectedEmail.body_html ? (
                        <div 
                          className="text-gray-300 text-sm"
                          dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap text-gray-300 text-sm font-sans">
                          {selectedEmail.body_text || selectedEmail.snippet}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-400" />
            Email Connections
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Connect your email accounts to Smart Inbox
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Email Account
        </button>
      </div>

      {/* Connection Types Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h3 className="font-medium text-blue-400 mb-2">Gmail (OAuth)</h3>
          <p className="text-sm text-gray-400">
            Use "Connect with Google" button in Smart Inbox for seamless Gmail integration.
            No password required.
          </p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <h3 className="font-medium text-purple-400 mb-2">Other Providers (IMAP/SMTP)</h3>
          <p className="text-sm text-gray-400">
            Connect Outlook, Yahoo, iCloud, or any email provider using IMAP/SMTP.
            Requires email and app password.
          </p>
        </div>
      </div>

      {/* Connections List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
        </div>
      ) : connections.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
          <Mail className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Email Accounts Connected</h3>
          <p className="text-gray-400 mb-4">
            Connect your email accounts to start using Smart Inbox with AI-powered features.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Connect Email Account
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">
                  {providerIcons[connection.provider] || '📧'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-white">{connection.display_name || connection.email_address}</h4>
                    {connection.is_primary && (
                      <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-full">
                        Primary
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      connection.connection_status === 'connected'
                        ? 'bg-green-500/20 text-green-300'
                        : connection.connection_status === 'error'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {connection.connection_status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{connection.email_address}</p>
                  <p className="text-xs text-gray-500">
                    {connection.connection_type === 'oauth' ? 'OAuth' : 'IMAP/SMTP'} • 
                    {connection.last_sync_at 
                      ? ` Last synced: ${new Date(connection.last_sync_at).toLocaleString()}`
                      : ' Never synced'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {connection.connection_type === 'imap_smtp' && (
                  <>
                    <button
                      onClick={() => viewEmails(connection)}
                      className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                      title="View emails"
                    >
                      <Inbox className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => syncEmails(connection.id)}
                      className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Sync emails"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => deleteConnection(connection.id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Remove connection"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-gray-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-xl font-semibold text-white">Connect Email Account</h3>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Provider
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {providers.slice(0, 6).map((provider) => (
                    <button
                      key={provider.name}
                      type="button"
                      onClick={() => handleProviderChange(provider.name)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        formData.provider === provider.name
                          ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                          : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-2xl mb-1">{providerIcons[provider.name] || '📧'}</div>
                      <div className="text-xs">{provider.display_name.split('/')[0]}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  {providers.slice(6).map((provider) => (
                    <button
                      key={provider.name}
                      type="button"
                      onClick={() => handleProviderChange(provider.name)}
                      className={`px-3 py-1 rounded-lg border text-sm transition-all ${
                        formData.provider === provider.name
                          ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                          : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {providerIcons[provider.name]} {provider.display_name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider Notes */}
              {selectedProvider && selectedProvider.notes && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-200">{selectedProvider.notes}</p>
                    {selectedProvider.app_password_url && (
                      <a
                        href={selectedProvider.app_password_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:underline flex items-center gap-1 mt-1"
                      >
                        Create App Password <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  {selectedProvider?.requires_app_password ? 'App Password' : 'Password'}
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-300"
                    title="Your password is encrypted and stored securely"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={selectedProvider?.requires_app_password ? 'xxxx xxxx xxxx xxxx' : '••••••••'}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Work Email, Personal, etc."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Custom Server Settings (for 'custom' provider) */}
              {formData.provider === 'custom' && (
                <div className="space-y-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Server Settings
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">IMAP Host</label>
                      <input
                        type="text"
                        value={formData.imapHost}
                        onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                        placeholder="imap.example.com"
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">IMAP Port</label>
                      <input
                        type="number"
                        value={formData.imapPort}
                        onChange={(e) => setFormData({ ...formData, imapPort: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">SMTP Host</label>
                      <input
                        type="text"
                        value={formData.smtpHost}
                        onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                        placeholder="smtp.example.com"
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">SMTP Port</label>
                      <input
                        type="number"
                        value={formData.smtpPort}
                        onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Test Results */}
              {testResult && (
                <div className={`p-4 rounded-lg border ${
                  testResult.success
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <h4 className={`font-medium mb-2 ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {testResult.success ? '✅ Connection Successful!' : '❌ Connection Failed'}
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p className={testResult.imap.success ? 'text-green-300' : 'text-red-300'}>
                      IMAP: {testResult.imap.message}
                    </p>
                    <p className={testResult.smtp.success ? 'text-green-300' : 'text-red-300'}>
                      SMTP: {testResult.smtp.message}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-800/50">
              <button
                onClick={testConnection}
                disabled={testingConnection || !formData.email || !formData.password}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testingConnection ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="h-4 w-4" />
                )}
                Test Connection
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addConnection}
                  disabled={addingConnection || !formData.email || !formData.password}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {addingConnection ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Connect Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailConnectionSettings;

