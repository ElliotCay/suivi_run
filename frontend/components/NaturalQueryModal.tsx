'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Send, Code, ChevronDown, ChevronUp } from 'lucide-react'
import axios from 'axios'
import { toast } from 'sonner'

interface Message {
  role: 'user' | 'assistant'
  content: string
  results?: QueryResults
  sql?: string
  timestamp: Date
}

interface QueryResults {
  type: 'table' | 'metrics' | 'text'
  data: any
  columns?: string[]
}

interface NaturalQueryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function NaturalQueryModal({
  open,
  onOpenChange
}: NaturalQueryModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedSQL, setExpandedSQL] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Quick query suggestions
  const quickQueries = [
    "Mes PRs cette année",
    "Volume moyen en décembre",
    "Ma progression d'allure",
    "Séances tempo ce mois",
    "Meilleure séance récente"
  ]

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || input
    if (!textToSend.trim()) return

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    }
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
        'http://127.0.0.1:8000/api/queries/ask',
        {
          message: textToSend,
          conversation_history: conversationHistory
        }
      )

      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response,
        results: response.data.results,
        sql: response.data.sql_query,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      // Log caching info
      if (response.data.is_cached) {
        console.log(`✓ Cache hit - ${response.data.tokens_used} tokens`)
      } else {
        console.log(`○ Cache miss - ${response.data.tokens_used} tokens`)
      }

    } catch (error: any) {
      console.error('Error querying database:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: error.response?.data?.detail || "Désolé, une erreur s'est produite. Peux-tu reformuler ta question ?",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      toast.error("Erreur lors de la requête")
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

  const handleQuickQuery = (query: string) => {
    handleSendMessage(query)
  }

  const toggleSQL = (index: number) => {
    setExpandedSQL(expandedSQL === index ? null : index)
  }

  const handleClose = () => {
    setMessages([])
    setExpandedSQL(null)
    onOpenChange(false)
  }

  const formatTableData = (data: any[], columns: string[]) => {
    if (!data || data.length === 0) return null

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              {columns.map(col => (
                <th key={col} className="text-left px-3 py-2 font-medium text-muted-foreground">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                {columns.map(col => (
                  <td key={col} className="px-3 py-2">
                    {formatCellValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'number') {
      // If it looks like a pace (300-600 seconds), format as mm:ss
      if (value >= 200 && value <= 800) {
        const mins = Math.floor(value / 60)
        const secs = Math.floor(value % 60)
        return `${mins}:${String(secs).padStart(2, '0')}/km`
      }
      return value.toFixed(2)
    }
    return String(value)
  }

  const formatMetricsData = (data: any) => {
    if (!data) return null

    // If single object, show as metrics cards
    if (!Array.isArray(data)) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(data).map(([key, value]) => (
            <Card key={key} className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">{key}</div>
                <div className="text-2xl font-bold">{formatCellValue(value)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    // If array, show as small table
    const columns = Object.keys(data[0] || {})
    return formatTableData(data, columns)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col border border-border bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl font-bold tracking-tight">
            Pose une question
          </DialogTitle>
          <DialogDescription className="font-sans text-sm text-muted-foreground">
            Interroge tes données d'entraînement en langage naturel
          </DialogDescription>
        </DialogHeader>

        {/* Quick suggestions */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pb-4">
            {quickQueries.map((query, i) => (
              <button
                key={i}
                onClick={() => handleQuickQuery(query)}
                className="px-3 py-1.5 text-xs rounded-full border border-border bg-muted hover:bg-muted/80 transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        )}

        {/* Messages container with glass aesthetic */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-[400px]">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-[#ee95b3] to-[#667abf] text-white px-5 py-3'
                    : 'space-y-3'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="font-sans text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                ) : (
                  <>
                    {/* Assistant text response */}
                    <div className="bg-muted/50 border border-border rounded-xl px-5 py-3">
                      <p className="font-sans text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>

                    {/* Results display */}
                    {message.results && message.results.data && (
                      <div className="bg-muted/50 border border-border rounded-xl p-4">
                        {message.results.type === 'table' && formatTableData(
                          message.results.data,
                          message.results.columns || []
                        )}
                        {message.results.type === 'metrics' && formatMetricsData(message.results.data)}
                        {message.results.type === 'text' && (
                          <p className="text-sm text-muted-foreground">
                            {JSON.stringify(message.results.data, null, 2)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* SQL toggle button */}
                    {message.sql && (
                      <div className="space-y-2">
                        <button
                          onClick={() => toggleSQL(index)}
                          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Code className="h-3 w-3" />
                          {expandedSQL === index ? 'Cacher SQL' : 'Voir SQL'}
                          {expandedSQL === index ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                        {expandedSQL === index && (
                          <div className="bg-stone-900 border border-border rounded-lg p-3 font-mono text-xs overflow-x-auto">
                            <pre className="text-green-400">{message.sql}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
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

        {/* Input area */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Pose une question sur tes données... (ex: 'Mes PRs sur 5km')"
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
