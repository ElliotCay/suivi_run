'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import axios from 'axios'
import { Loader2, Sparkles, Check, Clock, Trash2 } from 'lucide-react'

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
  }
  reasoning: string | null
  model_used: string
  tokens_used: number
  completed: number
  completed_workout_id: number | null
  created_at: string
}

const workoutTypeLabels: Record<string, string> = {
  'facile': 'Sortie facile',
  'tempo': 'Tempo',
  'fractionne': 'Fractionné',
  'longue': 'Sortie longue'
}

const workoutTypeColors: Record<string, string> = {
  'facile': 'bg-green-100 text-green-800',
  'tempo': 'bg-orange-100 text-orange-800',
  'fractionne': 'bg-red-100 text-red-800',
  'longue': 'bg-blue-100 text-blue-800'
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
        alert(`Semaine générée ! ${response.data.suggestions.length} séances créées.\n${response.data.week_description || ''}`)
      } else {
        // Single workout generation
        setSuggestions([response.data, ...suggestions])
        alert('Suggestion générée avec succès!')
      }

      loadSuggestions() // Reload to ensure consistency
    } catch (error) {
      console.error('Error generating suggestion:', error)
      alert('Erreur lors de la génération de la suggestion. Vérifiez que ANTHROPIC_API_KEY est configuré.')
    } finally {
      setGenerating(false)
    }
  }

  const markComplete = async (suggestionId: number) => {
    try {
      await axios.patch(`http://localhost:8000/api/suggestions/${suggestionId}/complete`)
      loadSuggestions()
    } catch (error) {
      console.error('Error marking suggestion complete:', error)
      alert('Erreur lors de la mise à jour')
    }
  }

  const deleteSuggestion = async (suggestionId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette suggestion ?')) {
      return
    }

    try {
      await axios.delete(`http://localhost:8000/api/suggestions/${suggestionId}`)
      loadSuggestions()
    } catch (error) {
      console.error('Error deleting suggestion:', error)
      alert('Erreur lors de la suppression')
    }
  }

  if (loading) {
    return <div className="container mx-auto py-8">Chargement...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-3xl font-bold">Suggestions d&apos;entraînement</h1>
        <div className="flex flex-col gap-2">
          {!showOptions ? (
            <Button
              onClick={() => setShowOptions(true)}
              disabled={generating}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Générer une suggestion
            </Button>
          ) : (
            <Card className="w-80">
              <CardHeader>
                <CardTitle className="text-lg">Type de génération</CardTitle>
                <CardDescription>Choisissez ce que vous voulez générer</CardDescription>
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
          )}
        </div>
      </div>

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Aucune suggestion pour le moment
            </p>
            <p className="text-sm text-muted-foreground">
              Cliquez sur &quot;Générer une suggestion&quot; pour recevoir une recommandation personnalisée basée sur vos dernières séances.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {suggestions.map((suggestion) => {
            const workoutType = suggestion.structure?.type || suggestion.workout_type || 'facile'
            const typeLabel = workoutTypeLabels[workoutType] || workoutType
            const typeColor = workoutTypeColors[workoutType] || 'bg-gray-100 text-gray-800'

            return (
              <Card key={suggestion.id} className={suggestion.completed ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={typeColor}>
                          {typeLabel}
                        </Badge>
                        {suggestion.completed ? (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Complétée
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            En attente
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl">
                        {suggestion.structure?.day && (
                          <span className="text-sm font-normal text-muted-foreground mr-2">
                            {suggestion.structure.day}:
                          </span>
                        )}
                        {suggestion.structure?.distance_km
                          ? `${suggestion.structure.distance_km} km`
                          : 'Séance suggérée'}
                      </CardTitle>
                      <CardDescription>
                        {suggestion.structure?.allure_cible && (
                          <span>Allure cible: {suggestion.structure.allure_cible}</span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {!suggestion.completed && (
                        <Button
                          onClick={() => markComplete(suggestion.id)}
                          variant="outline"
                          size="sm"
                        >
                          Marquer comme complétée
                        </Button>
                      )}
                      <Button
                        onClick={() => deleteSuggestion(suggestion.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {suggestion.structure?.structure && (
                    <div>
                      <h3 className="font-semibold mb-2">Structure de la séance</h3>
                      <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
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
                      <h3 className="font-semibold mb-2">Raison</h3>
                      <ul className="text-sm text-muted-foreground space-y-1.5 list-none">
                        {(suggestion.structure?.raison || suggestion.reasoning)
                          .split('\n')
                          .filter((line: string) => line.trim())
                          .map((line: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-muted-foreground mt-0.5">-</span>
                              <span className="flex-1">{line.trim()}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                    <span>Modèle: {suggestion.model_used.includes('sonnet') ? 'Claude Sonnet' : 'Claude Haiku'}</span>
                    <span>Tokens: {suggestion.tokens_used}</span>
                    <span>
                      {new Date(suggestion.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
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
