import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Edit, Trash2, UserPlus, UserMinus, ArrowLeft } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { WhatsAppContactGroup, WhatsAppContact } from '../../../types/whatsapp';

const ContactGroups: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<WhatsAppContactGroup | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const queryClient = useQueryClient();

  // Fetch groups
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['whatsapp-groups', search],
    queryFn: () => whatsappApi.getContactGroups(undefined, { search, limit: 100 }),
    placeholderData: (previousData) => previousData,
  });

  const groups = (groupsData as any)?.data || [];

  // Fetch contacts for adding to group
  const { data: contactsData } = useQuery({
    queryKey: ['whatsapp-contacts-for-group'],
    queryFn: () => whatsappApi.getContacts({ limit: 1000 }),
    enabled: showAddMembersModal,
  });

  const allContacts = (contactsData as any)?.data || [];

  // Fetch group details with members
  const { data: groupDetails } = useQuery({
    queryKey: ['whatsapp-group', selectedGroup?.id],
    queryFn: () => whatsappApi.getContactGroup(selectedGroup!.id),
    enabled: !!selectedGroup,
  });

  const groupMembers = (groupDetails as any)?.group?.contacts || [];

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => {
      // Note: wabaId might be required, but for now we'll use the first account
      return whatsappApi.createContactGroup({ ...data, wabaId: '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-groups'] });
      setShowCreateModal(false);
      setGroupName('');
      setGroupDescription('');
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => whatsappApi.deleteContactGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-groups'] });
      if (selectedGroup) {
        setSelectedGroup(null);
      }
    },
  });

  // Add members mutation
  const addMembersMutation = useMutation({
    mutationFn: ({ groupId, contactIds }: { groupId: string; contactIds: string[] }) =>
      whatsappApi.addContactsToGroup(groupId, contactIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-group', selectedGroup?.id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-groups'] });
      setShowAddMembersModal(false);
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, contactId }: { groupId: string; contactId: string }) =>
      whatsappApi.removeContactFromGroup(groupId, contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-group', selectedGroup?.id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-groups'] });
    },
  });

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    createGroupMutation.mutate({ name: groupName, description: groupDescription });
  };

  const handleAddMembers = (contactIds: string[]) => {
    if (!selectedGroup || contactIds.length === 0) return;
    addMembersMutation.mutate({ groupId: selectedGroup.id, contactIds });
  };

  const handleRemoveMember = (contactId: string) => {
    if (!selectedGroup) return;
    if (window.confirm('Remove this contact from the group?')) {
      removeMemberMutation.mutate({ groupId: selectedGroup.id, contactId });
    }
  };

  const filteredGroups = groups.filter((group: WhatsAppContactGroup) =>
    group.name.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedGroup) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedGroup(null)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-white">{selectedGroup.name}</h1>
        </div>

        {groupDetails && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-400 mb-2">{selectedGroup.description || 'No description'}</p>
                <p className="text-sm text-gray-500">
                  {groupMembers.length} {groupMembers.length === 1 ? 'contact' : 'contacts'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddMembersModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Members
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this group?')) {
                      deleteGroupMutation.mutate(selectedGroup.id);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Group Members</h3>
              {groupMembers.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No contacts in this group</p>
              ) : (
                <div className="space-y-2">
                  {groupMembers.map((contact: WhatsAppContact) => (
                    <div
                      key={contact.id}
                      className="bg-gray-700 rounded-lg p-4 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-white font-medium">{contact.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-400">{contact.phone_number}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(contact.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Members Modal */}
        {showAddMembersModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-4">Add Members to Group</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allContacts
                  .filter((contact: WhatsAppContact) => !groupMembers.some((m: WhatsAppContact) => m.id === contact.id))
                  .map((contact: WhatsAppContact) => (
                    <label
                      key={contact.id}
                      className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded"
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleAddMembers([contact.id]);
                          }
                        }}
                      />
                      <div>
                        <p className="text-white">{contact.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-400">{contact.phone_number}</p>
                      </div>
                    </label>
                  ))}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddMembersModal(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Contact Groups</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Group
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Groups List */}
      {groupsLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Loading groups...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No groups found</p>
          <p className="text-gray-500 text-sm mt-2">Create your first group to organize contacts</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group: WhatsAppContactGroup) => (
            <div
              key={group.id}
              onClick={() => setSelectedGroup(group)}
              className="bg-gray-800 rounded-lg p-6 cursor-pointer hover:bg-gray-750 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 rounded-full p-3">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{group.name}</h3>
                    <p className="text-sm text-gray-400">
                      {group.contact_count || 0} {group.contact_count === 1 ? 'contact' : 'contacts'}
                    </p>
                  </div>
                </div>
              </div>
              {group.description && (
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{group.description}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGroup(group);
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm transition-colors"
                >
                  View
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this group?')) {
                      deleteGroupMutation.mutate(group.id);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Group Name *</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., VIP Customers"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setGroupName('');
                    setGroupDescription('');
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGroupMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactGroups;
