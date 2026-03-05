import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  Layout,
  Image as ImageIcon,
  Video,
  FileText,
  Grid,
  BookOpen,
  Check,
  X,
  Eye
} from 'lucide-react';

interface PageTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  layout_type: string;
  preview_image_url?: string;
  template_structure: any;
  default_styles: any;
}

interface PageTemplateSelectorProps {
  projectId: string;
  chapterId: string;
  currentTemplate?: string;
  onTemplateSelect: (templateId: string, templateConfig?: any) => void;
  onClose: () => void;
}

const PageTemplateSelector: React.FC<PageTemplateSelectorProps> = ({
  projectId,
  chapterId,
  currentTemplate,
  onTemplateSelect,
  onClose
}) => {
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(currentTemplate || null);
  const [previewTemplate, setPreviewTemplate] = useState<PageTemplate | null>(null);

  const categories = [
    { id: 'all', name: 'All Templates', icon: Grid },
    { id: 'text', name: 'Text Only', icon: FileText },
    { id: 'image', name: 'With Images', icon: ImageIcon },
    { id: 'video', name: 'With Video', icon: Video },
    { id: 'catalog', name: 'Catalog', icon: BookOpen },
    { id: 'training', name: 'Training', icon: BookOpen },
    { id: 'mixed', name: 'Mixed Layout', icon: Layout }
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/content/ebook/templates') as any;
      if (response.success) {
        setTemplates(response.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        onTemplateSelect(selectedTemplate, {
          template_structure: template.template_structure,
          default_styles: template.default_styles
        });
        onClose();
      }
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.icon : Layout;
  };

  const getLayoutPreview = (template: PageTemplate) => {
    const structure = template.template_structure;
    if (!structure.sections) return null;

    return (
      <div className="w-full h-32 bg-gray-800 rounded border border-gray-700 p-2 flex items-center justify-center">
        <div className="w-full h-full flex flex-wrap gap-1">
          {structure.sections.map((section: any, idx: number) => {
            if (section.type === 'image') {
              return (
                <div
                  key={idx}
                  className="bg-purple-600/30 border border-purple-500/50 rounded flex items-center justify-center"
                  style={{ width: section.width || '100%' }}
                >
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                </div>
              );
            } else if (section.type === 'video') {
              return (
                <div
                  key={idx}
                  className="bg-red-600/30 border border-red-500/50 rounded flex items-center justify-center"
                  style={{ width: section.width || '100%' }}
                >
                  <Video className="w-4 h-4 text-red-400" />
                </div>
              );
            } else if (section.type === 'text') {
              return (
                <div
                  key={idx}
                  className="bg-gray-700 border border-gray-600 rounded flex items-center justify-center"
                  style={{ width: section.width || '100%' }}
                >
                  <FileText className="w-3 h-3 text-gray-400" />
                </div>
              );
            } else if (section.type === 'gallery') {
              return (
                <div
                  key={idx}
                  className="bg-blue-600/30 border border-blue-500/50 rounded flex items-center justify-center"
                  style={{ width: '100%' }}
                >
                  <Grid className="w-4 h-4 text-blue-400" />
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Page Templates</h2>
            <p className="text-sm text-gray-400 mt-1">
              Choose a template to structure your chapter pages
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Category Sidebar */}
          <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Categories</h3>
            <div className="space-y-1">
              {categories.map(category => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading templates...</div>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">No templates found</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => {
                  const isSelected = selectedTemplate === template.id;
                  const CategoryIcon = getCategoryIcon(template.category);

                  return (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`relative bg-gray-800 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-900/20'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-purple-600 rounded-full p-1">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}

                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 bg-gray-700 rounded">
                          <CategoryIcon className="w-5 h-5 text-gray-300" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{template.name}</h4>
                          <p className="text-xs text-gray-400 mt-1">{template.description}</p>
                        </div>
                      </div>

                      {/* Layout Preview */}
                      {getLayoutPreview(template)}

                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                        <span className="px-2 py-1 bg-gray-700 rounded">
                          {template.layout_type}
                        </span>
                        <span className="px-2 py-1 bg-gray-700 rounded">
                          {template.category}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {selectedTemplate && (
              <span>
                Selected: <span className="text-white font-medium">
                  {templates.find(t => t.id === selectedTemplate)?.name}
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Apply Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageTemplateSelector;

