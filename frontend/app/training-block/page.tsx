"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar, CheckCircle, Circle, Dumbbell, ChevronDown, ChevronUp, Edit2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import axios from "axios"
import { formatPace } from "@/lib/utils"

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

  const loadCurrentBlock = async () => {
    try {
      setLoading(true)
      const response = await axios.get("http://localhost:8000/api/training/current-block")
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
      setLoading(false)
    }
  }

  const completeWorkout = async (workoutId: number) => {
    try {
      await axios.post(`http://localhost:8000/api/training/workouts/${workoutId}/complete`)
      toast.success("Séance marquée comme complétée !")
      loadCurrentBlock()
    } catch (error) {
      console.error("Error completing workout:", error)
      toast.error("Erreur lors de la validation")
    }
  }

  const completeStrengthening = async (reminderId: number) => {
    try {
      await axios.patch(`http://localhost:8000/api/training/strengthening-reminders/${reminderId}/complete`)
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
      await axios.delete(`http://localhost:8000/api/training/blocks/${block.id}`)
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
      const response = await axios.post('http://localhost:8000/api/calendar/sync')
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
      const response = await axios.post(`http://localhost:8000/api/training/blocks/${block.id}/complete-and-generate-next`)

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
          await axios.post('http://localhost:8000/api/calendar/sync')
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
      await axios.patch(`http://localhost:8000/api/training/workouts/${workoutId}/reschedule`,
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

  const workoutsByWeek = groupWorkoutsByWeek(block.planned_workouts)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight">Bloc d'entraînement</h1>
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
            className="bg-green-600 hover:bg-green-700"
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

      {/* Block Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du bloc</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Période</p>
              <p className="font-bold">
                {new Date(block.start_date).toLocaleDateString("fr-FR")} -{" "}
                {new Date(block.end_date).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Jours restants</p>
              <Badge
                variant={getDaysRemaining() <= 3 ? "destructive" : getDaysRemaining() <= 7 ? "default" : "secondary"}
                className="font-bold"
              >
                {getDaysRemaining() > 0 ? `${getDaysRemaining()} jour${getDaysRemaining() > 1 ? 's' : ''}` : 'Terminé'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fréquence</p>
              <p className="font-bold">{block.days_per_week} séances/semaine</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Volume cible</p>
              <p className="font-bold">{block.target_weekly_volume} km/semaine</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phase</p>
              <Badge className="bg-muted text-foreground">
                {phaseLabels[block.phase] || block.phase}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Distribution des intensités</p>
            <div className="flex gap-4 text-sm">
              <span>Facile (dont longues): {actualEasyPct}%</span>
              <span>Seuil: {actualThresholdPct}%</span>
              <span>Fractionné: {actualIntervalPct}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Objectif: {block.easy_percentage}/{block.threshold_percentage}/{block.interval_percentage}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Weeks */}
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
            <div key={weekNum}>
              <h2 className="text-2xl font-bold mb-3">Semaine {weekNum}</h2>
              <div className="space-y-2">
                {weekWorkouts.map((workout) => {
                  const isExpanded = expandedWorkouts.has(workout.id)

                  return (
                    <Card
                      key={workout.id}
                      className={`transition-opacity ${workout.status === "completed" ? "opacity-50" : ""}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-4">
                          {/* Left: Type + Day + Date */}
                          <div className="flex items-center gap-3 w-[320px]">
                            <Badge
                              className={`${
                                workoutTypeColors[workout.workout_type] ||
                                "bg-gray-100 text-gray-800"
                              } w-[90px] justify-center shrink-0`}
                            >
                              {workoutTypeLabels[workout.workout_type] || workout.workout_type}
                            </Badge>
                            {editingWorkoutId === workout.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="date"
                                  value={editingDate}
                                  onChange={(e) => setEditingDate(e.target.value)}
                                  className="h-8 w-36 text-sm"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => saveNewDate(workout.id)}
                                  className="h-6 px-2 text-xs"
                                >
                                  ✓
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEditingDate}
                                  className="h-6 px-2 text-xs"
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="text-sm w-[130px]">
                                  <div className="font-medium">{workout.day_of_week}</div>
                                  <div className="text-muted-foreground text-xs">
                                    {new Date(workout.scheduled_date).toLocaleDateString("fr-FR", {
                                      day: "numeric",
                                      month: "short"
                                    })}
                                  </div>
                                </div>
                                {workout.status !== "completed" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditingDate(workout.id, workout.scheduled_date)}
                                    className="h-6 w-6 p-0 hover:bg-muted"
                                    title="Modifier la date"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Center: Title + Pace */}
                          <div className="flex-1">
                            <div className="font-bold text-sm">{workout.title}</div>
                            {workout.target_pace_min && workout.target_pace_max && (
                              <div className="text-xs text-muted-foreground">
                                Allure: {formatPace(workout.target_pace_min)} - {formatPace(workout.target_pace_max)}
                              </div>
                            )}
                          </div>

                          {/* Right: Expand + Status buttons */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleWorkout(workout.id)}
                              className="text-xs"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </Button>
                            {workout.status === "completed" ? (
                              <Button variant="ghost" size="sm" disabled className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Fait
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => completeWorkout(workout.id)}
                                className="text-xs"
                              >
                                <Circle className="h-3 w-3 mr-1" />
                                Valider
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Collapsible details */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="prose prose-sm max-w-none">
                              <div className="text-sm whitespace-pre-wrap">{workout.description}</div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}

                {/* Strengthening reminders for this week */}
                {weekStrengthening.map((reminder) => {
                  const isExpanded = expandedReminders.has(reminder.id)

                  return (
                    <Card
                      key={reminder.id}
                      className={`border-purple-200 transition-opacity ${reminder.completed ? "opacity-50" : ""}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-4">
                          {/* Left: Icon + Day */}
                          <div className="flex items-center gap-3 w-[240px]">
                            <div className="w-[90px] flex items-center justify-center shrink-0">
                              <Dumbbell className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="text-sm w-[130px]">
                              <div className="font-medium">{reminder.day_of_week}</div>
                              <div className="text-muted-foreground text-xs">
                                {new Date(reminder.scheduled_date).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short"
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Center: Title */}
                          <div className="flex-1">
                            <div className="font-bold text-sm text-purple-700">{reminder.title}</div>
                            <div className="text-xs text-muted-foreground">{reminder.duration_minutes} min</div>
                          </div>

                          {/* Right: Expand + Status buttons */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleReminder(reminder.id)}
                              className="text-xs"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </Button>
                            {reminder.completed ? (
                              <Button variant="ghost" size="sm" disabled className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Fait
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => completeStrengthening(reminder.id)}
                                className="text-xs"
                              >
                                <Circle className="h-3 w-3 mr-1" />
                                Valider
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Collapsible details */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-purple-100">
                            <div className="prose prose-sm max-w-none">
                              <div className="text-sm whitespace-pre-wrap">
                                {strengtheningDetails[reminder.session_type] || "Détails non disponibles"}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
    </div>
  )
}
