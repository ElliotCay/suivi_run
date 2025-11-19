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
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>💬 Analyse de séance avec Claude</DialogTitle>
          <DialogDescription>
            Discute avec ton coach IA pour analyser ta séance et adapter ton programme si besoin
          </DialogDescription>
        </DialogHeader>

        {/* Messages container */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-[400px]">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm text-muted-foreground">Claude réfléchit...</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested adjustment banner */}
        {suggestedAdjustment && (
          <Card className="p-4 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm text-orange-900 dark:text-orange-100">
                  Ajustement recommandé
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                  {suggestedAdjustment.reason}
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-2">
                  {suggestedAdjustment.suggestion}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleAcceptAdjustment}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Appliquer l'ajustement
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRejectAdjustment}
              >
                Non merci
              </Button>
            </div>
          </Card>
        )}

        {/* Input area */}
        <div className="flex gap-2 pt-4 border-t">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Pose une question ou discute de la séance... (Entrée pour envoyer)"
            className="min-h-[60px]"
            disabled={loading}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={loading || !input.trim()}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
