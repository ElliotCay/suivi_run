/**
 * Block Generation Chat Modal - AI-powered conversational block creation
 *
 * Design: Allure "Liquid Glass" aesthetic
 * - Deep transparency with heavy blur
 * - Minimal, focused interface
 * - Organic motion and interactions
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, CheckCircle2, Calendar, Sparkles, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

interface Message {
  id: string;  // Unique client-side ID
  role: 'user' | 'assistant';
  content: string;
  is_cached?: boolean;
}

interface BlockProposal {
  analysis: string;
  block_parameters: {
    phase: string;
    days_per_week: number;
    target_weekly_volume_km: number;
    easy_percentage: number;
    threshold_percentage: number;
    interval_percentage: number;
    add_recovery_sunday?: boolean;
    reasoning: string;
  };
  weekly_structure: Array<{
    day: string;
    type: string;
    distance_km: number;
    description_courte: string;
  }>;
  special_recommendations: string[];
  preferred_days: string[];
  preferred_time: string;
}

interface BlockGenerationChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBlockCreated?: (blockId: number) => void;
}

const workoutTypeLabels: Record<string, string> = {
  easy: 'Facile',
  threshold: 'Seuil',
  interval: 'Fractionné',
  long: 'Longue',
  recovery: 'Récupération',
  quality: 'Qualité'
};

const workoutTypeColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  threshold: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  interval: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  long: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  recovery: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400',
  quality: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
};

const phaseLabels: Record<string, string> = {
  base: 'Base (Endurance)',
  development: 'Développement',
  peak: 'Pic (Intensité)',
  taper: 'Affûtage'
};

export default function BlockGenerationChatModal({
  isOpen,
  onClose,
  onBlockCreated
}: BlockGenerationChatModalProps) {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [proposal, setProposal] = useState<BlockProposal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [createdBlockId, setCreatedBlockId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [tokensUsed, setTokensUsed] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation when modal opens
  useEffect(() => {
    if (isOpen && !conversationId) {
      initializeConversation();
    }
  }, [isOpen, conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeConversation = async () => {
    setIsInitializing(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/block-generation/conversations`);
      setConversationId(response.data.conversation_id);
      setMessages([{
        id: `assistant-${response.data.conversation_id}-init`,
        role: 'assistant',
        content: response.data.message,
        is_cached: response.data.is_cached
      }]);
      setTokensUsed(response.data.tokens_used);
      setMessageCount(1);
    } catch (err: any) {
      console.error('Failed to initialize conversation:', err);
      setError(err?.response?.data?.detail || 'Erreur lors de l\'initialisation');
    } finally {
      setIsInitializing(false);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || isLoading || !conversationId) return;

    const message = messageInput.trim();
    setMessageInput('');
    setError(null);

    // Add user message optimistically with unique ID
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/block-generation/conversations/${conversationId}/messages`,
        { message }
      );

      // Add AI response with unique ID
      const aiMessage: Message = {
        id: `assistant-${response.data.message_id}-${Date.now()}`,
        role: 'assistant',
        content: response.data.content,
        is_cached: response.data.is_cached
      };
      setMessages(prev => [...prev, aiMessage]);
      setTokensUsed(response.data.tokens_used);
      setMessageCount(response.data.message_count);

      if (response.data.approaching_limit) {
        toast.warning(`Approche de la limite: ${response.data.message_count}/${response.data.max_messages} messages`);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err?.response?.data?.detail || 'Erreur lors de l\'envoi');
      // Remove optimistic user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const requestProposal = async () => {
    if (isLoading || !conversationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/block-generation/conversations/${conversationId}/propose`
      );

      setProposal(response.data);
      setTokensUsed(response.data.tokens_used);
    } catch (err: any) {
      console.error('Failed to get proposal:', err);
      setError(err?.response?.data?.detail || 'Erreur lors de la génération de la proposition');
    } finally {
      setIsLoading(false);
    }
  };

  const validateAndCreate = async () => {
    if (isLoading || !conversationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/block-generation/conversations/${conversationId}/validate`
      );

      setIsValidated(true);
      setCreatedBlockId(response.data.block_id);
      toast.success('Bloc d\'entraînement créé avec succès !');

      if (onBlockCreated) {
        onBlockCreated(response.data.block_id);
      }

      // Close modal after brief delay
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      console.error('Failed to validate block:', err);
      setError(err?.response?.data?.detail || 'Erreur lors de la création du bloc');
    } finally {
      setIsLoading(false);
    }
  };

  const rejectProposal = () => {
    setProposal(null);
  };

  const handleClose = () => {
    // Reset state
    setConversationId(null);
    setMessages([]);
    setProposal(null);
    setIsValidated(false);
    setCreatedBlockId(null);
    setMessageInput('');
    setTokensUsed(0);
    setMessageCount(0);
    setError(null);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 bg-background/80 backdrop-blur-xl border border-border">
        {/* Header - Liquid Glass */}
        <DialogHeader className="p-6 border-b border-border bg-muted/10">
          <DialogTitle className="font-serif text-3xl tracking-tight flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-purple-500" />
            Création Intelligente
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Discutez avec votre coach IA pour créer un bloc d'entraînement personnalisé
          </p>

          {/* Token Counter */}
          {conversationId && (
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/60 mt-3">
              <span>Tokens utilisés:</span>
              <span className="text-muted-foreground">{tokensUsed}</span>
              <span>•</span>
              <span>Messages: {messageCount}/15</span>
            </div>
          )}
        </DialogHeader>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isInitializing ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Initialisation de la conversation...</p>
            </div>
          ) : isValidated ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-8">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h3 className="font-serif text-2xl">Bloc créé avec succès !</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Votre nouveau bloc d'entraînement est prêt. Vous pouvez le consulter dans la section Planning.
              </p>
            </div>
          ) : proposal ? (
            <ProposalView
              proposal={proposal}
              onValidate={validateAndCreate}
              onReject={rejectProposal}
              isValidating={isLoading}
            />
          ) : (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user'
                        ? 'bg-gradient-to-r from-[#ee95b3] to-[#667abf] text-white'
                        : 'bg-muted/50 backdrop-blur-md border border-border'
                        }`}
                    >
                      <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-p:my-3 prose-ul:my-2 prose-li:my-1 prose-headings:text-sm prose-headings:font-semibold prose-headings:my-3 prose-strong:font-medium prose-strong:text-sm">
                        {msg.role === 'user' ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        )}
                      </div>
                      {msg.is_cached && msg.role === 'assistant' && (
                        <span className="text-xs text-muted-foreground mt-2 block font-mono">
                          cached
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted/50 backdrop-blur-md border border-border rounded-2xl p-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area - Super Glass */}
              <div className="p-6 border-t border-border bg-background/50 backdrop-blur-xl">
                <div className="flex gap-3">
                  <Textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Décrivez vos objectifs, disponibilités, comment vous vous sentez..."
                    className="flex-1 bg-background border-input focus:border-ring resize-none h-20"
                    disabled={isLoading}
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={sendMessage}
                      disabled={!messageInput.trim() || isLoading}
                      className="bg-gradient-to-r from-[#ee95b3] to-[#667abf] hover:opacity-90 transition-opacity"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={requestProposal}
                      disabled={isLoading || messages.length < 3}
                      variant="outline"
                      className="bg-background border-input hover:bg-muted"
                      title="Demander une proposition de bloc"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Astuce: Après 2-3 échanges, cliquez sur 📅 pour obtenir une proposition de bloc personnalisée
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Proposal View Component - Shows AI's proposed block
 */
function ProposalView({
  proposal,
  onValidate,
  onReject,
  isValidating
}: {
  proposal: BlockProposal;
  onValidate: () => void;
  onReject: () => void;
  isValidating: boolean;
}) {
  const params = proposal.block_parameters;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Analysis */}
      <div className="bg-muted/30 backdrop-blur-md border border-border rounded-2xl p-6">
        <h3 className="font-serif text-xl mb-3">Analyse</h3>
        <p className="text-foreground/80 leading-relaxed">{proposal.analysis}</p>
      </div>

      {/* Block Parameters */}
      <div className="bg-muted/30 backdrop-blur-md border border-border rounded-2xl p-6">
        <h3 className="font-serif text-xl mb-4">Paramètres du bloc</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <p className="text-2xl font-bold font-mono">{params.days_per_week}</p>
            <p className="text-xs text-muted-foreground">séances/sem</p>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <p className="text-2xl font-bold font-mono">{params.target_weekly_volume_km?.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">km/semaine</p>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <p className="text-lg font-semibold">{phaseLabels[params.phase] || params.phase}</p>
            <p className="text-xs text-muted-foreground">phase</p>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <p className="text-lg font-semibold">4</p>
            <p className="text-xs text-muted-foreground">semaines</p>
          </div>
        </div>

        {/* Intensity Distribution */}
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">Distribution d'intensité</p>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${params.easy_percentage}%` }}
              title={`Facile: ${params.easy_percentage}%`}
            />
            <div
              className="bg-orange-500 h-full"
              style={{ width: `${params.threshold_percentage}%` }}
              title={`Seuil: ${params.threshold_percentage}%`}
            />
            <div
              className="bg-red-500 h-full"
              style={{ width: `${params.interval_percentage}%` }}
              title={`Fractionné: ${params.interval_percentage}%`}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Facile {params.easy_percentage}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Seuil {params.threshold_percentage}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Intensité {params.interval_percentage}%
            </span>
          </div>
        </div>

        {/* Reasoning */}
        <p className="text-sm text-muted-foreground mt-4 italic">{params.reasoning}</p>
      </div>

      {/* Weekly Structure */}
      <div className="bg-muted/30 backdrop-blur-md border border-border rounded-2xl p-6">
        <h3 className="font-serif text-xl mb-4">Structure hebdomadaire type</h3>

        <div className="space-y-3">
          {proposal.weekly_structure.map((session, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-background/50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium w-20">{session.day}</span>
                <Badge className={workoutTypeColors[session.type] || 'bg-gray-100 text-gray-800'}>
                  {workoutTypeLabels[session.type] || session.type}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-mono">{session.distance_km?.toFixed(1)} km</span>
                <span className="text-muted-foreground max-w-xs truncate">
                  {session.description_courte}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Special Recommendations */}
      {proposal.special_recommendations && proposal.special_recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-[#ee95b3]/10 to-[#667abf]/10 border border-border rounded-2xl p-6">
          <h3 className="font-serif text-xl mb-3">Recommandations personnalisées</h3>
          <ul className="space-y-2">
            {proposal.special_recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <ArrowRight className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t border-border">
        <Button
          onClick={onValidate}
          disabled={isValidating}
          className="flex-1 bg-gradient-to-r from-[#ee95b3] to-[#667abf] hover:opacity-90 transition-opacity h-12"
        >
          {isValidating ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Création en cours...</>
          ) : (
            <>✓ Créer ce bloc</>
          )}
        </Button>
        <Button
          onClick={onReject}
          disabled={isValidating}
          variant="outline"
          className="flex-1 bg-background border-input hover:bg-muted h-12"
        >
          ← Continuer la discussion
        </Button>
      </div>
    </div>
  );
}
