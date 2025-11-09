"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquarePlus, Download, Clock, TrendingUp } from "lucide-react"
import { formatPace } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface WorkoutWithoutFeedback {
  id: number
  date: string
  distance: number
  duration: number
  avg_pace: number
  workout_type: string
}

interface PendingStravaWorkout {
  strava_id: number
  name: string
  date: string
  distance_km: number
  duration_seconds: number
  avg_pace_sec_per_km: number
}

export function MissingFeedbackModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [workoutsWithoutFeedback, setWorkoutsWithoutFeedback] = useState<WorkoutWithoutFeedback[]>([])
  const [pendingStrava, setPendingStrava] = useState<PendingStravaWorkout[]>([])

  useEffect(() => {
    fetchMissingData()
  }, [])

  const fetchMissingData = async () => {
    try {
      setLoading(true)

      // Fetch workouts without feedback
      const feedbackResponse = await fetch("http://localhost:8000/api/workouts/missing-feedback")
      const feedbackData = await feedbackResponse.json()

      // Fetch pending Strava workouts
      const stravaResponse = await fetch("http://localhost:8000/api/strava/pending")
      const stravaData = await stravaResponse.json()

      setWorkoutsWithoutFeedback(feedbackData.workouts || [])
      setPendingStrava(stravaData.workouts || [])

      // Open modal if there's anything to show
      if ((feedbackData.workouts?.length > 0) || (stravaData.workouts?.length > 0)) {
        setOpen(true)
      }
    } catch (error) {
      console.error("Failed to fetch missing data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFeedback = (workoutId: number) => {
    setOpen(false)
    router.push(`/workouts/${workoutId}`)
  }

  const handleQuickRAS = async (workoutId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/workouts/${workoutId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_comment: "R.A.S."
        })
      })

      if (response.ok) {
        // Remove from list
        setWorkoutsWithoutFeedback(prev => prev.filter(w => w.id !== workoutId))

        // Close modal if nothing left
        if (workoutsWithoutFeedback.length === 1 && pendingStrava.length === 0) {
          setOpen(false)
        }
      }
    } catch (error) {
      console.error("Failed to add R.A.S. comment:", error)
    }
  }

  const handleImportStrava = async (stravaId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/strava/import/${stravaId}`, {
        method: "POST"
      })

      if (response.ok) {
        setPendingStrava(prev => prev.filter(w => w.strava_id !== stravaId))

        // Close modal if nothing left
        if (pendingStrava.length === 1 && workoutsWithoutFeedback.length === 0) {
          setOpen(false)
        }
      }
    } catch (error) {
      console.error("Failed to import workout:", error)
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

  if (loading || (workoutsWithoutFeedback.length === 0 && pendingStrava.length === 0)) {
    return null
  }

  const totalMissing = workoutsWithoutFeedback.length + pendingStrava.length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-orange-500" />
            {totalMissing} {totalMissing === 1 ? "action en attente" : "actions en attente"}
          </DialogTitle>
          <DialogDescription>
            Complétez vos séances pour un meilleur suivi de votre progression
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={workoutsWithoutFeedback.length > 0 ? "feedback" : "import"} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Feedback manquant ({workoutsWithoutFeedback.length})
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Import Strava ({pendingStrava.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feedback" className="space-y-3 mt-4">
            {workoutsWithoutFeedback.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Toutes vos séances ont un feedback ! 🎉
              </p>
            ) : (
              workoutsWithoutFeedback.map((workout) => (
                <div
                  key={workout.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{workout.workout_type || "Course"}</p>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(workout.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {workout.distance.toFixed(2)} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(workout.duration)}
                      </span>
                      {workout.avg_pace && (
                        <span>Allure: {formatPace(workout.avg_pace)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleQuickRAS(workout.id)}
                      size="sm"
                      variant="outline"
                    >
                      R.A.S.
                    </Button>
                    <Button
                      onClick={() => handleAddFeedback(workout.id)}
                      size="sm"
                    >
                      <MessageSquarePlus className="h-4 w-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-3 mt-4">
            {pendingStrava.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Toutes vos séances Strava sont importées ! 🎉
              </p>
            ) : (
              pendingStrava.map((workout) => (
                <div
                  key={workout.strava_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{workout.name}</p>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(workout.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {workout.distance_km.toFixed(2)} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(workout.duration_seconds)}
                      </span>
                      {workout.avg_pace_sec_per_km && (
                        <span>Allure: {formatPace(workout.avg_pace_sec_per_km)}</span>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleImportStrava(workout.strava_id)}
                    size="sm"
                    className="ml-4"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Importer
                  </Button>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Plus tard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
