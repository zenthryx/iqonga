import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Image, Paperclip, Smile } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { WhatsAppMessage, WhatsAppConversation } from '../../../types/whatsapp';
import toast from 'react-hot-toast';

const ConversationView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState('');

  const { data: conversationData, isLoading: conversationLoading } = useQuery<any>({
    queryKey: ['whatsapp-conversation', id],
    queryFn: () => whatsappApi.getConversation(id!),
    enabled: !!id,
    refetchInterval: 5000, // Poll for new messages every 5 seconds
  });

  const conversation = conversationData?.data?.conversation as WhatsAppConversation;

  const { data: messagesData, isLoading: messagesLoading } = useQuery<any>({
    queryKey: ['whatsapp-messages', conversation?.contact_id],
    queryFn: () => whatsappApi.getMessages(conversation?.contact_id || '', { limit: 100 }),
    enabled: !!conversation?.contact_id,
    refetchInterval: 5000,
  });

  const messages = (messagesData as any)?.data || [];

  const sendMutation = useMutation({
    mutationFn: (data: { wabaId: string; to: string; message: string; type?: 'text' | 'image' | 'video' | 'document' }) =>
      whatsappApi.sendMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', conversation?.contact_id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation', id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      setMessageText('');
      toast.success('Message sent');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send message');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !conversation) return;

    // Find the WABA ID from the conversation
    const wabaId = conversation.waba_id;
    const to = conversation.phone_number;

    sendMutation.mutate({
      wabaId,
      to,
      message: messageText,
      type: 'text',
    });
  };

  if (conversationLoading || messagesLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-400 py-12">Loading conversation...</div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="p-6">
        <div className="text-center text-red-400 py-12">Conversation not found</div>
        <Link to="/whatsapp/messages" className="text-blue-400 hover:text-blue-300">
          Back to Conversations
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/whatsapp/messages')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-white font-semibold">
              {conversation.contact_name || conversation.phone_number}
            </h2>
            {conversation.contact_profile_name && (
              <p className="text-gray-400 text-sm">{conversation.contact_profile_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No messages yet</div>
        ) : (
          messages.map((message: WhatsAppMessage) => (
            <div
              key={message.id}
              className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md rounded-lg px-4 py-2 ${
                  message.direction === 'outbound'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-white'
                }`}
              >
                {message.text_content && (
                  <p className="whitespace-pre-wrap">{message.text_content}</p>
                )}
                {message.media_url && (
                  <div className="mt-2">
                    {message.message_type === 'image' && (
                      <img src={message.media_url} alt="Media" className="max-w-full rounded" />
                    )}
                    {message.message_type === 'video' && (
                      <video src={message.media_url} controls className="max-w-full rounded" />
                    )}
                    {message.caption && <p className="mt-2 text-sm">{message.caption}</p>}
                  </div>
                )}
                <div className="text-xs opacity-70 mt-1">
                  {new Date(message.created_at).toLocaleTimeString()}
                  {message.status && (
                    <span className="ml-2">
                      {message.status === 'sent' && '✓'}
                      {message.status === 'delivered' && '✓✓'}
                      {message.status === 'read' && '✓✓ (read)'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <button
            type="button"
            className="text-gray-400 hover:text-white transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="text-gray-400 hover:text-white transition-colors"
            title="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || sendMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConversationView;
