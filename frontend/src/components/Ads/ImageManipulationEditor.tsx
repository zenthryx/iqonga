import React, { useState, useRef, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  PhotoIcon,
  ArrowsPointingOutIcon,
  PaintBrushIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  Square3Stack3DIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import AIToolsPanel from '../AIEditor/AIToolsPanel';

interface ImageManipulationEditorProps {
  imageUrl?: string;
  imageId?: string;
  imageType?: 'user_uploaded' | 'product';
  onSave?: (editedImageUrl: string) => void;
  onClose?: () => void;
  onImageUpdate?: (newImageUrl: string) => void;
}

interface Manipulation {
  type: 'crop' | 'resize' | 'filter' | 'composite';
  config: any;
}

const ImageManipulationEditor: React.FC<ImageManipulationEditorProps> = ({
  imageUrl,
  imageId,
  imageType = 'user_uploaded',
  onSave,
  onClose,
  onImageUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(imageUrl || '');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [manipulations, setManipulations] = useState<Manipulation[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'ai'>('basic');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  // Filter states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [grayscale, setGrayscale] = useState(false);
  const [sepia, setSepia] = useState(false);

  // Resize states
  const [resizeWidth, setResizeWidth] = useState<number | ''>('');
  const [resizeHeight, setResizeHeight] = useState<number | ''>('');
  const [resizeFit, setResizeFit] = useState<'cover' | 'contain' | 'fill'>('cover');

  // Crop states
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropWidth, setCropWidth] = useState<number | ''>('');
  const [cropHeight, setCropHeight] = useState<number | ''>('');

  // Canvas selection for object removal
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (imageUrl) {
      setCurrentImageUrl(imageUrl);
      loadImage(imageUrl);
    } else {
      setCurrentImageUrl('');
      setImageLoaded(false);
      setImageElement(null);
    }
  }, [imageUrl]);

  const loadImage = (url: string) => {
    if (!url) {
      setImageLoaded(false);
      return;
    }

    // Convert relative URLs to absolute URLs
    let imageSrc = url;
    if (url.startsWith('/uploads/') || url.startsWith('/')) {
      // Use the API base URL for relative paths
      const apiBaseUrl = process.env.REACT_APP_API_URL || 'https://ajentrix.com/api';
      // Remove /api from base URL if present, then add the path
      const baseUrl = apiBaseUrl.replace('/api', '');
      imageSrc = `${baseUrl}${url}`;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      setImageLoaded(true);
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }
      }
      setImageElement(img);
    };

    img.onerror = (error) => {
      console.error('Failed to load image:', error, imageSrc);
      setImageLoaded(false);
      toast.error('Failed to load image. Please check the image URL.');
    };

    img.src = imageSrc;
  };

  // Canvas selection handlers for object removal
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'object' && activeTab === 'ai') {
      const coords = getCanvasCoordinates(e);
      if (coords) {
        setIsSelecting(true);
        setSelectionStart(coords);
        setSelectionEnd(coords);
        setSelectionBox({ x: coords.x, y: coords.y, width: 0, height: 0 });
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSelecting && selectionStart && canvasRef.current) {
      const coords = getCanvasCoordinates(e);
      if (coords) {
        setSelectionEnd(coords);
        const box = {
          x: Math.min(selectionStart.x, coords.x),
          y: Math.min(selectionStart.y, coords.y),
          width: Math.abs(coords.x - selectionStart.x),
          height: Math.abs(coords.y - selectionStart.y)
        };
        setSelectionBox(box);
        drawCanvasWithSelection();
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isSelecting && selectionBox) {
      setIsSelecting(false);
    }
  };

  const drawCanvasWithSelection = () => {
    if (!canvasRef.current || !imageElement) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageElement, 0, 0);

    // Draw selection box if active tool is object removal
    if (activeTool === 'object' && activeTab === 'ai' && selectionBox && selectionBox.width > 0 && selectionBox.height > 0) {
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
      
      // Draw semi-transparent overlay
      ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
      ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
    }
  };

  useEffect(() => {
    if (activeTool === 'object' && activeTab === 'ai' && selectionBox) {
      drawCanvasWithSelection();
    } else if (imageElement && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageElement, 0, 0);
      }
    }
  }, [selectionBox, activeTool, activeTab, imageElement]);

  const applyFilters = () => {
    if (!canvasRef.current || !imageElement) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (imageElement) {
      ctx.drawImage(imageElement, 0, 0);
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply filters
    for (let i = 0; i < data.length; i += 4) {
      // Brightness
      if (brightness !== 100) {
        const factor = brightness / 100;
        data[i] = Math.min(255, data[i] * factor);     // R
        data[i + 1] = Math.min(255, data[i + 1] * factor); // G
        data[i + 2] = Math.min(255, data[i + 2] * factor); // B
      }

      // Contrast
      if (contrast !== 100) {
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
      }

      // Saturation
      if (saturation !== 100) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const factor = saturation / 100;
        data[i] = gray + factor * (data[i] - gray);
        data[i + 1] = gray + factor * (data[i + 1] - gray);
        data[i + 2] = gray + factor * (data[i + 2] - gray);
      }

      // Grayscale
      if (grayscale) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }

      // Sepia
      if (sepia) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Apply blur using CSS filter (simpler than canvas blur)
    if (blur > 0) {
      canvas.style.filter = `blur(${blur}px)`;
    } else {
      canvas.style.filter = 'none';
    }
  };

  useEffect(() => {
    if (imageLoaded && activeTool === 'filter') {
      applyFilters();
    }
  }, [brightness, contrast, saturation, blur, grayscale, sepia, imageLoaded, activeTool]);

  const handleApplyManipulations = async () => {
    if (!imageId) {
      toast.error('Image ID required for manipulation');
      return;
    }

    try {
      setApplying(true);
      const manipulationsToApply: Manipulation[] = [];

      // Add filter manipulation if any filters are applied
      if (brightness !== 100 || contrast !== 100 || saturation !== 100 || blur > 0 || grayscale || sepia) {
        manipulationsToApply.push({
          type: 'filter',
          config: {
            brightness: brightness / 100,
            contrast: contrast / 100,
            saturation: saturation / 100,
            blur,
            grayscale,
            sepia
          }
        });
      }

      // Add resize manipulation if dimensions are set
      if (resizeWidth && resizeHeight) {
        manipulationsToApply.push({
          type: 'resize',
          config: {
            width: Number(resizeWidth),
            height: Number(resizeHeight),
            fit: resizeFit
          }
        });
      }

      // Add crop manipulation if crop dimensions are set
      if (cropWidth && cropHeight) {
        manipulationsToApply.push({
          type: 'crop',
          config: {
            x: cropX,
            y: cropY,
            width: Number(cropWidth),
            height: Number(cropHeight)
          }
        });
      }

      if (manipulationsToApply.length === 0) {
        toast.error('No manipulations to apply');
        return;
      }

      const response = await apiService.post(`/user-images/${imageId}/manipulate`, {
        manipulations: manipulationsToApply
      });

      if (response.success) {
        toast.success('Image edited successfully!');
        if (onSave && response.data.file_url) {
          onSave(response.data.file_url);
        }
        setPreviewUrl(response.data.file_url);
      } else {
        throw new Error(response.error || 'Failed to apply manipulations');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply manipulations');
    } finally {
      setApplying(false);
    }
  };

  const handleReset = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setGrayscale(false);
    setSepia(false);
    setResizeWidth('');
    setResizeHeight('');
    setCropX(0);
    setCropY(0);
    setCropWidth('');
    setCropHeight('');
    loadImage(currentImageUrl);
  };

  return (
    <div className="h-full flex flex-col bg-gray-800 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <PaintBrushIcon className="h-6 w-6 text-purple-400" />
          Image Editor
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Reset
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-6 w-6 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
        {/* Image Preview */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex-1 bg-gray-900 rounded-lg p-4 flex items-center justify-center overflow-auto">
            {imageLoaded && currentImageUrl ? (
              <canvas
                ref={canvasRef}
                className={`max-w-full max-h-full rounded-lg ${activeTool === 'object' && activeTab === 'ai' ? 'cursor-crosshair' : ''}`}
                style={{ display: 'block' }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
            ) : currentImageUrl ? (
              <div className="text-gray-400">Loading image...</div>
            ) : (
              <div className="text-gray-400 text-center py-20">
                <PhotoIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <p className="text-lg mb-2">No image loaded</p>
                <p className="text-sm text-gray-500">Select an image to edit, or use AI Logo Maker to create a new logo</p>
              </div>
            )}
          </div>
        </div>

        {/* Tools Panel */}
        <div className="space-y-4 overflow-y-auto max-h-full" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* Tab Selection */}
          <div className="flex gap-2 border-b border-gray-700 pb-2">
            <button
              onClick={() => { setActiveTab('basic'); setActiveTool(null); }}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'basic'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Basic Tools
            </button>
            <button
              onClick={() => { setActiveTab('ai'); setActiveTool(null); }}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'ai'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <SparklesIcon className="h-4 w-4" />
              AI Tools
            </button>
          </div>

          {/* AI Tools Panel */}
          {activeTab === 'ai' && (
            <AIToolsPanel
              imageUrl={currentImageUrl || ''}
              imageId={imageId}
              maskArea={selectionBox ? {
                x: Math.round(selectionBox.x),
                y: Math.round(selectionBox.y),
                width: Math.round(selectionBox.width),
                height: Math.round(selectionBox.height)
              } : undefined}
              onMaskAreaChange={(area) => {
                if (canvasRef.current) {
                  const canvas = canvasRef.current;
                  const rect = canvas.getBoundingClientRect();
                  const scaleX = canvas.width / rect.width;
                  const scaleY = canvas.height / rect.height;
                  setSelectionBox({
                    x: area.x / scaleX,
                    y: area.y / scaleY,
                    width: area.width / scaleX,
                    height: area.height / scaleY
                  });
                }
              }}
              onToolChange={(tool) => {
                setActiveTool(tool);
                if (tool !== 'object') {
                  setSelectionBox(null);
                }
              }}
              onResult={(resultUrl) => {
                // Update the current image URL and reload
                setCurrentImageUrl(resultUrl);
                if (onImageUpdate) {
                  onImageUpdate(resultUrl);
                }
                // Clear selection after processing
                setSelectionBox(null);
                // Trigger image reload
                loadImage(resultUrl);
              }}
            />
          )}

          {/* Basic Tools Panel */}
          {activeTab === 'basic' && (
            <>
              {/* Tool Selection */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Tools</h4>
                <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTool(activeTool === 'filter' ? null : 'filter')}
                className={`p-3 rounded-lg transition-colors flex flex-col items-center gap-1 ${
                  activeTool === 'filter' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                <PaintBrushIcon className="h-5 w-5" />
                <span className="text-xs">Filters</span>
              </button>
              <button
                onClick={() => setActiveTool(activeTool === 'resize' ? null : 'resize')}
                className={`p-3 rounded-lg transition-colors flex flex-col items-center gap-1 ${
                  activeTool === 'resize' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                <ArrowsPointingOutIcon className="h-5 w-5" />
                <span className="text-xs">Resize</span>
              </button>
              <button
                onClick={() => setActiveTool(activeTool === 'crop' ? null : 'crop')}
                className={`p-3 rounded-lg transition-colors flex flex-col items-center gap-1 ${
                  activeTool === 'crop' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                <Square3Stack3DIcon className="h-5 w-5" />
                <span className="text-xs">Crop</span>
              </button>
            </div>
          </div>

          {/* Filter Controls */}
          {activeTool === 'filter' && (
            <div className="bg-gray-700 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-medium text-gray-300">Filters</h4>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Brightness: {brightness}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Contrast: {contrast}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Saturation: {saturation}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Blur: {blur}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={blur}
                  onChange={(e) => setBlur(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={grayscale}
                    onChange={(e) => setGrayscale(e.target.checked)}
                    className="rounded"
                  />
                  Grayscale
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={sepia}
                    onChange={(e) => setSepia(e.target.checked)}
                    className="rounded"
                  />
                  Sepia
                </label>
              </div>
            </div>
          )}

          {/* Resize Controls */}
          {activeTool === 'resize' && (
            <div className="bg-gray-700 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-medium text-gray-300">Resize</h4>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Width (px)</label>
                <input
                  type="number"
                  value={resizeWidth}
                  onChange={(e) => setResizeWidth(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  placeholder="Auto"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Height (px)</label>
                <input
                  type="number"
                  value={resizeHeight}
                  onChange={(e) => setResizeHeight(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  placeholder="Auto"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Fit Mode</label>
                <select
                  value={resizeFit}
                  onChange={(e) => setResizeFit(e.target.value as 'cover' | 'contain' | 'fill')}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="fill">Fill</option>
                </select>
              </div>
            </div>
          )}

          {/* Crop Controls */}
          {activeTool === 'crop' && (
            <div className="bg-gray-700 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-medium text-gray-300">Crop</h4>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">X Position</label>
                <input
                  type="number"
                  value={cropX}
                  onChange={(e) => setCropX(Number(e.target.value))}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Y Position</label>
                <input
                  type="number"
                  value={cropY}
                  onChange={(e) => setCropY(Number(e.target.value))}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Width</label>
                <input
                  type="number"
                  value={cropWidth}
                  onChange={(e) => setCropWidth(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Height</label>
                <input
                  type="number"
                  value={cropHeight}
                  onChange={(e) => setCropHeight(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  min="1"
                />
              </div>
            </div>
          )}

              {/* Apply Button */}
              {imageId && (
                <button
                  onClick={handleApplyManipulations}
                  disabled={applying}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {applying ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-5 w-5" />
                      Apply Changes
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Preview Result */}
      {previewUrl && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Edited Image</h4>
          <img src={previewUrl} alt="Edited" className="max-w-full h-auto rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default ImageManipulationEditor;

