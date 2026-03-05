import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import characterService, { Character, CharacterCreateRequest } from '@/services/characterService';
import { X, Upload, Image as ImageIcon, Loader } from 'lucide-react';

interface CharacterCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (character: Character) => void;
}

const CharacterCreationModal: React.FC<CharacterCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('Please select image files');
      return;
    }

    if (images.length + imageFiles.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }

    // Check file sizes (50MB per file limit)
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const oversizedFiles = imageFiles.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      toast.error(`Some files exceed 50MB limit. Please compress your images. Largest file: ${(Math.max(...oversizedFiles.map(f => f.size)) / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    setImages(prev => [...prev, ...imageFiles]);
    
    // Create preview URLs
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setImageUrls(prev => [...prev, url]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadImages = async () => {
    if (images.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    setIsUploading(true);
    try {
      const response = await characterService.uploadCharacterImages(images);
      if (response.success && response.data) {
        toast.success(`${response.data.count} image(s) uploaded successfully`);
        // Images are now uploaded, we'll use the URLs from the response
        // But for now, we'll keep the local previews
      }
    } catch (error: any) {
      // Handle 413 errors specifically
      if (error.response?.status === 413 || error.message?.includes('413') || error.message?.includes('Request Entity Too Large')) {
        toast.error('File too large. Please compress your images. Maximum size: 50MB per file.');
      } else {
        toast.error(error.response?.data?.details || error.message || 'Failed to upload images');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateCharacter = async () => {
    if (!name.trim()) {
      toast.error('Character name is required');
      return;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setIsCreating(true);
    try {
      // First upload images
      const uploadResponse = await characterService.uploadCharacterImages(images);
      if (!uploadResponse.success || !uploadResponse.data) {
        throw new Error('Failed to upload images');
      }

      // Then create character with uploaded image URLs
      const characterData: CharacterCreateRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        creationMethod: images.length > 1 ? 'images' : 'single_image',
        imageUrls: uploadResponse.data.imageUrls,
        tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
        visibility,
        metadata: {}
      };

      const response = await characterService.createCharacter(characterData);
      if (response.success && response.data) {
        toast.success('Character created successfully!');
        onSuccess?.(response.data);
        handleClose();
      }
    } catch (error: any) {
      // Handle 413 errors specifically
      if (error.response?.status === 413 || error.message?.includes('413') || error.message?.includes('Request Entity Too Large')) {
        toast.error('File too large. Please compress your images. Maximum size: 50MB per file.');
      } else {
        toast.error(error.response?.data?.details || error.message || 'Failed to create character');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setTags('');
    setVisibility('private');
    setImages([]);
    setImageUrls([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Create Character</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Character Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Character Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full"
              placeholder="Enter character name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field w-full h-24"
              placeholder="Describe the character..."
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Character Images * (1-10 images)
            </label>
            <div className="space-y-4">
              {/* Image Preview Grid */}
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-600"
                      />
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 flex items-center justify-center space-x-2"
                >
                  <Upload className="w-5 h-5" />
                  <span>Select Images</span>
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Upload 1-10 images of your character. More images = better consistency.
                </p>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="input-field w-full"
              placeholder="e.g., fantasy, warrior, female"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Visibility
            </label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={(e) => setVisibility(e.target.value as 'private' | 'public')}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600"
                />
                <span className="text-sm text-gray-300">Private (Only you)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={(e) => setVisibility(e.target.value as 'private' | 'public')}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600"
                />
                <span className="text-sm text-gray-300">Public (Community library)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCharacter}
              disabled={isCreating || isUploading || !name.trim() || images.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center space-x-2"
            >
              {isCreating || isUploading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  <span>Create Character</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreationModal;

