import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  Image as ImageIcon,
  Loader,
  X,
  Sparkles,
  Palette,
  Type,
  Download,
  RefreshCw,
  Check
} from 'lucide-react';

interface CoverDesignerProps {
  projectId: string;
  projectTitle: string;
  projectDescription?: string;
  projectGenre?: string;
  currentCoverUrl?: string;
  onCoverGenerated: (coverUrl: string) => void;
  onClose: () => void;
}

interface CoverTemplate {
  id: string;
  name: string;
  description: string;
  style: string;
  colorScheme: string;
}

const CoverDesigner: React.FC<CoverDesignerProps> = ({
  projectId,
  projectTitle,
  projectDescription,
  projectGenre,
  currentCoverUrl,
  onCoverGenerated,
  onClose
}) => {
  const [templates, setTemplates] = useState<CoverTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('modern');
  const [selectedColorScheme, setSelectedColorScheme] = useState<string>('auto');
  const [author, setAuthor] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [generatedCovers, setGeneratedCovers] = useState<any[]>([]);

  const styles = [
    { value: 'modern', label: 'Modern', description: 'Clean, minimalist design' },
    { value: 'classic', label: 'Classic', description: 'Traditional, elegant design' },
    { value: 'artistic', label: 'Artistic', description: 'Creative, unique design' },
    { value: 'minimalist', label: 'Minimalist', description: 'Simple, clean lines' },
    { value: 'bold', label: 'Bold', description: 'Eye-catching, vibrant' },
    { value: 'professional', label: 'Professional', description: 'Corporate, business-oriented' }
  ];

  const colorSchemes = [
    { value: 'auto', label: 'Auto', description: 'Automatic based on genre' },
    { value: 'warm', label: 'Warm', description: 'Oranges, reds, yellows' },
    { value: 'cool', label: 'Cool', description: 'Blues, greens, purples' },
    { value: 'vibrant', label: 'Vibrant', description: 'Saturated, bold colors' },
    { value: 'muted', label: 'Muted', description: 'Pastel, soft colors' },
    { value: 'monochrome', label: 'Monochrome', description: 'Black and white' }
  ];

  useEffect(() => {
    fetchTemplates();
    fetchGeneratedCovers();
  }, [projectId]);

  const fetchTemplates = async () => {
    try {
      const response = await apiService.get('/content/ebook/cover-templates') as any;
      if (response.success && response.data) {
        setTemplates(response.data);
        if (response.data.length > 0) {
          setSelectedTemplate(response.data[0].id);
          setSelectedStyle(response.data[0].style);
          setSelectedColorScheme(response.data[0].colorScheme);
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchGeneratedCovers = async () => {
    try {
      const response = await apiService.get(`/content/ebook/projects/${projectId}/covers`) as any;
      if (response.success && response.data) {
        setGeneratedCovers(response.data);
      }
    } catch (error) {
      console.error('Error fetching covers:', error);
    }
  };

  const handleGenerate = async () => {
    if (!projectTitle.trim()) {
      toast.error('Project title is required');
      return;
    }

    setGenerating(true);
    try {
      const response = await apiService.post(`/content/ebook/projects/${projectId}/cover`, {
        title: projectTitle,
        subtitle: subtitle.trim() || undefined,
        author: author.trim() || undefined,
        genre: projectGenre || undefined,
        style: selectedStyle,
        colorScheme: selectedColorScheme,
        template: selectedTemplate || undefined,
        customPrompt: customPrompt.trim() || undefined
      }) as any;

      if (response.success && response.cover) {
        toast.success('Cover generated successfully!');
        onCoverGenerated(response.cover.url);
        fetchGeneratedCovers();
      } else {
        toast.error(response.error || 'Failed to generate cover');
      }
    } catch (error: any) {
      if (error.response?.status === 402) {
        toast.error(error.response?.data?.details || 'Insufficient credits');
      } else {
        toast.error(error.response?.data?.error || 'Failed to generate cover');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectCover = (coverUrl: string) => {
    onCoverGenerated(coverUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl p-6 border border-gray-700 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-purple-400" />
            Cover Designer
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Settings */}
          <div className="lg:col-span-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Style
              </label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="input-field w-full"
              >
                {styles.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {styles.find(s => s.value === selectedStyle)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Color Scheme
              </label>
              <select
                value={selectedColorScheme}
                onChange={(e) => setSelectedColorScheme(e.target.value)}
                className="input-field w-full"
              >
                {colorSchemes.map((scheme) => (
                  <option key={scheme.value} value={scheme.value}>
                    {scheme.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {colorSchemes.find(s => s.value === selectedColorScheme)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Author Name (Optional)
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author name"
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subtitle (Optional)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Book subtitle"
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Custom Prompt (Optional)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Describe your ideal cover design..."
                rows={3}
                className="input-field w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                Leave empty to use AI-generated prompt
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !projectTitle.trim()}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Cover
                </>
              )}
            </button>
          </div>

          {/* Right Panel - Preview & History */}
          <div className="lg:col-span-2 space-y-4">
            {/* Current Cover */}
            {currentCoverUrl && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Current Cover</h4>
                <div className="aspect-[3/4] bg-gray-700 rounded-lg overflow-hidden">
                  <img
                    src={currentCoverUrl}
                    alt="Current cover"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Generated Covers History */}
            {generatedCovers.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Generated Covers</h4>
                <div className="grid grid-cols-2 gap-4">
                  {generatedCovers.map((cover) => (
                    <div
                      key={cover.id}
                      className="relative group cursor-pointer"
                      onClick={() => handleSelectCover(cover.cover_url)}
                    >
                      <div className="aspect-[3/4] bg-gray-700 rounded-lg overflow-hidden">
                        <img
                          src={cover.cover_url}
                          alt={`Cover ${cover.style}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Check className="w-8 h-8 text-white" />
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        {cover.style} • {cover.color_scheme}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedCovers.length === 0 && !currentCoverUrl && (
              <div className="aspect-[3/4] bg-gray-700 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No cover generated yet</p>
                  <p className="text-sm mt-2">Configure settings and click "Generate Cover"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverDesigner;

