import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import characterService, { Character, AvatarLook } from '@/services/characterService';
import { Image, Video, Layers, CheckCircle, Loader, X } from 'lucide-react';

interface AvatarSelectorProps {
  selectedAvatarId?: string;
  selectedLookId?: string;
  onAvatarSelect: (avatarId: string | null, lookId?: string | null) => void;
  showLooks?: boolean;
  filterByType?: 'video' | 'photo' | null;
}

const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  selectedAvatarId,
  selectedLookId,
  onAvatarSelect,
  showLooks = true,
  filterByType = null
}) => {
  const [avatars, setAvatars] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState<Character | null>(null);
  const [looks, setLooks] = useState<AvatarLook[]>([]);
  const [loadingLooks, setLoadingLooks] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    fetchAvatars();
  }, []);

  useEffect(() => {
    if (selectedAvatarId) {
      const avatar = avatars.find(a => a.id === selectedAvatarId);
      if (avatar) {
        setSelectedAvatar(avatar);
        if (showLooks) {
          fetchLooks(avatar.id);
        }
      }
    }
  }, [selectedAvatarId, avatars]);

  const fetchAvatars = async () => {
    try {
      setLoading(true);
      const response = await characterService.getCharacters({
        status: 'active',
        limit: 50
      });
      
      if (response.success && response.data) {
        let avatarsList = response.data.characters || [];
        
        // Filter by type if specified
        if (filterByType) {
          avatarsList = avatarsList.filter(a => a.avatarType === filterByType);
        }
        
        // Only show completed avatars
        avatarsList = avatarsList.filter(a => 
          !a.processingStatus || a.processingStatus === 'completed'
        );
        
        setAvatars(avatarsList);
      }
    } catch (error: any) {
      toast.error('Failed to load avatars');
      console.error('Error fetching avatars:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLooks = async (avatarId: string) => {
    try {
      setLoadingLooks(true);
      const response = await characterService.getAvatarLooks(avatarId);
      if (response.success && response.data) {
        setLooks(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching looks:', error);
    } finally {
      setLoadingLooks(false);
    }
  };

  const handleAvatarSelect = (avatar: Character) => {
    setSelectedAvatar(avatar);
    if (showLooks && avatar.looksCount && avatar.looksCount > 0) {
      fetchLooks(avatar.id);
    } else {
      setLooks([]);
      onAvatarSelect(avatar.id, null);
    }
    setShowSelector(false);
  };

  const handleLookSelect = (lookId: string) => {
    if (selectedAvatar) {
      onAvatarSelect(selectedAvatar.id, lookId);
    }
  };

  const handleClear = () => {
    setSelectedAvatar(null);
    setLooks([]);
    onAvatarSelect(null, null);
  };

  return (
    <div className="space-y-4">
      {!selectedAvatar ? (
        <div>
          <button
            onClick={() => setShowSelector(!showSelector)}
            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white border-2 border-dashed border-gray-600 hover:border-blue-500 transition-colors flex items-center justify-center gap-2"
          >
            <Video className="w-5 h-5" />
            <span>Select Avatar</span>
          </button>
          
          {showSelector && (
            <div className="mt-4 max-h-96 overflow-y-auto border border-gray-700 rounded-lg p-4 bg-gray-800">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-blue-400" />
                </div>
              ) : avatars.length === 0 ? (
                <div className="text-center py-8">
                  <Video className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No avatars available</p>
                  <p className="text-sm text-gray-500">Create an avatar first</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {avatars.map((avatar) => (
                    <div
                      key={avatar.id}
                      onClick={() => handleAvatarSelect(avatar)}
                      className="relative group cursor-pointer bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-600 hover:border-blue-500 transition-all"
                    >
                      <div className="aspect-square relative">
                        {avatar.previewImageUrl ? (
                          <img
                            src={avatar.previewImageUrl}
                            alt={avatar.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-900">
                            <Video className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                        
                        {/* Avatar Type Badge */}
                        {avatar.avatarType && (
                          <div className="absolute top-1 left-1">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              avatar.avatarType === 'video' ? 'bg-green-600' :
                              avatar.avatarType === 'photo' ? 'bg-blue-600' :
                              'bg-purple-600'
                            } text-white`}>
                              {avatar.avatarType === 'video' ? 'V' : 'P'}
                            </span>
                          </div>
                        )}
                        
                        {/* Looks Count */}
                        {avatar.looksCount && avatar.looksCount > 1 && (
                          <div className="absolute top-1 right-1">
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-600 text-white flex items-center">
                              <Layers className="w-3 h-3" />
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-white truncate">{avatar.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Selected Avatar Display */}
          <div className="p-4 bg-gray-700 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedAvatar.previewImageUrl ? (
                <img
                  src={selectedAvatar.previewImageUrl}
                  alt={selectedAvatar.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center">
                  <Video className="w-6 h-6 text-gray-600" />
                </div>
              )}
              <div>
                <p className="text-white font-medium">{selectedAvatar.name}</p>
                <p className="text-gray-400 text-sm">
                  {selectedAvatar.avatarType || 'avatar'} • {selectedAvatar.looksCount || 1} look{selectedAvatar.looksCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="px-3 py-1 text-sm text-gray-400 hover:text-white"
            >
              Change
            </button>
          </div>

          {/* Looks Selection */}
          {showLooks && selectedAvatar.looksCount && selectedAvatar.looksCount > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Look (Optional)
              </label>
              {loadingLooks ? (
                <div className="flex items-center justify-center py-4">
                  <Loader className="w-5 h-5 animate-spin text-blue-400" />
                </div>
              ) : looks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {looks.map((look) => (
                    <div
                      key={look.id}
                      onClick={() => handleLookSelect(look.id)}
                      className={`relative cursor-pointer bg-gray-700 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedLookId === look.id
                          ? 'border-blue-500 ring-2 ring-blue-500/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="aspect-square relative">
                        {look.image_url || look.thumbnail_url ? (
                          <img
                            src={look.image_url || look.thumbnail_url}
                            alt={look.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-900">
                            <Image className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                        
                        {selectedLookId === look.id && (
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-blue-400" />
                          </div>
                        )}
                        
                        {look.is_default && (
                          <div className="absolute top-1 left-1">
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-600 text-white">
                              Default
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-white truncate">{look.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No looks available for this avatar</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AvatarSelector;

