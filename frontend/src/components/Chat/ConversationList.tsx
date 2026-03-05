import React, { useState, useEffect } from 'react';
import { chatService, Conversation } from '../../services/chatService';
import { MessageSquare, Users, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import CreateConversationModal from './CreateConversationModal';

interface ConversationListProps {
  onSelect: (conversationId: string) => void;
  selectedConversationId?: string;
}

const ConversationList: React.FC<ConversationListProps> = ({
  onSelect,
  selectedConversationId
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'direct' | 'group'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const response = await chatService.listConversations();
      if (response.data) {
        setConversations(response.data);
      }
    } catch (err: any) {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (filter === 'all') return true;
    return conv.type === filter;
  });

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Chat</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('direct')}
            className={`px-3 py-1 text-sm rounded ${
              filter === 'direct' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Direct
          </button>
          <button
            onClick={() => setFilter('group')}
            className={`px-3 py-1 text-sm rounded ${
              filter === 'group' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Groups
          </button>
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-3 p-4">
                  <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No conversations yet</h3>
            <p className="text-gray-400 mb-4">Start a new chat to begin messaging!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm"
            >
              Create New Chat
            </button>
          </div>
        ) : (
          filteredConversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`p-4 cursor-pointer hover:bg-gray-700 transition-colors ${
                selectedConversationId === conv.id ? 'bg-gray-700 border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {conv.avatar_url ? (
                    <img
                      src={conv.avatar_url}
                      alt={conv.name || 'Chat'}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                      {conv.type === 'group' ? (
                        <Users className="h-6 w-6 text-gray-400" />
                      ) : (
                        <MessageSquare className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium truncate">
                      {conv.type === 'direct' 
                        ? (conv.other_user_username ?? (conv.other_user_id ? `User ${conv.other_user_id}` : 'Direct Message'))
                        : (conv.name || 'Group Chat')}
                    </span>
                    {conv.last_message_at && (
                      <span className="text-xs text-gray-400">
                        {formatTime(conv.last_message_at)}
                      </span>
                    )}
                  </div>

                  {conv.last_message_content && (
                    <div className="text-sm text-gray-400 truncate mt-1">
                      {conv.last_message_content}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {conv.member_count || 0} members
                    </span>
                    {conv.unread_count && conv.unread_count > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <CreateConversationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(conversation) => {
          setConversations(prev => [conversation, ...prev]);
          onSelect(conversation.id);
          setShowCreateModal(false);
        }}
      />
    </div>
  );
};

export default ConversationList;

