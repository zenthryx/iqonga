import { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/api';
import { getApiBaseUrl } from '../utils/domain';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  audio_url?: string;
  audio_duration_ms?: number;
  created_at: string;
  metadata?: any;
}

export interface VoiceChatState {
  isConnected: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  conversationId: string | null;
  messages: ConversationMessage[];
  error: string | null;
}

export interface VoiceSettings {
  enabled: boolean;
  auto_transcribe: boolean;
  speech_to_text_config: any;
  text_to_speech_config: any;
  voice_language: string;
  voice_speed: number;
  voice_provider: string;
}

const getVoiceChatApiBase = () => {
  const base = getApiBaseUrl();
  return base.replace(/\/api\/?$/, '') + '/api';
};
const getVoiceChatWsOrigin = () => {
  const base = getApiBaseUrl();
  const u = new URL(base);
  return u.protocol === 'https:' ? `wss://${u.host}` : `ws://${u.host}`;
};

export function useVoiceChat(agentId: string, userId?: number) {
  const [state, setState] = useState<VoiceChatState>({
    isConnected: false,
    isRecording: false,
    isPlaying: false,
    isLoading: false,
    conversationId: null,
    messages: [],
    error: null
  });

  const wsConnection = useRef<WebSocket | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const audioSource = useRef<AudioBufferSourceNode | null>(null);
  const stream = useRef<MediaStream | null>(null);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsConnection.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const token = localStorage.getItem('token');
    let wsUrl: string;

    if (token) {
      // Authenticated user
      wsUrl = `${getVoiceChatWsOrigin()}/ws/voice-chat?token=${token}`;
    } else {
      // Anonymous user - use sessionId (agentId as fallback)
      const sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      wsUrl = `${getVoiceChatWsOrigin()}/ws/voice-chat?sessionId=${sessionId}`;
    }

    try {
      wsConnection.current = new WebSocket(wsUrl);

      wsConnection.current.onopen = () => {
        setState(prev => ({ ...prev, isConnected: true, error: null }));
      };

      wsConnection.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      wsConnection.current.onclose = () => {
        setState(prev => ({ ...prev, isConnected: false }));
        // Reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      wsConnection.current.onerror = (error) => {
        setState(prev => ({ ...prev, error: 'WebSocket connection failed' }));
      };
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to connect to voice chat' }));
    }
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'conversation_started':
        setState(prev => ({ 
          ...prev, 
          conversationId: data.conversationId,
          isLoading: false
        }));
        break;
        
      case 'transcription_response':
        addMessage({
          id: data.messageId,
          role: 'user',
          content: data.transcript,
          audio_url: data.audioUrl,
          audio_duration_ms: data.durationMs,
          created_at: data.timestamp
        });
        break;
        
      case 'audio_response':
        addMessage({
          id: data.messageId,
          role: 'agent',
          content: data.textContent,
          audio_url: data.audioUrl,
          audio_duration_ms: data.durationMs,
          created_at: data.timestamp
        });
        if (data.audioData) {
          playAudio(data.audioData);
        }
        break;
        
      case 'text_response':
        addMessage({
          id: data.messageId,
          role: 'agent',
          content: data.content,
          created_at: data.timestamp
        });
        break;
        
      case 'error':
        setState(prev => ({ ...prev, error: data.message }));
        break;
    }
  };

  // Add message to conversation
  const addMessage = (message: ConversationMessage) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message]
    }));
  };

  // Start conversation
  const startConversation = async () => {
    if (!agentId) {
      setState(prev => ({ ...prev, error: 'Missing agent ID' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // For anonymous users, skip API call and use WebSocket directly
      if (!userId) {
        const conversationId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setState(prev => ({ 
          ...prev, 
          conversationId: conversationId,
          isLoading: false 
        }));
        
        // Notify WebSocket about new conversation
        if (wsConnection.current?.readyState === WebSocket.OPEN) {
          wsConnection.current.send(JSON.stringify({
            type: 'start_conversation',
            agentId,
            conversationId: conversationId,
            isAnonymous: true
          }));
        }
        return;
      }

      // For authenticated users, use API
      const response = await apiService.post(`/voice/conversations`, {
        agent_id: agentId,
        title: `Voice chat with ${agentId}`,
        voice_settings: {
          enabled: true,
          auto_transcribe: true,
          speech_to_text_config: { provider: 'openai' },
          text_to_speech_config: { provider: 'openai', voice: 'alloy' },
          voice_language: 'en-US',
          voice_speed: 1.0,
          voice_provider: 'openai'
        }
      });

      if (response.success) {
        setState(prev => ({ 
          ...prev, 
          conversationId: response.data.conversationId,
          isLoading: false 
        }));
        
        // Notify WebSocket about new conversation
        if (wsConnection.current?.readyState === WebSocket.OPEN) {
          wsConnection.current.send(JSON.stringify({
            type: 'start_conversation',
            userId,
            agentId,
            conversationId: response.data.conversationId
          }));
        }
      } else {
        setState(prev => ({ ...prev, error: response.error || 'Failed to start conversation' }));
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to start conversation' }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Stop conversation
  const endConversation = async () => {
    if (!state.conversationId) return;

    try {
      // For authenticated users, call API
      if (userId) {
        await apiService.post(`/voice/conversations/${state.conversationId}/end`);
      }
      
      setState(prev => ({
        ...prev,
        conversationId: null,
        messages: [],
        isRecording: false,
        isPlaying: false
      }));

      // Notify WebSocket
      if (wsConnection.current?.readyState === WebSocket.OPEN) {
        wsConnection.current.send(JSON.stringify({
          type: 'end_conversation',
          conversationId: state.conversationId
        }));
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to end conversation' }));
    }
  };

  // Start recording
  const startRecording = async () => {
    if (!state.conversationId) {
      await startConversation();
      return;
    }

    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      const mediaRecorderInstance = new MediaRecorder(stream.current, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderInstance.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorderInstance.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        audioChunks.current = [];
        processAudioBlob(audioBlob);
      };

      mediaRecorderInstance.start();
      mediaRecorder.current = mediaRecorderInstance;

      setState(prev => ({ ...prev, isRecording: true }));

    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to access microphone' }));
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder.current && state.isRecording) {
      mediaRecorder.current.stop();
      setState(prev => ({ ...prev, isRecording: false }));
    }

    if (stream.current) {
      stream.current.getTracks().forEach(track => track.stop());
      stream.current = null;
    }
  };

  // Process audio blob
  const processAudioBlob = async (audioBlob: Blob) => {
    if (!wsConnection.current || wsConnection.current.readyState !== WebSocket.OPEN) {
      setState(prev => ({ ...prev, error: 'WebSocket not connected' }));
      return;
    }

    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...Array.from(new Uint8Array(arrayBuffer))));

      wsConnection.current.send(JSON.stringify({
        type: 'voice_message',
        conversationId: state.conversationId,
        audioData: base64Audio,
        mimeType: audioBlob.type,
        durationMs: audioBlob.size / 100, // Rough estimation
        timestamp: Date.now()
      }));

    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to process audio' }));
    }
  };

  // Play audio
  const playAudio = async (audioData: string) => {
    try {
      // Convert base64 to audio buffer
      const binaryString = atob(audioData);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }

      if (!audioContext.current) {
        audioContext.current = new AudioContext();
      }

      const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
      const source = audioContext.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.current.destination);

      audioSource.current = source;

      source.onended = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
      };

      setState(prev => ({ ...prev, isPlaying: true }));
      source.start();

    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to play audio' }));
    }
  };

  // Send text message
  const sendTextMessage = async (text: string) => {
    if (!state.conversationId) return;

    try {
      const response = await apiService.post(`/voice/conversations/${state.conversationId}/message`, {
        content: text
      });

      if (response.success) {
        addMessage({
          id: response.data.id,
          role: 'user',
          content: text,
          created_at: response.data.created_at
        });

        // Get AI response via WebSocket
        if (wsConnection.current?.readyState === WebSocket.OPEN) {
          wsConnection.current.send(JSON.stringify({
            type: 'text_message',
            conversationId: state.conversationId,
            text,
            timestamp: Date.now()
          }));
        }
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to send message' }));
    }
  };

  // Load conversation messages
  const loadMessages = async (conversationId: string) => {
    try {
      const response = await apiService.get(`/voice/conversations/${conversationId}/messages`);
      
      if (response.success) {
        setState(prev => ({ ...prev, messages: response.data.messages }));
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to load messages' }));
    }
  };

  // Get voice settings
  const getVoiceSettings = useCallback(async () => {
    try {
      const response = await apiService.get('/voice/settings');
      
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      // Voice settings not found, return defaults
      return {
        enabled: true,
        auto_transcribe: true,
        voice_language: 'en-US',
        voice_speed: 1.0,
        voice_provider: 'openai'
      };
    }
  }, []);

  // Update voice settings
  const updateVoiceSettings = async (settings: Partial<VoiceSettings>) => {
    try {
      const response = await apiService.put('/voice/settings', settings);
      return response.success;
    } catch (error) {
      return false;
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (wsConnection.current) {
        wsConnection.current.close();
      }
      if (stream.current) {
        stream.current.getTracks().forEach(track => track.stop());
      }
      if (audioSource.current) {
        audioSource.current.stop();
      }
    };
  }, []);

  // Connect WebSocket on mount
  useEffect(() => {
    connectWebSocket();
  }, [connectWebSocket]);

  return {
    ...state,
    startConversation,
    endConversation,
    startRecording,
    stopRecording,
    sendTextMessage,
    loadMessages,
    getVoiceSettings,
    updateVoiceSettings,
    reconnect: connectWebSocket
  };
}
