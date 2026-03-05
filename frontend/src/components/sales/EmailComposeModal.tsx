import React, { useState, useEffect } from 'react';
import { X, Send, Mail, FileText, User, Building2, Loader2 } from 'lucide-react';
import salesEmailApi, { EmailTemplate, SendEmailData } from '@/services/salesEmailApi';
import { toast } from 'react-hot-toast';

interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId?: string;
  dealId?: string;
  recipientEmail?: string;
  recipientName?: string;
  companyName?: string;
  leadData?: any;
  dealData?: any;
  onEmailSent?: () => void;
}

const EmailComposeModal: React.FC<EmailComposeModalProps> = ({
  isOpen,
  onClose,
  leadId,
  dealId,
  recipientEmail = '',
  recipientName = '',
  companyName = '',
  leadData,
  dealData,
  onEmailSent
}) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  
  const [to, setTo] = useState(recipientEmail);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [useTracking, setUseTracking] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Load templates and email accounts
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadEmailAccounts();
    }
  }, [isOpen]);

  // Update recipient email when prop changes
  useEffect(() => {
    setTo(recipientEmail);
  }, [recipientEmail]);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const data = await salesEmailApi.getTemplates({ isActive: true });
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadEmailAccounts = async () => {
    try {
      // Load user's email accounts from email connections
      const response = await fetch('/api/email-connections', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const accounts = result.data || [];
        setEmailAccounts(accounts);
        
        // Auto-select first account
        if (accounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(accounts[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load email accounts:', error);
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    try {
      setSelectedTemplateId(templateId);
      
      if (!templateId) {
        return;
      }

      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      // Prepare data for token replacement
      const tokenData = {
        first_name: leadData?.first_name || dealData?.contact_name?.split(' ')[0] || '',
        last_name: leadData?.last_name || dealData?.contact_name?.split(' ').slice(1).join(' ') || '',
        email: recipientEmail,
        company_name: companyName || leadData?.company_name || dealData?.company_name || '',
        job_title: leadData?.job_title || '',
        phone: leadData?.phone || '',
        sender_name: '', // Will be filled from user profile
        sender_email: emailAccounts.find(a => a.id === selectedAccountId)?.email_address || '',
        sender_company: '', // Will be filled from company profile
        sender_phone: ''
      };

      // Replace tokens in subject and body
      const replacedSubject = salesEmailApi.replaceTokens(template.subject, tokenData);
      const replacedBody = salesEmailApi.replaceTokens(template.body_html, tokenData);

      setSubject(replacedSubject);
      setBody(replacedBody);
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  const handleSend = async () => {
    try {
      // Validation
      if (!selectedAccountId) {
        toast.error('Please select an email account');
        return;
      }

      if (!to) {
        toast.error('Please enter recipient email');
        return;
      }

      if (!subject) {
        toast.error('Please enter email subject');
        return;
      }

      if (!body) {
        toast.error('Please enter email body');
        return;
      }

      if (!leadId && !dealId) {
        toast.error('Email must be associated with a lead or deal');
        return;
      }

      setLoading(true);

      const emailData: SendEmailData = {
        leadId,
        dealId,
        emailAccountId: selectedAccountId,
        templateId: selectedTemplateId || undefined,
        to,
        cc: cc ? cc.split(',').map(e => e.trim()) : undefined,
        bcc: bcc ? bcc.split(',').map(e => e.trim()) : undefined,
        subject,
        bodyHtml: body,
        useTracking
      };

      await salesEmailApi.sendEmail(emailData);

      // Success
      toast.success('Email sent successfully!');
      
      if (onEmailSent) {
        onEmailSent();
      }

      // Reset and close
      handleClose();
    } catch (error: any) {
      console.error('Failed to send email:', error);
      toast.error(error.response?.data?.message || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedTemplateId('');
    setTo(recipientEmail);
    setCc('');
    setBcc('');
    setSubject('');
    setBody('');
    setUseTracking(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <Mail className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">
                Send Email
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              {/* Email Account Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  From (Email Account)
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select email account...</option>
                  {emailAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.email_address} ({account.provider})
                    </option>
                  ))}
                </select>
                {emailAccounts.length === 0 && (
                  <p className="text-xs text-yellow-400 mt-1">
                    No email accounts connected. Please connect an email account in Smart Inbox first.
                  </p>
                )}
              </div>

              {/* Template Selection */}
              <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Email Template (Optional)
              </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  disabled={loadingTemplates}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">No template (compose from scratch)</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.template_name} ({template.template_category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Info Display */}
              {(recipientName || companyName) && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-sm">
                    {recipientName && (
                      <div className="flex items-center text-blue-300">
                        <User className="w-4 h-4 mr-1" />
                        {recipientName}
                      </div>
                    )}
                    {companyName && (
                      <div className="flex items-center text-blue-300">
                        <Building2 className="w-4 h-4 mr-1" />
                        {companyName}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* To */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  To *
                </label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* CC & BCC */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    CC (comma separated)
                  </label>
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="cc@example.com, cc2@example.com"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    BCC (comma separated)
                  </label>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="bcc@example.com"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message *
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Email body (HTML supported)"
                  rows={12}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  HTML is supported. Use templates for pre-formatted emails.
                </p>
              </div>

              {/* Tracking Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useTracking"
                  checked={useTracking}
                  onChange={(e) => setUseTracking(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="useTracking" className="text-sm text-gray-300">
                  Enable email tracking (opens and clicks)
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-700 bg-gray-750">
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !selectedAccountId || !to || !subject || !body}
              className="inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailComposeModal;

