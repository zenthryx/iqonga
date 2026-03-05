import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, Inbox, Send, Star, Archive, Trash2, RefreshCw,
  Search, ChevronLeft, ChevronRight, MoreHorizontal,
  Tag, Sparkles, MessageSquare, FileText, AlertTriangle,
  Clock, User, Paperclip, Reply, Forward, X, Check,
  Filter, SortAsc, SortDesc, FolderOpen, Loader2,
  Zap, Brain, Shield, Plus, Edit3, Settings, ArrowLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/api';

interface Email {
  id: number;
  message_id: string;
  from_email: string;
  from_name: string;
  to_email: string;
  subject: string;
  snippet: string;
  body_text: string;
  body_html: string;
  received_at: string;
  is_read: boolean;
  is_starred: boolean;
  is_spam: boolean;
  has_attachments: boolean;
  ai_category?: string;
  ai_priority?: string;
  ai_sentiment?: string;
  ai_summary?: string;
  ai_labels?: string[];
}

interface EmailAccount {
  id: number;
  email_address: string;
  display_name: string;
  provider: string;
  connection_type: string;
}

interface DraftReply {
  id: number;
  draft_body: string;
  tone: string;
  confidence_score: number;
}

interface UnifiedInboxProps {
  accounts: EmailAccount[];
  onRefresh?: () => void;
  onManageConnections?: () => void;
}

const categoryColors: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  followup: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  work: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  personal: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  newsletter: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  promotional: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  social: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  spam: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
};

const priorityColors: Record<string, string> = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
  low: 'text-green-400'
};

export const UnifiedInbox: React.FC<UnifiedInboxProps> = ({ accounts, onRefresh, onManageConnections }) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState('INBOX');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // AI Features state
  const [generatingDrafts, setGeneratingDrafts] = useState(false);
  const [draftReplies, setDraftReplies] = useState<DraftReply[]>([]);
  const [summarizing, setSummarizing] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<string>('');
  
  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'forward'>('new');
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);

  // Set initial account
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts, selectedAccount]);

  // Fetch emails when account changes
  useEffect(() => {
    if (selectedAccount) {
      fetchEmails();
    }
  }, [selectedAccount, currentFolder]);

  const fetchEmails = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const response = await apiService.get(`/email-connections/${selectedAccount.id}/messages?limit=100&folder=${currentFolder}`);
      if (response.success) {
        // API returns { data: { emails: [...] } } or { data: [...] }
        const emailsData = response.data?.emails || response.data || [];
        setEmails(Array.isArray(emailsData) ? emailsData : []);
      }
    } catch (error: any) {
      toast.error('Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  };

  const syncEmails = async (days: number = 30) => {
    if (!selectedAccount) return;
    setSyncing(true);
    const toastId = toast.loading(`Syncing emails from last ${days} days...`);
    try {
      const response = await apiService.post(`/email-connections/${selectedAccount.id}/sync`, {
        folder: currentFolder,
        days,
        limit: 100
      });
      if (response.success) {
        const syncData = response.data || {};
        toast.success(`Synced ${syncData.synced || 0} emails`, { id: toastId });
        await fetchEmails();
      }
    } catch (error: any) {
      toast.error('Sync failed', { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  const markAsRead = async (email: Email, isRead: boolean, showError = true) => {
    if (!selectedAccount) return;
    
    // Optimistic UI update first
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_read: isRead } : e));
    if (selectedEmail?.id === email.id) {
      setSelectedEmail({ ...selectedEmail, is_read: isRead });
    }
    
    try {
      await apiService.patch(`/email-connections/${selectedAccount.id}/messages/${email.id}/read`, { is_read: isRead });
    } catch (error) {
      // Revert on failure
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_read: !isRead } : e));
      if (selectedEmail?.id === email.id) {
        setSelectedEmail({ ...selectedEmail, is_read: !isRead });
      }
      if (showError) {
        toast.error('Failed to update email');
      }
      console.error('Failed to mark email as read:', error);
    }
  };

  const toggleStar = async (email: Email) => {
    if (!selectedAccount) return;
    const newStarred = !email.is_starred;
    
    // Optimistic UI update first
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_starred: newStarred } : e));
    if (selectedEmail?.id === email.id) {
      setSelectedEmail({ ...selectedEmail, is_starred: newStarred });
    }
    
    try {
      await apiService.patch(`/email-connections/${selectedAccount.id}/messages/${email.id}/star`, { is_starred: newStarred });
    } catch (error) {
      // Revert on failure
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_starred: !newStarred } : e));
      if (selectedEmail?.id === email.id) {
        setSelectedEmail({ ...selectedEmail, is_starred: !newStarred });
      }
      toast.error('Failed to update email');
      console.error('Failed to toggle star:', error);
    }
  };

  // AI Features
  const generateDrafts = async (tone: string = 'professional') => {
    if (!selectedAccount || !selectedEmail) return;
    setGeneratingDrafts(true);
    const toastId = toast.loading('Generating AI draft replies...');
    try {
      const response = await apiService.post(
        `/email-connections/${selectedAccount.id}/messages/${selectedEmail.id}/drafts`,
        { tone }
      );
      if (response.success) {
        const drafts = response.data || [];
        setDraftReplies(Array.isArray(drafts) ? drafts : []);
        toast.success(`Generated ${drafts.length || 0} draft replies`, { id: toastId });
      }
    } catch (error: any) {
      if (error.response?.status === 402) {
        toast.error('Insufficient credits', { id: toastId });
      } else {
        toast.error('Failed to generate drafts', { id: toastId });
      }
    } finally {
      setGeneratingDrafts(false);
    }
  };

  const summarizeEmail = async () => {
    if (!selectedAccount || !selectedEmail) return;
    setSummarizing(true);
    const toastId = toast.loading('Generating AI summary...');
    try {
      const response = await apiService.post(
        `/email-connections/${selectedAccount.id}/messages/${selectedEmail.id}/summarize`
      );
      if (response.success) {
        setSelectedEmail({ ...selectedEmail, ai_summary: response.data.summary });
        setEmails(emails.map(e => e.id === selectedEmail.id ? { ...e, ai_summary: response.data.summary } : e));
        toast.success('Summary generated', { id: toastId });
      }
    } catch (error: any) {
      if (error.response?.status === 402) {
        toast.error('Insufficient credits', { id: toastId });
      } else {
        toast.error('Failed to summarize', { id: toastId });
      }
    } finally {
      setSummarizing(false);
    }
  };

  const categorizeEmail = async () => {
    if (!selectedAccount || !selectedEmail) return;
    setCategorizing(true);
    const toastId = toast.loading('AI categorizing email...');
    try {
      const response = await apiService.post(
        `/email-connections/${selectedAccount.id}/messages/${selectedEmail.id}/categorize`
      );
      if (response.success) {
        const { category, priority, sentiment } = response.data;
        setSelectedEmail({ ...selectedEmail, ai_category: category, ai_priority: priority, ai_sentiment: sentiment });
        setEmails(emails.map(e => e.id === selectedEmail.id ? { ...e, ai_category: category, ai_priority: priority, ai_sentiment: sentiment } : e));
        toast.success(`Categorized as ${category}`, { id: toastId });
      }
    } catch (error: any) {
      if (error.response?.status === 402) {
        toast.error('Insufficient credits', { id: toastId });
      } else {
        toast.error('Failed to categorize', { id: toastId });
      }
    } finally {
      setCategorizing(false);
    }
  };

  const batchCategorize = async () => {
    if (!selectedAccount) return;
    const toastId = toast.loading('AI categorizing emails...');
    try {
      const response = await apiService.post(
        `/email-connections/${selectedAccount.id}/batch-categorize`,
        { limit: 10 }
      );
      if (response.success) {
        toast.success(`Categorized ${response.data.categorized} emails`, { id: toastId });
        await fetchEmails();
      }
    } catch (error: any) {
      if (error.response?.status === 402) {
        toast.error('Insufficient credits', { id: toastId });
      } else {
        toast.error('Failed to batch categorize', { id: toastId });
      }
    }
  };

  // Compose & Reply
  const startReply = () => {
    if (!selectedEmail) return;
    setComposeMode('reply');
    setComposeTo(selectedEmail.from_email);
    setComposeSubject(`Re: ${selectedEmail.subject}`);
    setComposeBody(selectedDraft || `\n\n---\nOn ${new Date(selectedEmail.received_at).toLocaleDateString()}, ${selectedEmail.from_name || selectedEmail.from_email} wrote:\n> ${selectedEmail.snippet}`);
    setShowCompose(true);
  };

  const startForward = () => {
    if (!selectedEmail) return;
    setComposeMode('forward');
    setComposeTo('');
    setComposeSubject(`Fwd: ${selectedEmail.subject}`);
    setComposeBody(`\n\n---\nForwarded message:\nFrom: ${selectedEmail.from_email}\nDate: ${new Date(selectedEmail.received_at).toLocaleDateString()}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body_text || selectedEmail.snippet}`);
    setShowCompose(true);
  };

  const startNewEmail = () => {
    setComposeMode('new');
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    setShowCompose(true);
  };

  const sendEmail = async () => {
    if (!selectedAccount || !composeTo) return;
    setSending(true);
    const toastId = toast.loading('Sending email...');
    try {
      if (composeMode === 'reply' && selectedEmail) {
        await apiService.post(`/email-connections/${selectedAccount.id}/reply`, {
          messageId: selectedEmail.id,
          text: composeBody,
          html: `<p>${composeBody.replace(/\n/g, '<br>')}</p>`
        });
      } else {
        await apiService.post(`/email-connections/${selectedAccount.id}/send`, {
          to: composeTo,
          subject: composeSubject,
          text: composeBody,
          html: `<p>${composeBody.replace(/\n/g, '<br>')}</p>`
        });
      }
      toast.success('Email sent!', { id: toastId });
      setShowCompose(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email', { id: toastId });
    } finally {
      setSending(false);
    }
  };

  // Filter & Sort emails
  const filteredEmails = emails
    .filter(email => {
      if (filterCategory !== 'all' && email.ai_category !== filterCategory) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          email.subject?.toLowerCase().includes(query) ||
          email.from_email?.toLowerCase().includes(query) ||
          email.from_name?.toLowerCase().includes(query) ||
          email.snippet?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.received_at).getTime();
      const dateB = new Date(b.received_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const unreadCount = emails.filter(e => !e.is_read).length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex h-full bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 bg-gray-800/50 border-r border-gray-700 flex flex-col">
        {/* Account Selector */}
        <div className="p-3 border-b border-gray-700">
          <select
            value={selectedAccount?.id || ''}
            onChange={(e) => {
              const acc = accounts.find(a => a.id === parseInt(e.target.value));
              setSelectedAccount(acc || null);
              setSelectedEmail(null);
            }}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.display_name || acc.email_address}
              </option>
            ))}
          </select>
        </div>

        {/* Compose Button */}
        <div className="p-3">
          <button
            onClick={startNewEmail}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Compose
          </button>
        </div>

        {/* Folders */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {[
            { name: 'Inbox', icon: Inbox, folder: 'INBOX', count: unreadCount },
            { name: 'Starred', icon: Star, folder: 'STARRED' },
            { name: 'Sent', icon: Send, folder: 'Sent' },
            { name: 'Drafts', icon: Edit3, folder: 'Drafts' },
            { name: 'Archive', icon: Archive, folder: 'Archive' },
            { name: 'Trash', icon: Trash2, folder: 'Trash' }
          ].map(item => (
            <button
              key={item.folder}
              onClick={() => setCurrentFolder(item.folder)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                currentFolder === item.folder
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4" />
                <span className="text-sm">{item.name}</span>
              </div>
              {item.count && item.count > 0 && (
                <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* AI Actions */}
        <div className="p-3 border-t border-gray-700">
          <p className="text-xs text-gray-500 mb-2 font-medium">AI ACTIONS</p>
          <button
            onClick={batchCategorize}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
          >
            <Brain className="h-4 w-4" />
            Auto-Categorize All
          </button>
        </div>

        {/* Manage Connections */}
        {onManageConnections && (
          <div className="p-3 border-t border-gray-700">
            <button
              onClick={onManageConnections}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <Settings className="h-4 w-4" />
              Manage Connections
            </button>
          </div>
        )}
      </div>

      {/* Email List */}
      <div className="w-80 border-r border-gray-700 flex flex-col bg-gray-800/30">
        {/* Search & Filter Bar */}
        <div className="p-3 border-b border-gray-700 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-300"
            >
              <option value="all">All Categories</option>
              <option value="urgent">🔴 Urgent</option>
              <option value="followup">🟠 Follow-up</option>
              <option value="work">🔵 Work</option>
              <option value="personal">🟣 Personal</option>
              <option value="newsletter">📰 Newsletter</option>
              <option value="promotional">🎯 Promotional</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="p-1.5 text-gray-400 hover:text-white rounded"
              title={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
            >
              {sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
            </button>
            <button
              onClick={() => syncEmails(30)}
              disabled={syncing}
              className="p-1.5 text-gray-400 hover:text-white rounded disabled:opacity-50"
              title="Sync emails"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Mail className="h-8 w-8 mb-2" />
              <p className="text-sm">No emails found</p>
            </div>
          ) : (
            filteredEmails.map(email => (
              <div
                key={email.id}
                onClick={() => {
                  setSelectedEmail(email);
                  setDraftReplies([]);
                  setSelectedDraft('');
                  // Silent mark-as-read (don't show error toast for automatic actions)
                  if (!email.is_read) markAsRead(email, true, false);
                }}
                className={`p-3 border-b border-gray-700/50 cursor-pointer transition-colors ${
                  selectedEmail?.id === email.id
                    ? 'bg-blue-500/10 border-l-2 border-l-blue-500'
                    : 'hover:bg-gray-700/30'
                } ${!email.is_read ? 'bg-gray-700/20' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleStar(email); }}
                    className={`mt-1 ${email.is_starred ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-400'}`}
                  >
                    <Star className="h-4 w-4" fill={email.is_starred ? 'currentColor' : 'none'} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${!email.is_read ? 'font-semibold text-white' : 'text-gray-300'}`}>
                        {email.from_name || email.from_email?.split('@')[0] || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(email.received_at)}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${!email.is_read ? 'font-medium text-gray-200' : 'text-gray-400'}`}>
                      {email.subject || '(No subject)'}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {email.snippet}
                    </p>
                    {/* AI Tags */}
                    <div className="flex items-center gap-1 mt-1.5">
                      {email.ai_category && (
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${categoryColors[email.ai_category] || 'bg-gray-500/20 text-gray-400'}`}>
                          {email.ai_category}
                        </span>
                      )}
                      {email.ai_priority && (
                        <span className={`text-xs ${priorityColors[email.ai_priority]}`}>
                          {email.ai_priority === 'high' && '🔥'}
                          {email.ai_priority === 'medium' && '⚡'}
                          {email.ai_priority === 'low' && '💤'}
                        </span>
                      )}
                      {email.has_attachments && (
                        <Paperclip className="h-3 w-3 text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Email Detail / Compose */}
      <div className="flex-1 flex flex-col bg-gray-800/20">
        {showCompose ? (
          /* Compose View */
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">
                {composeMode === 'new' ? 'New Message' : composeMode === 'reply' ? 'Reply' : 'Forward'}
              </h3>
              <button onClick={() => setShowCompose(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">To</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Message</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={12}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 flex justify-between">
              <button
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={sendEmail}
                disabled={sending || !composeTo}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
            </div>
          </div>
        ) : selectedEmail ? (
          /* Email Detail View */
          <div className="flex flex-col h-full">
            {/* Email Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-white mb-2">{selectedEmail.subject || '(No subject)'}</h2>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white font-medium">
                        {(selectedEmail.from_name || selectedEmail.from_email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {selectedEmail.from_name || selectedEmail.from_email}
                      </p>
                      <p className="text-xs text-gray-400">{selectedEmail.from_email}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(selectedEmail.received_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStar(selectedEmail)}
                    className={`p-2 rounded-lg ${selectedEmail.is_starred ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-400 hover:bg-gray-700'}`}
                  >
                    <Star className="h-5 w-5" fill={selectedEmail.is_starred ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>

              {/* AI Category Tags */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {selectedEmail.ai_category && (
                  <span className={`text-sm px-2 py-1 rounded border ${categoryColors[selectedEmail.ai_category]}`}>
                    <Tag className="h-3 w-3 inline mr-1" />
                    {selectedEmail.ai_category}
                  </span>
                )}
                {selectedEmail.ai_priority && (
                  <span className={`text-sm px-2 py-1 rounded border border-gray-600 ${priorityColors[selectedEmail.ai_priority]}`}>
                    Priority: {selectedEmail.ai_priority}
                  </span>
                )}
                {selectedEmail.ai_sentiment && (
                  <span className="text-sm px-2 py-1 rounded border border-gray-600 text-gray-300">
                    {selectedEmail.ai_sentiment === 'positive' ? '😊' : selectedEmail.ai_sentiment === 'negative' ? '😞' : '😐'} {selectedEmail.ai_sentiment}
                  </span>
                )}
              </div>
            </div>

            {/* AI Features Bar */}
            <div className="px-4 py-2 border-b border-gray-700 bg-gray-800/50">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 font-medium">AI Features:</span>
                <button
                  onClick={() => generateDrafts('professional')}
                  disabled={generatingDrafts}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 disabled:opacity-50"
                >
                  {generatingDrafts ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Generate Reply
                </button>
                <button
                  onClick={summarizeEmail}
                  disabled={summarizing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 disabled:opacity-50"
                >
                  {summarizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                  Summarize
                </button>
                <button
                  onClick={categorizeEmail}
                  disabled={categorizing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 disabled:opacity-50"
                >
                  {categorizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
                  Categorize
                </button>
              </div>
            </div>

            {/* AI Summary */}
            {selectedEmail.ai_summary && (
              <div className="mx-4 mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">AI Summary</span>
                </div>
                <p className="text-sm text-gray-300">{selectedEmail.ai_summary}</p>
              </div>
            )}

            {/* Email Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedEmail.body_html ? (
                <div 
                  className="prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                />
              ) : (
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">
                  {selectedEmail.body_text || selectedEmail.snippet}
                </pre>
              )}
            </div>

            {/* AI Draft Replies */}
            {draftReplies.length > 0 && (
              <div className="border-t border-gray-700 p-4 bg-gray-800/50">
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  AI-Generated Draft Replies
                </h4>
                <div className="space-y-2">
                  {draftReplies.map((draft, index) => (
                    <div
                      key={draft.id || index}
                      onClick={() => setSelectedDraft(draft.draft_body)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedDraft === draft.draft_body
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400 capitalize">{draft.tone || 'Professional'}</span>
                        <span className="text-xs text-green-400">
                          {Math.round((draft.confidence_score || 0.9) * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-3">{draft.draft_body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-700 flex items-center gap-3">
              <button
                onClick={startReply}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Reply className="h-4 w-4" />
                Reply
              </button>
              <button
                onClick={startForward}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
              >
                <Forward className="h-4 w-4" />
                Forward
              </button>
              <button
                onClick={() => markAsRead(selectedEmail, !selectedEmail.is_read)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
              >
                {selectedEmail.is_read ? <Mail className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {selectedEmail.is_read ? 'Mark Unread' : 'Mark Read'}
              </button>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Mail className="h-16 w-16 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Select an email to read</h3>
            <p className="text-sm text-gray-500">Choose an email from the list to view its contents</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedInbox;

