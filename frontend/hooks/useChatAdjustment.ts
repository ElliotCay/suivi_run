/**
 * Hook for managing AI chat conversations for training block adjustments.
 *
 * Handles:
 * - Creating conversations with scope (block start vs rolling 4 weeks)
 * - Sending messages and receiving AI responses
 * - Requesting proposals and validating changes
 * - Managing conversation state and message history
 */

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ChatMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  is_cached: boolean;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  created_at: string;
}

export interface ChatConversation {
  id: number;
  user_id: number;
  block_id: number;
  scope_mode: 'block_start' | 'rolling_4weeks';
  scope_start_date: string;
  scope_end_date: string;
  state: 'active' | 'proposal_ready' | 'validated' | 'abandoned';
  proposed_changes: any;
  total_tokens: number;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
}

export interface WorkoutAdjustment {
  workout_id: number;
  action: 'modify' | 'delete' | 'reschedule';
  current: {
    date: string;
    type: string;
    distance_km: number;
    pace_target: string;
    structure: {
      warmup: string;
      main: string;
      cooldown: string;
    };
  };
  proposed: {
    date: string;
    type: string;
    distance_km: number;
    pace_target: string;
    structure: {
      warmup: string;
      main: string;
      cooldown: string;
    };
  };
  reasoning: string;
}

export interface Proposal {
  analysis: string;
  adjustments: WorkoutAdjustment[];
  tokens_used: number;
}

export function useChatAdjustment() {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);

  /**
   * Load active conversation for a block, or create new one if none exists
   */
  const loadOrCreateConversation = useCallback(async (
    blockId: number,
    scopeMode: 'block_start' | 'rolling_4weeks' = 'block_start'
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to load existing active conversation first
      try {
        const response = await axios.get(`${API_BASE_URL}/api/chat/blocks/${blockId}/active-conversation`);
        const conv = response.data;

        setConversation(conv);

        // Extract messages from conversation
        if (conv.messages && conv.messages.length > 0) {
          setMessages(conv.messages);
        }

        // Load proposal if exists
        if (conv.state === 'proposal_ready' && conv.proposed_changes) {
          setProposal({
            analysis: conv.proposed_changes.analysis,
            adjustments: conv.proposed_changes.adjustments,
            tokens_used: conv.total_tokens
          });
        }

        return conv;
      } catch (notFoundErr: any) {
        // No active conversation found, create a new one
        if (notFoundErr.response?.status === 404) {
          return await createConversation(blockId, scopeMode);
        }
        throw notFoundErr;
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Échec du chargement de la conversation';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new conversation for a training block
   */
  const createConversation = useCallback(async (
    blockId: number,
    scopeMode: 'block_start' | 'rolling_4weeks' = 'block_start'
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/chat/conversations`, {
        block_id: blockId,
        scope_mode: scopeMode
      });

      const conv = response.data;
      setConversation(conv);

      // Extract messages from conversation
      if (conv.messages && conv.messages.length > 0) {
        setMessages(conv.messages);
      }

      return conv;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Échec de la création de la conversation';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load an existing conversation
   */
  const loadConversation = useCallback(async (conversationId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/chat/conversations/${conversationId}`);

      const conv = response.data;
      setConversation(conv);

      if (conv.messages) {
        setMessages(conv.messages);
      }

      // Load proposal if exists
      if (conv.state === 'proposal_ready' && conv.proposed_changes) {
        setProposal({
          analysis: conv.proposed_changes.analysis,
          adjustments: conv.proposed_changes.adjustments,
          tokens_used: conv.total_tokens
        });
      }

      return conv;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Échec du chargement de la conversation';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Send a message and get AI response
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!conversation) {
      throw new Error('No active conversation');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/chat/conversations/${conversation.id}/messages`,
        { content }
      );

      const result = response.data;

      // Add user message and AI response to messages
      const userMsg: ChatMessage = {
        id: Date.now(), // Temporary ID
        conversation_id: conversation.id,
        role: 'user',
        content,
        is_cached: false,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        created_at: new Date().toISOString()
      };

      const aiMsg: ChatMessage = {
        id: result.message_id,
        conversation_id: conversation.id,
        role: 'assistant',
        content: result.content,
        is_cached: result.is_cached,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMsg, aiMsg]);

      // Update conversation tokens
      setConversation(prev => prev ? {
        ...prev,
        total_tokens: result.tokens_used,
        updated_at: new Date().toISOString()
      } : null);

      return {
        ...result,
        approaching_limit: result.approaching_limit,
        message_count: result.message_count
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Échec de l\'envoi du message';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [conversation]);

  /**
   * Request AI to propose adjustments
   */
  const requestProposal = useCallback(async () => {
    if (!conversation) {
      throw new Error('No active conversation');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/chat/conversations/${conversation.id}/propose`
      );

      const proposalData = response.data;
      setProposal(proposalData);

      // Update conversation state
      setConversation(prev => prev ? {
        ...prev,
        state: 'proposal_ready',
        proposed_changes: {
          analysis: proposalData.analysis,
          adjustments: proposalData.adjustments
        },
        total_tokens: proposalData.tokens_used,
        updated_at: new Date().toISOString()
      } : null);

      return proposalData;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Échec de la génération de la proposition';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [conversation]);

  /**
   * Validate and apply proposed changes
   */
  const validateChanges = useCallback(async () => {
    if (!conversation) {
      throw new Error('No active conversation');
    }

    if (conversation.state !== 'proposal_ready') {
      throw new Error('No proposal ready to validate');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/chat/conversations/${conversation.id}/validate`
      );

      const result = response.data;

      // Update conversation state
      setConversation(prev => prev ? {
        ...prev,
        state: 'validated',
        updated_at: new Date().toISOString()
      } : null);

      return result;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Échec de la validation des changements';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [conversation]);

  /**
   * Reject proposal and return to discussion
   */
  const rejectProposal = useCallback(() => {
    // Clear proposal but keep conversation and messages
    setProposal(null);

    // Update conversation state back to active
    if (conversation) {
      setConversation(prev => prev ? {
        ...prev,
        state: 'active',
        proposed_changes: null
      } : null);
    }
  }, [conversation]);

  /**
   * Reset conversation state
   */
  const resetConversation = useCallback(() => {
    setConversation(null);
    setMessages([]);
    setProposal(null);
    setError(null);
  }, []);

  return {
    // State
    conversation,
    messages,
    proposal,
    isLoading,
    error,

    // Actions
    loadOrCreateConversation,
    createConversation,
    loadConversation,
    sendMessage,
    requestProposal,
    validateChanges,
    rejectProposal,
    resetConversation
  };
}
