import React, { useState, useEffect } from 'react';
import ConversationList from '../components/Chat/ConversationList';
import ChatInterface from '../components/Chat/ChatInterface';
import FriendList from '../components/Chat/FriendList';
import FriendRequests from '../components/Chat/FriendRequests';
import CreateConversationModal from '../components/Chat/CreateConversationModal';
import PrivacySettingsModal from '../components/Chat/PrivacySettingsModal';
import { chatService } from '../services/chatService';
import { useAuthStore } from '../store/authStore';
import { MessageSquare, Users, UserPlus, Bell, Shield } from 'lucide-react';

const Chat: React.FC = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'requests'>('chats');
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const { user } = useAuthStore();

  if (!user) {
    return <div className="p-4 text-center text-gray-400">Please log in to use chat</div>;
  }

  // Convert user.id (string) to number for backend
  const userId = parseInt(user.id) || 0;

  // Load friend request count
  useEffect(() => {
    const loadRequestCount = async () => {
      try {
        const response = await chatService.getFriendRequests('incoming');
        setFriendRequestCount(response.data?.length || 0);
      } catch (error) {
        // Silently fail
      }
    };
    loadRequestCount();
    
    // Listen for friend request updates
    const handleFriendRequestUpdate = () => {
      loadRequestCount();
    };
    window.addEventListener('friendRequestUpdate', handleFriendRequestUpdate);
    
    // Refresh every 30 seconds
    const interval = setInterval(loadRequestCount, 30000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('friendRequestUpdate', handleFriendRequestUpdate);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N or Cmd+N: Create new chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowCreateModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFriendSelect = async (friendId: number) => {
    try {
      // Try to find existing direct conversation
      const conversations = await chatService.listConversations();
      if (conversations.data) {
        const existingConv = conversations.data.find(
          conv => conv.type === 'direct' && 
          (conv.other_user_id === friendId || 
           conv.members?.some(m => m.user_id === friendId))
        );
        
        if (existingConv) {
          setSelectedConversationId(existingConv.id);
          setActiveTab('chats');
          return;
        }
      }

      // Create new direct conversation
      const response = await chatService.createConversation({
        type: 'direct',
        memberIds: [friendId]
      });

      if (response.data) {
        setSelectedConversationId(response.data.id);
        setActiveTab('chats');
      }
    } catch (error: any) {
      console.error('Error creating conversation with friend:', error);
      // Error toast will be shown by the service
    }
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-gray-700 flex flex-col">
        {/* Tab Navigation */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'chats'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <MessageSquare size={16} className="inline mr-2" />
              Chats
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'friends'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Users size={16} className="inline mr-2" />
              Friends
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                activeTab === 'requests'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Bell size={16} className="inline mr-2" />
              Requests
              {friendRequestCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {friendRequestCount > 9 ? '9+' : friendRequestCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chats' && (
            <ConversationList
              onSelect={setSelectedConversationId}
              selectedConversationId={selectedConversationId || undefined}
            />
          )}
          {activeTab === 'friends' && (
            <FriendList
              onSelectFriend={handleFriendSelect}
              showAddButton={true}
            />
          )}
          {activeTab === 'requests' && (
            <FriendRequests
              onRequestAccepted={() => {
                // Refresh friend request count
                chatService.getFriendRequests('incoming').then(response => {
                  setFriendRequestCount(response.data?.length || 0);
                });
              }}
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <ChatInterface
            conversationId={selectedConversationId}
            currentUserId={userId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center space-y-4">
              <MessageSquare className="h-16 w-16 mx-auto text-gray-600" />
              <div>
                <h3 className="text-xl font-semibold mb-2 text-gray-300">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the sidebar to start chatting</p>
                <p className="text-sm text-gray-600 mt-4">
                  Press <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Ctrl+N</kbd> to create a new chat
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Conversation Modal */}
      <CreateConversationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(conversation) => {
          setSelectedConversationId(conversation.id);
          setActiveTab('chats');
          setShowCreateModal(false);
        }}
      />

      {/* Privacy Settings Modal */}
      <PrivacySettingsModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </div>
  );
};

export default Chat;

