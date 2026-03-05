import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, MessageSquare, Tag, User, Phone, Mail, Building, Calendar, Send } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { WhatsAppContact } from '../../../types/whatsapp';
import toast from 'react-hot-toast';

const ContactDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading } = useQuery<any>({
    queryKey: ['whatsapp-contact', id],
    queryFn: () => whatsappApi.getContact(id!),
    enabled: !!id,
  });

  const contact = data?.data?.contact as WhatsAppContact;

  const updateMutation = useMutation({
    mutationFn: (data: Partial<WhatsAppContact>) => whatsappApi.updateContact(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contact', id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
      setIsEditing(false);
      toast.success('Contact updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update contact');
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-400 py-12">Loading contact...</div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6">
        <div className="text-center text-red-400 py-12">Contact not found</div>
        <Link to="/whatsapp/contacts" className="text-blue-400 hover:text-blue-300">
          Back to Contacts
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/whatsapp/contacts')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <h1 className="text-3xl font-bold text-white">
          {contact.name || contact.profile_name || contact.phone_number}
        </h1>
        <div className="flex gap-2 ml-auto">
          <Link
            to={`/whatsapp/messages?contact=${contact.id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Message
          </Link>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Edit className="w-4 h-4" />
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Contact Information</h2>
            
            {isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  updateMutation.mutate({
                    name: formData.get('name') as string,
                    tags: formData.get('tags')?.toString().split(',').map(t => t.trim()).filter(Boolean),
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-white font-medium mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={contact.name || ''}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    name="tags"
                    defaultValue={contact.tags?.join(', ') || ''}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="VIP, Customer, Lead"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-gray-400 text-sm">Name</div>
                    <div className="text-white">{contact.name || 'Not set'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-gray-400 text-sm">Phone Number</div>
                    <div className="text-white">{contact.phone_number}</div>
                  </div>
                </div>
                {contact.profile_name && (
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-gray-400 text-sm">Profile Name</div>
                      <div className="text-white">{contact.profile_name}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Tag className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-gray-400 text-sm">Tags</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {contact.tags && contact.tags.length > 0 ? (
                        contact.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500">No tags</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Custom Fields */}
          {contact.custom_fields && Object.keys(contact.custom_fields).length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Custom Fields</h2>
              <div className="space-y-3">
                {Object.entries(contact.custom_fields).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-white">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversation History */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Messages</h2>
            <div className="space-y-3">
              <div className="text-gray-400 text-sm">
                Message count: {contact.message_count}
              </div>
              {contact.last_message_at && (
                <div className="text-gray-400 text-sm">
                  Last message: {new Date(contact.last_message_at).toLocaleString()}
                </div>
              )}
              <Link
                to={`/whatsapp/messages?contact=${contact.id}`}
                className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2"
              >
                View full conversation →
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Status</h3>
            <div className="space-y-3">
              <div>
                <div className="text-gray-400 text-sm mb-1">Opt-in Status</div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    contact.is_opted_in
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {contact.is_opted_in ? 'Opted In' : 'Opted Out'}
                </span>
              </div>
              {contact.opt_in_date && (
                <div>
                  <div className="text-gray-400 text-sm mb-1">Opt-in Date</div>
                  <div className="text-white text-sm">
                    {new Date(contact.opt_in_date).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Statistics</h3>
            <div className="space-y-3">
              <div>
                <div className="text-gray-400 text-sm">Total Messages</div>
                <div className="text-white text-2xl font-bold">{contact.message_count}</div>
              </div>
              {contact.last_message_at && (
                <div>
                  <div className="text-gray-400 text-sm">Last Message</div>
                  <div className="text-white text-sm">
                    {new Date(contact.last_message_at).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to={`/whatsapp/messages?contact=${contact.id}`}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                Send Message
              </Link>
              <button className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <Tag className="w-4 h-4" />
                Manage Tags
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactDetail;
