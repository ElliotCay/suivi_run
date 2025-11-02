'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import axios from 'axios'
import { Sparkles, Loader2, Activity, Upload } from 'lucide-react'
import { toast } from 'sonner'
import EmptyState from '@/components/EmptyState'

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

  useEffect(() => {
    loadWorkouts()
  }, [])

  const loadWorkouts = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/workouts')
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
      const response = await axios.post('http://localhost:8000/api/workouts/classify')
      toast.success(`Classification terminée ! ${response.data.classified} séances classifiées.`)
      loadWorkouts() // Reload to show updated types
    } catch (error) {
      console.error('Error classifying workouts:', error)
      toast.error('Erreur lors de la classification')
    } finally {
      setClassifying(false)
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
          <h1 className="text-6xl font-bold tracking-tight">
            Séances
          </h1>
          <p className="text-base text-muted-foreground">
            {workouts.length} entraînements
          </p>
        </div>
        <Button
          onClick={classifyWorkouts}
          disabled={classifying}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {classifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Classification...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Classifier
            </>
          )}
        </Button>
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
              <Card className="hover:shadow-md cursor-pointer transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-12">
                    {/* Left: Date & Type */}
                    <div className="space-y-0.5 min-w-[160px]">
                      <div className="font-bold text-base">
                        {formatDate(workout.date)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {workout.workout_type || 'Non catégorisé'}
                      </div>
                    </div>

                    {/* Main Metrics: Distance & Pace */}
                    <div className="flex gap-10 items-baseline">
                      <div className="text-center">
                        <div className="text-3xl font-bold tabular-nums">
                          {workout.distance?.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">km</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold font-mono tabular-nums">
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
