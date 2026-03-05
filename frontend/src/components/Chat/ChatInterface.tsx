import React, { useState, useEffect, useRef } from 'react';
import { useChatSocket } from '../../hooks/useChatSocket';
import { chatService, Message, Conversation } from '../../services/chatService';
import { Send, Paperclip, Smile, MoreVertical, Settings, Users, Edit2, Trash2, X, Save, Search, Reply, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import GroupSettingsModal from './GroupSettingsModal';
import GroupMembersList from './GroupMembersList';
import { formatMessageTimestamp, isDifferentDay, formatDateSeparator } from '../../utils/dateUtils';

interface ChatInterfaceProps {
  conversationId: string;
  currentUserId: number;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversationId,
  currentUserId
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { socket, connected } = useChatSocket();

  // Load initial messages and conversation
  useEffect(() => {
    if (conversationId) {
      loadMessages();
      loadConversation();
    }
  }, [conversationId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K: Toggle search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(!showSearch);
      }
      // Escape: Close search or cancel reply
      if (e.key === 'Escape') {
        if (showSearch) {
          setShowSearch(false);
          setSearchQuery('');
          setSearchResults([]);
        }
        if (replyingTo) {
          setReplyingTo(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, replyingTo]);

  const loadConversation = async () => {
    try {
      const response = await chatService.getConversation(conversationId);
      if (response.data) {
        setConversation(response.data);
      }
    } catch (err: any) {
      toast.error('Failed to load conversation');
    }
  };

  // Setup socket event listeners
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleNewMessage = (message: Message) => {
      if (message.conversation_id === conversationId) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
    };

    const handleMessageUpdated = (message: Message) => {
      if (message.conversation_id === conversationId) {
        setMessages(prev =>
          prev.map(msg => msg.id === message.id ? message : msg)
        );
      }
    };

    const handleMessageDeleted = (data: { message_id: string; conversation_id: string }) => {
      if (data.conversation_id === conversationId) {
        setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
      }
    };

    const handleTypingStatus = (data: { conversation_id: string; user_id: number; is_typing: boolean }) => {
      if (data.conversation_id === conversationId && data.user_id !== currentUserId) {
        setTypingUsers(prev => {
          const next = new Set(prev);
          if (data.is_typing) {
            next.add(data.user_id);
          } else {
            next.delete(data.user_id);
          }
          return next;
        });
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:updated', handleMessageUpdated);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('typing:status', handleTypingStatus);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:updated', handleMessageUpdated);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('typing:status', handleTypingStatus);
    };
  }, [socket, conversationId, currentUserId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await chatService.getMessages(conversationId);
      if (response.data) {
        setMessages(response.data);
        scrollToBottom();
        
        // Mark all messages as read when viewing conversation
        try {
          await chatService.markAllAsRead(conversationId);
        } catch (err) {
          // Silently fail - not critical
        }
      }
    } catch (err: any) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await chatService.searchMessages(conversationId, searchQuery);
      if (response.data) {
        setSearchResults(response.data);
      }
    } catch (err: any) {
      toast.error('Failed to search messages');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !socket || !connected) return;

    const replyToId = replyingTo?.id || null;
    
    socket.emit('message:send', {
      conversation_id: conversationId,
      content: newMessage,
      reply_to: replyToId
    });

    setNewMessage('');
    setReplyingTo(null);

    try {
      socket.emit('message:send', {
        conversation_id: conversationId,
        content: newMessage.trim(),
        content_type: 'text',
        reply_to: replyingTo?.id || null
      });

      setNewMessage('');
      setReplyingTo(null);
      stopTyping();
    } catch (err: any) {
      toast.error('Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  const handleTyping = () => {
    if (!socket || !connected) return;

    socket.emit('typing:start', { conversation_id: conversationId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (!socket || !connected) return;
    socket.emit('typing:stop', { conversation_id: conversationId });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await chatService.uploadAttachment(conversationId, file);
      toast.success('File uploaded');
      // Reload messages to show the new attachment
      await loadMessages();
    } catch (err: any) {
      toast.error('Failed to upload file: ' + (err.message || 'Unknown error'));
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isGroup = conversation?.type === 'group';
  const currentMember = conversation?.members?.find(m => m.user_id === currentUserId);
  const canManage = isGroup && (currentMember?.role === 'owner' || currentMember?.role === 'admin');

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              {conversation?.name || conversation?.other_user_username || 'Chat'}
              {!isGroup && conversation?.other_user_id && onlineUsers.has(conversation.other_user_id) && (
                <span className="w-2 h-2 bg-green-500 rounded-full" title="Online"></span>
              )}
            </h2>
            {conversation && (
              <p className="text-xs text-gray-400">
                {isGroup ? `${conversation.member_count || conversation.members?.length || 0} members` : 
                 onlineUsers.has(conversation.other_user_id || 0) ? 'Online' : 'Offline'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Search Messages"
          >
            <Search size={20} />
          </button>
          {isGroup && (
            <>
              <button
                onClick={() => setShowMembers(!showMembers)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Members"
              >
                <Users size={20} />
              </button>
              {canManage && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Group Settings"
                >
                  <Settings size={20} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="border-b border-gray-700 p-3 bg-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search messages..."
              className="flex-1 px-3 py-2 bg-gray-900 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
            >
              Search
            </button>
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
            >
              Cancel
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
              <div className="text-sm text-gray-400 mb-2">
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  onClick={() => {
                    // Scroll to message in conversation
                    const messageElement = document.querySelector(`[data-message-id="${result.id}"]`);
                    if (messageElement) {
                      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // Highlight the message
                      messageElement.classList.add('bg-yellow-500', 'bg-opacity-20');
                      setTimeout(() => {
                        messageElement.classList.remove('bg-yellow-500', 'bg-opacity-20');
                      }, 2000);
                    }
                    setShowSearch(false);
                  }}
                  className="p-2 bg-gray-900 hover:bg-gray-800 rounded cursor-pointer"
                >
                  <div className="text-sm text-white">{result.username || 'User'}</div>
                  <div className="text-xs text-gray-400 truncate">{result.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main content area - split if showing members */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages area */}
        <div className={`flex flex-col ${showMembers ? 'w-2/3' : 'flex-1'}`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <div className="text-gray-400">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
            <MessageCircle className="h-16 w-16 text-gray-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No messages yet</h3>
              <p className="text-gray-400">Start the conversation by sending a message!</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const showDateSeparator = index === 0 || 
              (index > 0 && isDifferentDay(message.created_at, messages[index - 1].created_at));
            
            return (
              <React.Fragment key={message.id}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-4">
                    <div className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-400">
                      {formatDateSeparator(message.created_at)}
                    </div>
                  </div>
                )}
                <div data-message-id={message.id}>
                  <MessageBubble
                    message={message}
                    isOwn={message.sender_id === currentUserId}
                    currentUserId={currentUserId}
                    socket={socket}
                    connected={connected}
                    onReply={(message) => setReplyingTo(message)}
                    onUpdate={(updatedMessage) => {
                      setMessages(prev =>
                        prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
                      );
                    }}
                    onDelete={(messageId) => {
                      setMessages(prev => prev.filter(msg => msg.id !== messageId));
                    }}
                  />
                </div>
              </React.Fragment>
            );
          })
        )}

        {typingUsers.size > 0 && (
          <div className="text-sm text-gray-400 italic">
            {typingUsers.size === 1 ? 'Someone is typing...' : 'Multiple people are typing...'}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-700 p-4">
        {replyingTo && (
          <div className="mb-2 p-2 bg-gray-800 rounded-lg flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Reply size={12} />
                Replying to {replyingTo.username || 'user'}
              </div>
              <div className="text-sm text-gray-300 truncate">{replyingTo.content}</div>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex items-end space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />

          <textarea
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
            rows={1}
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />

          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || !connected}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        {!connected && (
          <div className="text-xs text-yellow-400 mt-2">
            Reconnecting...
          </div>
        )}
      </div>
        </div>

        {/* Members sidebar */}
        {showMembers && conversation && (
          <div className="w-1/3 border-l border-gray-700">
            <GroupMembersList
              conversation={conversation}
              currentUserId={currentUserId}
              onMemberUpdate={loadConversation}
            />
          </div>
        )}
      </div>

      {/* Group Settings Modal */}
      {showSettings && conversation && (
        <GroupSettingsModal
          conversation={conversation}
          currentUserId={currentUserId}
          onClose={() => setShowSettings(false)}
          onUpdate={loadConversation}
        />
      )}
    </div>
  );
};

const MessageBubble: React.FC<{
  message: Message;
  isOwn: boolean;
  currentUserId: number;
  socket: any;
  connected: boolean;
  onReply?: (message: Message) => void;
  onUpdate: (message: Message) => void;
  onDelete: (messageId: string) => void;
}> = ({ message, isOwn, currentUserId, socket, connected, onReply, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowReactionPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEdit = async () => {
    if (!editContent.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    try {
      const response = await chatService.editMessage(message.id, editContent);
      if (response.data) {
        onUpdate(response.data);
        setIsEditing(false);
        toast.success('Message updated');
        
        // Emit socket event
        if (socket && connected) {
          socket.emit('message:update', {
            message_id: message.id,
            content: editContent
          });
        }
      }
    } catch (error: any) {
      toast.error('Failed to edit message: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this message?')) return;

    try {
      await chatService.deleteMessage(message.id);
      onDelete(message.id);
      toast.success('Message deleted');
      
      // Emit socket event
      if (socket && connected) {
        socket.emit('message:delete', {
          message_id: message.id,
          conversation_id: message.conversation_id
        });
      }
    } catch (error: any) {
      toast.error('Failed to delete message: ' + (error.message || 'Unknown error'));
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!socket || !connected) return;

    const reactions = message.metadata?.reactions || {};
    const hasReacted = reactions[emoji]?.includes(currentUserId);

    try {
      if (hasReacted) {
        await chatService.removeReaction(message.id, emoji);
      } else {
        await chatService.addReaction(message.id, emoji);
      }
      
      // Reload message to get updated reactions
      const response = await chatService.getMessage(message.id);
      if (response.data) {
        onUpdate(response.data);
      }
      
      setShowReactionPicker(false);
    } catch (error: any) {
      toast.error('Failed to update reaction: ' + (error.message || 'Unknown error'));
    }
  };

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

  if (message.deleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="text-gray-500 italic text-sm">
          Message deleted
        </div>
      </div>
    );
  }

  const reactions = message.metadata?.reactions || {};

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-xs lg:max-w-md relative ${
        isOwn ? 'items-end' : 'items-start'
      } flex flex-col`}>
        {isEditing ? (
          <div className={`w-full px-4 py-2 rounded-lg ${
            isOwn ? 'bg-blue-600' : 'bg-gray-800'
          }`}>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-transparent text-white resize-none focus:outline-none"
              rows={Math.min(editContent.split('\n').length, 5)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEdit();
                }
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditContent(message.content);
                }
              }}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleEdit}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-1"
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(message.content);
                }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center gap-1"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={`relative px-4 py-2 rounded-lg ${
            isOwn ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'
          }`}>
            {/* Reply to message */}
            {message.reply_to && (
              <div className={`mb-2 p-2 rounded border-l-2 ${
                isOwn ? 'bg-blue-700 border-blue-400' : 'bg-gray-700 border-gray-500'
              }`}>
                <div className="text-xs opacity-70 flex items-center gap-1">
                  <Reply size={10} />
                  {message.reply_message ? (
                    <>
                      Replying to {message.reply_message.username || 'user'}
                    </>
                  ) : (
                    'Replying to message'
                  )}
                </div>
                {message.reply_message && (
                  <div className="text-xs truncate mt-1 opacity-80">
                    {message.reply_message.content}
                  </div>
                )}
              </div>
            )}

            {message.is_signal && message.signal_data && (
              <SignalCard signal={message.signal_data} />
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((attachment) => (
                  <div key={attachment.id} className="rounded-lg overflow-hidden">
                    {attachment.file_type === 'image' ? (
                      <img
                        src={attachment.file_url}
                        alt={attachment.file_name}
                        className="max-w-full max-h-64 rounded cursor-pointer hover:opacity-90"
                        onClick={() => window.open(attachment.file_url, '_blank')}
                      />
                    ) : attachment.file_type === 'video' ? (
                      <video
                        src={attachment.file_url}
                        controls
                        className="max-w-full max-h-64 rounded"
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-black/20 rounded hover:bg-black/30 transition-colors"
                      >
                        <Paperclip size={16} />
                        <span className="text-sm truncate">{attachment.file_name}</span>
                        <span className="text-xs opacity-70">
                          ({(attachment.file_size / 1024).toFixed(1)} KB)
                        </span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            
            {message.edited && (
              <div className="text-xs opacity-70 mt-1">(edited)</div>
            )}

            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2">
                <div className="text-xs opacity-70" title={new Date(message.created_at).toLocaleString()}>
                  {formatMessageTimestamp(message.created_at)}
                </div>
                {isOwn && message.read_by && message.read_by.length > 0 && (
                  <div className="text-xs opacity-50" title="Read">
                    ✓✓
                  </div>
                )}
              </div>
              
              {isOwn && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-black/20 rounded transition-opacity"
                  >
                    <MoreVertical size={14} />
                  </button>
                  
                  {showMenu && (
                    <div className="absolute right-0 top-6 bg-gray-700 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                      {onReply && (
                        <button
                          onClick={() => {
                            onReply(message);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-600 flex items-center gap-2"
                        >
                          <Reply size={14} />
                          Reply
                        </button>
                      )}
                      {isOwn && (
                        <>
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setShowMenu(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-600 flex items-center gap-2"
                          >
                            <Edit2 size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              handleDelete();
                              setShowMenu(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-red-600 flex items-center gap-2"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reactions */}
            {Object.keys(reactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(reactions).map(([emoji, userIds]: [string, any]) => {
                  const hasReacted = userIds.includes(currentUserId);
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                        hasReacted
                          ? 'bg-blue-500 text-white'
                          : isOwn
                          ? 'bg-blue-500/30 text-white'
                          : 'bg-gray-700 text-gray-300'
                      } hover:opacity-80 transition-opacity`}
                    >
                      <span>{emoji}</span>
                      <span>{userIds.length}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Reaction picker button */}
            <div className="relative mt-1">
              <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-gray-300 transition-opacity"
              >
                <Smile size={16} />
              </button>
              
              {showReactionPicker && (
                <div className="absolute left-0 bottom-6 bg-gray-700 rounded-lg shadow-lg p-2 flex gap-1 z-10">
                  {commonEmojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className="p-2 hover:bg-gray-600 rounded text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SignalCard: React.FC<{ signal: any }> = ({ signal }) => {
  return (
    <div className="bg-gray-700 rounded p-2 mb-2">
      <div className="font-semibold">{signal.token} {signal.type}</div>
      <div className="text-xs">Severity: {signal.severity}</div>
    </div>
  );
};

export default ChatInterface;

