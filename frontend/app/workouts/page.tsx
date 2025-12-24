'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import Link from 'next/link'
import axios from 'axios'
import { Sparkles, Loader2, Activity, RefreshCw, Trash2, Calendar, MessageSquare, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import EmptyState from '@/components/EmptyState'
import MultiWorkoutAnalysisModal from '@/components/MultiWorkoutAnalysisModal'
import NaturalQueryModal from '@/components/NaturalQueryModal'

interface Workout {
  id: number
  date: string
  distance: number | null
  duration: number | null
  avg_pace: number | null
  avg_hr: number | null
  workout_type: string | null
  user_rating: number | null
  is_test: boolean
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [classifying, setClassifying] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Date range selection for multi-workout analysis
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false)

  // Natural language query modal
  const [queryModalOpen, setQueryModalOpen] = useState(false)

  useEffect(() => {
    loadWorkouts()
  }, [])

  const loadWorkouts = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/workouts?limit=1000')
      setWorkouts(response.data)
    } catch (error) {
      console.error('Error loading workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const classifyWorkouts = async () => {
    setClassifying(true)
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/workouts/classify')
      toast.success(`Classification terminée ! ${response.data.classified} séances classifiées.`)
      loadWorkouts()
    } catch (error) {
      console.error('Error classifying workouts:', error)
      toast.error('Erreur lors de la classification')
    } finally {
      setClassifying(false)
    }
  }

  const syncStrava = async () => {
    setSyncing(true)
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/strava/sync')
      if (response.data.success) {
        const imported = response.data.imported || 0
        const skipped = response.data.skipped || 0

        if (imported > 0) {
          toast.success(`${imported} nouvelle(s) séance(s) importée(s) depuis Strava !`)
          loadWorkouts()
        } else if (skipped > 0) {
          toast.info('Aucune nouvelle séance. Tout est déjà à jour !')
        } else {
          toast.info('Aucune séance trouvée sur Strava')
        }
      }
    } catch (error: any) {
      console.error('Error syncing Strava:', error)
      if (error.response?.status === 400) {
        toast.error('Connectez votre compte Strava dans les paramètres')
      } else {
        toast.error('Erreur lors de la synchronisation Strava')
      }
    } finally {
      setSyncing(false)
    }
  }

  const deleteTestWorkout = async (workoutId: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('Supprimer cette séance de test ?')) {
      return
    }

    try {
      await axios.delete(`http://127.0.0.1:8000/api/workouts/${workoutId}`)
      toast.success('Séance de test supprimée')
      loadWorkouts()
    } catch (error: any) {
      console.error('Error deleting workout:', error)
      if (error.response?.status === 403) {
        toast.error('Seules les séances de test peuvent être supprimées')
      } else {
        toast.error('Erreur lors de la suppression')
      }
    }
  }

  const handleOpenAnalysis = () => {
    if (startDate && endDate) {
      setDatePickerOpen(false)
      setAnalysisModalOpen(true)
    }
  }

  const setQuickDateRange = (days: number) => {
    const now = new Date()
    const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    setStartDate(past.toISOString().split('T')[0])
    setEndDate(now.toISOString().split('T')[0])
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatPace = (seconds: number | null) => {
    if (!seconds) return '-'
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${String(secs).padStart(2, '0')}/km`
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const getWorkoutBarColor = (type: string | null) => {
    if (!type) return 'var(--allure-gradient)'
    const normalized = type.toLowerCase().replace(/[éè]/g, 'e')

    if (normalized.includes('facile') || normalized.includes('endurance') ||
      normalized.includes('longue') || normalized.includes('recuperation')) {
      return 'hsl(var(--workout-facile))'
    }

    if (normalized.includes('tempo') || normalized.includes('seuil')) {
      return 'hsl(var(--workout-tempo))'
    }

    if (normalized.includes('intervalle') || normalized.includes('fractionne')) {
      return 'hsl(var(--workout-intervalle))'
    }

    return 'var(--allure-gradient)'
  }

  const filteredWorkouts = workouts.filter(w =>
    !search ||
    formatDate(w.date).toLowerCase().includes(search.toLowerCase()) ||
    w.workout_type?.toLowerCase().includes(search.toLowerCase())
  )

  // Consistent button style
  const buttonBaseClass = "h-9 px-3 text-sm font-medium rounded-lg border transition-all flex items-center gap-2 disabled:opacity-50"
  const outlineButtonClass = `${buttonBaseClass} border-input bg-background hover:bg-accent`
  const gradientBorderStyle = {
    backgroundImage: 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(90deg, #ee95b3, #667abf)',
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-6xl font-serif font-bold tracking-tight">
            Séances
          </h1>
          <p className="text-xl text-muted-foreground font-sans font-light">
            {workouts.length} entraînements
          </p>
        </div>
        <div className="flex gap-2">
          {/* Sync Strava */}
          <button
            onClick={syncStrava}
            disabled={syncing}
            className={outlineButtonClass}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {syncing ? 'Sync...' : 'Sync Strava'}
          </button>

          {/* Natural Query Button */}
          <button
            onClick={() => setQueryModalOpen(true)}
            className={`${buttonBaseClass} border-[1.5px] border-transparent hover:shadow-lg hover:shadow-pink-500/20`}
            style={gradientBorderStyle}
          >
            <HelpCircle className="h-4 w-4" />
            Poser une question
          </button>

          {/* Analyze Period Button */}
          <button
            onClick={() => setDatePickerOpen(true)}
            className={`${buttonBaseClass} border-[1.5px] border-transparent hover:shadow-lg hover:shadow-pink-500/20`}
            style={gradientBorderStyle}
          >
            <MessageSquare className="h-4 w-4" />
            Analyser une période
          </button>

          {/* Classify */}
          <button
            onClick={classifyWorkouts}
            disabled={classifying}
            className={`${buttonBaseClass} border-[1.5px] border-transparent hover:shadow-lg hover:shadow-pink-500/20 disabled:hover:shadow-none`}
            style={gradientBorderStyle}
          >
            {classifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {classifying ? 'Classification...' : 'Classifier'}
          </button>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Rechercher..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {/* Workouts List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : workouts.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Aucune séance"
          description="Vous n'avez pas encore de séances d'entraînement. Importez vos données Apple Health pour commencer à suivre vos performances."
          action={{
            label: "Importer mes séances",
            href: "/import"
          }}
        />
      ) : filteredWorkouts.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Aucun résultat"
          description="Aucune séance ne correspond à votre recherche. Essayez avec d'autres mots-clés."
        />
      ) : (
        <div className="grid gap-3">
          {filteredWorkouts.map((workout) => (
            <Link key={workout.id} href={`/workouts/${workout.id}`}>
              <Card className="hover:shadow-lg cursor-pointer transition-all duration-300 relative overflow-hidden">
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ background: getWorkoutBarColor(workout.workout_type) }}
                />
                <CardContent className="p-4 pr-6">
                  <div className="flex items-center gap-12">
                    <div className="space-y-1 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-muted-foreground/80">
                          {formatDate(workout.date)}
                        </div>
                        {workout.is_test && (
                          <Badge variant="outline" className="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0">
                            TEST
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground/70 font-medium">
                        {workout.workout_type || 'Non catégorisé'}
                      </div>
                    </div>

                    <div className="flex gap-10 items-baseline">
                      <div className="text-center min-w-[100px]">
                        <div className="text-3xl font-mono font-bold tabular-nums">
                          {workout.distance?.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">km</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-mono italic font-bold tabular-nums">
                          {formatPace(workout.avg_pace)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">allure</div>
                      </div>
                    </div>

                    <div className="ml-auto text-right flex items-center gap-3">
                      <div className="text-base font-mono text-muted-foreground tabular-nums">
                        {formatDuration(workout.duration)}
                      </div>
                      {workout.is_test && (
                        <button
                          onClick={(e) => deleteTestWorkout(workout.id, e)}
                          className="p-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Supprimer cette séance de test"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Date Picker Modal */}
      <Dialog open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <DialogContent className="max-w-md border border-white/10 bg-white/5 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold tracking-tight">
              Analyser une période
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Sélectionne une plage de dates pour analyser plusieurs séances avec Claude
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Quick presets */}
            <div className="flex gap-2">
              <button
                onClick={() => setQuickDateRange(7)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
              >
                7 jours
              </button>
              <button
                onClick={() => setQuickDateRange(30)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
              >
                30 jours
              </button>
              <button
                onClick={() => setQuickDateRange(90)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
              >
                3 mois
              </button>
            </div>

            {/* Date inputs */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Date de début</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Date de fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={handleOpenAnalysis}
              disabled={!startDate || !endDate}
              className="w-full h-11 rounded-lg font-medium transition-all border-[1.5px] border-transparent hover:shadow-lg hover:shadow-pink-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={gradientBorderStyle}
            >
              <MessageSquare className="h-4 w-4" />
              Lancer l'analyse
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Multi-Workout Analysis Modal */}
      <MultiWorkoutAnalysisModal
        open={analysisModalOpen}
        onOpenChange={setAnalysisModalOpen}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Natural Language Query Modal */}
      <NaturalQueryModal
        open={queryModalOpen}
        onOpenChange={setQueryModalOpen}
      />
    </div>
  )
}
