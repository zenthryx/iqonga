import React, { useState } from 'react';
import { imageService, VideoGenerationRequest, GeneratedVideo } from '@/services/imageService';
import VideoGallery from '@/components/Videos/VideoGallery';
import YouTubePostModal from '@/components/YouTube/YouTubePostModal';
import CharacterLibrary from '@/components/Characters/CharacterLibrary';
import { Character } from '@/services/characterService';
import toast from 'react-hot-toast';
import { Video, Image, Maximize2, Film, Youtube, User, X } from 'lucide-react';
import { useServicePricing } from '@/hooks/useServicePricing';

type TabType = 'text-to-video' | 'extend' | 'ingredients' | 'frames';

const VideoGeneration: React.FC = () => {
  // Pricing hooks
  const { getPricing, calculateCost } = useServicePricing();
  const videoScriptPricing = getPricing('video_generation_script');
  const videoActualPricing = getPricing('video_generation_actual');
  const videoExtensionPricing = getPricing('video_generation_extension');
  const videoIngredientsPricing = getPricing('video_generation_ingredients');
  const videoFramesPricing = getPricing('video_generation_frames');
  
  const [activeTab, setActiveTab] = useState<TabType>('text-to-video');
  
  // Text-to-Video state
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [style, setStyle] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [generateActualVideo, setGenerateActualVideo] = useState(false);
  const [videoProvider, setVideoProvider] = useState<'runwayml' | 'veo3.1'>('runwayml');
  const [quality, setQuality] = useState<'fast' | 'standard'>('standard');
  const [cameraControl, setCameraControl] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  
  // Scene Extension state
  const [extensionVideoUrl, setExtensionVideoUrl] = useState('');
  const [extensionPrompt, setExtensionPrompt] = useState('');
  const [extensionDuration, setExtensionDuration] = useState(5);
  const [extensionStyle, setExtensionStyle] = useState('cinematic');
  
  // Ingredients to Video state
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [ingredientsPrompt, setIngredientsPrompt] = useState('');
  const [ingredientsDuration, setIngredientsDuration] = useState(5);
  const [ingredientsStyle, setIngredientsStyle] = useState('cinematic');
  const [ingredientsQuality, setIngredientsQuality] = useState<'fast' | 'standard'>('standard');
  const [selectedCharacterForIngredients, setSelectedCharacterForIngredients] = useState<Character | null>(null);
  
  // First and Last Frame state
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [framesPrompt, setFramesPrompt] = useState('');
  const [framesDuration, setFramesDuration] = useState(5);
  const [framesStyle, setFramesStyle] = useState('cinematic');
  const [framesQuality, setFramesQuality] = useState<'fast' | 'standard'>('standard');
  
  // Common state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const [refreshGallery, setRefreshGallery] = useState(0);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [selectedVideoForYouTube, setSelectedVideoForYouTube] = useState<GeneratedVideo | null>(null);

  // Handle image upload for reference images
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      
      if (activeTab === 'ingredients') {
        if (index !== undefined) {
          const newImages = [...referenceImages];
          newImages[index] = base64;
          setReferenceImages(newImages);
        } else if (referenceImages.length < 3) {
          setReferenceImages([...referenceImages, base64]);
        } else {
          toast.error('Maximum 3 reference images allowed');
        }
      } else if (activeTab === 'frames') {
        if (index === 0) {
          setFirstFrame(base64);
        } else if (index === 1) {
          setLastFrame(base64);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Text-to-Video generation
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await imageService.generateVideo({
        prompt,
        duration,
        style,
        audio: false,
        generateActualVideo: generateActualVideo,
        videoProvider: videoProvider,
        quality: quality,
        cameraControl: cameraControl || undefined,
        characterId: selectedCharacter ? selectedCharacter.id : undefined
      });

      if (response.success && response.data) {
        setGeneratedVideo(response.data as any);
        if (response.data.videoUrl) {
          toast.success('Video generated successfully!');
        } else {
          toast.success('Video script generated successfully!');
        }
        setRefreshGallery(prev => prev + 1);
      }
    } catch (error: any) {
      // Don't show duplicate toast if API interceptor already handled it
      if (error?._handledByInterceptor || error?.response?.status === 402) {
        return;
      }
      toast.error(error.message || 'Failed to generate video. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Scene Extension
  const handleExtendVideo = async () => {
    if (!extensionVideoUrl.trim() || !extensionPrompt.trim()) {
      toast.error('Please provide video URL and extension prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await imageService.extendVideo(extensionVideoUrl, extensionPrompt, {
        duration: extensionDuration,
        style: extensionStyle
      });

      if (response.success && response.data) {
        setGeneratedVideo(response.data as any);
        toast.success('Video extended successfully!');
        setRefreshGallery(prev => prev + 1);
      }
    } catch (error: any) {
      // Don't show duplicate toast if API interceptor already handled it
      if (error?._handledByInterceptor || error?.response?.status === 402) {
        return;
      }
      toast.error(error.message || 'Failed to extend video. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Ingredients to Video
  const handleIngredientsToVideo = async () => {
    if (!selectedCharacterForIngredients && referenceImages.length === 0) {
      toast.error('Please upload at least one reference image or select a character');
      return;
    }
    if (!ingredientsPrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      // Use character images if character is selected, otherwise use uploaded images
      const imagesToUse = selectedCharacterForIngredients?.imageUrls || referenceImages;
      
      if (imagesToUse.length === 0) {
        toast.error('Please upload images or select a character');
        return;
      }

      const response = await imageService.generateFromIngredients(imagesToUse, ingredientsPrompt, {
        duration: ingredientsDuration,
        style: ingredientsStyle,
        aspectRatio: '16:9',
        quality: ingredientsQuality,
        characterId: selectedCharacterForIngredients ? selectedCharacterForIngredients.id : undefined
      });

      if (response.success && response.data) {
        setGeneratedVideo(response.data as any);
        toast.success('Video generated from ingredients successfully!');
        setRefreshGallery(prev => prev + 1);
      }
    } catch (error: any) {
      // Don't show duplicate toast if API interceptor already handled it
      if (error?._handledByInterceptor || error?.response?.status === 402) {
        return;
      }
      toast.error(error.message || 'Failed to generate video. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // First and Last Frame
  const handleFramesToVideo = async () => {
    if (!firstFrame || !lastFrame) {
      toast.error('Please upload both first and last frame images');
      return;
    }
    if (!framesPrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await imageService.generateFromFrames(firstFrame, lastFrame, framesPrompt, {
        duration: framesDuration,
        style: framesStyle,
        aspectRatio: '16:9',
        quality: framesQuality
      });

      if (response.success && response.data) {
        setGeneratedVideo(response.data as any);
        toast.success('Video transition generated successfully!');
        setRefreshGallery(prev => prev + 1);
      }
    } catch (error: any) {
      // Don't show duplicate toast if API interceptor already handled it
      if (error?._handledByInterceptor || error?.response?.status === 402) {
        return;
      }
      toast.error(error.message || 'Failed to generate video. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">AI Video Generation</h1>
        <p className="text-gray-400 mt-1">
          Create videos with AI-powered generation using Veo 3.1, RunwayML, and Flow features
        </p>
      </div>

      {/* Tabs */}
      <div className="glass-card p-6">
        <div className="flex space-x-2 border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('text-to-video')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'text-to-video'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Video className="w-4 h-4 inline mr-2" />
            Text to Video
          </button>
          <button
            onClick={() => setActiveTab('extend')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'extend'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Maximize2 className="w-4 h-4 inline mr-2" />
            Scene Extension
          </button>
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'ingredients'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Image className="w-4 h-4 inline mr-2" />
            Ingredients to Video
          </button>
          <button
            onClick={() => setActiveTab('frames')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'frames'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Film className="w-4 h-4 inline mr-2" />
            First & Last Frame
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'text-to-video' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="input-field w-full h-24"
                placeholder="Describe the video you want to generate..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 5)}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Style
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="cinematic">Cinematic</option>
                  <option value="documentary">Documentary</option>
                  <option value="animated">Animated</option>
                  <option value="corporate">Corporate</option>
                  <option value="social-media">Social Media</option>
                  <option value="artistic">Artistic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Aspect Ratio
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="16:9">16:9 (Widescreen)</option>
                  <option value="9:16">9:16 (Vertical)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="4:3">4:3 (Standard)</option>
                </select>
              </div>
            </div>

            {/* Character Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Character (Optional)
              </label>
              <div className="flex gap-2 items-center">
                {selectedCharacter ? (
                  <div className="flex items-center space-x-2 bg-gray-700 rounded-lg p-2 flex-1">
                    {selectedCharacter.previewImageUrl && (
                      <img
                        src={selectedCharacter.previewImageUrl}
                        alt={selectedCharacter.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    <span className="text-white flex-1">{selectedCharacter.name}</span>
                    <button
                      onClick={() => setSelectedCharacter(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCharacterSelector(!showCharacterSelector)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center space-x-2"
                  >
                    <User className="w-4 h-4" />
                    <span>Select Character</span>
                  </button>
                )}
              </div>
              {showCharacterSelector && (
                <div className="mt-4 glass-card p-4 max-h-96 overflow-y-auto">
                  <CharacterLibrary
                    showSelection={true}
                    selectedCharacterId={selectedCharacter ? selectedCharacter.id : null}
                    onCharacterSelect={(character) => {
                      setSelectedCharacter(character);
                      setShowCharacterSelector(false);
                      toast.success(`Character "${character.name}" selected`);
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Select a character to maintain consistency across video generations
              </p>
            </div>

            {/* Video Provider Selection - Always visible when generating actual video */}
            {generateActualVideo && (
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm text-blue-300 mb-3">
                    <strong>Video Generation Provider:</strong> Choose between RunwayML or Google Veo 3.1 for scene video generation.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Video Provider *
                    </label>
                    <select
                      value={videoProvider}
                      onChange={(e) => setVideoProvider(e.target.value as 'runwayml' | 'veo3.1')}
                      className="input-field w-full"
                    >
                      <option value="runwayml">RunwayML</option>
                      <option value="veo3.1">Veo 3.1 (Google)</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      {videoProvider === 'runwayml' 
                        ? 'Fast generation with good quality' 
                        : 'High quality with advanced features'}
                    </p>
                  </div>

                  {videoProvider === 'veo3.1' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Quality
                      </label>
                      <select
                        value={quality}
                        onChange={(e) => setQuality(e.target.value as 'fast' | 'standard')}
                        className="input-field w-full"
                      >
                        <option value="fast">Fast</option>
                        <option value="standard">Standard</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Camera Control (Optional)
                    </label>
                    <input
                      type="text"
                      value={cameraControl}
                      onChange={(e) => setCameraControl(e.target.value)}
                      className="input-field w-full"
                      placeholder="e.g., slow zoom in, pan left"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateActualVideo}
                  onChange={(e) => setGenerateActualVideo(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">
                  Generate actual video (requires video generation API - costs {videoActualPricing ? videoActualPricing.displayText : 'credits'})
                </span>
              </label>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="btn-primary"
              >
                {isGenerating ? 'Generating...' : generateActualVideo ? '🎬 Generate Video' : '📝 Generate Video Script'}
              </button>
            </div>
          </div>
        )}

        {/* Scene Extension Tab */}
        {activeTab === 'extend' && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>Scene Extension:</strong> Extend an existing video to create longer clips. The new video will seamlessly connect to the end of your original video.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Video URL (from generated videos)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={extensionVideoUrl}
                  onChange={(e) => setExtensionVideoUrl(e.target.value)}
                  className="input-field flex-1"
                  placeholder="/uploads/videos/generated/..."
                />
                <button
                  onClick={() => {
                    // Open a modal or dropdown to select from gallery
                    // For now, just show a message
                    toast('Click on a video in the gallery below to use its URL', {
                      icon: 'ℹ️',
                      duration: 3000
                    });
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                >
                  Select from Gallery
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Paste the video URL from your generated videos gallery, or click "Select from Gallery"</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Extension Prompt
              </label>
              <textarea
                value={extensionPrompt}
                onChange={(e) => setExtensionPrompt(e.target.value)}
                className="input-field w-full h-24"
                placeholder="Describe how the video should continue..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Extension Duration (seconds)
                </label>
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={extensionDuration}
                  onChange={(e) => setExtensionDuration(parseInt(e.target.value) || 5)}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Style
                </label>
                <select
                  value={extensionStyle}
                  onChange={(e) => setExtensionStyle(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="cinematic">Cinematic</option>
                  <option value="documentary">Documentary</option>
                  <option value="animated">Animated</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleExtendVideo}
              disabled={isGenerating}
              className="btn-primary w-full"
            >
              {isGenerating ? 'Extending Video...' : `🎬 Extend Video (${videoExtensionPricing ? videoExtensionPricing.displayText : 'credits'})`}
            </button>
          </div>
        )}

        {/* Ingredients to Video Tab */}
        {activeTab === 'ingredients' && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>Ingredients to Video:</strong> Generate video from up to 3 reference images. Perfect for maintaining character consistency or applying a specific style.
              </p>
            </div>

            {/* Character Selection for Ingredients */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Character (Optional - Use character images instead of uploading)
              </label>
              <div className="flex gap-2 items-center mb-2">
                {selectedCharacterForIngredients ? (
                  <div className="flex items-center space-x-2 bg-gray-700 rounded-lg p-2 flex-1">
                    {selectedCharacterForIngredients.previewImageUrl && (
                      <img
                        src={selectedCharacterForIngredients.previewImageUrl}
                        alt={selectedCharacterForIngredients.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    <span className="text-white flex-1">{selectedCharacterForIngredients.name}</span>
                    <button
                      onClick={() => {
                        setSelectedCharacterForIngredients(null);
                        setReferenceImages([]);
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      // Toggle character selector
                      toast('Select a character from the library below to use its images', {
                        icon: 'ℹ️',
                        duration: 3000
                      });
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center space-x-2"
                  >
                    <User className="w-4 h-4" />
                    <span>Select Character</span>
                  </button>
                )}
              </div>
              {!selectedCharacterForIngredients && (
                <div className="mb-4 max-h-64 overflow-y-auto">
                  <CharacterLibrary
                    showSelection={true}
                    selectedCharacterId={null}
                    onCharacterSelect={(character) => {
                      setSelectedCharacterForIngredients(character);
                      setReferenceImages([]); // Clear uploaded images when character is selected
                      toast.success(`Character "${character.name}" selected`);
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-gray-400 mb-2">
                Select a character to use its images, or upload your own reference images below
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reference Images (up to 3) {selectedCharacterForIngredients && '(Character images will be used instead)'}
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="relative">
                    {referenceImages[index] ? (
                      <div className="relative">
                        <img
                          src={referenceImages[index]}
                          alt={`Reference ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-600"
                        />
                        <button
                          onClick={() => {
                            const newImages = [...referenceImages];
                            newImages.splice(index, 1);
                            setReferenceImages(newImages);
                          }}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg ${selectedCharacterForIngredients ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-500'}`}>
                        <Image className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-xs text-gray-400">
                          {selectedCharacterForIngredients ? 'Character selected' : 'Upload Image'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={!!selectedCharacterForIngredients}
                          onChange={(e) => handleImageUpload(e, index)}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Prompt
              </label>
              <textarea
                value={ingredientsPrompt}
                onChange={(e) => setIngredientsPrompt(e.target.value)}
                className="input-field w-full h-24"
                placeholder="Describe the video you want to generate using these reference images..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={ingredientsDuration}
                  onChange={(e) => setIngredientsDuration(parseInt(e.target.value) || 5)}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Style
                </label>
                <select
                  value={ingredientsStyle}
                  onChange={(e) => setIngredientsStyle(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="cinematic">Cinematic</option>
                  <option value="documentary">Documentary</option>
                  <option value="animated">Animated</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quality
                </label>
                <select
                  value={ingredientsQuality}
                  onChange={(e) => setIngredientsQuality(e.target.value as 'fast' | 'standard')}
                  className="input-field w-full"
                >
                  <option value="fast">Fast</option>
                  <option value="standard">Standard</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleIngredientsToVideo}
              disabled={isGenerating}
              className="btn-primary w-full"
            >
              {isGenerating ? 'Generating...' : '🎬 Generate from Ingredients (400 credits)'}
            </button>
          </div>
        )}

        {/* First and Last Frame Tab */}
        {activeTab === 'frames' && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>First and Last Frame:</strong> Create smooth video transitions between two images. Veo 3.1 will generate the transition with accompanying audio.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Frame
                </label>
                {firstFrame ? (
                  <div className="relative">
                    <img
                      src={firstFrame}
                      alt="First frame"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-600"
                    />
                    <button
                      onClick={() => setFirstFrame(null)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-gray-500">
                    <Image className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-400">Upload First Frame</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 0)}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Frame
                </label>
                {lastFrame ? (
                  <div className="relative">
                    <img
                      src={lastFrame}
                      alt="Last frame"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-600"
                    />
                    <button
                      onClick={() => setLastFrame(null)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-gray-500">
                    <Image className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-400">Upload Last Frame</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 1)}
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Transition Prompt
              </label>
              <textarea
                value={framesPrompt}
                onChange={(e) => setFramesPrompt(e.target.value)}
                className="input-field w-full h-24"
                placeholder="Describe how the video should transition from first to last frame..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={framesDuration}
                  onChange={(e) => setFramesDuration(parseInt(e.target.value) || 5)}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Style
                </label>
                <select
                  value={framesStyle}
                  onChange={(e) => setFramesStyle(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="cinematic">Cinematic</option>
                  <option value="documentary">Documentary</option>
                  <option value="animated">Animated</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quality
                </label>
                <select
                  value={framesQuality}
                  onChange={(e) => setFramesQuality(e.target.value as 'fast' | 'standard')}
                  className="input-field w-full"
                >
                  <option value="fast">Fast</option>
                  <option value="standard">Standard</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleFramesToVideo}
              disabled={isGenerating}
              className="btn-primary w-full"
            >
              {isGenerating ? 'Generating Transition...' : '🎬 Generate Transition (400 credits)'}
            </button>
          </div>
        )}
      </div>

      {/* Generated Video Script */}
      {generatedVideo && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">
            {generatedVideo.videoUrl ? 'Generated Video' : 'Generated Video Script'}
          </h2>
          
          {generatedVideo.note && (
            <div className={`rounded-lg p-4 ${
              generatedVideo.videoUrl 
                ? 'bg-green-500/10 border border-green-500/20' 
                : 'bg-blue-500/10 border border-blue-500/20'
            }`}>
              <p className={`text-sm ${generatedVideo.videoUrl ? 'text-green-300' : 'text-blue-300'}`}>
                {generatedVideo.note}
              </p>
            </div>
          )}

          {/* Video Player */}
          {generatedVideo.videoUrl && (
            <div className="w-full">
              <video
                controls
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: '600px' }}
                preload="metadata"
              >
                <source src={generatedVideo.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="mt-2 text-sm text-gray-400">
                <a 
                  href={generatedVideo.videoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Download Video
                </a>
              </div>
            </div>
          )}

          {generatedVideo.videoScript && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Video Script</h3>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-300 whitespace-pre-wrap">{generatedVideo.videoScript}</p>
                </div>
              </div>

              {generatedVideo.storyboard && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Storyboard</h3>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-gray-300 whitespace-pre-wrap">{generatedVideo.storyboard}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Duration:</span>
              <span className="text-white ml-2">{generatedVideo.duration}s</span>
            </div>
            <div>
              <span className="text-gray-400">Style:</span>
              <span className="text-white ml-2 capitalize">{generatedVideo.style}</span>
            </div>
            <div>
              <span className="text-gray-400">Aspect Ratio:</span>
              <span className="text-white ml-2">{generatedVideo.aspectRatio}</span>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <span className="text-white ml-2 capitalize">{generatedVideo.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* Generated Videos Gallery */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Generated Videos</h2>
          {generatedVideo && generatedVideo.videoUrl && (
            <button
              onClick={() => {
                setSelectedVideoForYouTube(generatedVideo);
                setShowYouTubeModal(true);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Youtube className="w-4 h-4" />
              <span>Upload to YouTube</span>
            </button>
          )}
        </div>
        <VideoGallery 
          key={`gallery-${refreshGallery}`}
          onVideoSelect={(video) => {
            // If in extend tab, auto-fill the video URL
            if (activeTab === 'extend' && video.videoUrl) {
              setExtensionVideoUrl(video.videoUrl);
              toast.success('Video URL selected for extension');
            } else if (video.videoUrl) {
              // Allow selecting video for YouTube upload
              setSelectedVideoForYouTube(video);
            }
          }}
        />
      </div>

      {/* YouTube Upload Modal */}
      <YouTubePostModal
        isOpen={showYouTubeModal}
        onClose={() => {
          setShowYouTubeModal(false);
          setSelectedVideoForYouTube(null);
        }}
        selectedVideo={selectedVideoForYouTube}
        onSuccess={() => {
          toast.success('Video uploaded to YouTube successfully!');
          setRefreshGallery(prev => prev + 1);
        }}
      />
    </div>
  );
};

export default VideoGeneration;

