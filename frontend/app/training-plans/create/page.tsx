"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createTrainingPlan } from "@/lib/api/training-plans"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function CreateTrainingPlanPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    goal_type: "10km",
    target_date: "",
    current_level: "",
    weeks_count: "8",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name || !formData.target_date) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    try {
      setLoading(true)
      const plan = await createTrainingPlan({
        name: formData.name,
        goal_type: formData.goal_type as "5km" | "10km" | "half_marathon" | "marathon",
        target_date: formData.target_date,
        current_level: formData.current_level || undefined,
        weeks_count: parseInt(formData.weeks_count),
      })

      toast.success("Plan d'entraînement créé avec succès !")
      router.push(`/training-plans/${plan.id}`)
    } catch (error) {
      console.error("Failed to create training plan:", error)
      toast.error("Erreur lors de la création du plan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Link href="/training-plans">
        <Button variant="ghost" className="gap-2 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Retour aux plans
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Créer un Plan d'Entraînement</CardTitle>
          <CardDescription>
            Générez un programme personnalisé sur plusieurs semaines avec l'IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom du plan */}
            <div className="space-y-2">
              <Label htmlFor="name">Nom du plan *</Label>
              <Input
                id="name"
                placeholder="Ex: Préparation Semi-Marathon Mars 2026"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Objectif */}
            <div className="space-y-2">
              <Label htmlFor="goal_type">Objectif *</Label>
              <Select
                value={formData.goal_type}
                onValueChange={(value) => setFormData({ ...formData, goal_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5km">5 km</SelectItem>
                  <SelectItem value="10km">10 km</SelectItem>
                  <SelectItem value="half_marathon">Semi-Marathon (21.1 km)</SelectItem>
                  <SelectItem value="marathon">Marathon (42.2 km)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date cible */}
            <div className="space-y-2">
              <Label htmlFor="target_date">Date de l'objectif *</Label>
              <Input
                id="target_date"
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                required
              />
              <p className="text-sm text-muted-foreground">
                Date de votre course ou objectif personnel
              </p>
            </div>

            {/* Niveau actuel */}
            <div className="space-y-2">
              <Label htmlFor="current_level">Niveau actuel (optionnel)</Label>
              <Textarea
                id="current_level"
                placeholder="Ex: Je cours 3 fois par semaine, sortie longue de 10km, allure facile à 6:00/km"
                value={formData.current_level}
                onChange={(e) => setFormData({ ...formData, current_level: e.target.value })}
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Décrivez votre condition physique actuelle pour un plan personnalisé
              </p>
            </div>

            {/* Durée */}
            <div className="space-y-2">
              <Label htmlFor="weeks_count">Durée du plan *</Label>
              <Select
                value={formData.weeks_count}
                onValueChange={(value) => setFormData({ ...formData, weeks_count: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8 semaines</SelectItem>
                  <SelectItem value="10">10 semaines</SelectItem>
                  <SelectItem value="12">12 semaines</SelectItem>
                  <SelectItem value="16">16 semaines</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                La durée recommandée dépend de votre objectif (8-12 semaines pour 10km/semi, 12-16 pour marathon)
              </p>
            </div>

            {/* Info périodisation */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="font-medium mb-2">À propos de la périodisation</h4>
              <p className="text-sm text-muted-foreground">
                Le plan sera divisé en 4 phases : <strong>BASE</strong> (endurance fondamentale),
                <strong> BUILD</strong> (introduction de la qualité), <strong>PEAK</strong> (intensité maximale),
                et <strong>TAPER</strong> (affûtage pré-course).
              </p>
            </div>

            {/* Boutons */}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  "Générer le plan"
                )}
              </Button>
              <Link href="/training-plans">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
            </div>

            {loading && (
              <p className="text-sm text-center text-muted-foreground">
                L'IA génère votre plan personnalisé, cela peut prendre 10-30 secondes...
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
