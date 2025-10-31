'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import axios from 'axios'
import { Sparkles, Loader2, Activity } from 'lucide-react'
import { toast } from 'sonner'

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
    <div className="container mx-auto py-8">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mes Entraînements</h1>
          <p className="text-muted-foreground">{workouts.length} séances enregistrées</p>
        </div>
        <Button
          onClick={classifyWorkouts}
          disabled={classifying}
          variant="outline"
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
              Classifier automatiquement
            </>
          )}
        </Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-8 w-20 mb-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredWorkouts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {search ? 'Aucune séance trouvée' : 'Aucune séance enregistrée'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {search
                ? 'Essayez de modifier votre recherche'
                : 'Importez vos données Apple Health pour voir vos séances ici'}
            </p>
            {!search && (
              <Button asChild>
                <Link href="/import">Importer mes données</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredWorkouts.map((workout) => (
            <Link key={workout.id} href={`/workouts/${workout.id}`}>
              <Card className="hover:bg-accent cursor-pointer transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{formatDate(workout.date)}</CardTitle>
                      <CardDescription>
                        {workout.workout_type || 'Non catégorisé'}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {workout.distance?.toFixed(2)} km
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDuration(workout.duration)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Allure:</span>{' '}
                      <span className="font-medium">{formatPace(workout.avg_pace)}</span>
                    </div>
                    {workout.avg_hr && (
                      <div>
                        <span className="text-muted-foreground">FC moy:</span>{' '}
                        <span className="font-medium">{workout.avg_hr} bpm</span>
                      </div>
                    )}
                    {workout.user_rating && (
                      <div>
                        <span className="text-muted-foreground">Note:</span>{' '}
                        <span className="font-medium">{'⭐'.repeat(workout.user_rating)}</span>
                      </div>
                    )}
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
