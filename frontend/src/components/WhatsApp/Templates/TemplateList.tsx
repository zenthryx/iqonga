import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, CheckCircle, Clock, XCircle, RefreshCw, Eye, X } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { WhatsAppTemplate } from '../../../types/whatsapp';
import TemplatePreview from './TemplatePreview';

const TemplateList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ['whatsapp-templates', search, statusFilter, categoryFilter],
    queryFn: () => whatsappApi.getTemplates({
      search,
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      limit: 50,
    }),
  });

  const templates = (data as any)?.data || [];
  const total = (data as any)?.total || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs font-medium">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Templates</h1>
        <div className="flex gap-3">
          <button
            onClick={() => refetch()}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Sync
          </button>
          <Link
            to="/whatsapp/templates/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Template
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Category</option>
            <option value="MARKETING">MARKETING</option>
            <option value="UTILITY">UTILITY</option>
            <option value="AUTHENTICATION">AUTHENTICATION</option>
          </select>
        </div>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <div className="text-gray-400 mb-4">No templates found</div>
          <Link
            to="/whatsapp/templates/new"
            className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create your first template
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template: WhatsAppTemplate) => (
            <div
              key={template.id}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">{template.template_name}</h3>
                    {getStatusBadge(template.status)}
                  </div>
                  <div className="text-gray-400 text-sm space-y-1">
                    <div>Category: {template.category} | Language: {template.language}</div>
                    {template.status === 'rejected' && template.rejection_reason && (
                      <div className="text-red-400 text-xs">
                        Rejection reason: {template.rejection_reason}
                      </div>
                    )}
                    <div>Created: {new Date(template.created_at).toLocaleDateString()}</div>
                  </div>
                  {template.body_text && (
                    <div className="mt-3 text-gray-300 text-sm line-clamp-2">
                      {template.body_text.substring(0, 100)}...
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <Link
                    to={`/whatsapp/templates/${template.id}`}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    View
                  </Link>
                  {template.status === 'draft' && (
                    <Link
                      to={`/whatsapp/templates/${template.id}/edit`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                      Edit
                    </Link>
                  )}
                  {template.status === 'approved' && (
                    <Link
                      to="/whatsapp/campaigns/new"
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                      Use in Campaign
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 50 && (
        <div className="text-center text-gray-400">
          Showing {templates.length} of {total} templates
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">Template Preview</h2>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <TemplatePreview template={previewTemplate} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateList;
