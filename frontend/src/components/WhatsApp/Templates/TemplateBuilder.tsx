import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { CreateTemplateForm, WhatsAppTemplateButton } from '../../../types/whatsapp';
import toast from 'react-hot-toast';

const TemplateBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState<CreateTemplateForm>({
    wabaId: '',
    templateName: '',
    category: 'MARKETING',
    language: 'en',
    headerType: undefined,
    headerContent: '',
    bodyText: '',
    footerText: '',
    buttons: [],
    variables: [],
  });

  const [buttonText, setButtonText] = useState('');
  const [buttonType, setButtonType] = useState<'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'>('QUICK_REPLY');
  const [buttonUrl, setButtonUrl] = useState('');
  const [buttonPhone, setButtonPhone] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: CreateTemplateForm) => whatsappApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template created successfully');
      navigate('/whatsapp/templates');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create template');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.templateName || !formData.bodyText) {
      toast.error('Template name and body text are required');
      return;
    }

    createMutation.mutate(formData);
  };

  const handleAddButton = () => {
    if (!buttonText.trim()) {
      toast.error('Button text is required');
      return;
    }

    const newButton: WhatsAppTemplateButton = {
      type: buttonType,
      text: buttonText,
    };

    if (buttonType === 'URL' && buttonUrl) {
      newButton.url = buttonUrl;
    }

    if (buttonType === 'PHONE_NUMBER' && buttonPhone) {
      newButton.phoneNumber = buttonPhone;
    }

    setFormData({
      ...formData,
      buttons: [...(formData.buttons || []), newButton],
    });

    setButtonText('');
    setButtonUrl('');
    setButtonPhone('');
  };

  const handleRemoveButton = (index: number) => {
    setFormData({
      ...formData,
      buttons: formData.buttons?.filter((_, i) => i !== index) || [],
    });
  };

  const handleAddVariable = () => {
    setFormData({
      ...formData,
      variables: [...(formData.variables || []), { example: '' }],
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/whatsapp/templates')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Templates
      </button>

      <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
        <h1 className="text-3xl font-bold text-white mb-8">
          {isEditing ? 'Edit Template' : 'Create Message Template'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white font-medium mb-2">
                Template Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.templateName}
                onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                placeholder="welcome_message"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              />
              <p className="text-gray-500 text-sm mt-1">Alphanumeric and underscores only</p>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="MARKETING">MARKETING</option>
                <option value="UTILITY">UTILITY</option>
                <option value="AUTHENTICATION">AUTHENTICATION</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">
              Language <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="en">English (en)</option>
              <option value="es">Spanish (es)</option>
              <option value="fr">French (fr)</option>
            </select>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Header Type</label>
            <select
              value={formData.headerType || 'none'}
              onChange={(e) => setFormData({ 
                ...formData, 
                headerType: e.target.value === 'none' ? undefined : e.target.value as any 
              })}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="none">None</option>
              <option value="TEXT">Text</option>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
              <option value="DOCUMENT">Document</option>
            </select>
          </div>

          {formData.headerType && (
            <div>
              <label className="block text-white font-medium mb-2">Header Content</label>
              <input
                type="text"
                value={formData.headerContent || ''}
                onChange={(e) => setFormData({ ...formData, headerContent: e.target.value })}
                placeholder={formData.headerType === 'TEXT' ? 'Header text' : 'Media URL or handle'}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-white font-medium mb-2">
              Body Text <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.bodyText}
              onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
              placeholder="Hello {{1}}, welcome to our service!"
              rows={6}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
              required
            />
            <p className="text-gray-500 text-sm mt-1">Use {'{{1}}'}, {'{{2}}'}, etc. for variables</p>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Footer Text</label>
            <input
              type="text"
              value={formData.footerText || ''}
              onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
              placeholder="Thank you for choosing us!"
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Buttons */}
          <div>
            <label className="block text-white font-medium mb-2">Buttons</label>
            <div className="space-y-2 mb-3">
              {formData.buttons?.map((button, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-700 rounded-lg p-3">
                  <span className="text-gray-300 text-sm flex-1">
                    {button.type}: {button.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveButton(idx)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <select
                value={buttonType}
                onChange={(e) => setButtonType(e.target.value as any)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="QUICK_REPLY">Quick Reply</option>
                <option value="URL">URL</option>
                <option value="PHONE_NUMBER">Phone Number</option>
              </select>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="Button text"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              {buttonType === 'URL' && (
                <input
                  type="url"
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  placeholder="URL"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              )}
              {buttonType === 'PHONE_NUMBER' && (
                <input
                  type="tel"
                  value={buttonPhone}
                  onChange={(e) => setButtonPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              )}
              <button
                type="button"
                onClick={handleAddButton}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Add Button
              </button>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/whatsapp/templates')}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Creating...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateBuilder;
