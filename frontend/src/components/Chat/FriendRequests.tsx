import React, { useState, useEffect } from 'react';
import { chatService, FriendRequest } from '../../services/chatService';
import { UserPlus, Check, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface FriendRequestsProps {
  onRequestAccepted?: () => void;
}

const FriendRequests: React.FC<FriendRequestsProps> = ({ onRequestAccepted }) => {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [incomingCount, setIncomingCount] = useState(0);

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await chatService.getFriendRequests(activeTab);
      setRequests(response.data || []);
      
      // Also load incoming count for badge
      if (activeTab === 'incoming') {
        const incomingResponse = await chatService.getFriendRequests('incoming');
        setIncomingCount(incomingResponse.data?.length || 0);
      }
    } catch (error: any) {
      toast.error('Failed to load friend requests: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Load incoming count on mount
  useEffect(() => {
    const loadIncomingCount = async () => {
      try {
        const response = await chatService.getFriendRequests('incoming');
        setIncomingCount(response.data?.length || 0);
      } catch (error) {
        // Silently fail
      }
    };
    loadIncomingCount();
  }, []);

  const acceptRequest = async (requestId: string) => {
    try {
      await chatService.acceptFriendRequest(requestId);
      await loadRequests();
      toast.success('Friend request accepted');
      onRequestAccepted?.();
    } catch (error: any) {
      toast.error('Failed to accept request: ' + (error.message || 'Unknown error'));
    }
  };

  const declineRequest = async (requestId: string) => {
    try {
      await chatService.declineFriendRequest(requestId);
      await loadRequests();
      toast.success('Friend request declined');
    } catch (error: any) {
      toast.error('Failed to decline request: ' + (error.message || 'Unknown error'));
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      await chatService.cancelFriendRequest(requestId);
      await loadRequests();
      toast.success('Friend request canceled');
    } catch (error: any) {
      toast.error('Failed to cancel request: ' + (error.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-gray-400 text-center">Loading requests...</div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold mb-3">Friend Requests</h2>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'incoming'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Incoming ({requests.filter(r => r.request_type === 'incoming' || !r.request_type).length})
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'outgoing'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Outgoing ({requests.filter(r => r.request_type === 'outgoing').length})
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="flex-1 overflow-y-auto">
        {requests.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            No {activeTab} friend requests
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {requests.map((request) => {
              const isIncoming = activeTab === 'incoming' && (request.request_type === 'incoming' || !request.request_type);
              const otherUsername = request.other_username || request.requester_username || request.recipient_username || 'Unknown';

              return (
                <div key={request.id} className="p-4 hover:bg-gray-800 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium">
                          {otherUsername.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="font-medium truncate">{otherUsername}</div>
                        {request.message && (
                          <div className="text-sm text-gray-400 mt-1">{request.message}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-3">
                      {isIncoming ? (
                        <>
                          <button
                            onClick={() => acceptRequest(request.id)}
                            className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                            title="Accept"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => declineRequest(request.id)}
                            className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                            title="Decline"
                          >
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => cancelRequest(request.id)}
                          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
                          title="Cancel"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendRequests;

