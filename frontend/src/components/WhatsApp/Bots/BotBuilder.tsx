import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bot, Save } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { CreateBotForm, WhatsAppTemplate } from '../../../types/whatsapp';
import toast from 'react-hot-toast';

const BotBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState<CreateBotForm>({
    wabaId: '',
    name: '',
    triggerType: 'keyword' as 'exact_match' | 'contains' | 'first_message' | 'keyword',
    triggerText: '',
    replyType: 'text',
    replyText: '',
    templateId: '',
    aiAgentId: '',
    headerText: '',
    footerText: '',
    buttons: [],
    isActive: true,
    priority: 0,
  });

  // Fetch accounts
  const { data: accountsData } = useQuery<any>({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => whatsappApi.getAccounts(),
  });

  const accounts = (accountsData as any)?.data?.accounts || [];

  // Fetch templates
  const { data: templatesData } = useQuery<any>({
    queryKey: ['whatsapp-templates', formData.wabaId],
    queryFn: () => whatsappApi.getTemplates({ wabaId: formData.wabaId, status: 'approved' }),
    enabled: !!formData.wabaId,
  });

  const templates = (templatesData as any)?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: CreateBotForm) => whatsappApi.createBot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-bots'] });
      toast.success('Bot created successfully');
      navigate('/whatsapp/bots');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create bot');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateBotForm>) => whatsappApi.updateBot(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-bots'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-bot', id] });
      toast.success('Bot updated successfully');
      navigate(`/whatsapp/bots/${id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update bot');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.wabaId || !formData.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate(isEditing ? `/whatsapp/bots/${id}` : '/whatsapp/bots')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <Bot className="w-8 h-8" />
          {isEditing ? 'Edit Bot' : 'Create New Bot'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white font-medium mb-2">
                WhatsApp Business Account <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.wabaId}
                onChange={(e) => setFormData({ ...formData, wabaId: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="">Select an account</option>
                {accounts.map((account: any) => (
                  <option key={account.id} value={account.waba_id}>
                    {account.account_name} ({account.phone_number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Bot Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Welcome Bot"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white font-medium mb-2">
                Trigger Type <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.triggerType}
                onChange={(e) => setFormData({ ...formData, triggerType: e.target.value as any })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="keyword">Keyword</option>
                <option value="exact_match">Exact Match</option>
                <option value="contains">Contains</option>
                <option value="first_message">First Message</option>
              </select>
            </div>

            {formData.triggerType !== 'first_message' && (
              <div>
                <label className="block text-white font-medium mb-2">
                  Trigger Text <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.triggerText || ''}
                  onChange={(e) => setFormData({ ...formData, triggerText: e.target.value })}
                  placeholder="hello, hi, help"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
                  required
                />
                <p className="text-gray-500 text-sm mt-1">
                  {formData.triggerType === 'keyword' && 'Comma-separated keywords'}
                  {formData.triggerType === 'exact_match' && 'Exact text to match'}
                  {formData.triggerType === 'contains' && 'Text that must be contained'}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-white font-medium mb-2">
              Reply Type <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.replyType}
              onChange={(e) => setFormData({ ...formData, replyType: e.target.value as any })}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="text">Text Message</option>
              <option value="template">Template Message</option>
              <option value="ai_agent">AI Agent</option>
              <option value="flow">Flow</option>
            </select>
          </div>

          {formData.replyType === 'text' && (
            <div>
              <label className="block text-white font-medium mb-2">Reply Text</label>
              <textarea
                value={formData.replyText || ''}
                onChange={(e) => setFormData({ ...formData, replyText: e.target.value })}
                placeholder="Hello! How can I help you today?"
                rows={6}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {formData.replyType === 'template' && (
            <div>
              <label className="block text-white font-medium mb-2">Template</label>
              <select
                value={formData.templateId || ''}
                onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select a template</option>
                {templates.map((template: WhatsAppTemplate) => (
                  <option key={template.id} value={template.id}>
                    {template.template_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.replyType === 'ai_agent' && (
            <div>
              <label className="block text-white font-medium mb-2">AI Agent ID</label>
              <input
                type="text"
                value={formData.aiAgentId || ''}
                onChange={(e) => setFormData({ ...formData, aiAgentId: e.target.value })}
                placeholder="Enter AI Agent ID"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white font-medium mb-2">Header Text (Optional)</label>
              <input
                type="text"
                value={formData.headerText || ''}
                onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                placeholder="Welcome!"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Footer Text (Optional)</label>
              <input
                type="text"
                value={formData.footerText || ''}
                onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                placeholder="Thank you!"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white font-medium mb-2">Priority</label>
              <input
                type="number"
                value={formData.priority || 0}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                min="0"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-gray-500 text-sm mt-1">Higher priority bots are checked first</p>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-white font-medium">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(isEditing ? `/whatsapp/bots/${id}` : '/whatsapp/bots')}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : isEditing
                ? 'Update Bot'
                : 'Create Bot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BotBuilder;
