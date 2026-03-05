import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import characterService, { AvatarLook } from '@/services/characterService';
import { apiService } from '@/services/api';
import { X, Plus, Image as ImageIcon, Video, Edit, Trash2, Star, StarOff, Upload, Loader, Layers } from 'lucide-react';

interface AvatarLookManagementProps {
  characterId: string;
  onClose: () => void;
}

const AvatarLookManagement: React.FC<AvatarLookManagementProps> = ({
  characterId,
  onClose
}) => {
  const [looks, setLooks] = useState<AvatarLook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLook, setEditingLook] = useState<AvatarLook | null>(null);
  
  // Add/Edit form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lookType, setLookType] = useState<'photo' | 'video'>('photo');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [outfitType, setOutfitType] = useState('');
  const [setting, setSetting] = useState('');
  const [pose, setPose] = useState('');
  const [expression, setExpression] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchLooks();
  }, [characterId]);

  const fetchLooks = async () => {
    try {
      setLoading(true);
      const response = await characterService.getAvatarLooks(characterId);
      if (response.success && response.data) {
        setLooks(response.data);
      }
    } catch (error: any) {
      toast.error('Failed to load looks');
      console.error('Error fetching looks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('Image file is too large. Maximum size: 50MB');
      return;
    }

    setImageFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadImage = async () => {
    if (!imageFile) {
      toast.error('Please select an image');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('images', imageFile);

      const response = await apiService.post('/characters/upload-images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }) as any;

      if (response.success && response.data && response.data.imageUrls.length > 0) {
        return response.data.imageUrls[0];
      }
      throw new Error('Upload failed');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload image');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveLook = async () => {
    if (!name.trim()) {
      toast.error('Look name is required');
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl = editingLook?.image_url;
      
      // Upload new image if provided
      if (imageFile && !editingLook) {
        imageUrl = await handleUploadImage();
      }

      const lookData: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        look_type: lookType,
        image_url: imageUrl,
        outfit_type: outfitType || undefined,
        setting: setting || undefined,
        pose: pose || undefined,
        expression: expression || undefined,
        is_default: isDefault,
        order_index: looks.length
      };

      if (editingLook) {
        // Update existing look
        const response = await apiService.put(`/characters/${characterId}/looks/${editingLook.id}`, lookData) as any;
        if (response.success) {
          toast.success('Look updated successfully');
          await fetchLooks();
          handleCloseModal();
        }
      } else {
        // Create new look
        const response = await apiService.post(`/characters/${characterId}/looks`, lookData) as any;
        if (response.success) {
          toast.success('Look created successfully');
          await fetchLooks();
          handleCloseModal();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save look');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLook = async (lookId: string) => {
    if (!window.confirm('Are you sure you want to delete this look?')) {
      return;
    }

    try {
      const response = await apiService.delete(`/characters/${characterId}/looks/${lookId}`) as any;
      if (response.success) {
        toast.success('Look deleted successfully');
        await fetchLooks();
      }
    } catch (error: any) {
      toast.error('Failed to delete look');
    }
  };

  const handleSetDefault = async (lookId: string) => {
    try {
      const response = await apiService.put(`/characters/${characterId}/looks/${lookId}`, {
        is_default: true
      }) as any;
      if (response.success) {
        toast.success('Default look updated');
        await fetchLooks();
      }
    } catch (error: any) {
      toast.error('Failed to set default look');
    }
  };

  const handleEditLook = (look: AvatarLook) => {
    setEditingLook(look);
    setName(look.name);
    setDescription(look.description || '');
    // Handle ai_generated type by defaulting to photo
    setLookType(look.look_type === 'ai_generated' ? 'photo' : (look.look_type === 'video' ? 'video' : 'photo'));
    setOutfitType(look.outfit_type || '');
    setSetting(look.setting || '');
    setPose(look.pose || '');
    setExpression(look.expression || '');
    setIsDefault(look.is_default);
    setImagePreview(look.image_url || look.thumbnail_url || '');
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingLook(null);
    setName('');
    setDescription('');
    setLookType('photo');
    setImageFile(null);
    setImagePreview('');
    setOutfitType('');
    setSetting('');
    setPose('');
    setExpression('');
    setIsDefault(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-white">Avatar Looks</h3>
          <p className="text-sm text-gray-400 mt-1">
            Manage multiple looks (outfits, poses, settings) for this avatar
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Look</span>
        </button>
      </div>

      {/* Looks Grid */}
      {looks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
          <Layers className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">No looks yet</p>
          <p className="text-sm text-gray-500">Add your first look to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {looks.map((look) => (
            <div
              key={look.id}
              className={`relative group bg-gray-800 rounded-lg overflow-hidden border-2 ${
                look.is_default ? 'border-yellow-500' : 'border-gray-700'
              }`}
            >
              {/* Look Preview */}
              <div className="aspect-square relative bg-black">
                {look.image_url || look.thumbnail_url ? (
                  <img
                    src={look.image_url || look.thumbnail_url}
                    alt={look.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <ImageIcon className="w-12 h-12 text-gray-600" />
                  </div>
                )}

                {/* Default Badge */}
                {look.is_default && (
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-600 text-white flex items-center space-x-1">
                      <Star className="w-3 h-3" />
                      <span>Default</span>
                    </span>
                  </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                    {!look.is_default && (
                      <button
                        onClick={() => handleSetDefault(look.id)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-medium"
                        title="Set as default"
                      >
                        <Star className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditLook(look)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteLook(look.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Look Info */}
              <div className="p-3">
                <h4 className="text-sm font-semibold text-white mb-1">{look.name}</h4>
                {look.description && (
                  <p className="text-xs text-gray-400 line-clamp-2 mb-2">{look.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {look.outfit_type && (
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                      {look.outfit_type}
                    </span>
                  )}
                  {look.setting && (
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                      {look.setting}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingLook ? 'Edit Look' : 'Add New Look'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Look Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field w-full"
                  placeholder="e.g., Casual Outfit, Office Setting"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field w-full h-24"
                  placeholder="Describe this look..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Look Type
                </label>
                <select
                  value={lookType}
                  onChange={(e) => setLookType(e.target.value as 'photo' | 'video')}
                  className="input-field w-full"
                >
                  <option value="photo">Photo</option>
                  <option value="video">Video</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Image {!editingLook && '*'}
                </label>
                {imagePreview ? (
                  <div className="space-y-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                      }}
                      className="text-red-400 text-sm hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="look-image-upload"
                    />
                    <label
                      htmlFor="look-image-upload"
                      className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-gray-500"
                    >
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <span className="text-sm text-gray-400">Click to upload image</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Outfit Type
                  </label>
                  <input
                    type="text"
                    value={outfitType}
                    onChange={(e) => setOutfitType(e.target.value)}
                    className="input-field w-full"
                    placeholder="e.g., casual, formal, athletic"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Setting
                  </label>
                  <input
                    type="text"
                    value={setting}
                    onChange={(e) => setSetting(e.target.value)}
                    className="input-field w-full"
                    placeholder="e.g., office, gym, vacation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pose
                  </label>
                  <input
                    type="text"
                    value={pose}
                    onChange={(e) => setPose(e.target.value)}
                    className="input-field w-full"
                    placeholder="e.g., standing, sitting, walking"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Expression
                  </label>
                  <input
                    type="text"
                    value={expression}
                    onChange={(e) => setExpression(e.target.value)}
                    className="input-field w-full"
                    placeholder="e.g., smiling, neutral, serious"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <span className="text-sm text-gray-300">Set as default look</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLook}
                  disabled={isSaving || isUploading || !name.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg flex items-center space-x-2"
                >
                  {isSaving || isUploading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>{isUploading ? 'Uploading...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <span>{editingLook ? 'Update Look' : 'Create Look'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarLookManagement;

