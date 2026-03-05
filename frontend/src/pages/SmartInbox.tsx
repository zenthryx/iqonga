import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Inbox, 
  Star, 
  Archive, 
  Trash2, 
  RefreshCw, 
  Search, 
  Send,
  Reply,
  Forward,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  Clock,
  Tag,
  Filter,
  Settings,
  Loader2,
  Sparkles,
  Brain,
  Lightbulb,
  Shield,
  TrendingUp,
  Copy,
  X,
  Plus,
  Server
} from 'lucide-react';
import EmailConnectionSettings from '../components/Email/EmailConnectionSettings';
import UnifiedInbox from '../components/Email/UnifiedInbox';
import { apiService } from '../services/api';

interface EmailAccount {
  connected: boolean;
  email?: string;
  last_sync_at?: string;
  connected_at?: string;
}

interface EmailStats {
  totalEmails: number;
  unreadEmails: number;
  starredEmails: number;
  categories: Record<string, number>;
}

interface Email {
  id: number;
  subject: string;
  from_email: string;
  from_name: string;
  snippet: string;
  is_read: boolean;
  is_starred: boolean;
  received_at: string;
  ai_category?: string;
  ai_priority?: string;
  ai_sentiment?: string;
  ai_summary?: string;
  ai_key_points?: string[];
  ai_action_items?: string[];
}

interface AIDraft {
  id: number;
  draft_body: string;
  tone: string;
  confidence_score: number;
  type?: string;
}

interface AISuggestions {
  drafts: AIDraft[];
  category: {
    category: string;
    priority: string;
    sentiment: string;
    confidence: number;
  } | null;
  summary: {
    summary: string;
    keyPoints: string[];
    actionItems: string[];
  } | null;
  spamCheck: {
    isSpam: boolean;
    recommendation: string;
  } | null;
}

const SmartInbox: React.FC = () => {
  const [account, setAccount] = useState<EmailAccount>({ connected: false });
  const [stats, setStats] = useState<EmailStats>({
    totalEmails: 0,
    unreadEmails: 0,
    starredEmails: 0,
    categories: {}
  });
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedTone, setSelectedTone] = useState<'professional' | 'casual' | 'friendly' | 'brief'>('professional');
  
  // Reply composer state
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  
  // Forward composer state
  const [showForwardComposer, setShowForwardComposer] = useState(false);
  const [forwardTo, setForwardTo] = useState('');
  const [forwardCc, setForwardCc] = useState('');
  const [forwardBcc, setForwardBcc] = useState('');
  const [forwardMessage, setForwardMessage] = useState('');
  const [sendingForward, setSendingForward] = useState(false);
  
  // Compose new email state
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeBcc, setComposeBcc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sendingCompose, setSendingCompose] = useState(false);

  useEffect(() => {
    checkAccountStatus();
    // Check for OAuth callback success
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      const email = params.get('email');
      if (email) {
        // Clear URL params
        window.history.replaceState({}, '', '/smart-inbox');
        // Show success message
        alert(`Gmail connected successfully: ${email}`);
        // Trigger initial sync
        handleSync();
      }
    } else if (params.get('error')) {
      alert(`Failed to connect Gmail: ${params.get('error')}`);
      window.history.replaceState({}, '', '/smart-inbox');
    }
  }, []);

  useEffect(() => {
    if (account.connected) {
      fetchStats();
      fetchEmails();
    }
  }, [account.connected, filter]);

  const checkAccountStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/gmail/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAccount(data);
      }
    } catch (error) {
      console.error('Error checking account status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/gmail/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchEmails = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        page: '1',
        limit: '50',
        category: filter,
        search: searchQuery
      });

      const response = await fetch(`/api/gmail/messages?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmails(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/gmail/auth', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.oauth_url) {
          // Redirect to Google OAuth
          window.location.href = data.oauth_url;
        }
      } else {
        alert('Failed to initiate Gmail connection');
      }
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      alert('Failed to connect Gmail');
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ maxResults: 100 })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Synced ${data.synced} emails successfully`);
        fetchStats();
        fetchEmails();
      } else {
        const error = await response.json();
        alert(`Sync failed: ${error.error || 'Please try disconnecting and reconnecting your Gmail account'}`);
      }
    } catch (error) {
      console.error('Error syncing emails:', error);
      alert('Failed to sync emails. Try reconnecting your Gmail account.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Gmail account? You can reconnect anytime.')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/gmail/disconnect', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('✅ Gmail disconnected successfully! You can reconnect anytime.');
        setAccount({ connected: false });
        setEmails([]);
        setSelectedEmail(null);
        checkAccountStatus();
      } else {
        alert('Failed to disconnect Gmail');
      }
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      alert('Failed to disconnect Gmail');
    }
  };

  const handleMarkRead = async (emailId: number, isRead: boolean) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/api/gmail/messages/${emailId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isRead })
      });
      fetchEmails();
      fetchStats();
    } catch (error) {
      console.error('Error marking email:', error);
    }
  };

  const handleStar = async (emailId: number, isStarred: boolean) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/api/gmail/messages/${emailId}/star`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isStarred })
      });
      fetchEmails();
      fetchStats();
    } catch (error) {
      console.error('Error starring email:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const fetchAISuggestions = async (emailId: number) => {
    try {
      setLoadingAI(true);
      setShowAIPanel(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`/api/gmail/ai/suggestions/${emailId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const generateDraftReplies = async (emailId: number, tone: string) => {
    try {
      setLoadingAI(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`/api/gmail/ai/drafts/${emailId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tone })
      });

      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(prev => prev ? { ...prev, drafts: data.drafts } : null);
      }
    } catch (error) {
      console.error('Error generating drafts:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('✅ Copied to clipboard!');
  };

  const handleUseAIDraft = (draftBody: string) => {
    setReplyBody(draftBody);
    setShowReplyComposer(true);
    // Scroll to reply composer
    setTimeout(() => {
      const composer = document.getElementById('reply-composer');
      composer?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleSendReply = async () => {
    if (!selectedEmail || !replyBody.trim()) {
      alert('Please enter a reply message');
      return;
    }

    try {
      setSendingReply(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: selectedEmail.from_email,
          subject: `Re: ${selectedEmail.subject}`,
          body: replyBody,
          html: replyBody.replace(/\n/g, '<br>')
        })
      });

      if (response.ok) {
        alert('✅ Reply sent successfully!');
        setReplyBody('');
        setShowReplyComposer(false);
        // Optionally refresh emails
        fetchEmails();
      } else {
        const error = await response.json();
        alert(`Failed to send reply: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmail) return;

    if (!confirm(`Move "${selectedEmail.subject}" to trash?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/gmail/messages/${selectedEmail.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('✅ Email moved to trash');
        setSelectedEmail(null);
        fetchStats();
        fetchEmails();
      } else {
        const error = await response.json();
        alert(`Failed to delete: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Failed to delete email');
    }
  };

  const handleSendForward = async () => {
    if (!selectedEmail || !forwardTo.trim()) {
      alert('Please enter at least one recipient');
      return;
    }

    try {
      setSendingForward(true);
      const token = localStorage.getItem('authToken');
      
      // Build forward body with original message
      const forwardBody = `${forwardMessage}\n\n---------- Forwarded message ---------\nFrom: ${selectedEmail.from_name || selectedEmail.from_email}\nDate: ${new Date(selectedEmail.received_at).toLocaleString()}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.snippet}`;
      
      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: forwardTo,
          cc: forwardCc || undefined,
          bcc: forwardBcc || undefined,
          subject: `Fwd: ${selectedEmail.subject}`,
          body: forwardBody,
          html: forwardBody.replace(/\n/g, '<br>')
        })
      });

      if (response.ok) {
        alert('✅ Email forwarded successfully!');
        setForwardTo('');
        setForwardCc('');
        setForwardBcc('');
        setForwardMessage('');
        setShowForwardComposer(false);
        fetchEmails();
      } else {
        const error = await response.json();
        alert(`Failed to forward: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error forwarding email:', error);
      alert('Failed to forward email');
    } finally {
      setSendingForward(false);
    }
  };

  const handleSendCompose = async () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      alert('Please fill in To, Subject, and Message fields');
      return;
    }

    try {
      setSendingCompose(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: composeTo,
          cc: composeCc || undefined,
          bcc: composeBcc || undefined,
          subject: composeSubject,
          body: composeBody,
          html: composeBody.replace(/\n/g, '<br>')
        })
      });

      if (response.ok) {
        alert('✅ Email sent successfully!');
        // Clear form
        setComposeTo('');
        setComposeCc('');
        setComposeBcc('');
        setComposeSubject('');
        setComposeBody('');
        setShowComposeModal(false);
        fetchEmails();
      } else {
        const error = await response.json();
        alert(`Failed to send email: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    } finally {
      setSendingCompose(false);
    }
  };

  // Auto-fetch AI suggestions when email is selected
  useEffect(() => {
    if (selectedEmail && account.connected) {
      fetchAISuggestions(selectedEmail.id);
    } else {
      setAiSuggestions(null);
      setShowAIPanel(false);
    }
  }, [selectedEmail]);

  // State for view tabs on not connected screen (must be before any conditional returns)
  const [connectionTab, setConnectionTab] = useState<'gmail' | 'other'>('gmail');
  
  // IMAP accounts state
  const [imapAccounts, setImapAccounts] = useState<Array<{
    id: number;
    email_address: string;
    display_name: string;
    provider: string;
    connection_type: string;
  }>>([]);
  
  // Active inbox view (gmail or imap)
  const [activeInbox, setActiveInbox] = useState<'gmail' | 'imap'>('gmail');
  
  // Show connection settings instead of inbox
  const [showConnectionSettings, setShowConnectionSettings] = useState(false);

  // Fetch IMAP accounts on mount
  useEffect(() => {
    fetchImapAccounts();
  }, []);

  const fetchImapAccounts = async () => {
    try {
      const response = await apiService.get('/email-connections');
      if (response.success && response.data) {
        setImapAccounts(response.data);
        // If no Gmail connected but has IMAP accounts, show IMAP view
        if (!account.connected && response.data.length > 0) {
          setActiveInbox('imap');
        }
      }
    } catch (error) {
      console.error('Error fetching IMAP accounts:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Check if user has any connected accounts
  const hasGmail = account.connected;
  const hasImap = imapAccounts.length > 0;
  const hasAnyAccount = hasGmail || hasImap;

  // Show IMAP Connection Settings if requested
  if (activeInbox === 'imap' && showConnectionSettings) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setShowConnectionSettings(false)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            <Mail className="h-4 w-4" />
            ← Back to Inbox
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Email Connections</h1>
            <p className="text-sm text-gray-400">Manage your IMAP/SMTP accounts</p>
          </div>
        </div>
        <EmailConnectionSettings />
      </div>
    );
  }

  // Show IMAP Unified Inbox if selected and accounts exist
  if (activeInbox === 'imap' && hasImap) {
    return (
      <div className="h-screen flex flex-col">
        {/* Header with account switcher */}
        <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-4">
            <Mail className="h-6 w-6 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Smart Inbox</h1>
              <p className="text-sm text-gray-400">IMAP/SMTP Accounts ({imapAccounts.length})</p>
            </div>
          </div>
          
          {/* View Switcher */}
          <div className="flex items-center gap-2">
            {hasGmail && (
              <button
                onClick={() => setActiveInbox('gmail')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                <Mail className="h-4 w-4" />
                Switch to Gmail
              </button>
            )}
            <button
              onClick={fetchImapAccounts}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Unified Inbox Component - takes remaining space */}
        <div className="flex-1 min-h-0 p-4">
          <UnifiedInbox 
            accounts={imapAccounts} 
            onRefresh={fetchImapAccounts}
            onManageConnections={() => setShowConnectionSettings(true)}
          />
        </div>
      </div>
    );
  }

  // Not connected view
  if (!hasAnyAccount) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <Mail className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-4">Smart Inbox</h1>
          <p className="text-gray-400 text-lg">
            AI-powered email management for Gmail, Outlook, Yahoo, and more
          </p>
        </div>

        {/* AI Features Banner */}
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">🤖 AI-Powered Features</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-300">Smart Categorization</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-300">Draft Replies</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-300">Email Summaries</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-300">Spam Detection</span>
            </div>
          </div>
        </div>

        {/* Connection Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setConnectionTab('gmail')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
              connectionTab === 'gmail'
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">📧</span>
              <span>Gmail (Recommended)</span>
            </div>
          </button>
          <button
            onClick={() => setConnectionTab('other')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
              connectionTab === 'other'
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">📬</span>
              <span>Other Providers (IMAP/SMTP)</span>
            </div>
          </button>
        </div>

        {/* Gmail Connection */}
        {connectionTab === 'gmail' && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📧</span>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white">Connect Gmail</h2>
                <p className="text-gray-400">One-click OAuth connection - no password needed</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-white">Secure OAuth</h3>
                  <p className="text-sm text-gray-400">No password storage required</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-white">Full Integration</h3>
                  <p className="text-sm text-gray-400">Read, send, archive, and more</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-white">Real-time Sync</h3>
                  <p className="text-sm text-gray-400">Always up to date with your inbox</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-white">Labels & Filters</h3>
                  <p className="text-sm text-gray-400">Works with Gmail labels</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white py-4 px-6 rounded-lg font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <Mail className="h-5 w-5" />
                  <span>Connect with Google</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Other Providers (IMAP/SMTP) */}
        {connectionTab === 'other' && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 mb-8">
            <EmailConnectionSettings />
          </div>
        )}

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-sm text-yellow-200">
            <span className="font-semibold">🔒 Privacy Note:</span> We only read your emails to provide AI features. 
            Your data is encrypted and never shared with third parties.
          </p>
        </div>
      </div>
    );
  }

  // Connected view - Gmail inbox
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Mail className="h-6 w-6 text-blue-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Smart Inbox</h1>
              <p className="text-sm text-gray-400">{account.email} (Gmail)</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Switch to IMAP if available */}
            {hasImap && (
              <button
                onClick={() => setActiveInbox('imap')}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg"
              >
                <Server className="h-4 w-4" />
                <span>IMAP Inbox ({imapAccounts.length})</span>
              </button>
            )}
            <button
              onClick={() => setShowComposeModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold"
            >
              <Mail className="h-4 w-4" />
              <span>Compose</span>
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync'}</span>
            </button>
            <button 
              onClick={handleDisconnect}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg"
              title="Disconnect Gmail (you can reconnect anytime)"
            >
              <Settings className="h-4 w-4" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Stats & Filters */}
        <div className="w-64 bg-white/5 backdrop-blur-sm border-r border-white/10 p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Inbox</h2>
          
          <div className="space-y-2 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${
                filter === 'all' ? 'bg-blue-500/20 text-blue-300' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Inbox className="h-4 w-4" />
                <span>All Mail</span>
              </div>
              <span className="text-xs">{stats.totalEmails}</span>
            </button>

            <button
              onClick={() => setFilter('unread')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${
                filter === 'unread' ? 'bg-blue-500/20 text-blue-300' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Unread</span>
              </div>
              <span className="text-xs">{stats.unreadEmails}</span>
            </button>

            <button
              onClick={() => setFilter('starred')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${
                filter === 'starred' ? 'bg-blue-500/20 text-blue-300' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4" />
                <span>Starred</span>
              </div>
              <span className="text-xs">{stats.starredEmails}</span>
            </button>
          </div>

          {Object.keys(stats.categories).length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4 mt-6">Categories</h2>
              <div className="space-y-2">
                {Object.entries(stats.categories).map(([category, count]) => (
                  <button
                    key={category}
                    onClick={() => setFilter(category)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${
                      filter === category ? 'bg-blue-500/20 text-blue-300' : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4" />
                      <span className="capitalize">{category}</span>
                    </div>
                    <span className="text-xs">{count}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Email List */}
        <div className="w-96 border-r border-white/10 overflow-y-auto">
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchEmails()}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {emails.length === 0 ? (
              <div className="p-8 text-center">
                <Mail className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No emails found</p>
                <button
                  onClick={handleSync}
                  className="mt-4 text-blue-400 hover:text-blue-300"
                >
                  Sync emails
                </button>
              </div>
            ) : (
              emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`p-4 cursor-pointer hover:bg-white/5 ${
                    !email.is_read ? 'bg-blue-500/5' : ''
                  } ${
                    selectedEmail?.id === email.id ? 'bg-white/10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`font-semibold ${!email.is_read ? 'text-white' : 'text-gray-300'}`}>
                          {email.from_name || email.from_email}
                        </span>
                        {!email.is_read && (
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                        )}
                      </div>
                      <p className={`text-sm ${!email.is_read ? 'text-white' : 'text-gray-400'} truncate`}>
                        {email.subject}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {email.snippet}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className="text-xs text-gray-400">
                        {formatDate(email.received_at)}
                      </span>
                      {email.is_starred && (
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Email Detail */}
        <div className="flex-1 overflow-y-auto bg-white/5">
          {selectedEmail ? (
            <div className="p-6 max-w-4xl mx-auto">
              {/* Email Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedEmail.subject}</h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>{selectedEmail.from_name || selectedEmail.from_email}</span>
                    <span>•</span>
                    <span>{new Date(selectedEmail.received_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleStar(selectedEmail.id, !selectedEmail.is_starred)}
                    className="p-2 hover:bg-white/10 rounded-lg"
                  >
                    <Star className={`h-5 w-5 ${selectedEmail.is_starred ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} />
                  </button>
                  <button
                    onClick={() => handleMarkRead(selectedEmail.id, !selectedEmail.is_read)}
                    className="p-2 hover:bg-white/10 rounded-lg"
                  >
                    <Mail className="h-5 w-5 text-gray-400" />
                  </button>
                  <button className="p-2 hover:bg-white/10 rounded-lg">
                    <MoreVertical className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* AI Insights Banner */}
              {aiSuggestions?.category && (
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <Brain className="h-5 w-5 text-purple-400" />
                    <span className="font-semibold text-white">AI Insights</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm capitalize">
                      {aiSuggestions.category.category}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      aiSuggestions.category.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                      aiSuggestions.category.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>
                      {aiSuggestions.category.priority} priority
                    </span>
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm capitalize">
                      {aiSuggestions.category.sentiment}
                    </span>
                  </div>
                </div>
              )}

              {/* Spam Warning */}
              {aiSuggestions?.spamCheck?.isSpam && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-red-400" />
                    <span className="font-semibold text-red-300">Spam Detected</span>
                  </div>
                  <p className="text-sm text-red-200 mt-2">{aiSuggestions.spamCheck.recommendation}</p>
                </div>
              )}

              {/* Email Content */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
                <p className="text-gray-300 whitespace-pre-wrap">{selectedEmail.snippet}</p>
              </div>

              {/* AI Summary */}
              {aiSuggestions?.summary && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Lightbulb className="h-5 w-5 text-yellow-400" />
                    <span className="font-semibold text-white">AI Summary</span>
                  </div>
                  <p className="text-gray-300 mb-4">{aiSuggestions.summary.summary}</p>
                  
                  {aiSuggestions.summary.keyPoints && aiSuggestions.summary.keyPoints.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-400 mb-2">Key Points:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {aiSuggestions.summary.keyPoints.map((point, idx) => (
                          <li key={idx} className="text-sm text-gray-300">{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiSuggestions.summary.actionItems && aiSuggestions.summary.actionItems.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-400 mb-2">Action Items:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {aiSuggestions.summary.actionItems.map((action, idx) => (
                          <li key={idx} className="text-sm text-green-300">{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* AI Draft Replies */}
              {showAIPanel && (
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-5 w-5 text-blue-400" />
                      <span className="font-semibold text-white">AI Draft Replies</span>
                    </div>
                    <select
                      value={selectedTone}
                      onChange={(e) => {
                        const newTone = e.target.value as typeof selectedTone;
                        setSelectedTone(newTone);
                        generateDraftReplies(selectedEmail.id, newTone);
                      }}
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="friendly">Friendly</option>
                      <option value="brief">Brief</option>
                    </select>
                  </div>

                  {loadingAI ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                      <span className="ml-2 text-gray-400">Generating AI replies...</span>
                    </div>
                  ) : aiSuggestions?.drafts && aiSuggestions.drafts.length > 0 ? (
                    <div className="space-y-4">
                      {aiSuggestions.drafts.map((draft, index) => (
                        <div key={draft.id || index} className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-semibold text-blue-300 uppercase">
                              {draft.type || `Option ${index + 1}`}
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleUseAIDraft(draft.draft_body)}
                                className="flex items-center space-x-1 px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded text-xs"
                              >
                                <Send className="h-3 w-3" />
                                <span>Use This</span>
                              </button>
                              <button
                                onClick={() => copyToClipboard(draft.draft_body)}
                                className="flex items-center space-x-1 px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-xs"
                              >
                                <Copy className="h-3 w-3" />
                                <span>Copy</span>
                              </button>
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm whitespace-pre-wrap">{draft.draft_body}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              Confidence: {Math.round((draft.confidence_score || 0) * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">No draft replies generated yet.</p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-4 mb-6">
                <button 
                  onClick={() => setShowReplyComposer(!showReplyComposer)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <Reply className="h-4 w-4" />
                  <span>{showReplyComposer ? 'Hide Reply' : 'Reply'}</span>
                </button>
                <button 
                  onClick={() => setShowForwardComposer(!showForwardComposer)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
                >
                  <Forward className="h-4 w-4" />
                  <span>{showForwardComposer ? 'Hide Forward' : 'Forward'}</span>
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
                {!showAIPanel && (
                  <button
                    onClick={() => fetchAISuggestions(selectedEmail.id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Get AI Help</span>
                  </button>
                )}
              </div>

              {/* Reply Composer */}
              {showReplyComposer && (
                <div id="reply-composer" className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-6 mb-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Reply className="h-5 w-5 text-green-400" />
                    <span className="font-semibold text-white">Reply to {selectedEmail.from_name || selectedEmail.from_email}</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Your Reply</label>
                      <textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Type your reply here... Or use an AI-generated draft above!"
                        className="w-full h-40 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        💡 Tip: Click "Use This" on any AI draft above to auto-fill this reply
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setShowReplyComposer(false);
                            setReplyBody('');
                          }}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSendReply}
                          disabled={sendingReply || !replyBody.trim()}
                          className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold"
                        >
                          {sendingReply ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              <span>Send Reply</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Forward Composer */}
              {showForwardComposer && (
                <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/20 rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Forward className="h-5 w-5 text-orange-400" />
                    <span className="font-semibold text-white">Forward: {selectedEmail.subject}</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">To *</label>
                      <input
                        type="email"
                        value={forwardTo}
                        onChange={(e) => setForwardTo(e.target.value)}
                        placeholder="recipient@example.com (separate multiple with commas)"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">CC (optional)</label>
                      <input
                        type="email"
                        value={forwardCc}
                        onChange={(e) => setForwardCc(e.target.value)}
                        placeholder="cc@example.com"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">BCC (optional)</label>
                      <input
                        type="email"
                        value={forwardBcc}
                        onChange={(e) => setForwardBcc(e.target.value)}
                        placeholder="bcc@example.com"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Add a message (optional)</label>
                      <textarea
                        value={forwardMessage}
                        onChange={(e) => setForwardMessage(e.target.value)}
                        placeholder="Add your message here (original email will be included below)..."
                        className="w-full h-32 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
                      />
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <p className="text-xs text-gray-400 mb-2">Original message will be included:</p>
                      <p className="text-sm text-gray-300">
                        <strong>From:</strong> {selectedEmail.from_name || selectedEmail.from_email}<br/>
                        <strong>Date:</strong> {new Date(selectedEmail.received_at).toLocaleString()}<br/>
                        <strong>Subject:</strong> {selectedEmail.subject}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        📧 Forward with CC/BCC support
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setShowForwardComposer(false);
                            setForwardTo('');
                            setForwardCc('');
                            setForwardBcc('');
                            setForwardMessage('');
                          }}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSendForward}
                          disabled={sendingForward || !forwardTo.trim()}
                          className="flex items-center space-x-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold"
                        >
                          {sendingForward ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Forwarding...</span>
                            </>
                          ) : (
                            <>
                              <Forward className="h-4 w-4" />
                              <span>Send Forward</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Mail className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Select an email to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose New Email Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="h-6 w-6 text-white" />
                  <h2 className="text-xl font-bold text-white">Compose New Email</h2>
                </div>
                <button
                  onClick={() => {
                    setShowComposeModal(false);
                    setComposeTo('');
                    setComposeCc('');
                    setComposeBcc('');
                    setComposeSubject('');
                    setComposeBody('');
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">To *</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="recipient@example.com (separate multiple with commas)"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">CC (optional)</label>
                <input
                  type="email"
                  value={composeCc}
                  onChange={(e) => setComposeCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">BCC (optional)</label>
                <input
                  type="email"
                  value={composeBcc}
                  onChange={(e) => setComposeBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Subject *</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Email subject"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Message *</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message here..."
                  className="w-full h-64 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <p className="text-xs text-gray-400">
                  📧 All fields marked with * are required
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowComposeModal(false);
                      setComposeTo('');
                      setComposeCc('');
                      setComposeBcc('');
                      setComposeSubject('');
                      setComposeBody('');
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendCompose}
                    disabled={sendingCompose || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()}
                    className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold"
                  >
                    {sendingCompose ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartInbox;

