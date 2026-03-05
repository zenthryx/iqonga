import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MessageSquare, User } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { WhatsAppConversation } from '../../../types/whatsapp';

type ConversationFilters = {
  wabaId?: string;
  contactId?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

const ConversationList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const contactId = searchParams.get('contact');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<any>({
    queryKey: ['whatsapp-conversations', contactId, search],
    queryFn: async () => {
      const filters: ConversationFilters = {
        limit: 50,
      };
      if (contactId) filters.contactId = contactId;
      if (search) filters.search = search;
      return await (whatsappApi.getConversations as any)(filters);
    },
  });

  const conversations = (data as any)?.data || [];
  const total = (data as any)?.total || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Conversations</h1>
      </div>

      {/* Search */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Conversations List */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading conversations...</div>
      ) : conversations.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <div className="text-gray-400 mb-4">No conversations found</div>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conversation: WhatsAppConversation) => (
            <Link
              key={conversation.id}
              to={`/whatsapp/messages/${conversation.id}`}
              className="block bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-medium truncate">
                      {conversation.contact_name || conversation.phone_number || 'Unknown Contact'}
                    </h3>
                    {conversation.unread_count > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                  {conversation.last_message_preview && (
                    <p className="text-gray-400 text-sm truncate">
                      {conversation.last_message_preview}
                    </p>
                  )}
                </div>
                <div className="text-gray-500 text-xs text-right">
                  {conversation.last_message_at
                    ? new Date(conversation.last_message_at).toLocaleString()
                    : 'No messages'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {total > 50 && (
        <div className="text-center text-gray-400">
          Showing {conversations.length} of {total} conversations
        </div>
      )}
    </div>
  );
};

export default ConversationList;
