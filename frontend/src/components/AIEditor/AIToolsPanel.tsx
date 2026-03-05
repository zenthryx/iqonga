import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  SparklesIcon,
  PhotoIcon,
  XMarkIcon,
  ScissorsIcon,
  PaintBrushIcon,
  ArrowPathIcon,
  ArrowsPointingOutIcon,
  FaceSmileIcon,
  AcademicCapIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface AIToolsPanelProps {
  imageUrl: string;
  imageId?: string;
  onResult: (resultImageUrl: string) => void;
  onClose?: () => void;
  maskArea?: { x: number; y: number; width: number; height: number };
  onMaskAreaChange?: (area: { x: number; y: number; width: number; height: number }) => void;
  onToolChange?: (tool: string | null) => void;
}

interface FilterStyle {
  id: string;
  name: string;
  description: string;
}

const AIToolsPanel: React.FC<AIToolsPanelProps> = ({
  imageUrl,
  imageId,
  onResult,
  onClose,
  maskArea: externalMaskArea,
  onMaskAreaChange,
  onToolChange
}) => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [filters, setFilters] = useState<FilterStyle[]>([]);
  const [internalMaskArea, setInternalMaskArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [selectingArea, setSelectingArea] = useState(false);
  
  // Use external maskArea if provided, otherwise use internal state
  const maskArea = externalMaskArea !== undefined ? externalMaskArea : internalMaskArea;
  const setMaskArea = onMaskAreaChange || setInternalMaskArea;
  
  // Phase 2 features
  const [upscaleScale, setUpscaleScale] = useState<number>(2);
  const [retouchOptions, setRetouchOptions] = useState({
    smoothSkin: true,
    removeBlemishes: true,
    enhanceEyes: false,
    whitenTeeth: false,
    enhanceHair: false
  });
  const [styleProfiles, setStyleProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [learningStyle, setLearningStyle] = useState(false);
  
  // Logo Maker states
  const [logoPrompt, setLogoPrompt] = useState('');
  const [logoStyle, setLogoStyle] = useState('modern');
  const [logoShape, setLogoShape] = useState('square');
  const [logoStyles, setLogoStyles] = useState<any[]>([]);
  const [logoShapes, setLogoShapes] = useState<any[]>([]);

  const handleToolToggle = (tool: string) => {
    const newTool = activeTool === tool ? null : tool;
    setActiveTool(newTool);
    if (onToolChange) {
      onToolChange(newTool);
    }
  };

  React.useEffect(() => {
    loadFilters();
    loadStyleProfiles();
    loadLogoStyles();
    loadLogoShapes();
  }, []);

  const loadLogoStyles = async () => {
    try {
      const response = await apiService.get('/ai-image-editor/logo-styles');
      if (response.success && response.data) {
        setLogoStyles(response.data);
      }
    } catch (error) {
      console.error('Failed to load logo styles:', error);
    }
  };

  const loadLogoShapes = async () => {
    try {
      const response = await apiService.get('/ai-image-editor/logo-shapes');
      if (response.success && response.data) {
        setLogoShapes(response.data);
      }
    } catch (error) {
      console.error('Failed to load logo shapes:', error);
    }
  };

  const loadStyleProfiles = async () => {
    try {
      const response = await apiService.get('/ai-image-editor/style-profiles');
      if (response.success && response.data) {
        setStyleProfiles(response.data);
      }
    } catch (error) {
      console.error('Failed to load style profiles:', error);
    }
  };

  const loadFilters = async () => {
    try {
      const response = await apiService.get('/ai-image-editor/filters');
      if (response.success && response.data) {
        setFilters(response.data);
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  };

  const handleRemoveBackground = async () => {
    if (!imageUrl) {
      toast.error('No image selected');
      return;
    }

    setProcessing(true);
    try {
      const response = await apiService.post('/ai-image-editor/remove-background', {
        imageUrl
      });

      if (response.success && response.data) {
        toast.success(`Background removed! Used ${(response as any).creditsUsed || 50} credits`);
        onResult(response.data.imageUrl);
        setActiveTool(null);
      } else {
        throw new Error(response.error || 'Failed to remove background');
      }
    } catch (error: any) {
      console.error('Background removal error:', error);
      toast.error(error.message || 'Failed to remove background. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveObject = async () => {
    if (!imageUrl) {
      toast.error('No image selected');
      return;
    }

    if (!maskArea.width || !maskArea.height) {
      toast.error('Please select an area to remove');
      return;
    }

    setProcessing(true);
    try {
      const response = await apiService.post('/ai-image-editor/remove-object', {
        imageUrl,
        maskArea
      });

      if (response.success && response.data) {
        toast.success(`Object removed! Used ${(response as any).creditsUsed || 50} credits`);
        onResult(response.data.imageUrl);
        setActiveTool(null);
        setMaskArea({ x: 0, y: 0, width: 0, height: 0 });
      } else {
        throw new Error(response.error || 'Failed to remove object');
      }
    } catch (error: any) {
      console.error('Object removal error:', error);
      toast.error(error.message || 'Failed to remove object. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyFilter = async () => {
    if (!imageUrl || !selectedFilter) {
      toast.error('Please select a filter style');
      return;
    }

    setProcessing(true);
    try {
      const response = await apiService.post('/ai-image-editor/apply-filter', {
        imageUrl,
        filterStyle: selectedFilter
      });

      if (response.success && response.data) {
        const filterName = filters.find(f => f.id === selectedFilter)?.name || selectedFilter;
        toast.success(`${filterName} filter applied! Used ${(response as any).creditsUsed || 30} credits`);
        onResult(response.data.imageUrl);
        setActiveTool(null);
        setSelectedFilter('');
      } else {
        throw new Error(response.error || 'Failed to apply filter');
      }
    } catch (error: any) {
      console.error('Filter application error:', error);
      toast.error(error.message || 'Failed to apply filter. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <SparklesIcon className="h-6 w-6 text-purple-400" />
          AI Tools
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-400" />
          </button>
        )}
      </div>

      {/* Tool Selection */}
      <div className="space-y-3">
        {/* Background Removal */}
        <button
          onClick={() => handleToolToggle('background')}
          disabled={processing}
          className={`w-full p-4 rounded-lg transition-all text-left ${
            activeTool === 'background'
              ? 'bg-purple-600/20 border-2 border-purple-500'
              : 'bg-gray-700/50 hover:bg-gray-700 border-2 border-transparent'
          } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-3">
            <PhotoIcon className="h-6 w-6 text-purple-400" />
            <div className="flex-1">
              <div className="font-medium text-white">Remove Background</div>
              <div className="text-sm text-gray-400">AI-powered background removal</div>
              <div className="text-xs text-gray-500 mt-1">~50 credits</div>
            </div>
          </div>
        </button>

        {/* Object Removal */}
        <button
          onClick={() => handleToolToggle('object')}
          disabled={processing}
          className={`w-full p-4 rounded-lg transition-all text-left ${
            activeTool === 'object'
              ? 'bg-purple-600/20 border-2 border-purple-500'
              : 'bg-gray-700/50 hover:bg-gray-700 border-2 border-transparent'
          } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-3">
            <ScissorsIcon className="h-6 w-6 text-purple-400" />
            <div className="flex-1">
              <div className="font-medium text-white">Remove Object</div>
              <div className="text-sm text-gray-400">Select and remove unwanted objects</div>
              <div className="text-xs text-gray-500 mt-1">~50 credits</div>
            </div>
          </div>
        </button>

        {/* Smart Filters */}
        <button
          onClick={() => handleToolToggle('filter')}
          disabled={processing}
          className={`w-full p-4 rounded-lg transition-all text-left ${
            activeTool === 'filter'
              ? 'bg-purple-600/20 border-2 border-purple-500'
              : 'bg-gray-700/50 hover:bg-gray-700 border-2 border-transparent'
          } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-3">
            <PaintBrushIcon className="h-6 w-6 text-purple-400" />
            <div className="flex-1">
              <div className="font-medium text-white">AI Smart Filters</div>
              <div className="text-sm text-gray-400">Apply AI-powered style filters</div>
              <div className="text-xs text-gray-500 mt-1">~30 credits</div>
            </div>
          </div>
        </button>

        {/* Image Upscaling */}
        <button
          onClick={() => handleToolToggle('upscale')}
          disabled={processing}
          className={`w-full p-4 rounded-lg transition-all text-left ${
            activeTool === 'upscale'
              ? 'bg-purple-600/20 border-2 border-purple-500'
              : 'bg-gray-700/50 hover:bg-gray-700 border-2 border-transparent'
          } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-3">
            <ArrowsPointingOutIcon className="h-6 w-6 text-purple-400" />
            <div className="flex-1">
              <div className="font-medium text-white">Upscale Image</div>
              <div className="text-sm text-gray-400">AI-powered image upscaling with enhancement</div>
              <div className="text-xs text-gray-500 mt-1">~40 credits</div>
            </div>
          </div>
        </button>

        {/* AI Retouching */}
        <button
          onClick={() => handleToolToggle('retouch')}
          disabled={processing}
          className={`w-full p-4 rounded-lg transition-all text-left ${
            activeTool === 'retouch'
              ? 'bg-purple-600/20 border-2 border-purple-500'
              : 'bg-gray-700/50 hover:bg-gray-700 border-2 border-transparent'
          } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-3">
            <FaceSmileIcon className="h-6 w-6 text-purple-400" />
            <div className="flex-1">
              <div className="font-medium text-white">AI Retouching</div>
              <div className="text-sm text-gray-400">Skin smoothing, blemish removal, enhancements</div>
              <div className="text-xs text-gray-500 mt-1">~60 credits</div>
            </div>
          </div>
        </button>

        {/* Style Learning */}
        <button
          onClick={() => handleToolToggle('learn-style')}
          disabled={processing || learningStyle}
          className={`w-full p-4 rounded-lg transition-all text-left ${
            activeTool === 'learn-style'
              ? 'bg-purple-600/20 border-2 border-purple-500'
              : 'bg-gray-700/50 hover:bg-gray-700 border-2 border-transparent'
          } ${processing || learningStyle ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-3">
            <AcademicCapIcon className="h-6 w-6 text-purple-400" />
            <div className="flex-1">
              <div className="font-medium text-white">Learn My Style</div>
              <div className="text-sm text-gray-400">AI learns your editing preferences</div>
              <div className="text-xs text-gray-500 mt-1">~100 credits</div>
            </div>
          </div>
        </button>

        {/* Apply Learned Style */}
        {styleProfiles.length > 0 && (
          <button
            onClick={() => handleToolToggle('apply-style')}
            disabled={processing}
            className={`w-full p-4 rounded-lg transition-all text-left ${
              activeTool === 'apply-style'
                ? 'bg-purple-600/20 border-2 border-purple-500'
                : 'bg-gray-700/50 hover:bg-gray-700 border-2 border-transparent'
            } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-6 w-6 text-purple-400" />
              <div className="flex-1">
                <div className="font-medium text-white">Apply Learned Style</div>
                <div className="text-sm text-gray-400">Use your personal AI style profile</div>
                <div className="text-xs text-gray-500 mt-1">~40 credits</div>
              </div>
            </div>
          </button>
        )}

        {/* AI Logo Maker */}
        <button
          onClick={() => handleToolToggle('logo-maker')}
          disabled={processing}
          className={`w-full p-4 rounded-lg transition-all text-left ${
            activeTool === 'logo-maker'
              ? 'bg-purple-600/20 border-2 border-purple-500'
              : 'bg-gray-700/50 hover:bg-gray-700 border-2 border-transparent'
          } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-3">
            <SparklesIcon className="h-6 w-6 text-purple-400" />
            <div className="flex-1">
              <div className="font-medium text-white">AI Logo Maker</div>
              <div className="text-sm text-gray-400">Generate professional logos with AI</div>
              <div className="text-xs text-gray-500 mt-1">~150 credits</div>
            </div>
          </div>
        </button>
      </div>

      {/* Tool Controls */}
      {activeTool && (
        <div className="bg-gray-900/50 rounded-lg p-4 space-y-4 border border-gray-700">
          {activeTool === 'background' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                Remove the background from your image using AI. The main subject will be preserved.
              </p>
              <button
                onClick={handleRemoveBackground}
                disabled={processing}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <PhotoIcon className="h-5 w-5" />
                    Remove Background
                  </>
                )}
              </button>
            </div>
          )}

          {activeTool === 'object' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                Click and drag on the image canvas to select the area you want to remove. The selected area will be highlighted in purple.
              </p>
              <div className="text-xs text-gray-400 bg-blue-900/20 border border-blue-700/50 rounded p-2">
                💡 Tip: Click and drag on the image to create a selection box. The area inside the box will be removed.
              </div>
              {maskArea.width > 0 && maskArea.height > 0 && (
                <div className="bg-gray-700/50 rounded p-3 space-y-2">
                  <p className="text-xs text-gray-400">Selected Area:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">X:</span> <span className="text-white">{maskArea.x}px</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Y:</span> <span className="text-white">{maskArea.y}px</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Width:</span> <span className="text-white">{maskArea.width}px</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Height:</span> <span className="text-white">{maskArea.height}px</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setMaskArea({ x: 0, y: 0, width: 0, height: 0 })}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Clear Selection
                  </button>
                </div>
              )}
              <button
                onClick={handleRemoveObject}
                disabled={processing || !maskArea.width || !maskArea.height}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ScissorsIcon className="h-5 w-5" />
                    Remove Selected Area
                  </>
                )}
              </button>
            </div>
          )}

          {activeTool === 'filter' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                Choose an AI-powered style filter to transform your image.
              </p>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="">Select a filter style...</option>
                {filters.map((filter) => (
                  <option key={filter.id} value={filter.id}>
                    {filter.name} - {filter.description}
                  </option>
                ))}
              </select>
              <button
                onClick={handleApplyFilter}
                disabled={processing || !selectedFilter}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <PaintBrushIcon className="h-5 w-5" />
                    Apply Filter
                  </>
                )}
              </button>
            </div>
          )}

          {activeTool === 'upscale' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                Upscale your image using AI. Choose a scale factor (2x, 3x, or 4x) to increase resolution while maintaining quality.
              </p>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Scale Factor: {upscaleScale}x
                </label>
                <input
                  type="range"
                  min="2"
                  max="4"
                  step="1"
                  value={upscaleScale}
                  onChange={(e) => setUpscaleScale(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>2x</span>
                  <span>3x</span>
                  <span>4x</span>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!imageUrl) {
                    toast.error('No image selected');
                    return;
                  }
                  setProcessing(true);
                  try {
                    const response = await apiService.post('/ai-image-editor/upscale', {
                      imageUrl,
                      scale: upscaleScale
                    });
                    if (response.success && response.data) {
                      toast.success(`Image upscaled ${upscaleScale}x! Used ${(response as any).creditsUsed || 40} credits`);
                      onResult(response.data.imageUrl);
                      setActiveTool(null);
                    } else {
                      throw new Error(response.error || 'Failed to upscale image');
                    }
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to upscale image');
                  } finally {
                    setProcessing(false);
                  }
                }}
                disabled={processing}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Upscaling...
                  </>
                ) : (
                  <>
                    <ArrowsPointingOutIcon className="h-5 w-5" />
                    Upscale {upscaleScale}x
                  </>
                )}
              </button>
            </div>
          )}

          {activeTool === 'retouch' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                Apply professional AI retouching to enhance portraits and photos.
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={retouchOptions.smoothSkin}
                    onChange={(e) => setRetouchOptions({ ...retouchOptions, smoothSkin: e.target.checked })}
                    className="rounded"
                  />
                  Smooth Skin
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={retouchOptions.removeBlemishes}
                    onChange={(e) => setRetouchOptions({ ...retouchOptions, removeBlemishes: e.target.checked })}
                    className="rounded"
                  />
                  Remove Blemishes
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={retouchOptions.enhanceEyes}
                    onChange={(e) => setRetouchOptions({ ...retouchOptions, enhanceEyes: e.target.checked })}
                    className="rounded"
                  />
                  Enhance Eyes
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={retouchOptions.whitenTeeth}
                    onChange={(e) => setRetouchOptions({ ...retouchOptions, whitenTeeth: e.target.checked })}
                    className="rounded"
                  />
                  Whiten Teeth
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={retouchOptions.enhanceHair}
                    onChange={(e) => setRetouchOptions({ ...retouchOptions, enhanceHair: e.target.checked })}
                    className="rounded"
                  />
                  Enhance Hair
                </label>
              </div>
              <button
                onClick={async () => {
                  if (!imageUrl) {
                    toast.error('No image selected');
                    return;
                  }
                  setProcessing(true);
                  try {
                    const response = await apiService.post('/ai-image-editor/retouch', {
                      imageUrl,
                      retouchOptions
                    });
                    if (response.success && response.data) {
                      toast.success(`Retouching applied! Used ${(response as any).creditsUsed || 60} credits`);
                      onResult(response.data.imageUrl);
                      setActiveTool(null);
                    } else {
                      throw new Error(response.error || 'Failed to apply retouching');
                    }
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to apply retouching');
                  } finally {
                    setProcessing(false);
                  }
                }}
                disabled={processing}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Retouching...
                  </>
                ) : (
                  <>
                    <FaceSmileIcon className="h-5 w-5" />
                    Apply Retouching
                  </>
                )}
              </button>
            </div>
          )}

          {activeTool === 'learn-style' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                AI will analyze your editing history to learn your personal style. This creates a reusable style profile.
              </p>
              <div className="text-xs text-gray-400 bg-blue-900/20 border border-blue-700/50 rounded p-2">
                💡 Tip: Edit a few images first to build up your editing history. The more samples, the better the style profile.
              </div>
              <button
                onClick={async () => {
                  setLearningStyle(true);
                  setProcessing(true);
                  try {
                    const response = await apiService.post('/ai-image-editor/learn-style', {
                      sampleImageIds: [] // Empty array = use all recent edits
                    });
                    if (response.success && response.data) {
                      toast.success(`Style profile "${response.data.profileName}" created! Used ${(response as any).creditsUsed || 100} credits`);
                      await loadStyleProfiles(); // Reload profiles
                      setActiveTool(null);
                    } else {
                      throw new Error(response.error || 'Failed to learn style');
                    }
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to learn style. Make sure you have edited some images first.');
                  } finally {
                    setLearningStyle(false);
                    setProcessing(false);
                  }
                }}
                disabled={processing || learningStyle}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing || learningStyle ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Learning Style...
                  </>
                ) : (
                  <>
                    <AcademicCapIcon className="h-5 w-5" />
                    Learn My Style
                  </>
                )}
              </button>
            </div>
          )}

          {activeTool === 'apply-style' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                Apply one of your learned style profiles to this image.
              </p>
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="">Select a style profile...</option>
                {styleProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.profileName} ({profile.sampleCount} samples)
                  </option>
                ))}
              </select>
              <button
                onClick={async () => {
                  if (!imageUrl || !selectedProfileId) {
                    toast.error('Please select a style profile');
                    return;
                  }
                  setProcessing(true);
                  try {
                    const response = await apiService.post('/ai-image-editor/apply-style', {
                      imageUrl,
                      profileId: selectedProfileId
                    });
                    if (response.success && response.data) {
                      const profileName = styleProfiles.find(p => p.id === selectedProfileId)?.profileName || 'Style';
                      toast.success(`${profileName} applied! Used ${(response as any).creditsUsed || 40} credits`);
                      onResult(response.data.imageUrl);
                      setActiveTool(null);
                      setSelectedProfileId('');
                    } else {
                      throw new Error(response.error || 'Failed to apply style');
                    }
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to apply style');
                  } finally {
                    setProcessing(false);
                  }
                }}
                disabled={processing || !selectedProfileId}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    Apply Style
                  </>
                )}
              </button>
            </div>
          )}

          {activeTool === 'logo-maker' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                Generate a professional logo using AI. Describe your brand, business, or the style you want.
              </p>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Logo Description</label>
                <textarea
                  value={logoPrompt}
                  onChange={(e) => setLogoPrompt(e.target.value)}
                  placeholder="e.g., A modern tech company logo with a circuit pattern, blue and white colors"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Style</label>
                <select
                  value={logoStyle}
                  onChange={(e) => setLogoStyle(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                >
                  {logoStyles.map((style) => (
                    <option key={style.id} value={style.id}>
                      {style.name} - {style.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Shape</label>
                <select
                  value={logoShape}
                  onChange={(e) => setLogoShape(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                >
                  {logoShapes.map((shape) => (
                    <option key={shape.id} value={shape.id}>
                      {shape.name} - {shape.description}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={async () => {
                  if (!logoPrompt.trim()) {
                    toast.error('Please enter a logo description');
                    return;
                  }
                  setProcessing(true);
                  try {
                    const sizeMap: { [key: string]: string } = {
                      square: '1024x1024',
                      wide: '1792x1024',
                      tall: '1024x1792',
                      circle: '1024x1024'
                    };
                    const response = await apiService.post('/ai-image-editor/generate-logo', {
                      prompt: logoPrompt,
                      style: logoStyle,
                      shape: logoShape,
                      size: sizeMap[logoShape] || '1024x1024'
                    });
                    if (response.success && response.data) {
                      toast.success(`Logo generated! Used ${(response as any).creditsUsed || 150} credits`);
                      onResult(response.data.imageUrl);
                      setActiveTool(null);
                      setLogoPrompt('');
                    } else {
                      throw new Error(response.error || 'Failed to generate logo');
                    }
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to generate logo');
                  } finally {
                    setProcessing(false);
                  }
                }}
                disabled={processing || !logoPrompt.trim()}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5" />
                    Generate Logo
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIToolsPanel;

