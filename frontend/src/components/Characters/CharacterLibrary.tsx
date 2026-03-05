import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import characterService, { Character } from '@/services/characterService';
import AvatarLookManagement from './AvatarLookManagement';
import { Image, Trash2, Edit, Eye, EyeOff, Search, Plus, Video, Loader, CheckCircle, AlertCircle, Layers, X } from 'lucide-react';

interface CharacterLibraryProps {
  onCharacterSelect?: (character: Character) => void;
  showSelection?: boolean;
  selectedCharacterId?: string | null;
}

const CharacterLibrary: React.FC<CharacterLibraryProps> = ({
  onCharacterSelect,
  showSelection = false,
  selectedCharacterId = null
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPublic, setShowPublic] = useState(false);
  const [selectedCharacterForLooks, setSelectedCharacterForLooks] = useState<string | null>(null);

  useEffect(() => {
    fetchCharacters();
  }, [page, searchQuery, showPublic]);

  const fetchCharacters = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = showPublic
        ? await characterService.getCommunityCharacters({
            page: pageNum,
            limit: 12,
            search: searchQuery || undefined
          })
        : await characterService.getCharacters({
            page: pageNum,
            limit: 12,
            search: searchQuery || undefined,
            status: 'active'
          });

      if (response.success && response.data) {
        const charactersList = response.data.characters || [];
        if (pageNum === 1) {
          setCharacters(charactersList);
        } else {
          setCharacters(prev => [...prev, ...charactersList]);
        }
        setHasMore(response.data.pagination.page < response.data.pagination.pages);
      }
    } catch (error: any) {
      console.error('Error fetching characters:', error);
      toast.error(error.message || 'Failed to load characters');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCharacters(nextPage);
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!window.confirm('Are you sure you want to delete this character?')) {
      return;
    }

    try {
      const response = await characterService.deleteCharacter(characterId);
      if (response.success) {
        toast.success('Character deleted successfully');
        setCharacters(prev => prev.filter(c => c.id !== characterId));
      }
    } catch (error: any) {
      toast.error('Failed to delete character');
      console.error('Error deleting character:', error);
    }
  };

  const handleCharacterClick = (character: Character) => {
    if (showSelection && onCharacterSelect) {
      onCharacterSelect(character);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search characters..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="input-field w-full pl-10"
          />
        </div>
        {!showPublic && (
          <button
            onClick={() => setShowPublic(!showPublic)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center space-x-2"
          >
            {showPublic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showPublic ? 'My Characters' : 'Community'}</span>
          </button>
        )}
      </div>

      {/* Characters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {characters.map((character) => (
          <div
            key={character.id}
            className={`relative group bg-gray-800 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
              selectedCharacterId === character.id
                ? 'border-blue-500 ring-2 ring-blue-500/20'
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => handleCharacterClick(character)}
          >
            {/* Character Preview */}
            <div className="aspect-square relative bg-black">
              {character.previewImageUrl ? (
                <img
                  src={character.previewImageUrl}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <Image className="w-12 h-12 text-gray-600" />
                </div>
              )}

              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                  {showSelection && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCharacterClick(character);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                    >
                      {selectedCharacterId === character.id ? 'Selected' : 'Select'}
                    </button>
                  )}
                  {!showPublic && (
                    <>
                      {character.looksCount !== undefined && character.looksCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCharacterForLooks(character.id);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm font-medium"
                          title="Manage looks"
                        >
                          <Layers className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement edit
                          toast('Edit feature coming soon');
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCharacter(character.id);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Visibility Badge */}
              {character.visibility === 'public' && (
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-600 text-white">
                    Public
                  </span>
                </div>
              )}

              {/* Avatar Type Badge */}
              {character.avatarType && (
                <div className="absolute bottom-2 left-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    character.avatarType === 'video' ? 'bg-green-600' :
                    character.avatarType === 'photo' ? 'bg-blue-600' :
                    'bg-purple-600'
                  } text-white flex items-center space-x-1`}>
                    {character.avatarType === 'video' && <Video className="w-3 h-3" />}
                    {character.avatarType === 'photo' && <Image className="w-3 h-3" />}
                    <span className="capitalize">{character.avatarType}</span>
                  </span>
                </div>
              )}

              {/* Looks Count Badge */}
              {character.looksCount && character.looksCount > 1 && (
                <div className="absolute bottom-2 right-2">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-purple-600 text-white flex items-center space-x-1">
                    <Layers className="w-3 h-3" />
                    <span>{character.looksCount} looks</span>
                  </span>
                </div>
              )}

              {/* Processing Status Badge */}
              {character.processingStatus && character.processingStatus !== 'completed' && (
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 ${
                    character.processingStatus === 'processing' ? 'bg-yellow-600' :
                    character.processingStatus === 'pending' ? 'bg-gray-600' :
                    'bg-red-600'
                  } text-white`}>
                    {character.processingStatus === 'processing' && <Loader className="w-3 h-3 animate-spin" />}
                    {character.processingStatus === 'failed' && <AlertCircle className="w-3 h-3" />}
                    <span className="capitalize">{character.processingStatus}</span>
                    {character.processingProgress !== undefined && character.processingProgress < 100 && (
                      <span>{character.processingProgress}%</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Character Info */}
            <div className="p-3">
              <h3 className="text-sm font-semibold text-white line-clamp-1 mb-1">
                {character.name}
              </h3>
              {character.description && (
                <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                  {character.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="capitalize">
                  {character.avatarType || character.creationMethod?.replace('_', ' ')}
                </span>
                {character.createdAt && <span>{formatDate(character.createdAt)}</span>}
              </div>
              
              {/* Processing Progress Bar */}
              {character.processingStatus === 'processing' && character.processingProgress !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${character.processingProgress}%` }}
                    />
                  </div>
                </div>
              )}
              {character.tags && character.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {character.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!loading && characters.length === 0 && (
        <div className="text-center py-12">
          <Image className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">
            {showPublic ? 'No public characters found' : 'No characters yet'}
          </p>
          {!showPublic && (
            <p className="text-sm text-gray-500">
              Create your first character to get started
            </p>
          )}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Looks Management Modal */}
      {selectedCharacterForLooks && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Manage Avatar Looks</h2>
              <button
                onClick={() => setSelectedCharacterForLooks(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <AvatarLookManagement
                characterId={selectedCharacterForLooks}
                onClose={() => setSelectedCharacterForLooks(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterLibrary;

