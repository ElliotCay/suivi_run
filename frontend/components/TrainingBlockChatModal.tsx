/**
 * Training Block Chat Modal - AI-powered conversational adjustments
 *
 * Design: Allure "Liquid Glass" aesthetic
 * - Deep transparency with heavy blur
 * - Minimal, focused interface
 * - Organic motion and interactions
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChatAdjustment, type WorkoutAdjustment } from '@/hooks/useChatAdjustment';
import { Loader2, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TrainingBlockChatModalProps {
  blockId: number;
  isOpen: boolean;
  onClose: () => void;
  onChangesApplied?: () => void;
}

export default function TrainingBlockChatModal({
  blockId,
  isOpen,
  onClose,
  onChangesApplied
}: TrainingBlockChatModalProps) {
  const {
    conversation,
    messages,
    proposal,
    isLoading,
    error,
    loadOrCreateConversation,
    sendMessage,
    requestProposal,
    validateChanges,
    rejectProposal,
    resetConversation
  } = useChatAdjustment();

  const [scopeMode, setScopeMode] = useState<'block_start' | 'rolling_4weeks'>('block_start');
  const [messageInput, setMessageInput] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation when modal opens
  useEffect(() => {
    if (isOpen && !conversation) {
      initializeConversation();
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeConversation = async () => {
    setIsInitializing(true);
    try {
      await loadOrCreateConversation(blockId, scopeMode);
    } catch (err) {
      console.error('Failed to initialize conversation:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isLoading) return;

    const message = messageInput.trim();
    setMessageInput('');

    try {
      const result = await sendMessage(message);

      // Show warning if approaching message limit
      if (result.approaching_limit) {
        // Could show a toast notification here
        console.warn(`Approaching message limit: ${result.message_count}/${result.max_messages}`);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleRequestProposal = async () => {
    try {
      await requestProposal();
    } catch (err) {
      console.error('Failed to request proposal:', err);
    }
  };

  const handleValidate = async () => {
    try {
      await validateChanges();

      // Notify parent component to refresh data
      if (onChangesApplied) {
        onChangesApplied();
      }

      // Close modal after brief delay
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to validate changes:', err);
    }
  };

  const handleClose = () => {
    resetConversation();
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 bg-background/80 backdrop-blur-xl border border-border">
        {/* Header - Liquid Glass */}
        <DialogHeader className="p-6 border-b border-border bg-muted/10">
          <DialogTitle className="font-serif text-3xl tracking-tight">
            Ajustement Intelligent
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Discutez avec votre coach IA pour adapter vos séances
          </p>

          {/* Scope Mode Toggle */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setScopeMode('block_start')}
              disabled={!!conversation}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${scopeMode === 'block_start'
                  ? 'bg-gradient-to-r from-[#ee95b3] to-[#667abf] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                } ${conversation ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Depuis début du bloc
            </button>
            <button
              onClick={() => setScopeMode('rolling_4weeks')}
              disabled={!!conversation}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${scopeMode === 'rolling_4weeks'
                  ? 'bg-gradient-to-r from-[#ee95b3] to-[#667abf] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                } ${conversation ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              4 dernières semaines
            </button>
          </div>

          {/* Token Counter & Reset Button */}
          {conversation && (
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/60">
                <span>Tokens utilisés:</span>
                <span className="text-muted-foreground">{conversation.total_tokens}</span>
                <span>•</span>
                <span>Messages: {messages.length}/{20}</span>
              </div>
              <Button
                onClick={resetConversation}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Réinitialiser
              </Button>
            </div>
          )}
        </DialogHeader>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isInitializing ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : conversation?.state === 'validated' ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-8">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h3 className="font-serif text-2xl">Changements appliqués</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Vos séances ont été ajustées avec succès. Les modifications sont visibles dans votre bloc d'entraînement.
              </p>
            </div>
          ) : proposal ? (
            <ProposalView
              proposal={proposal}
              onValidate={handleValidate}
              onReject={rejectProposal}
              isValidating={isLoading}
            />
          ) : (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg, idx) => (
                  <div
                    key={msg.id || idx}
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
                    placeholder="Décrivez vos ressentis, fatigue, douleurs..."
                    className="flex-1 bg-background border-input focus:border-ring resize-none h-20"
                    disabled={isLoading}
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || isLoading}
                      className="bg-gradient-to-r from-[#ee95b3] to-[#667abf] hover:opacity-90 transition-opacity"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={handleRequestProposal}
                      disabled={isLoading || messages.length < 4}
                      variant="outline"
                      className="bg-background border-input hover:bg-muted"
                      title="Demander une proposition d'ajustements"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Proposal View Component - Shows AI's proposed adjustments with diff
 */
function ProposalView({
  proposal,
  onValidate,
  onReject,
  isValidating
}: {
  proposal: { analysis: string; adjustments: WorkoutAdjustment[]; tokens_used: number };
  onValidate: () => void;
  onReject: () => void;
  isValidating: boolean;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Analysis */}
      <div className="bg-muted/30 backdrop-blur-md border border-border rounded-2xl p-6">
        <h3 className="font-serif text-xl mb-3">Analyse</h3>
        <p className="text-foreground/80 leading-relaxed">{proposal.analysis}</p>
      </div>

      {/* Adjustments */}
      <div className="space-y-4">
        <h3 className="font-serif text-xl">Ajustements proposés ({proposal.adjustments.length})</h3>

        {proposal.adjustments.map((adj, idx) => (
          <WorkoutDiff key={idx} adjustment={adj} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t border-border">
        <Button
          onClick={onValidate}
          disabled={isValidating}
          className="flex-1 bg-gradient-to-r from-[#ee95b3] to-[#667abf] hover:opacity-90 transition-opacity h-12"
        >
          {isValidating ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Application...</>
          ) : (
            <>✓ Valider et appliquer</>
          )}
        </Button>
        <Button
          onClick={onReject}
          disabled={isValidating}
          variant="outline"
          className="flex-1 bg-background border-input hover:bg-muted h-12"
        >
          ✗ Refuser et continuer
        </Button>
      </div>
    </div>
  );
}

/**
 * Workout Diff Component - Visual diff for before/after
 */
function WorkoutDiff({ adjustment }: { adjustment: WorkoutAdjustment }) {
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'modify':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">Modifié</span>;
      case 'delete':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">Supprimé</span>;
      case 'reschedule':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">Reporté</span>;
      case 'create':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Créé</span>;
      default:
        return null;
    }
  };

  // Create action: show only proposed workout
  if (adjustment.action === 'create') {
    if (!adjustment.proposed) return null;
    return (
      <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-green-400">Nouvelle séance</span>
          {getActionBadge(adjustment.action)}
        </div>
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 space-y-1 font-mono text-sm">
          <div className="text-muted-foreground">{adjustment.proposed.date}</div>
          <div className="text-green-400">{adjustment.proposed.type}</div>
          <div className="text-foreground/80">{adjustment.proposed.distance_km}km</div>
          <div className="text-muted-foreground text-xs">{adjustment.proposed.pace_target || 'N/A'}</div>
        </div>
        <div className="pt-3 border-t border-border">
          <p className="text-muted-foreground text-sm leading-relaxed">{adjustment.reasoning}</p>
        </div>
      </div>
    );
  }

  // Delete action: show only reasoning
  if (adjustment.action === 'delete') {
    return (
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-sm text-red-400">ID {adjustment.workout_id}</span>
          {getActionBadge(adjustment.action)}
        </div>
        <p className="text-muted-foreground text-sm">{adjustment.reasoning}</p>
      </div>
    );
  }

  // Safety check: ensure current and proposed exist
  if (!adjustment.current || !adjustment.proposed) {
    return (
      <div className="bg-muted/30 backdrop-blur-md border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-sm text-muted-foreground">ID {adjustment.workout_id}</span>
          {getActionBadge(adjustment.action)}
        </div>
        <p className="text-muted-foreground text-sm">{adjustment.reasoning}</p>
        <p className="text-xs text-red-400 mt-2">⚠️ Données d'ajustement incomplètes</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 backdrop-blur-md border border-border rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-muted-foreground">ID {adjustment.workout_id}</span>
        {getActionBadge(adjustment.action)}
      </div>

      {/* Diff Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Current */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actuel</h4>
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-1 font-mono text-sm">
            <div className="text-muted-foreground">{adjustment.current.date}</div>
            <div className="text-red-400">{adjustment.current.type}</div>
            <div className="text-foreground/80">{adjustment.current.distance_km}km</div>
            <div className="text-muted-foreground text-xs">{adjustment.current.pace_target || 'N/A'}</div>
          </div>
        </div>

        {/* Proposed */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Proposé</h4>
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 space-y-1 font-mono text-sm">
            <div className="text-muted-foreground">{adjustment.proposed.date}</div>
            <div className="text-green-400">{adjustment.proposed.type}</div>
            <div className="text-foreground/80">{adjustment.proposed.distance_km}km</div>
            <div className="text-muted-foreground text-xs">{adjustment.proposed.pace_target || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="pt-3 border-t border-border">
        <p className="text-muted-foreground text-sm leading-relaxed">{adjustment.reasoning}</p>
      </div>
    </div>
  );
}
