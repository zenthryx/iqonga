import React, { useState, useEffect } from 'react';
import { imageService, ImageGenerationRequest, GeneratedImage } from '@/services/imageService';
import ImageGallery from '@/components/Images/ImageGallery';
import toast from 'react-hot-toast';
import CanvaQuickImport from '@/components/Canva/CanvaQuickImport';
import { Paintbrush } from 'lucide-react';
import { mediaService } from '@/services/mediaService';

const ImageGeneration: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<ImageGenerationRequest['style']>('realistic');
  const [size, setSize] = useState<ImageGenerationRequest['size']>('512x512');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [refreshGallery, setRefreshGallery] = useState(0);
  const [showCanvaImport, setShowCanvaImport] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await imageService.generateImage({
        prompt,
        style,
        size,
        negativePrompt: negativePrompt || undefined,
        n: 1
      });

      if (response.success && response.data) {
        toast.success('Image generated successfully!');
        setRefreshGallery(prev => prev + 1); // Refresh gallery
      }
    } catch (error: any) {
      // Don't show duplicate toast if API interceptor already handled it
      if (error?._handledByInterceptor || error?.response?.status === 402) {
        return;
      }
      
      // Extract friendly message from error response if available
      const errorMessage = error?.response?.data?.friendlyMessage 
        || error?.response?.data?.message 
        || error?.response?.data?.details
        || error?.message
        || 'Failed to generate image. Please try again.';
      
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">AI Image Generation</h1>
        <p className="text-gray-400 mt-1">
          Create stunning visuals with AI-powered image generation
        </p>
      </div>

      {/* Canva Import */}
      {showCanvaImport && (
        <div className="mb-6">
          <CanvaQuickImport
            onImport={async (url, name, type) => {
              try {
                await mediaService.importFromUrl(url, {
                  name,
                  description: `Imported from Canva for image generation`,
                  tags: ['canva', 'image-gen']
                });
                toast.success(`Imported ${name} from Canva! You can use it in your prompts.`);
                setShowCanvaImport(false);
              } catch (error: any) {
                toast.error(error.message || 'Failed to import from Canva');
              }
            }}
            onClose={() => setShowCanvaImport(false)}
            showStockSearch={false}
          />
        </div>
      )}

      {/* Image Generation Form */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Generate Image</h2>
          <button
            onClick={() => setShowCanvaImport(!showCanvaImport)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
          >
            <Paintbrush className="h-4 w-4" />
            {showCanvaImport ? 'Hide' : 'Use Canva Asset'}
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="input-field w-full h-24"
              placeholder="Describe the image you want to generate..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as ImageGenerationRequest['style'])}
                className="input-field w-full"
              >
                <option value="realistic">Realistic</option>
                <option value="artistic">Artistic</option>
                <option value="anime">Anime</option>
                <option value="digital-art">Digital Art</option>
                <option value="photographic">Photographic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Size
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as ImageGenerationRequest['size'])}
                className="input-field w-full"
              >
                <option value="256x256">256x256</option>
                <option value="512x512">512x512</option>
                <option value="1024x1024">1024x1024</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Negative Prompt (Optional)
            </label>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="input-field w-full"
              placeholder="Elements to exclude from the generation..."
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-primary"
            >
              {isGenerating ? 'Generating...' : '🎨 Generate Image'}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Images Gallery */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Generated Images</h2>
        <ImageGallery key={refreshGallery} />
      </div>
    </div>
  );
};

export default ImageGeneration; 