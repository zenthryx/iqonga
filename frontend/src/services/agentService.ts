import { getApiBaseUrl } from '@/utils/domain';

interface Agent {
  id: string;
  name: string;
  description: string;
  avatar_url?: string;
  personality_config: any;
  platforms: string[];
  status: string;
  created_at: string;
  updated_at: string;
  performance_metrics: any;
  platform_connections: Array<{
    platform: string;
    username: string;
    status: string;
    connected: boolean;
    followers?: number;
  }>;
}

interface CreateAgentData {
  name: string;
  description: string;
  personality_type: string;
  voice_tone: string;
  humor_style?: string;
  intelligence_level?: string;
  controversy_comfort?: number;
  platforms?: string[];
  target_topics?: string[];
  avoid_topics?: string[];
  behavioral_guidelines?: string[];
  avatar_url?: string;
}

class AgentService {
  private getBaseUrl() {
    return `${getApiBaseUrl().replace(/\/$/, '')}/agents`;
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Get all user's agents
  async getAgents(params?: {
    status?: string;
    platform?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; agents: Agent[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.set('status', params.status);
      if (params?.platform) queryParams.set('platform', params.platform);
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.offset) queryParams.set('offset', params.offset.toString());

      const response = await fetch(`${this.getBaseUrl()}?${queryParams}`, {
        headers: this.getAuthHeaders()
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(response.status === 404 ? 'Agents API not found. Is the backend running and VITE_API_URL correct?' : `Invalid response (${response.status})`);
      }
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch agents');
      }

      // Handle both old and new API response formats
      if (data.success && data.data) {
        return {
          success: data.success,
          agents: data.data,
          pagination: data.pagination
        };
      } else if (data.success && data.agents) {
        return {
          success: data.success,
          agents: data.agents,
          pagination: data.pagination
        };
      } else {
        throw new Error(data.error || 'Failed to fetch agents');
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  }

  // Get specific agent
  async getAgent(id: string): Promise<{ success: boolean; agent: Agent }> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/${id}`, {
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch agent');
      }

      return data;
    } catch (error) {
      console.error('Error fetching agent:', error);
      throw error;
    }
  }

  // Create new agent
  async createAgent(agentData: CreateAgentData): Promise<{ success: boolean; agent: Agent; message: string }> {
    try {
      const response = await fetch(this.getBaseUrl(), {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(agentData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create agent');
      }

      return data;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  // Update agent
  async updateAgent(id: string, updates: Partial<CreateAgentData>): Promise<{ success: boolean; agent: Agent; message: string }> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update agent');
      }

      return data;
    } catch (error) {
      console.error('Error updating agent:', error);
      throw error;
    }
  }

  // Delete agent
  async deleteAgent(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete agent');
      }

      return data;
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw error;
    }
  }

  // Connect agent to platform
  async connectAgentToPlatform(agentId: string, platform: string): Promise<{ success: boolean; message: string; platforms: string[] }> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/${agentId}/connect-platform`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ platform })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect agent to platform');
      }

      return data;
    } catch (error) {
      console.error('Error connecting agent to platform:', error);
      throw error;
    }
  }

  // Disconnect agent from platform
  async disconnectAgentFromPlatform(agentId: string, platform: string): Promise<{ success: boolean; message: string; platforms: string[] }> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/${agentId}/disconnect-platform`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ platform })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect agent from platform');
      }

      return data;
    } catch (error) {
      console.error('Error disconnecting agent from platform:', error);
      throw error;
    }
  }

  // Get agent analytics
  async getAgentAnalytics(agentId: string, params?: {
    period?: '7d' | '30d' | '90d';
    platform?: string;
  }): Promise<{ success: boolean; agent: string; period: string; analytics: any }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.period) queryParams.set('period', params.period);
      if (params?.platform) queryParams.set('platform', params.platform);

      const response = await fetch(`${this.getBaseUrl()}/${agentId}/analytics?${queryParams}`, {
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      return data;
    } catch (error) {
      console.error('Error fetching agent analytics:', error);
      throw error;
    }
  }
}

export const agentService = new AgentService();
export type { Agent, CreateAgentData }; 