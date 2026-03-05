import React, { useState, useEffect } from 'react';
import { chatService } from '../../services/chatService';
import { X, Search, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddMemberModalProps {
  conversationId: string;
  existingMemberIds: number[];
  onAdd: (userId: number) => void;
  onClose: () => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  conversationId,
  existingMemberIds,
  onAdd,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Array<{ id: number; username: string; email: string; match_type?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      if (searchTimeout) clearTimeout(searchTimeout);
      const timeout = setTimeout(() => {
        searchUsers();
      }, 300);
      setSearchTimeout(timeout);
    } else {
      setUsers([]);
    }

    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchQuery]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      const response = await chatService.searchUsers(searchQuery, 20);
      // Filter out existing members
      const filtered = (response.data || []).filter(
        user => !existingMemberIds.includes(user.id)
      );
      setUsers(filtered);
    } catch (error: any) {
      toast.error('Failed to search users: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (userId: number) => {
    onAdd(userId);
    setSearchQuery('');
    setUsers([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <UserPlus size={24} />
            Add Member
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search users by username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Searching...</div>
          ) : users.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {searchQuery.length >= 2 ? 'No users found' : 'Start typing to search for users'}
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                  onClick={() => handleAdd(user.id)}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{user.username}</div>
                      <div className="text-xs text-gray-400 truncate">{user.email}</div>
                    </div>
                  </div>
                  {user.match_type === 'friend' && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded ml-2">
                      Friend
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AddMemberModal;

