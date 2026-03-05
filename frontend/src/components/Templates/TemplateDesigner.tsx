import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Save, 
  Upload, 
  Type, 
  Move, 
  Trash2, 
  Eye,
  Image as ImageIcon,
  Layers,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import templateAdService, { AdDesignTemplate, TextPlaceholder, LayoutConfig } from '../../services/templateAdService';
import { mediaService } from '../../services/mediaService';
import { apiService } from '../../services/api';
import CanvaQuickImport from '../Canva/CanvaQuickImport';

interface TemplateDesignerProps {
  template?: AdDesignTemplate | null;
  onSave?: (template: AdDesignTemplate) => void;
  onClose: () => void;
}

const TemplateDesigner: React.FC<TemplateDesignerProps> = ({ template, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Template data
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState(template?.category || 'product_showcase');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(template?.background_image_url || '');
  const [backgroundColor, setBackgroundColor] = useState(template?.background_color || '#FFFFFF');
  const [platforms, setPlatforms] = useState<string[]>(template?.platforms || ['facebook', 'instagram']);
  const [textPlaceholders, setTextPlaceholders] = useState<TextPlaceholder[]>(
    template?.layout_config?.textPlaceholders || []
  );
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string | null>(null);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [showCanvaImport, setShowCanvaImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Canvas dimensions
  const canvasWidth = 1080;
  const canvasHeight = 1080;
  const scale = 0.5; // Scale for display

  useEffect(() => {
    if (backgroundImageUrl && canvasRef.current) {
      drawCanvas();
    }
  }, [backgroundImageUrl, textPlaceholders]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background image
    if (backgroundImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawTextPlaceholders(ctx);
      };
      img.src = backgroundImageUrl;
    } else {
      drawTextPlaceholders(ctx);
    }
  };

  const drawTextPlaceholders = (ctx: CanvasRenderingContext2D) => {
    textPlaceholders.forEach(placeholder => {
      const { position, style } = placeholder;
      const text = placeholder.id; // Use placeholder ID as display text
      const x = position.x * scale;
      const y = position.y * scale;
      const fontSize = (style.fontSize || 24) * scale;
      const color = style.color || '#000000';
      const align = style.align || 'left';

      ctx.font = `${style.fontWeight || 'normal'} ${fontSize}px ${style.fontFamily || 'Arial'}`;
      ctx.fillStyle = color;
      ctx.textAlign = align as CanvasTextAlign;
      ctx.textBaseline = 'top';

      // Draw background if specified
      if (style.backgroundColor) {
        const textWidth = ctx.measureText(text).width;
        const textHeight = fontSize;
        const padding = style.padding || { x: 0, y: 0 };
        const bgX = align === 'center' ? x - textWidth / 2 - padding.x :
                   align === 'right' ? x - textWidth - padding.x : x - padding.x;
        const bgY = y - padding.y;
        const bgWidth = textWidth + (padding.x * 2);
        const bgHeight = textHeight + (padding.y * 2);

        ctx.fillStyle = style.backgroundColor;
        if (style.borderRadius) {
          ctx.beginPath();
          ctx.roundRect(bgX, bgY, bgWidth, bgHeight, style.borderRadius * scale);
          ctx.fill();
        } else {
          ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        }
        ctx.fillStyle = color;
      }

      // Draw text
      ctx.fillText(text, x, y);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const response = await mediaService.uploadMedia({
        file,
        tags: ['template-background'],
        description: 'Template background image'
      });

      if (response.success && response.data) {
        setBackgroundImageUrl(response.data.file_url);
        toast.success('Background image uploaded!');
      }
    } catch (error: any) {
      // Handle rate limiting specifically
      if (error.response?.status === 429) {
        toast.error('Too many requests. Please wait a moment and try again, or use a direct image URL instead.');
      } else {
        toast.error(error.response?.data?.error || error.message || 'Failed to upload image');
      }
    }
  };

  const handleCanvaImport = async (url: string, name: string, type: 'image' | 'video') => {
    try {
      if (type === 'video') {
        toast.error('Videos are not supported as template backgrounds. Please select an image.');
        return;
      }
      await mediaService.importFromUrl(url, {
        name,
        tags: ['canva', 'template-background']
      });
      setBackgroundImageUrl(url);
      setShowCanvaImport(false);
      toast.success('Canva design imported as background!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to import from Canva');
    }
  };

  const handleAddPlaceholder = (type: 'headline' | 'description' | 'cta') => {
    const newPlaceholder: TextPlaceholder = {
      id: type,
      type,
      position: { x: canvasWidth / 2, y: 200 + (textPlaceholders.length * 150) },
      size: { width: 800, height: 100 },
      style: {
        fontFamily: 'Arial',
        fontSize: type === 'headline' ? 48 : type === 'cta' ? 24 : 32,
        fontWeight: type === 'headline' || type === 'cta' ? 'bold' : 'normal',
        color: '#FFFFFF',
        align: 'center',
        maxLines: type === 'headline' ? 2 : type === 'cta' ? 1 : 3,
        shadow: true
      }
    };

    setTextPlaceholders([...textPlaceholders, newPlaceholder]);
    setSelectedPlaceholder(newPlaceholder.id);
  };

  const handleDeletePlaceholder = (id: string) => {
    setTextPlaceholders(textPlaceholders.filter(p => p.id !== id));
    if (selectedPlaceholder === id) {
      setSelectedPlaceholder(null);
    }
  };

  const handlePlaceholderStyleChange = (id: string, field: string, value: any) => {
    setTextPlaceholders(textPlaceholders.map(p => {
      if (p.id === id) {
        return {
          ...p,
          style: {
            ...p.style,
            [field]: value
          }
        };
      }
      return p;
    }));
  };

  const handleMouseDown = (e: React.MouseEvent, placeholderId: string) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const placeholder = textPlaceholders.find(p => p.id === placeholderId);
    if (!placeholder) return;

    setDragOffset({
      x: x - placeholder.position.x,
      y: y - placeholder.position.y
    });
    setDragging(placeholderId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale - dragOffset.x;
    const y = (e.clientY - rect.top) / scale - dragOffset.y;

    setTextPlaceholders(textPlaceholders.map(p => {
      if (p.id === dragging) {
        return {
          ...p,
          position: { x: Math.max(0, Math.min(canvasWidth, x)), y: Math.max(0, Math.min(canvasHeight, y)) }
        };
      }
      return p;
    }));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (!backgroundImageUrl) {
      toast.error('Please add a background image');
      return;
    }

    if (textPlaceholders.length === 0) {
      toast.error('Please add at least one text placeholder');
      return;
    }

    setSaving(true);

    try {
      const layoutConfig: LayoutConfig = {
        textPlaceholders
      };

      // For createTemplate, use camelCase as expected by the service
      const createTemplateData = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        backgroundImageUrl,
        backgroundColor,
        layoutConfig,
        platforms,
        aspectRatios: ['1:1'],
        defaultDimensions: { width: canvasWidth, height: canvasHeight }
      };

      // For updateTemplate, use snake_case as expected by the backend
      const updateTemplateData = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        background_image_url: backgroundImageUrl,
        background_color: backgroundColor,
        layout_config: layoutConfig,
        platforms,
        aspect_ratios: ['1:1'],
        default_dimensions: { width: canvasWidth, height: canvasHeight }
      };

      let savedTemplate;
      if (template?.id) {
        // Update existing - use snake_case
        const response = await templateAdService.updateTemplate(template.id, updateTemplateData);
        savedTemplate = response.data;
      } else {
        // Create new - use camelCase
        const response = await templateAdService.createTemplate(createTemplateData);
        savedTemplate = response.data;
      }

      toast.success(template?.id ? 'Template updated!' : 'Template created!');
      if (onSave) {
        onSave(savedTemplate);
      }
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const selectedPlaceholderData = textPlaceholders.find(p => p.id === selectedPlaceholder);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {template ? 'Edit Template' : 'Create New Template'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Design your ad template with text placeholders
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Canvas */}
          <div className="flex-1 p-6 overflow-auto bg-gray-100">
            <div className="bg-white rounded-lg shadow-lg p-4 inline-block">
              <div
                ref={containerRef}
                className="relative border-2 border-gray-300"
                style={{ width: canvasWidth * scale, height: canvasHeight * scale }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <canvas
                  ref={canvasRef}
                  width={canvasWidth * scale}
                  height={canvasHeight * scale}
                  className="block"
                />
                
                {/* Text Placeholder Overlays */}
                {textPlaceholders.map(placeholder => (
                  <div
                    key={placeholder.id}
                    onClick={() => setSelectedPlaceholder(placeholder.id)}
                    onMouseDown={(e) => handleMouseDown(e, placeholder.id)}
                    className={`absolute border-2 border-dashed cursor-move ${
                      selectedPlaceholder === placeholder.id
                        ? 'border-purple-500 bg-purple-100 bg-opacity-20'
                        : 'border-gray-400 bg-transparent'
                    }`}
                    style={{
                      left: placeholder.position.x * scale,
                      top: placeholder.position.y * scale,
                      width: placeholder.size?.width ? placeholder.size.width * scale : 200,
                      height: placeholder.size?.height ? placeholder.size.height * scale : 50
                    }}
                  >
                    <div className="absolute -top-6 left-0 text-xs bg-purple-600 text-white px-2 py-1 rounded">
                      {placeholder.id}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Controls */}
          <div className="w-96 border-l bg-gray-50 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Template Info</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Product Showcase"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Template description..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                    >
                      <option value="product_showcase">Product Showcase</option>
                      <option value="promotional">Promotional</option>
                      <option value="testimonial">Testimonial</option>
                      <option value="educational">Educational</option>
                      <option value="brand">Brand</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Background Image */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Background</h3>
                <div className="space-y-3">
                  {backgroundImageUrl ? (
                    <div className="relative">
                      <img
                        src={backgroundImageUrl}
                        alt="Background"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setBackgroundImageUrl('')}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">No background image</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <label className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-center cursor-pointer hover:bg-purple-700 transition">
                        <Upload className="w-4 h-4 inline mr-2" />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        onClick={() => setShowMediaSelector(true)}
                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                      >
                        <Layers className="w-4 h-4 inline mr-2" />
                        Media
                      </button>
                      <button
                        onClick={() => setShowCanvaImport(true)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        <ImageIcon className="w-4 h-4 inline mr-2" />
                        Canva
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                      >
                        {showUrlInput ? 'Hide' : 'Use Image URL'}
                      </button>
                    </div>
                    {showUrlInput && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          placeholder="Paste image URL here..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        />
                        <button
                          onClick={() => {
                            if (imageUrlInput.trim()) {
                              setBackgroundImageUrl(imageUrlInput.trim());
                              setImageUrlInput('');
                              setShowUrlInput(false);
                              toast.success('Image URL set!');
                            } else {
                              toast.error('Please enter a valid URL');
                            }
                          }}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          Use This URL
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Placeholders */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Text Placeholders</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAddPlaceholder('headline')}
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                    >
                      + Headline
                    </button>
                    <button
                      onClick={() => handleAddPlaceholder('description')}
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                    >
                      + Description
                    </button>
                    <button
                      onClick={() => handleAddPlaceholder('cta')}
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                    >
                      + CTA
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {textPlaceholders.map(placeholder => (
                    <div
                      key={placeholder.id}
                      onClick={() => setSelectedPlaceholder(placeholder.id)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                        selectedPlaceholder === placeholder.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-gray-900">{placeholder.id}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePlaceholder(placeholder.id);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600">
                        {placeholder.position.x}, {placeholder.position.y}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Style Editor */}
              {selectedPlaceholderData && selectedPlaceholder && (() => {
                const placeholderId = selectedPlaceholder; // Capture in closure
                return (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Style Editor</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                      <input
                        type="number"
                        value={selectedPlaceholderData.style.fontSize || 24}
                        onChange={(e) => handlePlaceholderStyleChange(placeholderId, 'fontSize', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        min="12"
                        max="120"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
                      <select
                        value={selectedPlaceholderData.style.fontFamily || 'Arial'}
                        onChange={(e) => handlePlaceholderStyleChange(placeholderId, 'fontFamily', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Courier New">Courier New</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Font Weight</label>
                      <select
                        value={selectedPlaceholderData.style.fontWeight || 'normal'}
                        onChange={(e) => handlePlaceholderStyleChange(placeholderId, 'fontWeight', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selectedPlaceholderData.style.color || '#000000'}
                          onChange={(e) => handlePlaceholderStyleChange(placeholderId, 'color', e.target.value)}
                          className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedPlaceholderData.style.color || '#000000'}
                          onChange={(e) => handlePlaceholderStyleChange(placeholderId, 'color', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alignment</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePlaceholderStyleChange(placeholderId, 'align', 'left')}
                          className={`flex-1 px-3 py-2 rounded-lg border ${
                            selectedPlaceholderData.style.align === 'left'
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          <AlignLeft className="w-4 h-4 mx-auto" />
                        </button>
                        <button
                          onClick={() => handlePlaceholderStyleChange(placeholderId, 'align', 'center')}
                          className={`flex-1 px-3 py-2 rounded-lg border ${
                            selectedPlaceholderData.style.align === 'center'
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          <AlignCenter className="w-4 h-4 mx-auto" />
                        </button>
                        <button
                          onClick={() => handlePlaceholderStyleChange(placeholderId, 'align', 'right')}
                          className={`flex-1 px-3 py-2 rounded-lg border ${
                            selectedPlaceholderData.style.align === 'right'
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          <AlignRight className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Background Color (Optional)</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selectedPlaceholderData.style.backgroundColor || '#000000'}
                          onChange={(e) => handlePlaceholderStyleChange(placeholderId, 'backgroundColor', e.target.value)}
                          className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedPlaceholderData.style.backgroundColor || ''}
                          onChange={(e) => handlePlaceholderStyleChange(placeholderId, 'backgroundColor', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                          placeholder="Leave empty for transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedPlaceholderData.style.shadow || false}
                          onChange={(e) => handlePlaceholderStyleChange(placeholderId, 'shadow', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">Text Shadow</span>
                      </label>
                    </div>
                  </div>
                </div>
                );
              })()}

              {/* Platforms */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Platforms</h3>
                <div className="space-y-2">
                  {['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'].map(platform => (
                    <label key={platform} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={platforms.includes(platform)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPlatforms([...platforms, platform]);
                          } else {
                            setPlatforms(platforms.filter(p => p !== platform));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700 capitalize">{platform}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !backgroundImageUrl}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </div>
      </div>

      {/* Media Selector Modal */}
      {showMediaSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Select Background Image</h3>
              <button onClick={() => setShowMediaSelector(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">Media selector coming soon. Use upload or Canva for now.</p>
            <button
              onClick={() => setShowMediaSelector(false)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Canva Import Modal */}
      {showCanvaImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Import from Canva</h3>
              <button onClick={() => setShowCanvaImport(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <CanvaQuickImport
              onImport={handleCanvaImport}
              onClose={() => setShowCanvaImport(false)}
              showStockSearch={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateDesigner;
