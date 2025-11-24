"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { TrainingPlanCard, TrainingPlanCardSkeleton } from "@/components/training-plan-card"
import { TrainingPlanListItem, getTrainingPlans } from "@/lib/api/training-plans"
import { Plus } from "lucide-react"

export default function TrainingPlansPage() {
  const [plans, setPlans] = useState<TrainingPlanListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all")

  useEffect(() => {
    loadPlans()
  }, [])

  async function loadPlans() {
    try {
      setLoading(true)
      const data = await getTrainingPlans()
      setPlans(data)
    } catch (error) {
      console.error("Failed to load training plans:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPlans = plans.filter((plan) => {
    if (filter === "all") return true
    if (filter === "active") return plan.status === "active"
    if (filter === "completed") return plan.status === "completed"
    return true
  })

  return (
    <div className="space-y-6">
      {/* Minimal Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-6xl font-serif font-bold tracking-tight">
            Plans
          </h1>
          <p className="text-base text-muted-foreground">
            Gérez vos programmes d'entraînement
          </p>
        </div>
        <Link href="/training-plans/create">
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau
          </Button>
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Tous
        </Button>
        <Button
          variant={filter === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("active")}
        >
          Actifs
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("completed")}
        >
          Terminés
        </Button>
      </div>

      {/* Liste des plans */}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <TrainingPlanCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <Card className="p-16 text-center hover:shadow-md transition-all">
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold mb-2">
              {filter === "all"
                ? "Aucun plan d'entraînement"
                : `Aucun plan ${filter === "active" ? "actif" : "terminé"}`}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {filter === "all"
                ? "Créez votre premier plan d'entraînement pour structurer votre préparation sur plusieurs semaines."
                : `Vous n'avez aucun plan ${filter === "active" ? "actif" : "terminé"} pour le moment.`}
            </p>
            {filter === "all" && (
              <Link href="/training-plans/create">
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Créer un plan
                </Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan) => (
            <Link key={plan.id} href={`/training-plans/${plan.id}`}>
              <TrainingPlanCard plan={plan} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
