import React, { useState, useEffect } from 'react';
import { chatService, Conversation, ConversationMember } from '../../services/chatService';
import { Users, UserPlus, Crown, Shield, User, X, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import AddMemberModal from './AddMemberModal';

interface GroupMembersListProps {
  conversation: Conversation;
  currentUserId: number;
  onMemberUpdate?: () => void;
}

const GroupMembersList: React.FC<GroupMembersListProps> = ({
  conversation,
  currentUserId,
  onMemberUpdate
}) => {
  const [members, setMembers] = useState<ConversationMember[]>(conversation.members || []);
  const [loading, setLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ConversationMember | null>(null);

  // Get current user's role
  const currentMember = members.find(m => m.user_id === currentUserId);
  const isOwner = currentMember?.role === 'owner';
  const isAdmin = currentMember?.role === 'admin' || isOwner;
  const canManageMembers = isAdmin;

  useEffect(() => {
    loadMembers();
  }, [conversation.id]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await chatService.getConversation(conversation.id);
      if (response.data) {
        setMembers(response.data.members || []);
      }
    } catch (error: any) {
      toast.error('Failed to load members: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (userId: number) => {
    try {
      await chatService.addMember(conversation.id, userId);
      toast.success('Member added');
      await loadMembers();
      onMemberUpdate?.();
    } catch (error: any) {
      toast.error('Failed to add member: ' + (error.message || 'Unknown error'));
    }
  };

  const handleRemoveMember = async (member: ConversationMember) => {
    if (member.user_id === currentUserId) {
      // Leave group
      if (!confirm('Leave this group?')) return;
      try {
        await chatService.leaveConversation(conversation.id);
        toast.success('Left group');
        window.location.reload(); // Reload to update conversation list
      } catch (error: any) {
        toast.error('Failed to leave group: ' + (error.message || 'Unknown error'));
      }
    } else {
      // Remove member
      if (!confirm(`Remove ${member.username} from the group?`)) return;
      try {
        await chatService.removeMember(conversation.id, member.user_id);
        toast.success('Member removed');
        await loadMembers();
        onMemberUpdate?.();
      } catch (error: any) {
        toast.error('Failed to remove member: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleRoleChange = async (member: ConversationMember, newRole: 'owner' | 'admin' | 'member') => {
    if (!confirm(`Change ${member.username}'s role to ${newRole}?`)) return;
    
    try {
      await chatService.updateMemberRole(conversation.id, member.user_id, newRole);
      toast.success('Role updated');
      await loadMembers();
      onMemberUpdate?.();
    } catch (error: any) {
      toast.error('Failed to update role: ' + (error.message || 'Unknown error'));
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown size={16} className="text-yellow-500" />;
      case 'admin':
        return <Shield size={16} className="text-blue-500" />;
      default:
        return <User size={16} className="text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-gray-400 text-center">Loading members...</div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={20} />
            Members ({members.length})
          </h2>
          {canManageMembers && (
            <button
              onClick={() => setShowAddMember(true)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Add Member"
            >
              <UserPlus size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto">
        {members.length === 0 ? (
          <div className="p-4 text-center text-gray-400">No members</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {members.map((member) => {
              const isCurrentUser = member.user_id === currentUserId;
              const canRemove = isAdmin && !isCurrentUser && member.role !== 'owner';
              const canChangeRole = isOwner && !isCurrentUser && member.role !== 'owner';

              return (
                <div
                  key={member.id}
                  className="p-3 hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium">
                          {(member.username || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {member.username}
                            {isCurrentUser && ' (You)'}
                          </span>
                          {getRoleIcon(member.role)}
                        </div>
                        <div className="text-xs text-gray-400 capitalize">
                          {member.role}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canChangeRole && (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member, e.target.value as 'owner' | 'admin' | 'member')}
                          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          {isOwner && <option value="owner">Owner</option>}
                        </select>
                      )}
                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(member)}
                          className="p-1.5 hover:bg-red-600 rounded transition-colors"
                          title="Remove member"
                        >
                          <X size={16} className="text-red-400" />
                        </button>
                      )}
                      {isCurrentUser && (
                        <button
                          onClick={() => handleRemoveMember(member)}
                          className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded transition-colors"
                        >
                          Leave
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

      {/* Add Member Modal */}
      {showAddMember && (
        <AddMemberModal
          conversationId={conversation.id}
          existingMemberIds={members.map(m => m.user_id)}
          onAdd={handleAddMember}
          onClose={() => setShowAddMember(false)}
        />
      )}
    </div>
  );
};

export default GroupMembersList;

