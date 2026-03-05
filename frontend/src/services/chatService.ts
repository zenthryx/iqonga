import { apiService } from './api';

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  avatar_url?: string;
  is_public: boolean;
  require_approval: boolean;
  max_members: number;
  associated_token?: string;
  auto_share_signals: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  members?: ConversationMember[];
  member_count?: number;
  last_message_content?: string;
  last_message_at?: string;
  unread_count?: number;
  // For direct messages, info about the other user
  other_user_username?: string;
  other_user_id?: number;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: number;
  role: 'owner' | 'admin' | 'member';
  notifications_enabled: boolean;
  mute_until?: string;
  last_read_at: string;
  last_read_message_id?: string;
  joined_at: string;
  username?: string;
  email?: string;
  avatar_url?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: number;
  content: string;
  content_type: 'text' | 'signal' | 'file' | 'system';
  metadata: {
    mentions?: number[];
    hashtags?: string[];
    links?: Array<{ url: string; preview?: any }>;
    reactions?: { [emoji: string]: number[] };
  };
  is_signal: boolean;
  signal_data?: {
    type: string;
    token: string;
    severity: string;
    data: any;
  };
  reply_to?: string;
  reply_message?: {
    id: string;
    content: string;
    sender_id: number;
    username?: string;
  };
  has_attachments: boolean;
  attachment_count: number;
  attachments?: MessageAttachment[];
  edited: boolean;
  edited_at?: string;
  deleted: boolean;
  deleted_at?: string;
  read_by: number[];
  created_at: string;
  updated_at: string;
  username?: string;
  avatar_url?: string;
}

export interface MessageAttachment {
  id: string;
  message_id?: string;
  file_name: string;
  file_type: 'image' | 'document' | 'video';
  file_size: number;
  mime_type: string;
  file_path: string;
  file_url: string;
  thumbnail_url?: string;
  uploaded_by: number;
  uploaded_at: string;
}

export interface ConversationInvite {
  id: string;
  conversation_id: string;
  invite_code: string;
  invited_by: number;
  expires_at: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  conversation_name?: string;
  conversation_type?: string;
  conversation_description?: string;
}

class ChatService {
  // ==================== Conversations ====================

  async createConversation(data: {
    type: 'direct' | 'group';
    name?: string;
    description?: string;
    memberIds?: number[];
    associated_token?: string;
    is_public?: boolean;
    require_approval?: boolean;
    max_members?: number;
  }) {
    return apiService.post<Conversation>('/chat/conversations', data);
  }

  async listConversations() {
    return apiService.get<Conversation[]>('/chat/conversations');
  }

  async getConversation(id: string) {
    return apiService.get<Conversation>(`/chat/conversations/${id}`);
  }

  async updateConversation(id: string, updates: Partial<Conversation>) {
    return apiService.put<Conversation>(`/chat/conversations/${id}`, updates);
  }

  async leaveConversation(id: string) {
    return apiService.delete(`/chat/conversations/${id}`);
  }

  async addMember(conversationId: string, userId: number, role: 'owner' | 'admin' | 'member' = 'member') {
    return apiService.post<ConversationMember>(`/chat/conversations/${conversationId}/members`, {
      user_id: userId,
      role
    });
  }

  async removeMember(conversationId: string, userId: number) {
    return apiService.delete(`/chat/conversations/${conversationId}/members/${userId}`);
  }

  async updateMemberRole(conversationId: string, userId: number, role: 'owner' | 'admin' | 'member') {
    return apiService.put<ConversationMember>(`/chat/conversations/${conversationId}/members/${userId}/role`, {
      role
    });
  }

  // ==================== Messages ====================

  async getMessages(conversationId: string, limit: number = 50, before?: string) {
    const params = new URLSearchParams({
      conversation_id: conversationId,
      limit: limit.toString()
    });
    if (before) params.append('before', before);
    return apiService.get<Message[]>(`/chat/messages?${params.toString()}`);
  }

  async getMessage(id: string) {
    return apiService.get<Message>(`/chat/messages/${id}`);
  }

  async editMessage(id: string, content: string) {
    return apiService.put<Message>(`/chat/messages/${id}`, { content });
  }

  async deleteMessage(id: string) {
    return apiService.delete(`/chat/messages/${id}`);
  }

  async addReaction(messageId: string, emoji: string) {
    return apiService.post<Message>(`/chat/messages/${messageId}/reactions`, { emoji });
  }

  async removeReaction(messageId: string, emoji: string) {
    return apiService.delete<Message>(`/chat/messages/${messageId}/reactions/${emoji}`);
  }

  async markAsRead(messageId: string) {
    return apiService.post(`/chat/messages/${messageId}/read`);
  }

  async markAllAsRead(conversationId: string) {
    return apiService.post(`/chat/conversations/${conversationId}/read-all`);
  }

  // ==================== Signals ====================

  async shareSignal(conversationId: string, signal: {
    type: string;
    token: string;
    severity: string;
    data: any;
  }) {
    return apiService.post<Message>('/chat/signals/share', {
      conversation_id: conversationId,
      signal
    });
  }

  async getSignals(conversationId: string, limit: number = 50) {
    return apiService.get<Message[]>(`/chat/signals?conversation_id=${conversationId}&limit=${limit}`);
  }

  // ==================== Attachments ====================

  async uploadAttachment(conversationId: string, file: File, messageId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversation_id', conversationId);
    if (messageId) formData.append('message_id', messageId);

    return apiService.post<MessageAttachment>('/chat/attachments', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  async getAttachment(id: string) {
    return apiService.get<MessageAttachment>(`/chat/attachments/${id}`);
  }

  async deleteAttachment(id: string) {
    return apiService.delete(`/chat/attachments/${id}`);
  }

  // ==================== Invitations ====================

  async createInvite(conversationId: string, expiresInHours: number = 24) {
    return apiService.post<ConversationInvite>('/chat/invites', {
      conversation_id: conversationId,
      expires_in_hours: expiresInHours
    });
  }

  async getInvite(code: string) {
    return apiService.get<ConversationInvite>(`/chat/invites/${code}`);
  }

  async acceptInvite(code: string) {
    return apiService.post<Conversation>(`/chat/invites/${code}/accept`);
  }

  async declineInvite(code: string) {
    return apiService.post(`/chat/invites/${code}/decline`);
  }

  // ==================== Search ====================

  async searchMessages(conversationId: string, query: string, limit: number = 20) {
    return apiService.get<Message[]>(`/chat/search?conversation_id=${conversationId}&q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async searchUsers(query: string, limit: number = 20) {
    return apiService.get<Array<{ id: number; username: string; email: string; avatar_url?: string }>>(
      `/chat/users/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  // ==================== Friends ====================

  async getFriends(favoritesOnly: boolean = false) {
    return apiService.get<Friend[]>(`/chat/friends${favoritesOnly ? '?favorites_only=true' : ''}`);
  }

  async sendFriendRequest(recipientId: number, message?: string) {
    return apiService.post<FriendRequest>('/chat/friends/request', {
      recipient_id: recipientId,
      message
    });
  }

  async getFriendRequests(type: 'all' | 'incoming' | 'outgoing' = 'all') {
    return apiService.get<FriendRequest[]>(`/chat/friends/requests?type=${type}`);
  }

  async acceptFriendRequest(requestId: string) {
    return apiService.post<{ request: FriendRequest; friend: Friend }>(`/chat/friends/requests/${requestId}/accept`);
  }

  async declineFriendRequest(requestId: string) {
    return apiService.post<FriendRequest>(`/chat/friends/requests/${requestId}/decline`);
  }

  async cancelFriendRequest(requestId: string) {
    return apiService.delete<FriendRequest>(`/chat/friends/requests/${requestId}`);
  }

  async removeFriend(friendId: number) {
    return apiService.delete(`/chat/friends/${friendId}`);
  }

  async updateFriend(friendId: number, updates: { nickname?: string; notes?: string; is_favorite?: boolean }) {
    return apiService.patch<Friend>(`/chat/friends/${friendId}`, updates);
  }

  async blockUser(userId: number) {
    return apiService.post(`/chat/friends/block/${userId}`);
  }

  async unblockUser(userId: number) {
    return apiService.post(`/chat/friends/unblock/${userId}`);
  }

  async getBlockedUsers() {
    return apiService.get<BlockedUser[]>('/chat/friends/blocked');
  }

  // ==================== Privacy Settings ====================

  async getPrivacySettings() {
    return apiService.get<{
      chat_message_privacy: 'everyone' | 'friends' | 'contacts' | 'none';
      chat_show_online_status: boolean;
      chat_allow_friend_requests: boolean;
    }>('/chat/privacy');
  }

  async updatePrivacySettings(settings: {
    chat_message_privacy?: 'everyone' | 'friends' | 'contacts' | 'none';
    chat_show_online_status?: boolean;
    chat_allow_friend_requests?: boolean;
  }) {
    return apiService.put('/chat/privacy', settings);
  }
}

export interface Friend {
  id: string;
  friend_id: number;
  nickname?: string;
  notes?: string;
  is_favorite: boolean;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
  username: string;
  email: string;
}

export interface FriendRequest {
  id: string;
  requester_id: number;
  recipient_id: number;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  message?: string;
  created_at: string;
  updated_at: string;
  requester_username?: string;
  recipient_username?: string;
  other_username?: string;
  request_type?: 'incoming' | 'outgoing';
}

export interface BlockedUser {
  friend_id: number;
  username: string;
  email: string;
  blocked_at: string;
}

export const chatService = new ChatService();

