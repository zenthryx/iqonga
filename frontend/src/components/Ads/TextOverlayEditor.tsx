import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  PaintBrushIcon,
  ArrowsPointingOutIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';

interface TextLayer {
  id: string;
  text: string;
  x: number; // percentage from left
  y: number; // percentage from top
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  textAlign: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold';
  shadow: boolean;
  visible: boolean;
  type: 'headline' | 'description' | 'cta' | 'custom';
}

interface LogoLayer {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number; // percentage of container width
  opacity: number;
  visible: boolean;
}

interface HistoryState {
  textLayers: TextLayer[];
  logoLayer: LogoLayer | null;
}

// Text style presets
const TEXT_PRESETS = [
  {
    name: '🔥 Bold Impact',
    headline: { fontSize: 56, fontFamily: 'Bebas Neue, sans-serif', color: '#FFFFFF', backgroundColor: '#FF0000', backgroundOpacity: 0.9, fontWeight: 'bold' as const, shadow: true },
    description: { fontSize: 24, fontFamily: 'Inter, sans-serif', color: '#FFFFFF', backgroundColor: '#000000', backgroundOpacity: 0.7, fontWeight: 'normal' as const, shadow: true },
    cta: { fontSize: 22, fontFamily: 'Montserrat, sans-serif', color: '#FFFFFF', backgroundColor: '#FF0000', backgroundOpacity: 1, fontWeight: 'bold' as const, shadow: false }
  },
  {
    name: '✨ Minimalist',
    headline: { fontSize: 42, fontFamily: 'Inter, sans-serif', color: '#000000', backgroundColor: '#FFFFFF', backgroundOpacity: 0.95, fontWeight: 'bold' as const, shadow: false },
    description: { fontSize: 20, fontFamily: 'Inter, sans-serif', color: '#333333', backgroundColor: '#FFFFFF', backgroundOpacity: 0.9, fontWeight: 'normal' as const, shadow: false },
    cta: { fontSize: 18, fontFamily: 'Inter, sans-serif', color: '#FFFFFF', backgroundColor: '#000000', backgroundOpacity: 1, fontWeight: 'bold' as const, shadow: false }
  },
  {
    name: '🎯 Sale Banner',
    headline: { fontSize: 52, fontFamily: 'Oswald, sans-serif', color: '#FFFF00', backgroundColor: '#FF0000', backgroundOpacity: 1, fontWeight: 'bold' as const, shadow: true },
    description: { fontSize: 22, fontFamily: 'Roboto, sans-serif', color: '#FFFFFF', backgroundColor: '#000000', backgroundOpacity: 0.8, fontWeight: 'normal' as const, shadow: true },
    cta: { fontSize: 24, fontFamily: 'Oswald, sans-serif', color: '#000000', backgroundColor: '#FFFF00', backgroundOpacity: 1, fontWeight: 'bold' as const, shadow: false }
  },
  {
    name: '💎 Luxury',
    headline: { fontSize: 48, fontFamily: 'Playfair Display, serif', color: '#D4AF37', backgroundColor: '#000000', backgroundOpacity: 0.9, fontWeight: 'bold' as const, shadow: true },
    description: { fontSize: 20, fontFamily: 'Inter, sans-serif', color: '#FFFFFF', backgroundColor: '#000000', backgroundOpacity: 0.7, fontWeight: 'normal' as const, shadow: false },
    cta: { fontSize: 18, fontFamily: 'Montserrat, sans-serif', color: '#000000', backgroundColor: '#D4AF37', backgroundOpacity: 1, fontWeight: 'bold' as const, shadow: false }
  },
  {
    name: '🌈 Vibrant',
    headline: { fontSize: 50, fontFamily: 'Poppins, sans-serif', color: '#FFFFFF', backgroundColor: '#8B5CF6', backgroundOpacity: 0.95, fontWeight: 'bold' as const, shadow: true },
    description: { fontSize: 22, fontFamily: 'Poppins, sans-serif', color: '#FFFFFF', backgroundColor: '#EC4899', backgroundOpacity: 0.85, fontWeight: 'normal' as const, shadow: true },
    cta: { fontSize: 20, fontFamily: 'Poppins, sans-serif', color: '#FFFFFF', backgroundColor: '#10B981', backgroundOpacity: 1, fontWeight: 'bold' as const, shadow: false }
  },
  {
    name: '🏢 Corporate',
    headline: { fontSize: 44, fontFamily: 'Roboto, sans-serif', color: '#FFFFFF', backgroundColor: '#1E3A8A', backgroundOpacity: 0.95, fontWeight: 'bold' as const, shadow: false },
    description: { fontSize: 20, fontFamily: 'Roboto, sans-serif', color: '#FFFFFF', backgroundColor: '#1E3A8A', backgroundOpacity: 0.8, fontWeight: 'normal' as const, shadow: false },
    cta: { fontSize: 18, fontFamily: 'Roboto, sans-serif', color: '#1E3A8A', backgroundColor: '#FFFFFF', backgroundOpacity: 1, fontWeight: 'bold' as const, shadow: false }
  }
];

interface TextOverlayEditorProps {
  imageUrl: string;
  headline?: string;
  description?: string;
  callToAction?: string;
  aspectRatio?: string;
  onSave?: (compositeImageUrl: string) => void;
  onClose?: () => void;
}

const FONT_OPTIONS = [
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Poppins', value: 'Poppins, sans-serif' },
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { name: 'Playfair Display', value: 'Playfair Display, serif' },
  { name: 'Oswald', value: 'Oswald, sans-serif' },
  { name: 'Bebas Neue', value: 'Bebas Neue, sans-serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
];

const PRESET_COLORS = [
  '#FFFFFF', '#000000', '#FF6B6B', '#4ECDC4', '#45B7D1', 
  '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8C00', '#1E90FF'
];

const TextOverlayEditor: React.FC<TextOverlayEditorProps> = ({
  imageUrl,
  headline = '',
  description = '',
  callToAction = '',
  aspectRatio = '1:1',
  onSave,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'logo' | 'presets'>('text');
  
  // Logo layer state
  const [logoLayer, setLogoLayer] = useState<LogoLayer | null>(null);
  const [selectedElement, setSelectedElement] = useState<'text' | 'logo' | null>(null);
  
  // Undo/Redo history
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistory = 20;

  // Initialize text layers from props
  const [textLayers, setTextLayers] = useState<TextLayer[]>([
    {
      id: 'headline',
      text: headline,
      x: 50,
      y: 20,
      fontSize: 48,
      fontFamily: 'Montserrat, sans-serif',
      color: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 0.7,
      textAlign: 'center',
      fontWeight: 'bold',
      shadow: true,
      visible: !!headline,
      type: 'headline'
    },
    {
      id: 'description',
      text: description,
      x: 50,
      y: 50,
      fontSize: 24,
      fontFamily: 'Inter, sans-serif',
      color: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 0.5,
      textAlign: 'center',
      fontWeight: 'normal',
      shadow: true,
      visible: !!description,
      type: 'description'
    },
    {
      id: 'cta',
      text: callToAction,
      x: 50,
      y: 85,
      fontSize: 20,
      fontFamily: 'Montserrat, sans-serif',
      color: '#FFFFFF',
      backgroundColor: '#6366F1',
      backgroundOpacity: 1,
      textAlign: 'center',
      fontWeight: 'bold',
      shadow: false,
      visible: !!callToAction,
      type: 'cta'
    }
  ]);

  const selectedLayer = textLayers.find(l => l.id === selectedLayerId);

  // Save state to history for undo/redo
  const saveToHistory = useCallback(() => {
    const newState: HistoryState = {
      textLayers: JSON.parse(JSON.stringify(textLayers)),
      logoLayer: logoLayer ? JSON.parse(JSON.stringify(logoLayer)) : null
    };
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newState);
      if (newHistory.length > maxHistory) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, maxHistory - 1));
  }, [textLayers, logoLayer, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setTextLayers(prevState.textLayers);
      setLogoLayer(prevState.logoLayer);
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setTextLayers(nextState.textLayers);
      setLogoLayer(nextState.logoLayer);
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      saveToHistory();
      setLogoLayer({
        id: 'logo',
        imageUrl: dataUrl,
        x: 50,
        y: 90,
        width: 15,
        opacity: 1,
        visible: true
      });
      setSelectedElement('logo');
      toast.success('Logo added!');
    };
    reader.readAsDataURL(file);
  };

  // Apply text preset
  const applyPreset = (preset: typeof TEXT_PRESETS[0]) => {
    saveToHistory();
    setTextLayers(prev => prev.map(layer => {
      if (layer.type === 'headline' && preset.headline) {
        return { ...layer, ...preset.headline, visible: true };
      }
      if (layer.type === 'description' && preset.description) {
        return { ...layer, ...preset.description, visible: true };
      }
      if (layer.type === 'cta' && preset.cta) {
        return { ...layer, ...preset.cta, visible: true };
      }
      return layer;
    }));
    toast.success(`Applied "${preset.name}" preset`);
  };

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImageLoaded(true);
    img.onerror = () => toast.error('Failed to load image');
    img.src = imageUrl.startsWith('/') ? `${window.location.origin}${imageUrl}` : imageUrl;
  }, [imageUrl]);

  // Update layer
  const updateLayer = useCallback((id: string, updates: Partial<TextLayer>, saveHistory = false) => {
    if (saveHistory) saveToHistory();
    setTextLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, ...updates } : layer
    ));
  }, [saveToHistory]);

  // Update logo layer
  const updateLogoLayer = useCallback((updates: Partial<LogoLayer>, saveHistory = false) => {
    if (saveHistory) saveToHistory();
    setLogoLayer(prev => prev ? { ...prev, ...updates } : null);
  }, [saveToHistory]);

  // Add custom layer
  const addCustomLayer = () => {
    const newId = `custom-${Date.now()}`;
    setTextLayers(prev => [...prev, {
      id: newId,
      text: 'New Text',
      x: 50,
      y: 60,
      fontSize: 24,
      fontFamily: 'Inter, sans-serif',
      color: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 0.5,
      textAlign: 'center',
      fontWeight: 'normal',
      shadow: true,
      visible: true,
      type: 'custom'
    }]);
    setSelectedLayerId(newId);
  };

  // Delete layer
  const deleteLayer = (id: string) => {
    if (['headline', 'description', 'cta'].includes(id)) {
      updateLayer(id, { visible: false });
    } else {
      setTextLayers(prev => prev.filter(l => l.id !== id));
    }
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, layerId: string) => {
    if (!previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const layer = textLayers.find(l => l.id === layerId);
    if (!layer) return;

    const layerX = (layer.x / 100) * rect.width;
    const layerY = (layer.y / 100) * rect.height;

    setDragOffset({
      x: e.clientX - rect.left - layerX,
      y: e.clientY - rect.top - layerY
    });
    setIsDragging(true);
    setSelectedLayerId(layerId);
  };

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !selectedLayerId || !previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

    updateLayer(selectedLayerId, {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  }, [isDragging, selectedLayerId, dragOffset, updateLayer]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Export image with text overlay
  const exportImage = async () => {
    if (!canvasRef.current) return;
    
    setExporting(true);
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Load image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl.startsWith('/') ? `${window.location.origin}${imageUrl}` : imageUrl;
      });

      // Set canvas size to match image
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Draw text layers
      const visibleLayers = textLayers.filter(l => l.visible && l.text);
      
      for (const layer of visibleLayers) {
        const x = (layer.x / 100) * canvas.width;
        const y = (layer.y / 100) * canvas.height;
        
        // Scale font size based on image dimensions
        const scaleFactor = canvas.width / 500; // Base scale
        const fontSize = Math.round(layer.fontSize * scaleFactor);
        
        ctx.font = `${layer.fontWeight} ${fontSize}px ${layer.fontFamily}`;
        ctx.textAlign = layer.textAlign;
        ctx.textBaseline = 'middle';

        // Measure text for background
        const metrics = ctx.measureText(layer.text);
        const textWidth = metrics.width;
        const textHeight = fontSize * 1.4;
        const padding = fontSize * 0.4;

        // Calculate background position based on alignment
        let bgX = x;
        if (layer.textAlign === 'center') bgX = x - textWidth / 2;
        else if (layer.textAlign === 'right') bgX = x - textWidth;

        // Draw background if opacity > 0
        if (layer.backgroundOpacity > 0) {
          ctx.fillStyle = layer.backgroundColor;
          ctx.globalAlpha = layer.backgroundOpacity;
          
          if (layer.type === 'cta') {
            // Rounded rectangle for CTA
            const radius = fontSize * 0.3;
            ctx.beginPath();
            ctx.roundRect(bgX - padding, y - textHeight / 2, textWidth + padding * 2, textHeight, radius);
            ctx.fill();
          } else {
            ctx.fillRect(bgX - padding, y - textHeight / 2, textWidth + padding * 2, textHeight);
          }
          ctx.globalAlpha = 1;
        }

        // Draw shadow if enabled
        if (layer.shadow) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = fontSize * 0.1;
          ctx.shadowOffsetX = fontSize * 0.05;
          ctx.shadowOffsetY = fontSize * 0.05;
        }

        // Draw text
        ctx.fillStyle = layer.color;
        ctx.fillText(layer.text, x, y);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // Draw logo if present
      if (logoLayer && logoLayer.visible && logoLayer.imageUrl) {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
          logoImg.src = logoLayer.imageUrl;
        });

        const logoWidth = (logoLayer.width / 100) * canvas.width;
        const logoHeight = (logoImg.naturalHeight / logoImg.naturalWidth) * logoWidth;
        const logoX = (logoLayer.x / 100) * canvas.width - logoWidth / 2;
        const logoY = (logoLayer.y / 100) * canvas.height - logoHeight / 2;

        ctx.globalAlpha = logoLayer.opacity;
        ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        ctx.globalAlpha = 1;
      }

      // Export as data URL
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      
      // Download
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `ad-creative-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Image exported successfully!');
      
      if (onSave) {
        onSave(dataUrl);
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export image');
    } finally {
      setExporting(false);
    }
  };

  // Get layer type label
  const getLayerLabel = (type: string) => {
    switch (type) {
      case 'headline': return '📝 Headline';
      case 'description': return '📄 Description';
      case 'cta': return '🔘 CTA Button';
      default: return '✏️ Custom Text';
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <PaintBrushIcon className="h-5 w-5 text-purple-400" />
          Text Overlay Editor
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title={showLayerPanel ? 'Hide layers' : 'Show layers'}
          >
            {showLayerPanel ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Preview Area */}
        <div className="flex-1 p-4">
          <div 
            ref={previewRef}
            className="relative bg-slate-900 rounded-xl overflow-hidden mx-auto"
            style={{ 
              maxWidth: '500px',
              aspectRatio: aspectRatio.replace(':', '/') 
            }}
          >
            {/* Image */}
            {imageLoaded ? (
              <img 
                src={imageUrl.startsWith('/') ? `${window.location.origin}${imageUrl}` : imageUrl}
                alt="Ad preview"
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ArrowPathIcon className="h-8 w-8 text-gray-500 animate-spin" />
              </div>
            )}

            {/* Text Layers */}
            {textLayers.filter(l => l.visible && l.text).map(layer => (
              <div
                key={layer.id}
                className={`absolute cursor-move select-none transition-all ${
                  selectedLayerId === layer.id ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-transparent' : ''
                }`}
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  transform: `translate(-50%, -50%)`,
                  fontSize: `${layer.fontSize * 0.5}px`, // Scale down for preview
                  fontFamily: layer.fontFamily,
                  fontWeight: layer.fontWeight,
                  color: layer.color,
                  textAlign: layer.textAlign,
                  textShadow: layer.shadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
                  backgroundColor: layer.backgroundOpacity > 0 
                    ? `${layer.backgroundColor}${Math.round(layer.backgroundOpacity * 255).toString(16).padStart(2, '0')}`
                    : 'transparent',
                  padding: layer.type === 'cta' ? '8px 16px' : '4px 8px',
                  borderRadius: layer.type === 'cta' ? '8px' : '4px',
                  whiteSpace: 'nowrap',
                  maxWidth: '90%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseDown={(e) => handleDragStart(e, layer.id)}
                onClick={() => setSelectedLayerId(layer.id)}
              >
                {layer.text}
              </div>
            ))}

            {/* Logo Layer Preview */}
            {logoLayer && logoLayer.visible && logoLayer.imageUrl && (
              <div
                className="absolute cursor-move select-none"
                style={{
                  left: `${logoLayer.x}%`,
                  top: `${logoLayer.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${logoLayer.width}%`,
                  opacity: logoLayer.opacity
                }}
              >
                <img 
                  src={logoLayer.imageUrl}
                  alt="Logo"
                  className="w-full h-auto"
                  draggable={false}
                />
              </div>
            )}

            {/* Drag hint */}
            {(selectedLayerId || selectedElement === 'logo') && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/70 bg-black/50 px-2 py-1 rounded">
                <ArrowsPointingOutIcon className="h-3 w-3 inline mr-1" />
                Drag to reposition
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={exportImage}
              disabled={exporting || !imageLoaded}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {exporting ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Download with Text
                </>
              )}
            </button>
          </div>
        </div>

        {/* Layer Panel */}
        {showLayerPanel && (
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-700 p-4 space-y-4 max-h-[600px] overflow-y-auto">
            {/* Undo/Redo Buttons */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <div className="flex gap-1">
                <button
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs text-white transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  ↩ Undo
                </button>
                <button
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs text-white transition-colors"
                  title="Redo (Ctrl+Y)"
                >
                  Redo ↪
                </button>
              </div>
              <span className="text-xs text-gray-500">
                {historyIndex + 1}/{history.length || 1}
              </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-700/50 rounded-lg">
              {(['text', 'logo', 'presets'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab === 'text' ? '📝 Text' : tab === 'logo' ? '🖼️ Logo' : '🎨 Presets'}
                </button>
              ))}
            </div>

            {/* Presets Tab */}
            {activeTab === 'presets' && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">Apply a style preset to all text layers:</p>
                {TEXT_PRESETS.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => applyPreset(preset)}
                    className="w-full p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left transition-colors"
                  >
                    <span className="font-medium text-white">{preset.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Logo Tab */}
            {activeTab === 'logo' && (
              <div className="space-y-4">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                
                {logoLayer ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">Logo Added</span>
                      <button
                        onClick={() => { saveToHistory(); setLogoLayer(null); }}
                        className="p-1.5 hover:bg-red-600/20 rounded-lg"
                      >
                        <TrashIcon className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                    
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <img 
                        src={logoLayer.imageUrl} 
                        alt="Logo preview"
                        className="h-16 mx-auto object-contain"
                      />
                    </div>

                    {/* Logo Size */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Size</label>
                      <input
                        type="range"
                        min={5}
                        max={50}
                        value={logoLayer.width}
                        onChange={(e) => updateLogoLayer({ width: parseInt(e.target.value) })}
                        onMouseUp={() => saveToHistory()}
                        className="w-full"
                      />
                      <span className="text-xs text-gray-500">{logoLayer.width}%</span>
                    </div>

                    {/* Logo Opacity */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Opacity</label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={logoLayer.opacity}
                        onChange={(e) => updateLogoLayer({ opacity: parseFloat(e.target.value) })}
                        onMouseUp={() => saveToHistory()}
                        className="w-full"
                      />
                      <span className="text-xs text-gray-500">{Math.round(logoLayer.opacity * 100)}%</span>
                    </div>

                    {/* Logo Position */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Position</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">X (%)</label>
                          <input
                            type="number"
                            value={Math.round(logoLayer.x)}
                            onChange={(e) => updateLogoLayer({ x: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) }, true)}
                            min={0}
                            max={100}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Y (%)</label>
                          <input
                            type="number"
                            value={Math.round(logoLayer.y)}
                            onChange={(e) => updateLogoLayer({ y: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) }, true)}
                            min={0}
                            max={100}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Visibility Toggle */}
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-400">Visible</label>
                      <button
                        onClick={() => updateLogoLayer({ visible: !logoLayer.visible }, true)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          logoLayer.visible ? 'bg-purple-600' : 'bg-slate-600'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                          logoLayer.visible ? 'translate-x-6' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-700/50 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <PhotoIcon className="h-8 w-8 text-gray-500" />
                    </div>
                    <p className="text-gray-400 text-sm mb-3">Add your brand logo</p>
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm text-white font-medium transition-colors"
                    >
                      Upload Logo
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Text Tab - Layers List */}
            {activeTab === 'text' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-300">Text Layers</h4>
                    <button
                      onClick={() => { saveToHistory(); addCustomLayer(); }}
                      className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                      title="Add custom text"
                    >
                      <PlusIcon className="h-4 w-4 text-white" />
                    </button>
                  </div>
              
              <div className="space-y-2">
                {textLayers.map(layer => (
                  <div
                    key={layer.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedLayerId === layer.id 
                        ? 'bg-purple-600/20 border border-purple-500' 
                        : 'bg-slate-700/50 border border-transparent hover:bg-slate-700'
                    }`}
                    onClick={() => setSelectedLayerId(layer.id)}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                      className="p-1 hover:bg-slate-600 rounded"
                    >
                      {layer.visible ? (
                        <EyeIcon className="h-4 w-4 text-green-400" />
                      ) : (
                        <EyeSlashIcon className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    <span className="flex-1 text-sm text-white truncate">
                      {getLayerLabel(layer.type)}
                    </span>
                    {layer.type === 'custom' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                        className="p-1 hover:bg-red-600/20 rounded"
                      >
                        <TrashIcon className="h-4 w-4 text-red-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Layer Editor */}
            {selectedLayer && (
              <div className="space-y-4 pt-4 border-t border-slate-700">
                <h4 className="text-sm font-medium text-gray-300">
                  Edit: {getLayerLabel(selectedLayer.type)}
                </h4>

                {/* Text Input */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Text</label>
                  <input
                    type="text"
                    value={selectedLayer.text}
                    onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter text..."
                  />
                </div>

                {/* Font Family */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Font</label>
                  <select
                    value={selectedLayer.fontFamily}
                    onChange={(e) => updateLayer(selectedLayer.id, { fontFamily: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {FONT_OPTIONS.map(font => (
                      <option key={font.value} value={font.value}>{font.name}</option>
                    ))}
                  </select>
                </div>

                {/* Font Size & Weight */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Size</label>
                    <input
                      type="number"
                      value={selectedLayer.fontSize}
                      onChange={(e) => updateLayer(selectedLayer.id, { fontSize: parseInt(e.target.value) || 16 })}
                      min={12}
                      max={120}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Weight</label>
                    <select
                      value={selectedLayer.fontWeight}
                      onChange={(e) => updateLayer(selectedLayer.id, { fontWeight: e.target.value as 'normal' | 'bold' })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                </div>

                {/* Text Color */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedLayer.color}
                      onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-slate-600 cursor-pointer"
                    />
                    <div className="flex flex-wrap gap-1">
                      {PRESET_COLORS.slice(0, 5).map(color => (
                        <button
                          key={color}
                          onClick={() => updateLayer(selectedLayer.id, { color })}
                          className={`w-6 h-6 rounded border-2 ${selectedLayer.color === color ? 'border-purple-500' : 'border-slate-600'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Background Color & Opacity */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedLayer.backgroundColor}
                      onChange={(e) => updateLayer(selectedLayer.id, { backgroundColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-slate-600 cursor-pointer"
                    />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={selectedLayer.backgroundOpacity}
                      onChange={(e) => updateLayer(selectedLayer.id, { backgroundOpacity: parseFloat(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-400 w-8">
                      {Math.round(selectedLayer.backgroundOpacity * 100)}%
                    </span>
                  </div>
                </div>

                {/* Text Align */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Alignment</label>
                  <div className="flex gap-1">
                    {(['left', 'center', 'right'] as const).map(align => (
                      <button
                        key={align}
                        onClick={() => updateLayer(selectedLayer.id, { textAlign: align })}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedLayer.textAlign === align
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                        }`}
                      >
                        {align.charAt(0).toUpperCase() + align.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shadow Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Text Shadow</label>
                  <button
                    onClick={() => updateLayer(selectedLayer.id, { shadow: !selectedLayer.shadow })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      selectedLayer.shadow ? 'bg-purple-600' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                      selectedLayer.shadow ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">X (%)</label>
                      <input
                        type="number"
                        value={Math.round(selectedLayer.x)}
                        onChange={(e) => updateLayer(selectedLayer.id, { x: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                        min={0}
                        max={100}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Y (%)</label>
                      <input
                        type="number"
                        value={Math.round(selectedLayer.y)}
                        onChange={(e) => updateLayer(selectedLayer.id, { y: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                        min={0}
                        max={100}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default TextOverlayEditor;

