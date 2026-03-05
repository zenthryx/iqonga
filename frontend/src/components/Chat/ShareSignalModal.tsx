import React, { useState, useEffect } from 'react';
import { chatService, Conversation } from '../../services/chatService';
import { X, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShareSignalModalProps {
  isOpen: boolean;
  onClose: () => void;
  signal: {
    type: string;
    token: string;
    severity: string;
    data: any;
  };
}

const ShareSignalModal: React.FC<ShareSignalModalProps> = ({
  isOpen,
  onClose,
  signal
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const response = await chatService.listConversations();
      if (response.data) {
        setConversations(response.data);
      }
    } catch (err) {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const shareToConversation = async (conversationId: string) => {
    setSharing(conversationId);
    try {
      await chatService.shareSignal(conversationId, signal);
      toast.success('Signal shared successfully');
      onClose();
    } catch (err) {
      toast.error('Failed to share signal');
    } finally {
      setSharing(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Share Signal</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Signal preview */}
        <div className="bg-gray-700 rounded p-4 mb-4">
          <div className="text-sm text-gray-400 mb-1">{signal.token}</div>
          <div className="text-white font-semibold">{signal.type}</div>
          <div className="text-xs text-gray-400 mt-1">Severity: {signal.severity}</div>
        </div>

        {/* Conversation list */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">Select Conversation</label>
          {loading ? (
            <div className="text-center text-gray-400 py-4">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-gray-400 py-4">No conversations found</div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => shareToConversation(conv.id)}
                  disabled={sharing === conv.id}
                  className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{conv.name || 'Direct Message'}</div>
                      <div className="text-xs text-gray-400">{conv.type}</div>
                    </div>
                    {sharing === conv.id ? (
                      <div className="text-sm text-gray-400">Sharing...</div>
                    ) : (
                      <Send className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ShareSignalModal;

