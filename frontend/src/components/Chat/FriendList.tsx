import React, { useState, useEffect } from 'react';
import { chatService, Friend } from '../../services/chatService';
import { UserPlus, Star, StarOff, MessageSquare, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import AddFriendModal from './AddFriendModal';

interface FriendListProps {
  onSelectFriend?: (friendId: number) => void;
  showAddButton?: boolean;
}

const FriendList: React.FC<FriendListProps> = ({ onSelectFriend, showAddButton = true }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  useEffect(() => {
    loadFriends();
  }, [showFavoritesOnly]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const response = await chatService.getFriends(showFavoritesOnly);
      setFriends(response.data || []);
    } catch (error: any) {
      toast.error('Failed to load friends: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (friend: Friend) => {
    try {
      await chatService.updateFriend(friend.friend_id, { is_favorite: !friend.is_favorite });
      await loadFriends();
      toast.success(friend.is_favorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error: any) {
      toast.error('Failed to update favorite: ' + (error.message || 'Unknown error'));
    }
  };

  const removeFriend = async (friend: Friend) => {
    if (!confirm(`Remove ${friend.nickname || friend.username} from your friends?`)) {
      return;
    }

    try {
      await chatService.removeFriend(friend.friend_id);
      await loadFriends();
      toast.success('Friend removed');
    } catch (error: any) {
      toast.error('Failed to remove friend: ' + (error.message || 'Unknown error'));
    }
  };

  const filteredFriends = friends.filter(friend =>
    (friend.nickname || friend.username).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-4 text-gray-400 text-center">Loading friends...</div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Friends</h2>
          {showAddButton && (
            <button
              onClick={() => setShowAddFriendModal(true)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Add Friend"
            >
              <UserPlus size={20} />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Favorites filter */}
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`text-sm px-3 py-1 rounded-lg transition-colors ${
            showFavoritesOnly
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {showFavoritesOnly ? 'Show All' : 'Show Favorites Only'}
        </button>
      </div>

      {/* Friends List */}
      <div className="flex-1 overflow-y-auto">
        {filteredFriends.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            {showFavoritesOnly ? 'No favorite friends' : 'No friends yet'}
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className="p-3 hover:bg-gray-800 transition-colors cursor-pointer group"
                onClick={() => onSelectFriend?.(friend.friend_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium">
                        {(friend.nickname || friend.username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {friend.nickname || friend.username}
                        </span>
                        {friend.is_favorite && (
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      {friend.nickname && (
                        <span className="text-xs text-gray-400 truncate">@{friend.username}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(friend);
                      }}
                      className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                      title={friend.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {friend.is_favorite ? (
                        <Star size={16} className="text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff size={16} className="text-gray-400" />
                      )}
                    </button>
                    {onSelectFriend && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFriend(friend.friend_id);
                        }}
                        className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                        title="Start chat"
                      >
                        <MessageSquare size={16} className="text-blue-400" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFriend(friend);
                      }}
                      className="p-1.5 hover:bg-red-600 rounded transition-colors"
                      title="Remove friend"
                    >
                      <X size={16} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <AddFriendModal
          isOpen={showAddFriendModal}
          onClose={() => setShowAddFriendModal(false)}
          onRequestSent={() => {
            // Optionally refresh friend requests count
          }}
        />
      )}
    </div>
  );
};

export default FriendList;

