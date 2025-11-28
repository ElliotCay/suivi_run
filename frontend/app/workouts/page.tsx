'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import axios from 'axios'
import { Sparkles, Loader2, Activity, Upload, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import EmptyState from '@/components/EmptyState'
import { AIButton } from '@/components/ui/AIButton'

interface Workout {
  id: number
  date: string
  distance: number | null
  duration: number | null
  avg_pace: number | null
  avg_hr: number | null
  workout_type: string | null
  user_rating: number | null
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [classifying, setClassifying] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadWorkouts()
  }, [])

  const loadWorkouts = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/workouts')
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
      loadWorkouts() // Reload to show updated types
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
          loadWorkouts() // Reload to show new workouts
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
    const secsStr = String(secs).padStart(2, '0')
    return minutes + ':' + secsStr + '/km'
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    const secsStr = String(secs).padStart(2, '0')
    return mins + ':' + secsStr
  }

  const getWorkoutBarColor = (type: string | null) => {
    if (!type) return 'var(--allure-gradient)'
    const normalized = type.toLowerCase().replace(/[éè]/g, 'e')

    // Vert pour facile/endurance/longue/récupération
    if (normalized.includes('facile') || normalized.includes('endurance') ||
      normalized.includes('longue') || normalized.includes('recuperation')) {
      return 'hsl(var(--workout-facile))'
    }

    // Orange pour tempo/seuil
    if (normalized.includes('tempo') || normalized.includes('seuil')) {
      return 'hsl(var(--workout-tempo))'
    }

    // Rouge pour intervalle/fractionné
    if (normalized.includes('intervalle') || normalized.includes('fractionne')) {
      return 'hsl(var(--workout-intervalle))'
    }

    // Gradient Allure par défaut
    return 'var(--allure-gradient)'
  }

  const filteredWorkouts = workouts.filter(w =>
    !search ||
    formatDate(w.date).toLowerCase().includes(search.toLowerCase()) ||
    w.workout_type?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Minimal Header */}
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
          <Button
            onClick={syncStrava}
            disabled={syncing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sync...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Sync Strava
              </>
            )}
          </Button>
          <AIButton
            onClick={classifyWorkouts}
            disabled={classifying}
            animationType="none"
            label={classifying ? "Classification..." : "Classifier"}
            iconClassName="w-4 h-4 text-purple-500"
            className="border border-input shadow-sm text-sm px-4 py-1.5 h-9"
            showIcon={!classifying}
          >
            {classifying && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          </AIButton>
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
                {/* Barre verticale colorée selon le type de séance */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{
                    background: getWorkoutBarColor(workout.workout_type)
                  }}
                />
                <CardContent className="p-4 pr-6">
                  <div className="flex items-center gap-12">
                    {/* Left: Date & Type */}
                    <div className="space-y-1 min-w-[160px]">
                      <div className="text-sm text-muted-foreground/80">
                        {formatDate(workout.date)}
                      </div>
                      <div className="text-xs text-muted-foreground/70 font-medium">
                        {workout.workout_type || 'Non catégorisé'}
                      </div>
                    </div>

                    {/* Main Metrics: Distance & Pace */}
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

                    {/* Right: Duration */}
                    <div className="ml-auto text-right">
                      <div className="text-base font-mono text-muted-foreground tabular-nums">
                        {formatDuration(workout.duration)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
