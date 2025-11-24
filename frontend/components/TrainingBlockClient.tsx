'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import axios from "axios"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Loader2, Calendar, CheckCircle, Dumbbell, ChevronDown, ChevronUp, Edit2, MoreHorizontal, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatPace } from "@/lib/utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"

interface PlannedWorkout {
  id: number
  scheduled_date: string
  week_number: number
  day_of_week: string
  workout_type: string
  distance_km: number | null
  duration_minutes: number | null
  title: string
  description: string
  target_pace_min: number | null
  target_pace_max: number | null
  status: string
  completed_workout_id: number | null
}

interface StrengtheningReminder {
  id: number
  scheduled_date: string
  day_of_week: string
  session_type: string
  title: string
  duration_minutes: number
  completed: boolean
}

export interface TrainingBlock {
  id: number
  name: string
  phase: string
  start_date: string
  end_date: string
  days_per_week: number
  target_weekly_volume: number
  easy_percentage: number
  threshold_percentage: number
  interval_percentage: number
  status: string
  planned_workouts: PlannedWorkout[]
  strengthening_reminders: StrengtheningReminder[]
}

const workoutTypeLabels: Record<string, string> = {
  easy: "Facile",
  threshold: "Seuil",
  interval: "Fractionné",
  long: "Longue",
  recovery: "Récupération",
  strengthening: "Renforcement"
}

const workoutTypeColors: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  threshold: "bg-orange-100 text-orange-800",
  interval: "bg-red-100 text-red-800",
  long: "bg-blue-100 text-blue-800",
  recovery: "bg-gray-100 text-gray-800",
  strengthening: "bg-purple-100 text-purple-800"
}

const phaseLabels: Record<string, string> = {
  base: "Base (Endurance)",
  development: "Développement",
  peak: "Pic (Intensité)",
  taper: "Affûtage"
}

const strengtheningDetails: Record<string, string> = {
  tfl_hanche: `**Renforcement TFL/Hanche - 15 minutes**

Exercices à répéter 3 fois :

1. **Clamshells (30 sec chaque côté)**
   - Couché sur le côté, genoux pliés
   - Garder les pieds ensemble, soulever le genou supérieur
   - Contrôler la descente

2. **Pont sur une jambe (30 sec chaque côté)**
   - Allongé sur le dos, un pied au sol
   - Lever les hanches en serrant les fessiers
   - Maintenir l'alignement du corps

3. **Abduction de hanche debout (15 reps chaque côté)**
   - Debout, lever la jambe sur le côté
   - Garder le tronc stable
   - Contrôler le mouvement`,

  mollet_cheville: `**Proprioception Cheville - 15 minutes**

Exercices à répéter 3 fois :

1. **Équilibre sur une jambe (1 min chaque côté)**
   - Tenir sur un pied, yeux ouverts puis fermés
   - Maintenir la stabilité de la cheville
   - Progresser vers surface instable si facile

2. **Renforcement mollets (3x15 reps)**
   - Monter sur la pointe des pieds
   - Descendre lentement
   - Faire sur une marche pour plus d'amplitude

3. **Alphabet avec le pied (2 fois chaque pied)**
   - Dessiner l'alphabet avec la pointe du pied
   - Mobilise la cheville dans toutes les directions`
}

type TrainingBlockClientProps = {
  initialBlock: TrainingBlock | null
}

// Lazy-load the drag-and-drop container (no SSR) to reduce JS on first paint
const LazyWeekWorkoutsContainer = dynamic(
  () => import("@/components/WeekWorkoutsContainer").then(mod => mod.WeekWorkoutsContainer),
  { ssr: false }
)

import { TrainingSession } from "@/components/WeekWorkoutsContainer"

export default function TrainingBlockClient({ initialBlock }: TrainingBlockClientProps) {
  const [block, setBlock] = useState<TrainingBlock | null>(initialBlock)
  const [loading, setLoading] = useState(!initialBlock)
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<number>>(new Set())
  const [expandedReminders, setExpandedReminders] = useState<Set<number>>(new Set())
  const [syncingCalendar, setSyncingCalendar] = useState(false)
  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null)
  const [editingDate, setEditingDate] = useState<string>("")
  const [generatingNextBlock, setGeneratingNextBlock] = useState(false)

  useEffect(() => {
    if (!initialBlock) {
      loadCurrentBlock(true)
    }
  }, [initialBlock])

  const api = useMemo(() => axios.create({ baseURL: API_BASE_URL }), [])

  const loadCurrentBlock = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      const response = await api.get("/api/training/current-block")
      setBlock(response.data)
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setBlock(null)
      } else {
        console.error("Error loading training block:", error)
        toast.error("Erreur lors du chargement du bloc")
      }
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [api])

  const completeWorkout = useCallback(async (workoutId: number) => {
    try {
      await api.post(`/api/training/workouts/${workoutId}/complete`)
      toast.success("Séance validée ! Bravo 🎉")
      loadCurrentBlock(false)
    } catch (error) {
      console.error("Error completing workout:", error)
      toast.error("Erreur lors de la validation de la séance")
    }
  }, [api, loadCurrentBlock])

  const completeStrengthening = useCallback(async (reminderId: number) => {
    try {
      await api.patch(`/api/training/strengthening-reminders/${reminderId}/complete`)
      toast.success("Renforcement validé !")
      loadCurrentBlock()
    } catch (error) {
      console.error("Error completing strengthening:", error)
      toast.error("Erreur lors de la validation")
    }
  }, [api, loadCurrentBlock])

  const abandonBlock = useCallback(async () => {
    if (!block) return
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce bloc d'entraînement ? Cette action est irréversible.")) return
    try {
      await api.delete(`/api/training/blocks/${block.id}`)
      toast.success("Bloc supprimé")
      setBlock(null)
    } catch (error) {
      console.error("Error deleting block:", error)
      toast.error("Erreur lors de la suppression du bloc")
    }
  }, [api, block])

  const syncToCalendar = useCallback(async () => {
    setSyncingCalendar(true)
    try {
      const response = await api.post('/api/calendar/sync')
      toast.success(response.data.message || "Synchronisation réussie")
    } catch (error: any) {
      console.error('Error syncing calendar:', error)
      const errorMsg = error?.response?.data?.detail || 'Erreur lors de la synchronisation'
      toast.error(errorMsg)
    } finally {
      setSyncingCalendar(false)
    }
  }, [api])

  const completeBlockAndGenerateNext = useCallback(async () => {
    if (!block) return
    if (!confirm("Terminer ce bloc et générer le suivant ? Le nouveau bloc sera adapté selon vos performances.")) return

    setGeneratingNextBlock(true)
    try {
      const response = await api.post(`/api/training/blocks/${block.id}/complete-and-generate-next`)
      const analysis = response.data.analysis
      const nextBlock = response.data.next_block

      toast.success(
        `✅ Bloc terminé !\n\n` +
        `📊 Analyse: ${analysis.warnings.length > 0 ? analysis.warnings.join(', ') : 'Tout va bien'}\n\n` +
        `🚀 Prochain bloc: ${nextBlock.name}\n` +
        `Phase: ${nextBlock.phase}, Volume: ${nextBlock.target_weekly_volume}km/semaine`,
        { duration: 10000 }
      )

      setTimeout(async () => {
        try {
          await api.post('/api/calendar/sync')
          toast.success("Nouveau bloc synchronisé au calendrier !")
        } catch (e) {
          console.error("Calendar sync error:", e)
        }
      }, 1000)

      loadCurrentBlock()
    } catch (error: any) {
      console.error('Error completing block:', error)
      const errorMsg = error?.response?.data?.detail || 'Erreur lors de la génération'
      toast.error(errorMsg)
    } finally {
      setGeneratingNextBlock(false)
    }
  }, [api, block, loadCurrentBlock])

  const startEditingDate = useCallback((workoutId: number, currentDate: string) => {
    setEditingWorkoutId(workoutId)
    const date = new Date(currentDate)
    setEditingDate(date.toISOString().split('T')[0])
  }, [])

  const cancelEditingDate = useCallback(() => {
    setEditingWorkoutId(null)
    setEditingDate("")
  }, [])

  const saveNewDate = useCallback(async (workoutId: number) => {
    if (!editingDate) return
    try {
      await api.patch(`/api/training/workouts/${workoutId}/reschedule`, null, { params: { new_date: editingDate } })
      toast.success("Date modifiée avec succès !")
      setEditingWorkoutId(null)
      setEditingDate("")
      loadCurrentBlock()
    } catch (error) {
      console.error('Error rescheduling workout:', error)
      toast.error('Erreur lors de la modification de la date')
    }
  }, [api, editingDate, loadCurrentBlock])

  const toggleReminder = useCallback((reminderId: number) => {
    setExpandedReminders(prev => {
      const next = new Set(prev)
      if (next.has(reminderId)) next.delete(reminderId)
      else next.add(reminderId)
      return next
    })
  }, [])

  const getDaysRemaining = useCallback(() => {
    if (!block) return 0
    const today = new Date()
    const endDate = new Date(block.end_date)
    const diffTime = endDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }, [block])

  const getBlockProgress = useCallback(() => {
    if (!block) return 0
    const start = new Date(block.start_date).getTime()
    const end = new Date(block.end_date).getTime()
    const now = new Date().getTime()
    if (now < start) return 0
    if (now > end) return 100
    return Math.round(((now - start) / (end - start)) * 100)
  }, [block])

  useEffect(() => {
    if (!block) return
    const daysRemaining = getDaysRemaining()
    if (daysRemaining > 0 && daysRemaining <= 7 && block.status === 'active') {
      toast.info(`Plus que ${daysRemaining} jour(s) avant la fin du bloc ! Pensez à générer le suivant.`, {
        duration: 8000
      })
    }
  }, [block, getDaysRemaining])

  const workoutsByWeek = useMemo(() => {
    if (!block) return {}

    const workouts: TrainingSession[] = block.planned_workouts.map(w => ({ ...w, type: 'workout' }))
    const reminders: TrainingSession[] = block.strengthening_reminders.map(r => ({ ...r, type: 'strengthening' }))

    const allSessions = [...workouts, ...reminders].sort((a, b) => {
      // Sort by date
      const dateA = new Date(a.scheduled_date).getTime()
      const dateB = new Date(b.scheduled_date).getTime()
      if (dateA !== dateB) return dateA - dateB

      // If same date, put workouts first
      if (a.type !== b.type) return a.type === 'workout' ? -1 : 1

      return 0
    })

    // Helper to get week number from date if not present (for reminders)
    const getWeekNumber = (dateStr: string) => {
      const date = new Date(dateStr)
      const start = new Date(block.start_date)
      const diffTime = Math.abs(date.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return Math.ceil(diffDays / 7)
    }

    return allSessions.reduce<Record<number, TrainingSession[]>>((acc, session) => {
      // Use existing week_number for workouts, calculate for reminders if needed
      // Assuming reminders might not have week_number, but if they do, use it.
      // The interface says reminders don't have week_number, so we calculate it based on block start date
      // or we can try to match it with a workout on the same day.
      // Ideally, the backend should provide week_number for reminders too, but let's calculate it relative to block start.

      let week = 1
      if ('week_number' in session) {
        week = session.week_number
      } else {
        // Simple fallback calculation
        const sessionDate = new Date(session.scheduled_date)
        const startDate = new Date(block.start_date)
        // Adjust to start of week (Monday) to be safe, but simple diff is okay for now
        const diffTime = sessionDate.getTime() - startDate.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        week = Math.floor(diffDays / 7) + 1
      }

      if (!acc[week]) acc[week] = []
      acc[week].push(session)
      return acc
    }, {})
  }, [block])

  const intensityStats = useMemo(() => {
    if (!block) return { totalDistance: 0, actualEasyPct: 0, actualThresholdPct: 0, actualIntervalPct: 0 }
    const totalDistance = block.planned_workouts.reduce((sum, w) => sum + (w.distance_km || 0), 0)
    if (!totalDistance) return { totalDistance: 0, actualEasyPct: 0, actualThresholdPct: 0, actualIntervalPct: 0 }
    const easyDistance = block.planned_workouts
      .filter(w => w.workout_type === 'easy' || w.workout_type === 'long' || w.workout_type === 'recovery')
      .reduce((sum, w) => sum + (w.distance_km || 0), 0)
    const thresholdDistance = block.planned_workouts
      .filter(w => w.workout_type === 'threshold')
      .reduce((sum, w) => sum + (w.distance_km || 0), 0)
    const intervalDistance = block.planned_workouts
      .filter(w => w.workout_type === 'interval')
      .reduce((sum, w) => sum + (w.distance_km || 0), 0)

    return {
      totalDistance,
      actualEasyPct: Math.round((easyDistance / totalDistance) * 100),
      actualThresholdPct: Math.round((thresholdDistance / totalDistance) * 100),
      actualIntervalPct: Math.round((intervalDistance / totalDistance) * 100)
    }
  }, [block])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!block) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight">Bloc d'entraînement</h1>
          <p className="text-base text-muted-foreground">Aucun bloc actif pour le moment</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-base font-bold mb-2">Aucun bloc d'entraînement actif</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Générez un bloc de 4 semaines avec périodisation depuis la page Suggestions
            </p>
            <Button asChild><a href="/suggestions">Aller aux Suggestions</a></Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const strengthening = block.strengthening_reminders || []

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-6xl font-serif font-bold tracking-tight">Bloc d'entraînement</h1>
          <p className="text-base text-muted-foreground">
            {block.name} • {phaseLabels[block.phase] || block.phase}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={syncToCalendar}
            disabled={syncingCalendar}
            className="hidden sm:flex"
          >
            {syncingCalendar ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Synchronisation...</>) : (<><Calendar className="h-4 w-4 mr-2" />Synchroniser</>)}
          </Button>

          <Button
            variant="outline"
            onClick={completeBlockAndGenerateNext}
            disabled={generatingNextBlock}
          >
            {generatingNextBlock ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-500" />
            )}
            Terminer et générer le suivant
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={syncToCalendar} disabled={syncingCalendar} className="sm:hidden">
                <Calendar className="h-4 w-4 mr-2" />
                Synchroniser calendrier
              </DropdownMenuItem>
              <DropdownMenuSeparator className="sm:hidden" />
              <DropdownMenuItem onClick={abandonBlock} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer le bloc
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Block Info & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progression du bloc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-bold font-mono">{getDaysRemaining()}</span>
              <span className="text-sm text-muted-foreground mb-1">jours restants</span>
            </div>
            <Progress value={getBlockProgress()} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{new Date(block.start_date).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' })}</span>
              <span>{new Date(block.end_date).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' })}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Volume Hebdomadaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold font-mono">{block.target_weekly_volume}</span>
              <span className="text-sm text-muted-foreground mb-1">km / semaine</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{block.days_per_week} séances par semaine</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Distribution d'intensité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-secondary mt-2">
              <div className="bg-emerald-500 h-full" style={{ width: `${intensityStats.actualEasyPct}%` }} title={`Facile: ${intensityStats.actualEasyPct}%`} />
              <div className="bg-orange-500 h-full" style={{ width: `${intensityStats.actualThresholdPct}%` }} title={`Seuil: ${intensityStats.actualThresholdPct}%`} />
              <div className="bg-red-500 h-full" style={{ width: `${intensityStats.actualIntervalPct}%` }} title={`Fractionné: ${intensityStats.actualIntervalPct}%`} />
            </div>
            <div className="flex justify-between mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span>Facile {intensityStats.actualEasyPct}%</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" /><span>Seuil {intensityStats.actualThresholdPct}%</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /><span>Intensité {intensityStats.actualIntervalPct}%</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workouts by week */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(workoutsByWeek).map(([week, workouts]) => (
          <Card key={week}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Semaine {week}</CardTitle>
                  <p className="text-xs text-muted-foreground">Séances planifiées</p>
                </div>
                <Badge variant="outline">
                  {workouts.filter(s => s.type === 'workout').length} séances
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <LazyWeekWorkoutsContainer
                weekNumber={parseInt(week, 10)}
                sessions={workouts}
                workoutTypeLabels={workoutTypeLabels}
                workoutTypeColors={workoutTypeColors}
                strengtheningDetails={strengtheningDetails}
                onWorkoutsSwapped={() => loadCurrentBlock(false)}
                onCompleteWorkout={completeWorkout}
                onCompleteStrengthening={completeStrengthening}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Strengthening reminders - REMOVED (now integrated in weekly view) */}

      {/* Quick edit dates */}

    </div>
  )
}
