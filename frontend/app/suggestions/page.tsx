'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import axios from 'axios'
import { Loader2, Sparkles, Check, Clock, Trash2, Calendar, Rss, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface Suggestion {
  id: number
  user_id: number
  workout_type: string
  distance: number | null
  pace_target: string | null
  structure: {
    type: string
    distance_km: number
    allure_cible: string
    structure: string
    raison: string
    day?: string
  }
  reasoning: string | null
  model_used: string
  tokens_used: number
  completed: number
  completed_workout_id: number | null
  created_at: string
  scheduled_date: string | null
  calendar_event_id: string | null
}

const workoutTypeLabels: Record<string, string> = {
  'facile': 'Sortie facile',
  'tempo': 'Tempo',
  'fractionne': 'Fractionné',
  'longue': 'Sortie longue'
}

const workoutTypeColors: Record<string, string> = {
  'facile': 'bg-muted text-foreground',
  'tempo': 'bg-muted text-foreground',
  'fractionne': 'bg-muted text-foreground',
  'longue': 'bg-muted text-foreground'
}

function CalendarSubscribeDialog() {
  const [open, setOpen] = useState(false)
  const webcalUrl = 'webcal://localhost:8000/api/calendar/feed.ics'
  const httpUrl = 'http://localhost:8000/api/calendar/feed.ics'

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('URL copiée dans le presse-papier !')
  }

  const openInCalendar = () => {
    window.location.href = webcalUrl
    toast.success('Ouverture dans Apple Calendar...')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Rss className="h-4 w-4" />
          S'abonner au calendrier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bold">Abonnement au calendrier</DialogTitle>
          <DialogDescription>
            Synchronisez automatiquement vos séances planifiées avec Apple Calendar
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Une fois abonné, toutes vos séances planifiées apparaîtront automatiquement dans votre calendrier.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold">Méthode 1 : Ouverture directe</Label>
            <Button onClick={openInCalendar} className="w-full" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Ouvrir dans Apple Calendar
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold">Méthode 2 : URL manuelle</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webcalUrl}
                className="text-xs font-mono"
              />
              <Button
                onClick={() => copyToClipboard(webcalUrl)}
                variant="outline"
                size="sm"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Copiez cette URL et ajoutez-la dans Calendrier → Fichier → Nouvel abonnement
            </p>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-xs text-muted-foreground">
              💡 Astuce : Les modifications (ajout, suppression, planification) seront automatiquement synchronisées.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ScheduleDialog({ suggestion, onSchedule }: { suggestion: Suggestion; onSchedule: (date: string) => void }) {
  // Get tomorrow's date as default
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().split('T')[0]

  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [selectedTime, setSelectedTime] = useState('18:00')

  const handleSchedule = () => {
    if (!selectedDate) {
      toast.error('Veuillez sélectionner une date')
      return
    }
    const dateTime = `${selectedDate}T${selectedTime}:00`
    onSchedule(dateTime)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <Calendar className="h-3 w-3 mr-1" />
          Planifier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-bold">Planifier la séance</DialogTitle>
          <DialogDescription className="text-sm">
            Choisissez la date et l'heure pour cette séance
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="date" className="text-sm font-bold">Date</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate || defaultDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <Label htmlFor="time" className="text-sm font-bold">Heure</Label>
            <Input
              id="time"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSchedule} variant="outline" size="sm" className="flex-1">
              Confirmer
            </Button>
            <Button onClick={() => setOpen(false)} variant="ghost" size="sm" className="flex-1">
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  useEffect(() => {
    loadSuggestions()
  }, [])

  const loadSuggestions = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/suggestions')
      setSuggestions(response.data)
    } catch (error) {
      console.error('Error loading suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateSuggestion = async (workoutType: string | null = null, generateWeek: boolean = false) => {
    setGenerating(true)
    setShowOptions(false)
    try {
      const response = await axios.post('http://localhost:8000/api/suggestions/generate', {
        use_sonnet: true,
        workout_type: workoutType,
        generate_week: generateWeek
      })

      if (generateWeek && response.data.suggestions) {
        // Week generation returns multiple suggestions
        setSuggestions([...response.data.suggestions, ...suggestions])
        toast.success(`Semaine générée ! ${response.data.suggestions.length} séances créées.`)
      } else {
        // Single workout generation
        setSuggestions([response.data, ...suggestions])
        toast.success('Suggestion générée avec succès!')
      }

      loadSuggestions() // Reload to ensure consistency
    } catch (error: any) {
      console.error('Error generating suggestion:', error)
      toast.error(error?.response?.data?.detail || 'Erreur lors de la génération de la suggestion')
    } finally {
      setGenerating(false)
    }
  }

  const markComplete = async (suggestionId: number) => {
    try {
      // Marquer comme terminée puis supprimer directement
      await axios.patch(`http://localhost:8000/api/suggestions/${suggestionId}/complete`)
      await axios.delete(`http://localhost:8000/api/suggestions/${suggestionId}`)
      toast.success('Séance terminée et archivée')
      loadSuggestions()
    } catch (error: any) {
      console.error('Error marking suggestion complete:', error)
      toast.error(error?.response?.data?.detail || 'Erreur lors de la mise à jour')
    }
  }

  const deleteSuggestion = async (suggestionId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette suggestion ?')) {
      return
    }

    try {
      await axios.delete(`http://localhost:8000/api/suggestions/${suggestionId}`)
      toast.success('Suggestion supprimée')
      loadSuggestions()
    } catch (error: any) {
      console.error('Error deleting suggestion:', error)
      toast.error(error?.response?.data?.detail || 'Erreur lors de la suppression')
    }
  }

  const scheduleSuggestion = async (suggestionId: number, scheduledDate: string) => {
    try {
      await axios.patch(`http://localhost:8000/api/suggestions/${suggestionId}/schedule`, {
        scheduled_date: scheduledDate
      })
      toast.success('Séance planifiée !')
      loadSuggestions()
    } catch (error: any) {
      console.error('Error scheduling suggestion:', error)
      toast.error(error?.response?.data?.detail || 'Erreur lors de la planification')
    }
  }

  const downloadCalendarEvent = async (suggestionId: number) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/suggestions/${suggestionId}/calendar`,
        { responseType: 'blob' }
      )

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `workout-${suggestionId}.ics`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success('Événement téléchargé ! Ajoutez-le à votre calendrier.')
    } catch (error: any) {
      console.error('Error downloading calendar event:', error)
      toast.error(error?.response?.data?.detail || 'Erreur lors du téléchargement')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Minimal Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight">
            Suggestions
          </h1>
          <p className="text-base text-muted-foreground">
            {suggestions.length} {suggestions.length > 1 ? 'entraînements' : 'entraînement'} suggéré{suggestions.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <CalendarSubscribeDialog />
            {!showOptions ? (
              <Button
                onClick={() => setShowOptions(true)}
                disabled={generating}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Générer
              </Button>
            ) : null}
          </div>
          {showOptions ? (
            <Card className="w-80 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Type de génération</CardTitle>
                <CardDescription className="text-sm">Choisissez ce que vous voulez générer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => generateSuggestion(null, true)}
                  disabled={generating}
                  className="w-full flex items-center gap-2"
                  variant="default"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Semaine type complète (3 séances)
                    </>
                  )}
                </Button>
                <div className="border-t pt-3">
                  <p className="text-sm text-muted-foreground mb-2">Ou une séance spécifique :</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => generateSuggestion('facile')}
                      disabled={generating}
                      variant="outline"
                      className="text-xs"
                    >
                      Sortie facile
                    </Button>
                    <Button
                      onClick={() => generateSuggestion('tempo')}
                      disabled={generating}
                      variant="outline"
                      className="text-xs"
                    >
                      Tempo
                    </Button>
                    <Button
                      onClick={() => generateSuggestion('fractionne')}
                      disabled={generating}
                      variant="outline"
                      className="text-xs"
                    >
                      Fractionné
                    </Button>
                    <Button
                      onClick={() => generateSuggestion('longue')}
                      disabled={generating}
                      variant="outline"
                      className="text-xs"
                    >
                      Sortie longue
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={() => setShowOptions(false)}
                  variant="ghost"
                  className="w-full text-xs"
                >
                  Annuler
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {suggestions.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-16 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-base font-bold mb-2">
              Aucune suggestion
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Cliquez sur &quot;Générer&quot; pour recevoir une recommandation personnalisée basée sur vos dernières séances.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {suggestions.map((suggestion) => {
            const workoutType = suggestion.structure?.type || suggestion.workout_type || 'facile'
            const typeLabel = workoutTypeLabels[workoutType] || workoutType
            const typeColor = workoutTypeColors[workoutType] || 'bg-gray-100 text-gray-800'

            return (
              <Card key={suggestion.id} className={`hover:shadow-md transition-all ${suggestion.completed ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={typeColor} variant="secondary">
                          {typeLabel}
                        </Badge>
                        {suggestion.completed ? (
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <Check className="h-3 w-3" />
                            Complétée
                          </Badge>
                        ) : suggestion.scheduled_date ? (
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <Calendar className="h-3 w-3" />
                            Planifiée le {new Date(suggestion.scheduled_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            En attente
                          </Badge>
                        )}
                      </div>
                      <div className="font-bold text-lg">
                        {suggestion.structure?.day && (
                          <span className="text-sm font-normal text-muted-foreground mr-2">
                            {suggestion.structure.day}:
                          </span>
                        )}
                        {suggestion.structure?.distance_km
                          ? `${suggestion.structure.distance_km} km`
                          : 'Séance suggérée'}
                      </div>
                      {suggestion.structure?.allure_cible && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Allure cible: {suggestion.structure.allure_cible}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {!suggestion.completed && !suggestion.scheduled_date && (
                        <ScheduleDialog
                          suggestion={suggestion}
                          onSchedule={(date) => scheduleSuggestion(suggestion.id, date)}
                        />
                      )}
                      {suggestion.scheduled_date && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadCalendarEvent(suggestion.id)
                          }}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Télécharger
                        </Button>
                      )}
                      {!suggestion.completed && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            markComplete(suggestion.id)
                          }}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Terminer
                        </Button>
                      )}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSuggestion(suggestion.id)
                        }}
                        variant="outline"
                        size="sm"
                        className="hover:bg-muted"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {suggestion.structure?.structure && (
                      <div>
                        <h3 className="text-sm font-bold mb-1.5">Structure</h3>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          {suggestion.structure.structure
                            .split('\n')
                            .filter((line: string) => line.trim())
                            .map((line: string, index: number) => (
                              <li key={index} className="ml-2">{line.trim()}</li>
                            ))}
                        </ol>
                      </div>
                    )}

                    {(suggestion.structure?.raison || suggestion.reasoning) && (
                      <div>
                        <h3 className="text-sm font-bold mb-1.5">Raison</h3>
                        <ul className="text-sm text-muted-foreground space-y-1 list-none">
                          {(suggestion.structure?.raison || suggestion.reasoning || '')
                            .split('\n')
                            .filter((line: string) => line.trim())
                            .map((line: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-muted-foreground mt-0.5">•</span>
                                <span className="flex-1">{line.trim()}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                      <span>{suggestion.model_used.includes('sonnet') ? 'Claude Sonnet' : 'Claude Haiku'}</span>
                      <span>•</span>
                      <span>{suggestion.tokens_used} tokens</span>
                      <span>•</span>
                      <span>
                        {new Date(suggestion.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
