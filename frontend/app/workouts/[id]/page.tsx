'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, MessageCircle, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import axios from 'axios'
import { toast } from 'sonner'
import WorkoutAnalysisModal from '@/components/WorkoutAnalysisModal'

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
  notes: string | null
  start_time: string
  end_time: string
  raw_data?: {
    gpx?: GpxData
  }
}

// Workout type colors
const workoutTypeColors: Record<string, string> = {
  facile: 'bg-emerald-500',
  tempo: 'bg-orange-500',
  fractionne: 'bg-red-500',
  longue: 'bg-blue-500',
  recuperation: 'bg-slate-400'
}

const workoutTypeLabels: Record<string, string> = {
  facile: 'Facile / Endurance',
  tempo: 'Tempo / Allure soutenue',
  fractionne: 'Fractionne',
  longue: 'Sortie longue',
  recuperation: 'Recuperation'
}

// Helper to get pace color based on comparison to average
const getPaceColor = (splitPace: number, avgPace: number): string => {
  const diff = (splitPace - avgPace) / avgPace
  if (diff < -0.03) return 'text-emerald-500'
  if (diff > 0.03) return 'text-orange-500'
  return ''
}

export default function WorkoutDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [workoutType, setWorkoutType] = useState('')
  const [saving, setSaving] = useState(false)
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false)

  useEffect(() => {
    loadWorkout()
  }, [params.id])

  const loadWorkout = async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/workouts/${params.id}`)
      setWorkout(response.data)
      setComment(response.data.notes || '')
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
      await axios.patch(`http://127.0.0.1:8000/api/workouts/${params.id}`, {
        notes: comment || null,
        workout_type: workoutType || null
      })
      toast.success('Seance mise a jour !')
      loadWorkout()
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleBlockAdjustment = (adjustment: any) => {
    console.log('Block adjustment accepted:', adjustment)
    alert(`Ajustement applique: ${adjustment.suggestion}`)
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
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-muted border-t-[#ee95b3] animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse font-sans">Chargement...</p>
      </div>
    )
  }

  // Empty state
  if (!workout) {
    return (
      <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
          <Activity className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-serif font-bold">Entrainement non trouve</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-xl text-sm border border-border hover:bg-muted/50 transition-all font-sans"
        >
          Retour
        </button>
      </div>
    )
  }

  return (
    <motion.div
      className="container mx-auto py-8 space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-xl font-medium transition-all duration-200
            border border-border hover:bg-muted/50
            flex items-center gap-2 text-sm font-sans"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <button
          onClick={() => setAnalysisModalOpen(true)}
          className="group px-4 py-2 rounded-xl font-medium transition-all duration-300 border-[1.5px] border-transparent hover:shadow-lg hover:shadow-pink-500/20 hover:-translate-y-0.5 flex items-center gap-2 font-sans"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(90deg, #ee95b3, #667abf)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box'
          }}
        >
          <MessageCircle className="h-4 w-4" />
          Analyser avec Claude
        </button>
      </div>

      {/* Title with workout type indicator */}
      <div className="space-y-3">
        <motion.h1
          className="text-5xl md:text-6xl font-serif font-bold tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {formatDate(workout.date)}
        </motion.h1>
        {workout.workout_type && (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className={cn("w-2 h-2 rounded-full", workoutTypeColors[workout.workout_type] || 'bg-muted-foreground')} />
            <span className="text-sm font-sans text-muted-foreground uppercase tracking-wider">
              {workoutTypeLabels[workout.workout_type] || workout.workout_type}
            </span>
          </motion.div>
        )}
      </div>

      {/* Main Card - Metrics + Notes */}
      <motion.div
        className="rounded-2xl border border-border bg-card p-6 md:p-8 transition-shadow duration-200 hover:shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Metrics Section */}
        <div className="space-y-6">
          <h2 className="font-serif text-2xl font-bold tracking-tight">Metriques</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {/* Distance */}
            <div className="space-y-1">
              <p className="text-xs font-sans text-muted-foreground uppercase tracking-wider">Distance</p>
              <div className="flex items-baseline gap-1">
                <span className="font-mono font-bold text-3xl tabular-nums">{workout.distance.toFixed(2)}</span>
                <span className="text-sm font-sans text-muted-foreground">km</span>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-1">
              <p className="text-xs font-sans text-muted-foreground uppercase tracking-wider">Duree</p>
              <span className="font-mono font-bold text-3xl tabular-nums">{formatDuration(workout.duration)}</span>
            </div>

            {/* Pace */}
            <div className="space-y-1">
              <p className="text-xs font-sans text-muted-foreground uppercase tracking-wider">Allure moyenne</p>
              <div className="flex items-baseline gap-1">
                <span className="font-mono font-bold text-3xl tabular-nums italic">{formatPace(workout.avg_pace)}</span>
                <span className="text-sm font-sans text-muted-foreground">/km</span>
              </div>
            </div>

            {/* Avg HR */}
            <div className="space-y-1">
              <p className="text-xs font-sans text-muted-foreground uppercase tracking-wider">FC moyenne</p>
              <div className="flex items-baseline gap-1">
                <span className="font-mono font-bold text-2xl tabular-nums">{workout.avg_hr}</span>
                <span className="text-sm font-sans text-muted-foreground">bpm</span>
              </div>
            </div>

            {/* Max HR */}
            {workout.max_hr && (
              <div className="space-y-1">
                <p className="text-xs font-sans text-muted-foreground uppercase tracking-wider">FC max</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono font-bold text-2xl tabular-nums">{workout.max_hr}</span>
                  <span className="text-sm font-sans text-muted-foreground">bpm</span>
                </div>
              </div>
            )}

            {/* Elevation */}
            {workout.elevation_gain && (
              <div className="space-y-1">
                <p className="text-xs font-sans text-muted-foreground uppercase tracking-wider">Denivele</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono font-bold text-2xl tabular-nums">{workout.elevation_gain.toFixed(0)}</span>
                  <span className="text-sm font-sans text-muted-foreground">m</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="my-8 border-t border-border" />

        {/* Notes Section */}
        <div className="space-y-6">
          <h2 className="font-serif text-2xl font-bold tracking-tight">Mes notes</h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Workout Type Select */}
            <div className="space-y-2">
              <label className="text-xs font-sans text-muted-foreground uppercase tracking-wider">
                Type de sortie
              </label>
              <Select value={workoutType} onValueChange={setWorkoutType}>
                <SelectTrigger className="border-border bg-background hover:bg-muted/50 transition-colors">
                  <SelectValue placeholder="Selectionner..." />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="facile">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      Facile / Endurance
                    </div>
                  </SelectItem>
                  <SelectItem value="tempo">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      Tempo / Allure soutenue
                    </div>
                  </SelectItem>
                  <SelectItem value="fractionne">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Fractionne
                    </div>
                  </SelectItem>
                  <SelectItem value="longue">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Sortie longue
                    </div>
                  </SelectItem>
                  <SelectItem value="recuperation">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                      Recuperation
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Comment Textarea */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-sans text-muted-foreground uppercase tracking-wider">
                Commentaire
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comment s'est passee cette seance ? Ressenti, douleurs, conditions..."
                rows={3}
                className="border-border bg-background resize-none
                  focus:bg-muted/30 transition-colors
                  placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "px-6 h-10 rounded-xl font-medium transition-all duration-200 font-sans text-sm",
              "bg-foreground text-background",
              "hover:opacity-90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </motion.div>

      {/* GPX Splits Section */}
      {workout.raw_data?.gpx?.splits && workout.raw_data.gpx.splits.length > 0 && (
        <motion.div
          className="rounded-2xl border border-border bg-card p-6 md:p-8 transition-shadow duration-200 hover:shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="space-y-6">
            <h2 className="font-serif text-2xl font-bold tracking-tight">Splits kilometre par kilometre</h2>

            <div className="space-y-1">
              {workout.raw_data.gpx.splits.map((split, index) => {
                const paceColor = getPaceColor(split.pace, workout.avg_pace)

                return (
                  <motion.div
                    key={split.km}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={cn(
                      "flex items-center justify-between py-3 px-4 rounded-xl transition-colors duration-200",
                      index % 2 === 0 ? 'bg-muted/30' : 'bg-transparent',
                      "hover:bg-muted/50"
                    )}
                  >
                    {/* Kilometer number */}
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-mono font-bold text-lg">
                        {split.km}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-sans">km</span>
                    </div>

                    {/* Time and Pace */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-sans">Temps</p>
                        <p className="font-mono font-semibold tabular-nums">
                          {Math.floor(split.time / 60)}:{String(Math.floor(split.time % 60)).padStart(2, '0')}
                        </p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-sans">Allure</p>
                        <p className={cn(
                          "font-mono font-semibold italic tabular-nums",
                          paceColor
                        )}>
                          {formatPace(split.pace)}/km
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Pace Variability Footer */}
            {workout.raw_data.gpx.pace_variability !== undefined && (
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <span className="text-sm text-muted-foreground font-sans">Variabilite d'allure:</span>
                <span className={cn(
                  "font-mono font-semibold text-sm",
                  workout.raw_data.gpx.pace_variability > 0.15
                    ? "text-orange-500"
                    : workout.raw_data.gpx.pace_variability < 0.05
                      ? "text-emerald-500"
                      : "text-muted-foreground"
                )}>
                  {(workout.raw_data.gpx.pace_variability * 100).toFixed(1)}%
                </span>
                {workout.raw_data.gpx.pace_variability > 0.15 && (
                  <span className="text-xs text-orange-500/80 italic font-sans">
                    (haute variabilite - possiblement du fractionne)
                  </span>
                )}
                {workout.raw_data.gpx.pace_variability < 0.05 && (
                  <span className="text-xs text-emerald-500/80 italic font-sans">
                    (allure tres stable)
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Track Laps Section */}
      {workout.raw_data?.gpx?.laps && workout.raw_data.gpx.laps.length > 0 && (
        <motion.div
          className="rounded-2xl border border-border bg-card p-6 md:p-8 transition-shadow duration-200 hover:shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold tracking-tight">Tours de piste</h2>
              <span className="text-sm text-muted-foreground font-mono">400m</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {workout.raw_data.gpx.laps.map((lap, index) => (
                <motion.div
                  key={lap.lap}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className={cn(
                    "relative rounded-xl p-4 transition-all duration-200",
                    "bg-muted/30 border border-transparent",
                    "hover:bg-muted/50 hover:border-border"
                  )}
                >
                  {/* Lap number badge */}
                  <div className="absolute top-2 right-2">
                    <span className="text-xs font-mono text-muted-foreground/50">
                      #{lap.lap}
                    </span>
                  </div>

                  {/* Time */}
                  <div className="pt-2">
                    <p className="font-mono font-bold text-2xl italic tabular-nums">
                      {Math.floor(lap.time / 60)}:{String(Math.floor(lap.time % 60)).padStart(2, '0')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Analysis Modal */}
      <WorkoutAnalysisModal
        workoutId={Number(params.id)}
        open={analysisModalOpen}
        onOpenChange={setAnalysisModalOpen}
        onBlockAdjustment={handleBlockAdjustment}
      />
    </motion.div>
  )
}
