import React, { useState, useEffect } from 'react';
import { chatService, Conversation } from '../../services/chatService';
import { X, Users, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (conversation: Conversation) => void;
}

const CreateConversationModal: React.FC<CreateConversationModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const [type, setType] = useState<'direct' | 'group'>('direct');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: number; username: string; email: string; avatar_url?: string }>>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    try {
      const response = await chatService.searchUsers(searchQuery);
      if (response.data) {
        setSearchResults(response.data);
      }
    } catch (err) {
      // Error handled by interceptor
    }
  };

  const handleCreate = async () => {
    if (type === 'direct' && selectedMembers.length !== 1) {
      toast.error('Select exactly one user for direct message');
      return;
    }

    if (type === 'group' && !name.trim()) {
      toast.error('Group name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await chatService.createConversation({
        type,
        name: type === 'group' ? name : undefined,
        description: type === 'group' ? description : undefined,
        memberIds: selectedMembers
      });

      if (response.data) {
        toast.success(type === 'direct' ? 'Conversation created' : 'Group created');
        onCreated(response.data);
        onClose();
        resetForm();
      }
    } catch (err) {
      // Error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setType('direct');
    setName('');
    setDescription('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMembers([]);
  };

  const toggleMember = (userId: number) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">New Conversation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Type selection */}
        <div className="mb-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setType('direct')}
              className={`flex-1 px-4 py-2 rounded ${
                type === 'direct' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              <User className="h-4 w-4 inline mr-2" />
              Direct Message
            </button>
            <button
              onClick={() => setType('group')}
              className={`flex-1 px-4 py-2 rounded ${
                type === 'group' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Group Chat
            </button>
          </div>
        </div>

        {/* Group name */}
        {type === 'group' && (
          <>
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Group Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter group name"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter group description"
                rows={2}
              />
            </div>
          </>
        )}

        {/* Member search */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">
            {type === 'direct' ? 'Select User' : 'Add Members'}
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-700 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search users..."
          />

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto bg-gray-700 rounded">
              {searchResults.map(user => (
                <div
                  key={user.id}
                  onClick={() => toggleMember(user.id)}
                  className={`p-2 cursor-pointer hover:bg-gray-600 ${
                    selectedMembers.includes(user.id) ? 'bg-blue-600' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <div className="text-white text-sm">{user.username}</div>
                      <div className="text-gray-400 text-xs">{user.email}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected members */}
          {selectedMembers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedMembers.map(userId => {
                const user = searchResults.find(u => u.id === userId);
                return user ? (
                  <div
                    key={userId}
                    className="bg-blue-600 text-white px-2 py-1 rounded text-sm flex items-center space-x-1"
                  >
                    <span>{user.username}</span>
                    <button
                      onClick={() => toggleMember(userId)}
                      className="hover:text-red-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || (type === 'direct' && selectedMembers.length !== 1) || (type === 'group' && !name.trim())}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateConversationModal;

