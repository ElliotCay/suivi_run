'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { MessageSquare, Copy, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { generateWorkoutAnalysisMarkdown, copyMarkdownToClipboard } from '@/lib/ai-export'
import axios from 'axios'

interface AIAnalyzeButtonProps {
  workoutId: number
  workoutData: any
  aiMode: 'integrated' | 'export'
  onAnalysisComplete?: () => void
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
}

export function AIAnalyzeButton({
  workoutId,
  workoutData,
  aiMode,
  onAnalysisComplete,
  variant = 'ghost',
  size = 'sm',
  showLabel = false
}: AIAnalyzeButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleAnalyze = async () => {
    if (aiMode === 'export') {
      // Export mode: Generate markdown and copy to clipboard
      await handleExportMode()
    } else {
      // Integrated mode: Call API
      await handleIntegratedMode()
    }
  }

  const handleExportMode = async () => {
    setAnalyzing(true)
    try {
      // Fetch additional context
      const [profileRes, workoutsRes] = await Promise.all([
        axios.get('http://localhost:8000/api/profile'),
        axios.get('http://localhost:8000/api/workouts')
      ])

      // Find recent workouts (excluding current one)
      const recentWorkouts = workoutsRes.data
        .filter((w: any) => w.id !== workoutId)
        .slice(0, 5)

      // Generate markdown
      const markdown = generateWorkoutAnalysisMarkdown(
        workoutData,
        recentWorkouts,
        profileRes.data
      )

      // Copy to clipboard
      const success = await copyMarkdownToClipboard(markdown)

      if (success) {
        toast.success('Analyse copiée dans le presse-papier !', {
          description: 'Colle ce texte dans l\'app Claude pour obtenir ton feedback.'
        })
        setAnalysis(markdown)
        setDialogOpen(true)
      } else {
        toast.error('Erreur lors de la copie')
      }
    } catch (error) {
      console.error('Error generating export:', error)
      toast.error('Erreur lors de la génération de l\'export')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleIntegratedMode = async () => {
    setAnalyzing(true)
    setDialogOpen(true)
    try {
      // Call API for analysis
      const response = await axios.post(`http://localhost:8000/api/workouts/${workoutId}/analyze`)
      setAnalysis(response.data.analysis)
      toast.success('Analyse terminée !')
      if (onAnalysisComplete) {
        onAnalysisComplete()
      }
    } catch (error) {
      console.error('Error analyzing workout:', error)
      toast.error('Erreur lors de l\'analyse')
      setDialogOpen(false)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCopyAgain = async () => {
    if (analysis) {
      const success = await copyMarkdownToClipboard(analysis)
      if (success) {
        setCopied(true)
        toast.success('Copié à nouveau !')
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleAnalyze}
        disabled={analyzing}
      >
        {analyzing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}
        {showLabel && <span className="ml-2">Analyser</span>}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {aiMode === 'export' ? 'Export pour Claude' : 'Analyse de séance'}
            </DialogTitle>
            <DialogDescription>
              {aiMode === 'export'
                ? 'Le texte ci-dessous a été copié dans ton presse-papier. Colle-le dans l\'app Claude pour obtenir ton analyse.'
                : 'Analyse générée par le coach IA'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {analyzing && aiMode === 'integrated' ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Analyse en cours...</p>
              </div>
            ) : analysis ? (
              <div className="space-y-4">
                {aiMode === 'export' ? (
                  <>
                    <div className="bg-muted/50 rounded-lg p-4 border">
                      <pre className="whitespace-pre-wrap text-xs font-mono max-h-96 overflow-y-auto">
                        {analysis}
                      </pre>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        💡 Colle ce texte dans Claude pour obtenir ton feedback
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyAgain}
                        className="ml-auto"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Copié !
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copier à nouveau
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{analysis}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
