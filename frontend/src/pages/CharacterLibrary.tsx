import React, { useState } from 'react';
import CharacterLibrary from '@/components/Characters/CharacterLibrary';
import AvatarCreationModal from '@/components/Characters/AvatarCreationModal';
import { Character } from '@/services/characterService';
import { Plus, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const CharacterLibraryPage: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCharacterCreated = (character: Character) => {
    toast.success(`Character "${character.name}" created successfully!`);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Avatar Library</h1>
          <p className="text-gray-400 mt-1">
            Create and manage avatars for music videos and UGC content
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Create Avatar</span>
        </button>
      </div>

      <div className="glass-card p-6">
        <CharacterLibrary key={refreshKey} />
      </div>

      <AvatarCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCharacterCreated}
      />
    </div>
  );
};

export default CharacterLibraryPage;

