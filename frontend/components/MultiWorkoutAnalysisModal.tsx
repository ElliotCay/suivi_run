'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send, Calendar, Activity } from 'lucide-react'
import axios from 'axios'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface MultiWorkoutAnalysisModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  startDate: string
  endDate: string
}

export default function MultiWorkoutAnalysisModal({
  open,
  onOpenChange,
  startDate,
  endDate
}: MultiWorkoutAnalysisModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [workoutsAnalyzed, setWorkoutsAnalyzed] = useState<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initial message when modal opens
  useEffect(() => {
    if (open && messages.length === 0 && startDate && endDate) {
      handleSendMessage("Analyse cette période d'entraînement. Quels sont les points clés, la progression et les éventuels points d'attention basés sur mes commentaires ?")
    }
  }, [open, startDate, endDate])

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
        'http://127.0.0.1:8000/api/workouts/analyze-range',
        {
          message: textToSend,
          start_date: startDate,
          end_date: endDate,
          conversation_history: conversationHistory
        }
      )

      // Update workouts analyzed count
      setWorkoutsAnalyzed(response.data.workouts_analyzed)

      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response
      }
      setMessages(prev => [...prev, assistantMessage])

    } catch (error: any) {
      console.error('Error analyzing workouts:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: error.response?.data?.detail || "Désolé, une erreur s'est produite lors de l'analyse. Peux-tu réessayer ?"
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClose = () => {
    setMessages([])
    setWorkoutsAnalyzed(0)
    onOpenChange(false)
  }

  const formatDateDisplay = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col border border-border bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl font-bold tracking-tight">
            Analyse de période
          </DialogTitle>
          <DialogDescription className="font-sans text-sm text-muted-foreground">
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#ee95b3]" />
                <span>{formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}</span>
              </div>
              {workoutsAnalyzed > 0 && (
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#667abf]" />
                  <span>{workoutsAnalyzed} séances analysées</span>
                </div>
              )}
            </div>
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
                <p className="font-sans text-sm text-muted-foreground">Claude analyse {workoutsAnalyzed > 0 ? `${workoutsAnalyzed} séances` : 'la période'}...</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Pose une question sur cette période... (Entrée pour envoyer)"
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
