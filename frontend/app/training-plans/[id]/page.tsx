"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { WeekCalendar } from "@/components/week-calendar"
import { SessionDetailModal } from "@/components/session-detail-modal"
import {
  TrainingPlan,
  TrainingSession,
  getTrainingPlan,
  getCurrentWeek,
  calculateProgress,
} from "@/lib/api/training-plans"
import { ArrowLeft, Calendar, Target, TrendingUp, Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function TrainingPlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const planId = parseInt(params.id as string)

  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    loadPlan()
  }, [planId])

  async function loadPlan() {
    try {
      setLoading(true)
      const data = await getTrainingPlan(planId)
      setPlan(data)
    } catch (error) {
      console.error("Failed to load training plan:", error)
    } finally {
      setLoading(false)
    }
  }

  function handleSessionClick(session: TrainingSession) {
    setSelectedSession(session)
    setModalOpen(true)
  }

  function handleSessionUpdated() {
    loadPlan()
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="p-12 text-center">
          <h3 className="text-xl font-semibold mb-2">Plan non trouvé</h3>
          <p className="text-muted-foreground mb-6">
            Ce plan d'entraînement n'existe pas ou a été supprimé.
          </p>
          <Link href="/training-plans">
            <Button>Retour aux plans</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const currentWeek = getCurrentWeek(plan)
  const currentWeekNumber = currentWeek?.week_number || 1
  const progress = calculateProgress(plan)

  const getGoalTypeLabel = (goalType: string) => {
    switch (goalType) {
      case "5km":
        return "5 km"
      case "10km":
        return "10 km"
      case "half_marathon":
        return "Semi-Marathon"
      case "marathon":
        return "Marathon"
      default:
        return goalType
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Link href="/training-plans">
        <Button variant="ghost" className="gap-2 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Retour aux plans
        </Button>
      </Link>

      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-6xl font-serif font-bold tracking-tight">{plan.name}</h1>
          <Badge variant={plan.status === "active" ? "default" : "secondary"}>
            {plan.status === "active" ? "Actif" : plan.status === "completed" ? "Terminé" : "Brouillon"}
          </Badge>
        </div>

        {/* Métriques */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Objectif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getGoalTypeLabel(plan.goal_type)}</div>
              {plan.target_date && (
                <p className="text-sm text-muted-foreground">
                  {new Date(plan.target_date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{progress}%</div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                Semaine {currentWeekNumber} / {plan.weeks_count}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Durée
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{plan.weeks_count} semaines</div>
              <p className="text-sm text-muted-foreground">
                {new Date(plan.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                {" → "}
                {new Date(plan.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Niveau actuel */}
        {plan.current_level && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Niveau de départ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{plan.current_level}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Calendrier des semaines */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Calendrier d'entraînement</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plan.weeks.map((week) => (
            <WeekCalendar
              key={week.id}
              week={week}
              onSessionClick={handleSessionClick}
            />
          ))}
        </div>
      </div>

      {/* Modal détail séance */}
      <SessionDetailModal
        session={selectedSession}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSessionUpdated={handleSessionUpdated}
        planId={planId}
      />
    </div>
  )
}
