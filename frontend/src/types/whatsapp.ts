// WhatsApp Integration TypeScript Types

export interface WhatsAppAccount {
  id: string;
  user_id: number;
  account_name: string;
  waba_id: string;
  phone_number_id: string;
  phone_number: string;
  access_token?: string; // Encrypted, not usually returned
  status: 'active' | 'inactive' | 'pending' | 'pending_verification' | 'suspended';
  created_at: string;
  updated_at: string;
  last_sync_at?: string;
  webhook_url?: string;
  webhook_verified?: boolean;
}

export interface WhatsAppContact {
  id: string;
  user_id: number;
  waba_id: string;
  phone_number: string;
  name?: string;
  profile_name?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  is_opted_in: boolean;
  opt_in_date?: string;
  opt_out_date?: string;
  message_count: number;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppContactGroup {
  id: string;
  user_id: number;
  waba_id: string;
  name: string;
  description?: string;
  contact_count: number;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplate {
  id: string;
  user_id: number;
  waba_id: string;
  template_name: string;
  template_id?: string; // WhatsApp template ID after approval
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  header_type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  header_content?: string;
  body_text: string;
  footer_text?: string;
  buttons?: WhatsAppTemplateButton[];
  variables?: WhatsAppTemplateVariable[];
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phoneNumber?: string;
}

export interface WhatsAppTemplateVariable {
  example?: string;
  [key: string]: any;
}

export interface WhatsAppCampaign {
  id: string;
  user_id: number;
  waba_id: string;
  name: string;
  type: 'broadcast' | 'targeted';
  template_id?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  variables?: Record<string, any>;
  created_at: string;
  updated_at: string;
  template_name?: string;
  whatsapp_template_id?: string;
  stats?: CampaignStats;
}

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
  deliveryRate: string;
  readRate: string;
  failureRate: string;
}

export interface WhatsAppCampaignRecipient {
  id: string;
  campaign_id: string;
  contact_id?: string;
  phone_number: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  message_id?: string;
  wamid?: string;
  variables?: Record<string, any>;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
  created_at: string;
  contact_name?: string;
  contact_phone?: string;
}

export interface WhatsAppBot {
  id: string;
  user_id: number;
  waba_id: string;
  name: string;
  trigger_type: 'exact_match' | 'contains' | 'first_message' | 'keyword';
  trigger_text?: string;
  reply_type: 'text' | 'template' | 'flow' | 'ai_agent';
  reply_text?: string;
  template_id?: string;
  flow_id?: string;
  ai_agent_id?: string;
  header_text?: string;
  footer_text?: string;
  buttons?: any[];
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  template_name?: string;
  ai_agent_name?: string;
  execution_count?: number;
}

export interface WhatsAppBotExecution {
  id: string;
  bot_id: string;
  contact_id?: string;
  contact_name?: string; // May come from JOIN
  contact_phone?: string; // May come from JOIN
  phone_number: string;
  trigger_message?: string; // Alias for message_text
  message_text?: string;
  response_text?: string;
  reply_type?: string; // May come from JOIN with bot
  status?: 'success' | 'failed' | 'pending'; // May be computed
  response_time_ms?: number; // May be computed
  error_message?: string; // May be in response_text if failed
  created_at: string;
}

export interface WhatsAppMessage {
  id: string;
  user_id: number;
  waba_id: string;
  contact_id?: string;
  wamid: string;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contacts';
  text_content?: string;
  media_id?: string;
  media_url?: string;
  caption?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  error_code?: string;
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
}

export interface WhatsAppConversation {
  id: string;
  user_id: number;
  waba_id: string;
  contact_id: string;
  phone_number: string;
  unread_count: number;
  last_message_at?: string;
  last_message_preview?: string;
  created_at: string;
  updated_at: string;
  contact_name?: string;
  contact_profile_name?: string;
}

export interface WhatsAppWebhookEvent {
  id: string;
  waba_id: string;
  event_type: string;
  event_data: any;
  processed: boolean;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// Form Types
export interface ConnectAccountForm {
  account_name: string;
  waba_id: string;
  phone_number_id: string;
  access_token: string;
}

export interface CreateContactForm {
  wabaId: string;
  phoneNumber: string;
  name?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface CreateTemplateForm {
  wabaId: string;
  templateName: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  headerType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  headerContent?: string;
  bodyText: string;
  footerText?: string;
  buttons?: WhatsAppTemplateButton[];
  variables?: WhatsAppTemplateVariable[];
}

export interface CreateCampaignForm {
  wabaId: string;
  name: string;
  type: 'broadcast';
  templateId: string;
  scheduledAt?: string;
  variables?: Record<string, any>;
  recipientIds?: string[];
  groupIds?: string[];
  contactPhones?: string[];
}

export interface CreateBotForm {
  wabaId: string;
  name: string;
  triggerType: 'exact_match' | 'contains' | 'first_message' | 'keyword';
  triggerText?: string;
  replyType: 'text' | 'template' | 'flow' | 'ai_agent';
  replyText?: string;
  templateId?: string;
  aiAgentId?: string;
  headerText?: string;
  footerText?: string;
  buttons?: any[];
  isActive?: boolean;
  priority?: number;
}

// Filter Types
export interface ContactFilters {
  wabaId?: string;
  search?: string;
  tags?: string;
  isOptedIn?: boolean;
  groupId?: string;
  limit?: number;
  offset?: number;
}

export interface TemplateFilters {
  wabaId?: string;
  status?: string;
  category?: string;
  language?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CampaignFilters {
  wabaId?: string;
  status?: string;
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface BotFilters {
  wabaId?: string;
  triggerType?: string;
  replyType?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}
