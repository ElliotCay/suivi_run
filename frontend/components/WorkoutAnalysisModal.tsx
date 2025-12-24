'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Loader2, Send, AlertCircle, CheckCircle2 } from 'lucide-react'
import axios from 'axios'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface BlockAdjustment {
  type: 'pace_reduction' | 'split_workout' | 'rest_day' | 'swap_sessions'
  reason: string
  suggestion: string
}

interface WorkoutAnalysisModalProps {
  workoutId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onBlockAdjustment?: (adjustment: BlockAdjustment) => void
}

export default function WorkoutAnalysisModal({
  workoutId,
  open,
  onOpenChange,
  onBlockAdjustment
}: WorkoutAnalysisModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestedAdjustment, setSuggestedAdjustment] = useState<BlockAdjustment | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initial message when modal opens
  useEffect(() => {
    if (open && messages.length === 0) {
      handleSendMessage("Analyse cette séance et dis-moi ce que tu en penses. Y a-t-il des points d'attention ?")
    }
  }, [open])

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || input
    if (!textToSend.trim()) return

    // Add user message
    const userMessage: Message = { role: 'user', content: textToSend }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Prepare conversation history for API
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const response = await axios.post(
        `http://127.0.0.1:8000/api/workouts/${workoutId}/analyze`,
        {
          message: textToSend,
          conversation_history: conversationHistory
        }
      )

      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response
      }
      setMessages(prev => [...prev, assistantMessage])

      // Handle suggested adjustments
      if (response.data.suggested_block_adjustments) {
        setSuggestedAdjustment(response.data.suggested_block_adjustments)
      }

    } catch (error) {
      console.error('Error analyzing workout:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: "Désolé, une erreur s'est produite lors de l'analyse. Peux-tu réessayer ?"
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptAdjustment = () => {
    if (suggestedAdjustment && onBlockAdjustment) {
      onBlockAdjustment(suggestedAdjustment)
      setSuggestedAdjustment(null)
    }
  }

  const handleRejectAdjustment = () => {
    setSuggestedAdjustment(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClose = () => {
    setMessages([])
    setSuggestedAdjustment(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col border border-border bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl font-bold tracking-tight">
            Analyse de séance
          </DialogTitle>
          <DialogDescription className="font-sans text-sm text-muted-foreground">
            Discussion avec ton coach IA pour adapter ton entraînement
          </DialogDescription>
        </DialogHeader>

        {/* Messages container with glass aesthetic */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-[400px]">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-5 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-[#ee95b3] to-[#667abf] text-white'
                    : 'bg-muted/50 border border-border'
                }`}
              >
                <p className="font-sans text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted/50 border border-border rounded-xl px-5 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#ee95b3]" />
                <p className="font-sans text-sm text-muted-foreground">Claude analyse...</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested adjustment banner - Allure style */}
        {suggestedAdjustment && (
          <div className="relative rounded-xl border border-amber-500/20 bg-amber-500/10 backdrop-blur-md p-5 space-y-3 overflow-hidden group">
            {/* Gradient border on hover */}
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                background: "linear-gradient(90deg, #ee95b3, #667abf)",
                padding: "1px",
                WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
              }}
            />

            <div className="relative z-10">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-sans text-sm font-semibold text-amber-600 dark:text-amber-400">
                    Ajustement recommandé
                  </p>
                  <p className="font-sans text-sm text-foreground/90">
                    {suggestedAdjustment.reason}
                  </p>
                  <p className="font-sans text-sm text-muted-foreground italic">
                    {suggestedAdjustment.suggestion}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAcceptAdjustment}
                  className="flex-1 bg-gradient-to-r from-[#ee95b3] to-[#667abf] text-white font-sans text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Valider l'ajustement
                </button>
                <button
                  onClick={handleRejectAdjustment}
                  className="flex-1 border border-border font-sans text-sm font-medium px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  Ignorer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Pose une question ou discute de la séance... (Entrée pour envoyer)"
            className="min-h-[60px] bg-muted/30 border-border font-sans text-sm resize-none focus:border-ring transition-colors"
            disabled={loading}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !input.trim()}
            className="h-[60px] w-[60px] rounded-lg bg-gradient-to-r from-[#ee95b3] to-[#667abf] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
