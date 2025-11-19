"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, Calendar, CheckCircle, Circle, Dumbbell, ChevronDown, ChevronUp, Edit2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import axios from "axios"
import { formatPace } from "@/lib/utils"
import { WeekWorkoutsContainer } from "@/components/WeekWorkoutsContainer"

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

interface TrainingBlock {
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

export default function TrainingBlockPage() {
  const [block, setBlock] = useState<TrainingBlock | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<number>>(new Set())
  const [expandedReminders, setExpandedReminders] = useState<Set<number>>(new Set())
  const [syncingCalendar, setSyncingCalendar] = useState(false)
  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null)
  const [editingDate, setEditingDate] = useState<string>("")
  const [generatingNextBlock, setGeneratingNextBlock] = useState(false)

  useEffect(() => {
    loadCurrentBlock()
  }, [])

  // Calculate days remaining in block
  const getDaysRemaining = () => {
    if (!block) return 0
    const today = new Date()
    const endDate = new Date(block.end_date)
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getBlockProgress = () => {
    if (!block) return 0
    const start = new Date(block.start_date).getTime()
    const end = new Date(block.end_date).getTime()
    const now = new Date().getTime()

    if (now < start) return 0
    if (now > end) return 100

    const total = end - start
    const current = now - start
    return Math.round((current / total) * 100)
  }

  // Show notification if block is ending soon
  useEffect(() => {
    if (block) {
      const daysRemaining = getDaysRemaining()
      if (daysRemaining > 0 && daysRemaining <= 7 && block.status === 'active') {
        toast.info(`Plus que ${daysRemaining} jour(s) avant la fin du bloc ! Pensez à générer le suivant.`, {
          duration: 8000
        })
      }
    }
  }, [block])

  const loadCurrentBlock = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      const response = await axios.get("http://127.0.0.1:8000/api/training/current-block")
      setBlock(response.data)
    } catch (error: any) {
      if (error?.response?.status === 404) {
        // No active block
        setBlock(null)
      } else {
        console.error("Error loading training block:", error)
        toast.error("Erreur lors du chargement du bloc")
      }
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const completeWorkout = async (workoutId: number) => {
    try {
      await axios.post(`http://127.0.0.1:8000/api/training/workouts/${workoutId}/complete`)
      toast.success("Séance validée ! Bravo 🎉")
      loadCurrentBlock(false)
    } catch (error) {
      console.error("Error completing workout:", error)
      toast.error("Erreur lors de la validation de la séance")
    }
  }

  const completeStrengthening = async (reminderId: number) => {
    try {
      await axios.patch(`http://127.0.0.1:8000/api/training/strengthening-reminders/${reminderId}/complete`)
      toast.success("Renforcement validé !")
      loadCurrentBlock()
    } catch (error) {
      console.error("Error completing strengthening:", error)
      toast.error("Erreur lors de la validation")
    }
  }

  const abandonBlock = async () => {
    if (!block) return

    if (!confirm("Êtes-vous sûr de vouloir supprimer ce bloc d'entraînement ? Cette action est irréversible.")) {
      return
    }

    try {
      await axios.delete(`http://127.0.0.1:8000/api/training/blocks/${block.id}`)
      toast.success("Bloc supprimé")
      setBlock(null)
    } catch (error) {
      console.error("Error deleting block:", error)
      toast.error("Erreur lors de la suppression du bloc")
    }
  }

  const syncToCalendar = async () => {
    setSyncingCalendar(true)
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/calendar/sync')
      toast.success(response.data.message || "Synchronisation réussie")
    } catch (error: any) {
      console.error('Error syncing calendar:', error)
      const errorMsg = error?.response?.data?.detail || 'Erreur lors de la synchronisation'
      toast.error(errorMsg)
    } finally {
      setSyncingCalendar(false)
    }
  }

  const completeBlockAndGenerateNext = async () => {
    if (!block) return

    if (!confirm("Terminer ce bloc et générer le suivant ? Le nouveau bloc sera adapté selon vos performances.")) {
      return
    }

    setGeneratingNextBlock(true)
    try {
      const response = await axios.post(`http://127.0.0.1:8000/api/training/blocks/${block.id}/complete-and-generate-next`)

      // Show success message with analysis
      const analysis = response.data.analysis
      const nextBlock = response.data.next_block

      toast.success(
        `✅ Bloc terminé !\n\n` +
        `📊 Analyse: ${analysis.warnings.length > 0 ? analysis.warnings.join(', ') : 'Tout va bien'}\n\n` +
        `🚀 Prochain bloc: ${nextBlock.name}\n` +
        `Phase: ${nextBlock.phase}, Volume: ${nextBlock.target_weekly_volume}km/semaine`,
        { duration: 10000 }
      )

      // Automatically sync new block to calendar
      setTimeout(async () => {
        try {
          await axios.post('http://127.0.0.1:8000/api/calendar/sync')
          toast.success("Nouveau bloc synchronisé au calendrier !")
        } catch (e) {
          console.error("Calendar sync error:", e)
        }
      }, 1000)

      // Reload to show new block
      loadCurrentBlock()
    } catch (error: any) {
      console.error('Error completing block:', error)
      const errorMsg = error?.response?.data?.detail || 'Erreur lors de la génération'
      toast.error(errorMsg)
    } finally {
      setGeneratingNextBlock(false)
    }
  }

  const startEditingDate = (workoutId: number, currentDate: string) => {
    setEditingWorkoutId(workoutId)
    // Convert ISO string to YYYY-MM-DD for input
    const date = new Date(currentDate)
    const formatted = date.toISOString().split('T')[0]
    setEditingDate(formatted)
  }

  const cancelEditingDate = () => {
    setEditingWorkoutId(null)
    setEditingDate("")
  }

  const saveNewDate = async (workoutId: number) => {
    if (!editingDate) return

    try {
      await axios.patch(`http://127.0.0.1:8000/api/training/workouts/${workoutId}/reschedule`,
        null,
        { params: { new_date: editingDate } }
      )
      toast.success("Date modifiée avec succès !")
      setEditingWorkoutId(null)
      setEditingDate("")
      loadCurrentBlock()
    } catch (error) {
      console.error('Error rescheduling workout:', error)
      toast.error('Erreur lors de la modification de la date')
    }
  }

  const toggleWorkout = (workoutId: number) => {
    const newExpanded = new Set(expandedWorkouts)
    if (newExpanded.has(workoutId)) {
      newExpanded.delete(workoutId)
    } else {
      newExpanded.add(workoutId)
    }
    setExpandedWorkouts(newExpanded)
  }

  const toggleReminder = (reminderId: number) => {
    const newExpanded = new Set(expandedReminders)
    if (newExpanded.has(reminderId)) {
      newExpanded.delete(reminderId)
    } else {
      newExpanded.add(reminderId)
    }
    setExpandedReminders(newExpanded)
  }

  const groupWorkoutsByWeek = (workouts: PlannedWorkout[]) => {
    const weeks: Record<number, PlannedWorkout[]> = {}
    workouts.forEach((workout) => {
      if (!weeks[workout.week_number]) {
        weeks[workout.week_number] = []
      }
      weeks[workout.week_number].push(workout)
    })
    return weeks
  }

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
          <p className="text-base text-muted-foreground">
            Aucun bloc actif pour le moment
          </p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-base font-bold mb-2">Aucun bloc d'entraînement actif</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Générez un bloc de 4 semaines avec périodisation depuis la page Suggestions
            </p>
            <Button asChild>
              <a href="/suggestions">Aller aux Suggestions</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const workoutsByWeek = groupWorkoutsByWeek(
    [...block.planned_workouts].sort((a, b) =>
      new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    )
  )
  const strengthening = block.strengthening_reminders || []

  // Calculate actual percentages from planned workouts
  const totalDistance = block.planned_workouts.reduce((sum, w) => sum + (w.distance_km || 0), 0)
  const easyDistance = block.planned_workouts
    .filter(w => w.workout_type === 'easy' || w.workout_type === 'long' || w.workout_type === 'recovery')
    .reduce((sum, w) => sum + (w.distance_km || 0), 0)
  const thresholdDistance = block.planned_workouts
    .filter(w => w.workout_type === 'threshold')
    .reduce((sum, w) => sum + (w.distance_km || 0), 0)
  const intervalDistance = block.planned_workouts
    .filter(w => w.workout_type === 'interval')
    .reduce((sum, w) => sum + (w.distance_km || 0), 0)

  const actualEasyPct = Math.round((easyDistance / totalDistance) * 100)
  const actualThresholdPct = Math.round((thresholdDistance / totalDistance) * 100)
  const actualIntervalPct = Math.round((intervalDistance / totalDistance) * 100)

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
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={syncToCalendar}
            disabled={syncingCalendar}
          >
            {syncingCalendar ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Synchronisation...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Synchroniser calendrier
              </>
            )}
          </Button>
          <Button
            variant="default"
            onClick={completeBlockAndGenerateNext}
            disabled={generatingNextBlock}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {generatingNextBlock ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Terminer et générer le suivant
              </>
            )}
          </Button>
          <Button variant="destructive" onClick={abandonBlock}>
            Supprimer le bloc
          </Button>
        </div>
      </div>

      {/* Block Info & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Progress Card */}
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

        {/* Volume Card */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Volume Hebdomadaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold font-mono">{block.target_weekly_volume}</span>
              <span className="text-sm text-muted-foreground mb-1">km / semaine</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {block.days_per_week} séances par semaine
            </p>
          </CardContent>
        </Card>

        {/* Intensity Distribution Card */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Distribution d'intensité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-secondary mt-2">
              <div className="bg-emerald-500 h-full" style={{ width: `${actualEasyPct}%` }} title={`Facile: ${actualEasyPct}%`} />
              <div className="bg-orange-500 h-full" style={{ width: `${actualThresholdPct}%` }} title={`Seuil: ${actualThresholdPct}%`} />
              <div className="bg-red-500 h-full" style={{ width: `${actualIntervalPct}%` }} title={`Fractionné: ${actualIntervalPct}%`} />
            </div>
            <div className="flex justify-between mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Facile {actualEasyPct}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Seuil {actualThresholdPct}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Intensité {actualIntervalPct}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weeks with Drag & Drop */}
      <div className="space-y-12">
        {Object.keys(workoutsByWeek)
          .sort((a, b) => Number(a) - Number(b))
          .map((weekNum) => {
            const weekWorkouts = workoutsByWeek[Number(weekNum)]
            // Filter strengthening by week number instead of exact date match
            const weekStrengthening = strengthening.filter((s) => {
              // Get week number from scheduled_date
              const reminderDate = new Date(s.scheduled_date)
              const blockStartDate = new Date(block.start_date)
              const daysDiff = Math.floor((reminderDate.getTime() - blockStartDate.getTime()) / (1000 * 60 * 60 * 24))
              const reminderWeek = Math.floor(daysDiff / 7) + 1
              return reminderWeek === Number(weekNum)
            })

            return (
              <div key={weekNum} className="relative">
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-2xl font-serif font-bold tracking-tight text-foreground">Semaine {weekNum}</h2>
                  <div className="h-[1px] flex-1 bg-border/60" />
                </div>

                {/* Use new drag & drop component for workouts */}
                <WeekWorkoutsContainer
                  weekNumber={Number(weekNum)}
                  workouts={weekWorkouts}
                  workoutTypeLabels={workoutTypeLabels}
                  workoutTypeColors={workoutTypeColors}
                  onWorkoutsSwapped={() => loadCurrentBlock(false)}
                  onComplete={completeWorkout}
                />

                {/* Strengthening Section - Styled as Cards */}
                {weekStrengthening.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Dumbbell className="h-4 w-4" />
                      Renforcement
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {weekStrengthening.map((reminder) => {
                        const isExpanded = expandedReminders.has(reminder.id)

                        return (
                          <div
                            key={reminder.id}
                            className="relative overflow-hidden rounded-xl bg-card border border-border/50 transition-all hover:shadow-md group"
                          >
                            {/* Vertical Purple Bar */}
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-purple-500" />

                            {/* Dashboard-style Gradient Border on Hover */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"
                              style={{
                                background: 'var(--allure-gradient)',
                                padding: '2px',
                                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude'
                              }}
                            />

                            <div className="p-4 pl-5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {reminder.completed ? (
                                    <button disabled className="cursor-default">
                                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        completeStrengthening(reminder.id)
                                      }}
                                      className="hover:scale-110 transition-transform group/btn"
                                      title="Valider le renforcement"
                                    >
                                      <Circle className="h-5 w-5 text-muted-foreground group-hover/btn:text-emerald-600 transition-colors" />
                                    </button>
                                  )}
                                  <div>
                                    <p className={`font-serif font-bold text-base ${reminder.completed ? 'opacity-50' : ''}`}>{reminder.title}</p>
                                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                      {reminder.day_of_week} • {reminder.duration_minutes} min
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleReminder(reminder.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                              </div>

                              {isExpanded && (
                                <div className="mt-3 p-3 bg-muted/50 rounded-md text-sm whitespace-pre-wrap text-muted-foreground border border-border/50">
                                  {strengtheningDetails[reminder.session_type] || "Aucun détail disponible"}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
