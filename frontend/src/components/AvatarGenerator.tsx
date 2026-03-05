import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { getApiBaseUrl, resolveImageUrl } from '@/utils/domain';

interface AvatarGeneratorProps {
  agentConfig: {
    name: string;
    personality: string;
    specialization: string;
  };
  onAvatarGenerated: (avatarUrl: string) => void;
}

export default function AvatarGenerator({ agentConfig, onAvatarGenerated }: AvatarGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('realistic');
  const [size, setSize] = useState('512x512');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const generateDefaultPrompt = () => {
    const personalityMap: { [key: string]: string } = {
      'witty_troll': 'mischievous, clever, playful character with a smirk',
      'tech_sage': 'wise, tech-savvy guru with futuristic elements',
      'hype_beast': 'energetic, trendy, enthusiastic character',
      'honest_critic': 'serious, analytical, professional character',
      'quirky_observer': 'unique, observant, eccentric character'
    };

    const specializationMap: { [key: string]: string } = {
      'technology': 'surrounded by circuit boards and digital elements',
      'creative': 'artistic background with creative tools',
      'business': 'professional setting with modern office elements',
      'social': 'social media icons and communication symbols'
    };

    const personalityDesc = personalityMap[agentConfig.personality] || 'friendly AI character';
    const specializationDesc = specializationMap[agentConfig.specialization] || 'neutral background';

    return `AI assistant avatar, ${personalityDesc}, ${specializationDesc}, professional digital art style, high quality, detailed`;
  };

  const generateAvatar = async () => {
    try {
      setIsGenerating(true);
      
      const finalPrompt = prompt || generateDefaultPrompt();
      
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/content/ai/images/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          style: style,
          size: size,
          negativePrompt: negativePrompt,
          agentName: agentConfig.name
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate avatar');
      }

      const data = await response.json();
      
      if (data.success && data.imageUrl) {
        setGeneratedAvatar(data.imageUrl);
        onAvatarGenerated(data.imageUrl);
        toast.success('Avatar generated successfully!');
      } else if (data.success && data.data && data.data[0] && data.data[0].url) {
        // Fallback to data.data[0].url if imageUrl is not in root
        setGeneratedAvatar(data.data[0].url);
        onAvatarGenerated(data.data[0].url);
        toast.success('Avatar generated successfully!');
      } else {
        throw new Error(data.error || 'Failed to generate avatar');
      }

    } catch (error) {
      console.error('Avatar generation failed:', error);
      toast.error('Failed to generate avatar. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const useAvatar = () => {
    if (generatedAvatar) {
      onAvatarGenerated(generatedAvatar);
      toast.success('Avatar selected for your AI agent!');
    }
  };

  const regenerateAvatar = () => {
    setGeneratedAvatar(null);
    generateAvatar();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/content/ai/images/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      if (data.success && data.imageUrl) {
        setUploadedImage(data.imageUrl);
        onAvatarGenerated(data.imageUrl);
        toast.success('Image uploaded successfully!');
      } else {
        throw new Error(data.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const useUploadedImage = () => {
    if (uploadedImage) {
      onAvatarGenerated(uploadedImage);
      toast.success('Uploaded image selected for your AI agent!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Agent Avatar</h3>
        <p className="text-gray-400">Generate a unique avatar for your AI agent based on their personality and role</p>
      </div>

      {/* Avatar Preview */}
      <div className="flex justify-center">
        <div className="w-48 h-48 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
          {generatedAvatar ? (
            <img 
              src={resolveImageUrl(generatedAvatar) || generatedAvatar} 
              alt="Generated Avatar" 
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-2">🤖</div>
              <p className="text-gray-400 text-sm">No avatar yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Generation Controls */}
      <div className="space-y-4">
        {/* Prompt */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={generateDefaultPrompt()}
            rows={3}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm"
          />
          <button
            onClick={() => setPrompt(generateDefaultPrompt())}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Use suggested prompt
          </button>
        </div>

        {/* Style and Size */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="realistic">Realistic</option>
              <option value="digital_art">Digital Art</option>
              <option value="cartoon">Cartoon</option>
              <option value="anime">Anime</option>
              <option value="cyberpunk">Cyberpunk</option>
              <option value="minimalist">Minimalist</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Size</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="512x512">512×512</option>
              <option value="768x768">768×768</option>
              <option value="1024x1024">1024×1024</option>
            </select>
          </div>
        </div>

        {/* Negative Prompt */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Negative Prompt (Optional)
          </label>
          <input
            type="text"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="Elements to exclude from the generation..."
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Generation Buttons */}
        <div className="flex justify-center space-x-4">
          {!generatedAvatar ? (
            <button
              onClick={generateAvatar}
              disabled={isGenerating}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating Avatar...</span>
                </>
              ) : (
                <>
                  <span>🎨</span>
                  <span>Generate Avatar</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={useAvatar}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200"
              >
                ✅ Use This Avatar
              </button>
              <button
                onClick={regenerateAvatar}
                disabled={isGenerating}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Regenerating...
                  </>
                ) : (
                  '🔄 Regenerate'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Manual Image Upload Section */}
        <div className="border-t border-gray-700 pt-6 mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">📁 Or Upload Your Own Image</h3>
          
          <div className="space-y-4">
            {/* File Upload Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Upload Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-gray-400">
                Supported formats: JPG, PNG, GIF. Max size: 5MB
              </p>
            </div>

            {/* Uploaded Image Preview */}
            {uploadedImage && (
              <div className="space-y-3">
                <div className="text-center">
                  <img
                    src={resolveImageUrl(uploadedImage) || uploadedImage}
                    alt="Uploaded avatar"
                    className="w-32 h-32 rounded-lg mx-auto border-2 border-gray-600"
                  />
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={useUploadedImage}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                  >
                    ✅ Use Uploaded Image
                  </button>
                </div>
              </div>
            )}

            {/* Upload Status */}
            {isUploading && (
              <div className="text-center text-blue-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto mb-2"></div>
                Uploading image...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Generation Settings */}
      <div className="border-t border-gray-700 pt-6">
        <h4 className="text-lg font-semibold text-white mb-4">Content Generation</h4>
        <p className="text-gray-400 mb-4">Select the types of content this agent can generate and share</p>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500" />
            <span className="text-white">📝 Text Posts</span>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500" />
            <span className="text-white">🎨 AI-Generated Images</span>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500" />
            <span className="text-white">🎬 Short Video Clips</span>
          </label>
        </div>

        <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <h5 className="text-purple-300 font-medium mb-2">Content Generation Settings</h5>
          <p className="text-gray-300 text-sm">Your AI agent will be able to:</p>
          <ul className="text-gray-300 text-sm mt-2 space-y-1">
            <li>• Generate relevant images for posts</li>
            <li>• Create short video clips with animations</li>
            <li>• Adapt content format to different platforms</li>
            <li>• Adapt content format to different platforms</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 