"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ChevronDown, ChevronUp } from "lucide-react"
import { formatPace } from "@/lib/utils"
import { toast } from "sonner"

interface WorkoutWithoutFeedback {
  id: number
  date: string
  distance: number
  duration: number
  avg_pace: number
  workout_type: string
}

interface WorkoutFormState {
  type: string
  rating: number
  comment: string
}

export function MissingFeedbackModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [workoutsWithoutFeedback, setWorkoutsWithoutFeedback] = useState<WorkoutWithoutFeedback[]>([])
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<number | null>(null)
  const [formState, setFormState] = useState<WorkoutFormState>({ type: "", rating: 0, comment: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchMissingData()
  }, [])

  const fetchMissingData = async () => {
    try {
      setLoading(true)

      // Fetch workouts without feedback
      const feedbackResponse = await fetch("http://127.0.0.1:8000/api/workouts/missing-feedback")
      const feedbackData = await feedbackResponse.json()

      setWorkoutsWithoutFeedback(feedbackData.workouts || [])

      // Open modal if there's anything to show
      if (feedbackData.workouts?.length > 0) {
        setOpen(true)
      }
    } catch (error) {
      console.error("Failed to fetch missing data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleExpand = (workoutId: number, currentType: string) => {
    if (expandedWorkoutId === workoutId) {
      setExpandedWorkoutId(null)
      setFormState({ type: "", rating: 0, comment: "" })
    } else {
      setExpandedWorkoutId(workoutId)
      setFormState({ type: currentType || "", rating: 0, comment: "" })
    }
  }

  const handleSaveFeedback = async (workoutId: number) => {
    setSaving(true)
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/workouts/${workoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workout_type: formState.type || null,
          user_rating: formState.rating || null,
          notes: formState.comment || null
        })
      })

      if (response.ok) {
        toast.success("Séance mise à jour")
        setWorkoutsWithoutFeedback(prev => prev.filter(w => w.id !== workoutId))
        setExpandedWorkoutId(null)
        setFormState({ type: "", rating: 0, comment: "" })

        if (workoutsWithoutFeedback.length === 1) {
          setOpen(false)
        }
      } else {
        toast.error("Erreur lors de la sauvegarde")
      }
    } catch (error) {
      console.error("Failed to save feedback:", error)
      toast.error("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const handleQuickRAS = async (workoutId: number) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/workouts/${workoutId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          notes: "R.A.S."
        })
      })

      if (response.ok) {
        // Remove from list
        setWorkoutsWithoutFeedback(prev => prev.filter(w => w.id !== workoutId))

        // Close modal if nothing left
        if (workoutsWithoutFeedback.length === 1) {
          setOpen(false)
        }
      }
    } catch (error) {
      console.error("Failed to add R.A.S. comment:", error)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short"
    }).format(date)
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h${mins}min` : `${mins}min`
  }

  if (loading || workoutsWithoutFeedback.length === 0) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl tracking-tight">
            {workoutsWithoutFeedback.length} {workoutsWithoutFeedback.length === 1 ? "séance sans feedback" : "séances sans feedback"}
          </DialogTitle>
          <DialogDescription className="font-sans text-muted-foreground">
            Complétez vos séances pour un meilleur suivi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {workoutsWithoutFeedback.map((workout) => {
            const isExpanded = expandedWorkoutId === workout.id
            return (
              <div
                key={workout.id}
                className={`
                  rounded-xl overflow-hidden transition-all duration-300 ease-out
                  bg-white/5 backdrop-blur-xl border border-white/10
                  ${isExpanded ? "shadow-lg shadow-black/5" : "hover:bg-white/8"}
                `}
              >
                {/* Workout header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-sans font-medium tracking-tight">
                        {workout.workout_type || "Course"}
                      </p>
                      <span className="text-sm text-muted-foreground font-sans">
                        {formatDate(workout.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-mono tabular-nums">
                        {workout.distance.toFixed(2)} km
                      </span>
                      <span className="font-mono tabular-nums">
                        {formatDuration(workout.duration)}
                      </span>
                      {workout.avg_pace && (
                        <span className="font-mono tabular-nums italic">
                          {formatPace(workout.avg_pace)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleQuickRAS(workout.id)}
                      size="sm"
                      variant="outline"
                      className="border-white/10 hover:bg-white/10"
                    >
                      R.A.S.
                    </Button>
                    <Button
                      onClick={() => handleToggleExpand(workout.id, workout.workout_type)}
                      size="sm"
                      className="gap-1.5"
                      style={{
                        backgroundImage: 'linear-gradient(90deg, #ee95b3, #667abf)',
                      }}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Fermer
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          Ajouter
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expandable form */}
                <div
                  className={`
                    overflow-hidden transition-all duration-300 ease-out
                    ${isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"}
                  `}
                >
                  <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-4">
                    {/* Type de sortie */}
                    <div className="space-y-2">
                      <Label className="text-sm font-sans text-muted-foreground">
                        Type de sortie
                      </Label>
                      <Select
                        value={formState.type}
                        onValueChange={(value) => setFormState(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10">
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

                    {/* Rating */}
                    <div className="space-y-2">
                      <Label className="text-sm font-sans text-muted-foreground">
                        Ressenti
                      </Label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFormState(prev => ({ ...prev, rating: star }))}
                            className={`
                              text-2xl transition-all duration-150 hover:scale-110
                              ${star <= formState.rating ? "text-amber-400" : "text-white/20"}
                            `}
                          >
                            {star <= formState.rating ? "★" : "☆"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                      <Label className="text-sm font-sans text-muted-foreground">
                        Commentaire
                      </Label>
                      <Textarea
                        value={formState.comment}
                        onChange={(e) => setFormState(prev => ({ ...prev, comment: e.target.value }))}
                        placeholder="Ressenti, conditions, douleurs..."
                        rows={3}
                        className="bg-white/5 border-white/10 resize-none font-sans"
                      />
                    </div>

                    {/* Save button */}
                    <Button
                      onClick={() => handleSaveFeedback(workout.id)}
                      disabled={saving}
                      className="w-full font-sans font-medium"
                      style={{
                        backgroundImage: 'linear-gradient(90deg, #ee95b3, #667abf)',
                      }}
                    >
                      {saving ? "Sauvegarde..." : "Sauvegarder"}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="font-sans border-white/10 hover:bg-white/10"
          >
            Plus tard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
