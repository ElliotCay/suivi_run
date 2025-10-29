'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import axios from 'axios'

interface GpxSplit {
  km: number
  time: number
  pace: number
  elevation?: number
}

interface GpxLap {
  lap: number
  time: number
  distance: number
}

interface GpxData {
  splits: GpxSplit[]
  pace_variability: number
  laps: GpxLap[]
  elevation_gain: number
  trackpoint_count: number
}

interface Workout {
  id: number
  date: string
  distance: number
  duration: number
  avg_pace: number
  avg_hr: number
  max_hr: number
  elevation_gain: number
  workout_type: string | null
  user_rating: number | null
  user_comment: string | null
  start_time: string
  end_time: string
  raw_data?: {
    gpx?: GpxData
  }
}

export default function WorkoutDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [workoutType, setWorkoutType] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadWorkout()
  }, [params.id])

  const loadWorkout = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/api/workouts/${params.id}`)
      setWorkout(response.data)
      setRating(response.data.user_rating || 0)
      setComment(response.data.user_comment || '')
      setWorkoutType(response.data.workout_type || '')
    } catch (error) {
      console.error('Error loading workout:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await axios.patch(`http://localhost:8000/api/workouts/${params.id}`, {
        user_rating: rating || null,
        user_comment: comment || null,
        workout_type: workoutType || null
      })
      alert('Entraînement mis à jour!')
      loadWorkout()
    } catch (error) {
      console.error('Error saving:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}h ${mins}min ${secs}s`
    }
    return `${mins}min ${secs}s`
  }

  const formatPace = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, '0')}/km`
  }

  if (loading) return <div className="container mx-auto py-8">Chargement...</div>
  if (!workout) return <div className="container mx-auto py-8">Entraînement non trouvé</div>

  return (
    <div className="container mx-auto py-8">
      <Button onClick={() => router.back()} variant="outline" className="mb-4">
        ← Retour
      </Button>

      <h1 className="text-3xl font-bold mb-6">{formatDate(workout.date)}</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Métriques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Distance</p>
                <p className="text-2xl font-bold">{workout.distance.toFixed(2)} km</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durée</p>
                <p className="text-2xl font-bold">{formatDuration(workout.duration)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Allure moyenne</p>
                <p className="text-xl font-bold">{formatPace(workout.avg_pace)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">FC moyenne</p>
                <p className="text-xl font-bold">{workout.avg_hr} bpm</p>
              </div>
              {workout.max_hr && (
                <div>
                  <p className="text-sm text-muted-foreground">FC max</p>
                  <p className="text-xl font-bold">{workout.max_hr} bpm</p>
                </div>
              )}
              {workout.elevation_gain && (
                <div>
                  <p className="text-sm text-muted-foreground">Dénivelé</p>
                  <p className="text-xl font-bold">{workout.elevation_gain.toFixed(0)} m</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mes notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Type de sortie</Label>
              <Select value={workoutType} onValueChange={setWorkoutType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facile">Facile / Endurance</SelectItem>
                  <SelectItem value="tempo">Tempo / Allure soutenue</SelectItem>
                  <SelectItem value="fractionne">Fractionné</SelectItem>
                  <SelectItem value="longue">Sortie longue</SelectItem>
                  <SelectItem value="recuperation">Récupération</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Note (1-5 étoiles)</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-all hover:scale-110 ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                  >
                    {star <= rating ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Commentaire</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comment s'est passée cette séance ? Ressenti, douleurs, conditions..."
                rows={4}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* GPX Splits Section */}
      {workout.raw_data?.gpx?.splits && workout.raw_data.gpx.splits.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Splits kilomètre par kilomètre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workout.raw_data.gpx.splits.map((split) => {
                const minutes = Math.floor(split.pace / 60)
                const seconds = Math.floor(split.pace % 60)
                const paceStr = `${minutes}:${String(seconds).padStart(2, '0')}/km`

                return (
                  <div key={split.km} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-muted-foreground w-8">
                        {split.km}
                      </span>
                      <span className="text-sm text-muted-foreground">km</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Temps</p>
                        <p className="font-semibold">{Math.floor(split.time / 60)}:{String(Math.floor(split.time % 60)).padStart(2, '0')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Allure</p>
                        <p className="font-semibold">{paceStr}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {workout.raw_data.gpx.pace_variability !== undefined && (
              <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                Variabilité d'allure: {(workout.raw_data.gpx.pace_variability * 100).toFixed(1)}%
                {workout.raw_data.gpx.pace_variability > 0.15 && (
                  <span className="ml-2 text-orange-600">(haute variabilité - possiblement du fractionné)</span>
                )}
                {workout.raw_data.gpx.pace_variability < 0.05 && (
                  <span className="ml-2 text-green-600">(allure très stable)</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Track Laps Section */}
      {workout.raw_data?.gpx?.laps && workout.raw_data.gpx.laps.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tours de piste (400m)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {workout.raw_data.gpx.laps.map((lap) => {
                const minutes = Math.floor(lap.time / 60)
                const seconds = Math.floor(lap.time % 60)
                const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`

                return (
                  <div key={lap.lap} className="border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Tour {lap.lap}</p>
                    <p className="text-lg font-bold">{timeStr}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
