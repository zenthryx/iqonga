import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  Hash,
  X,
  Save,
  Eye,
  Loader,
  CheckCircle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FileText,
  BookOpen
} from 'lucide-react';

interface PageNumberingSettingsProps {
  projectId: string;
  chapters: Array<{ id: string; title: string; chapter_number: number; word_count: number }>;
  onClose: () => void;
  onSave?: () => void;
}

type NumberingStyle = 'arabic' | 'roman' | 'none';
type Placement = 'header' | 'footer';
type Alignment = 'left' | 'center' | 'right';

interface PageNumberingConfig {
  style: NumberingStyle;
  frontMatterStyle: NumberingStyle;
  separateFrontMatter: boolean;
  placement: Placement;
  alignment: Alignment;
  wordsPerPage: number;
  startPage: number;
  showOnFirstPage: boolean;
}

const PageNumberingSettings: React.FC<PageNumberingSettingsProps> = ({
  projectId,
  chapters,
  onClose,
  onSave
}) => {
  const [config, setConfig] = useState<PageNumberingConfig>({
    style: 'arabic',
    frontMatterStyle: 'roman',
    separateFrontMatter: true,
    placement: 'footer',
    alignment: 'center',
    wordsPerPage: 250,
    startPage: 1,
    showOnFirstPage: false
  });

  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  // Debounced preview generation - only generate after user stops changing settings
  useEffect(() => {
    // Clear existing timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    // Set new timeout - wait 800ms after last change
    previewTimeoutRef.current = setTimeout(() => {
      generatePreview();
    }, 800);

    // Cleanup on unmount
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [config]);

  const loadSettings = async () => {
    try {
      // Load saved settings from project metadata if available
      const response = await apiService.get(`/content/ebook/projects/${projectId}`) as any;
      if (response.success && response.data.metadata?.pageNumbering) {
        setConfig({ ...config, ...response.data.metadata.pageNumbering });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const generatePreview = async () => {
    setLoadingPreview(true);
    try {
      const response = await apiService.post(
        `/content/ebook/projects/${projectId}/toc`,
        {
          wordsPerPage: config.wordsPerPage,
          startPage: config.startPage,
          includeFrontMatter: true,
          includePageNumbers: config.style !== 'none'
        }
      ) as any;

      if (response.success) {
        setPreview(response.toc);
      }
    } catch (error: any) {
      console.error('Failed to generate preview:', error);
      if (error.response?.status === 429) {
        toast.error('Too many requests. Please wait a moment before trying again.');
      } else {
        toast.error('Failed to generate preview. Please try again.');
      }
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save settings to project metadata
      const response = await apiService.put(
        `/content/ebook/projects/${projectId}`,
        {
          metadata: {
            pageNumbering: config
          }
        }
      ) as any;

      if (response.success) {
        toast.success('Page numbering settings saved!');
        if (onSave) {
          onSave();
        }
        onClose();
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const formatPageNumber = (pageNum: number, style: NumberingStyle) => {
    if (style === 'none') return '';
    if (style === 'roman') {
      return toRoman(pageNum);
    }
    return pageNum.toString();
  };

  const toRoman = (num: number): string => {
    const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const numerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    let result = '';
    for (let i = 0; i < values.length; i++) {
      while (num >= values[i]) {
        result += numerals[i];
        num -= values[i];
      }
    }
    return result;
  };

  const getPlacementIcon = (placement: Placement) => {
    return placement === 'header' ? FileText : BookOpen;
  };

  const getAlignmentIcon = (alignment: Alignment) => {
    switch (alignment) {
      case 'left':
        return AlignLeft;
      case 'center':
        return AlignCenter;
      case 'right':
        return AlignRight;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl p-6 border border-gray-700 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Hash className="h-5 w-5 text-purple-400" />
            Page Numbering Settings
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings Panel */}
          <div className="space-y-6">
            <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Numbering Style
              </h4>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="style"
                    value="arabic"
                    checked={config.style === 'arabic'}
                    onChange={(e) => setConfig({ ...config, style: e.target.value as NumberingStyle })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div className="flex-1">
                    <div className="text-white font-medium">Arabic Numerals</div>
                    <div className="text-xs text-gray-400">1, 2, 3, 4...</div>
                  </div>
                  <div className="text-purple-400 font-mono">1, 2, 3</div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="style"
                    value="roman"
                    checked={config.style === 'roman'}
                    onChange={(e) => setConfig({ ...config, style: e.target.value as NumberingStyle })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div className="flex-1">
                    <div className="text-white font-medium">Roman Numerals</div>
                    <div className="text-xs text-gray-400">i, ii, iii, iv...</div>
                  </div>
                  <div className="text-purple-400 font-mono">i, ii, iii</div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="style"
                    value="none"
                    checked={config.style === 'none'}
                    onChange={(e) => setConfig({ ...config, style: e.target.value as NumberingStyle })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div className="flex-1">
                    <div className="text-white font-medium">No Page Numbers</div>
                    <div className="text-xs text-gray-400">Hide page numbers</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Front Matter Settings */}
            <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <h4 className="text-sm font-medium text-white mb-4">Front Matter</h4>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.separateFrontMatter}
                    onChange={(e) => setConfig({ ...config, separateFrontMatter: e.target.checked })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm text-gray-300">Separate numbering for front matter</span>
                </label>

                {config.separateFrontMatter && (
                  <div className="ml-6">
                    <label className="block text-xs text-gray-400 mb-2">Front Matter Style</label>
                    <select
                      value={config.frontMatterStyle}
                      onChange={(e) => setConfig({ ...config, frontMatterStyle: e.target.value as NumberingStyle })}
                      className="input-field w-full text-sm"
                    >
                      <option value="roman">Roman (i, ii, iii)</option>
                      <option value="arabic">Arabic (1, 2, 3)</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Placement Settings */}
            <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <h4 className="text-sm font-medium text-white mb-4">Placement</h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['header', 'footer'] as Placement[]).map((placement) => {
                      const Icon = getPlacementIcon(placement);
                      return (
                        <button
                          key={placement}
                          onClick={() => setConfig({ ...config, placement })}
                          className={`p-3 rounded-lg border transition-colors text-left ${
                            config.placement === placement
                              ? 'border-purple-500 bg-purple-500/20'
                              : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                          }`}
                        >
                          <Icon className={`h-5 w-5 mb-2 ${
                            config.placement === placement ? 'text-purple-400' : 'text-gray-400'
                          }`} />
                          <div className="text-sm font-medium text-white capitalize">{placement}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-2">Alignment</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['left', 'center', 'right'] as Alignment[]).map((alignment) => {
                      const Icon = getAlignmentIcon(alignment);
                      return (
                        <button
                          key={alignment}
                          onClick={() => setConfig({ ...config, alignment })}
                          className={`p-3 rounded-lg border transition-colors ${
                            config.alignment === alignment
                              ? 'border-purple-500 bg-purple-500/20'
                              : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                          }`}
                        >
                          <Icon className={`h-5 w-5 mx-auto ${
                            config.alignment === alignment ? 'text-purple-400' : 'text-gray-400'
                          }`} />
                          <div className="text-xs text-white capitalize mt-1">{alignment}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showOnFirstPage}
                    onChange={(e) => setConfig({ ...config, showOnFirstPage: e.target.checked })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm text-gray-300">Show on first page of chapter</span>
                </label>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <h4 className="text-sm font-medium text-white mb-4">Advanced</h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">
                    Words per Page: {config.wordsPerPage}
                  </label>
                  <input
                    type="range"
                    min="150"
                    max="400"
                    step="10"
                    value={config.wordsPerPage}
                    onChange={(e) => setConfig({ ...config, wordsPerPage: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>150</span>
                    <span>250</span>
                    <span>400</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-2">Starting Page Number</label>
                  <input
                    type="number"
                    min="1"
                    value={config.startPage}
                    onChange={(e) => setConfig({ ...config, startPage: parseInt(e.target.value) || 1 })}
                    className="input-field w-full text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="space-y-4">
            <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </h4>

              {loadingPreview ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="h-6 w-6 text-purple-400 animate-spin" />
                </div>
              ) : preview ? (
                <div className="space-y-4">
                  {/* Page Preview */}
                  <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 min-h-[400px] relative">
                    {/* Header/Footer Preview */}
                    {config.placement === 'header' && config.style !== 'none' && (
                      <div className={`absolute top-0 left-0 right-0 px-6 py-2 border-b border-gray-700 flex ${
                        config.alignment === 'left' ? 'justify-start' :
                        config.alignment === 'center' ? 'justify-center' :
                        'justify-end'
                      }`}>
                        <span className="text-xs text-gray-500 font-mono">
                          {formatPageNumber(1, config.style)}
                        </span>
                      </div>
                    )}

                    <div className="pt-8">
                      <h5 className="text-lg font-semibold text-white mb-2">Sample Chapter</h5>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        This is a preview of how your page numbering will appear. The page numbers
                        will be positioned at the {config.placement} with {config.alignment} alignment.
                        {config.style === 'arabic' && ' Arabic numerals will be used.'}
                        {config.style === 'roman' && ' Roman numerals will be used.'}
                        {config.style === 'none' && ' No page numbers will be displayed.'}
                      </p>
                    </div>

                    {config.placement === 'footer' && config.style !== 'none' && (
                      <div className={`absolute bottom-0 left-0 right-0 px-6 py-2 border-t border-gray-700 flex ${
                        config.alignment === 'left' ? 'justify-start' :
                        config.alignment === 'center' ? 'justify-center' :
                        'justify-end'
                      }`}>
                        <span className="text-xs text-gray-500 font-mono">
                          {formatPageNumber(1, config.style)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* TOC Preview */}
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <h6 className="text-sm font-semibold text-white mb-3">Table of Contents Preview</h6>
                    <div className="space-y-2">
                      {preview.items.slice(0, 5).map((item: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm py-1 border-b border-gray-800 last:border-0"
                        >
                          <span className="text-gray-300">
                            {item.chapterNumber}. {item.title}
                          </span>
                          {config.style !== 'none' && (
                            <span className="text-gray-500 font-mono text-xs">
                              {formatPageNumber(item.pageNumber, config.style)}
                            </span>
                          )}
                        </div>
                      ))}
                      {preview.items.length > 5 && (
                        <div className="text-xs text-gray-500 text-center pt-2">
                          ... and {preview.items.length - 5} more chapters
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-400">
                      Total Pages: {preview.totalPages} • Total Chapters: {preview.totalChapters}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No preview available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PageNumberingSettings;

