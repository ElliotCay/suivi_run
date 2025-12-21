'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Target, Calendar, Sparkles } from 'lucide-react'
import { AIButton } from '@/components/ui/AIButton'
import { PostWorkoutAnalysisCard } from '@/components/PostWorkoutAnalysisCard'
import { toast } from 'sonner'
import api from '@/lib/api'

interface WorkoutAnalysis {
  id: number
  workout_id: number
  performance_vs_plan: "sur_objectif" | "conforme" | "sous_objectif" | "séance_libre"
  pace_variance_pct: number | null
  hr_zone_variance: string | null
  fatigue_detected: boolean
  injury_risk_score: number
  injury_risk_factors: string[] | null
  summary: string
  analyzed_at: string
}

interface Workout {
  id: number
  date: string
  distance: number
  duration: number
  avg_pace: number
  avg_hr: number | null
  max_hr: number | null
  workout_type: string | null
  notes: string | null
}

interface AdjustmentProposal {
  id: number
  status: "pending" | "auto_applied" | "validated" | "rejected"
  adjustments: Array<any>
  applied: boolean
  created_at: string
}

export default function CoachPage() {
  const [activeTab, setActiveTab] = useState('race')
  const [recentAnalysis, setRecentAnalysis] = useState<WorkoutAnalysis | null>(null)
  const [recentWorkout, setRecentWorkout] = useState<Workout | null>(null)
  const [recentProposal, setRecentProposal] = useState<AdjustmentProposal | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentAnalysis()
  }, [])

  const fetchRecentAnalysis = async () => {
    try {
      const response = await api.get('/api/workouts/recent-analysis')
      if (response.data.analysis) {
        setRecentAnalysis(response.data.analysis)
        setRecentWorkout(response.data.workout)
        setRecentProposal(response.data.proposal)
      }
    } catch (error) {
      console.error('Error fetching recent analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async (proposalId: number) => {
    try {
      await api.post(`/api/adjustments/${proposalId}/validate`)
      toast.success('Ajustements appliqués avec succès ✓')
      fetchRecentAnalysis() // Refresh
    } catch (error) {
      console.error('Error validating proposal:', error)
      toast.error('Erreur lors de la validation')
    }
  }

  const handleReject = async (proposalId: number) => {
    try {
      await api.post(`/api/adjustments/${proposalId}/reject`)
      toast.info('Proposition ignorée')
      fetchRecentAnalysis() // Refresh
    } catch (error) {
      console.error('Error rejecting proposal:', error)
      toast.error('Erreur lors du rejet')
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-6xl font-serif font-bold tracking-tight">
          Coach IA
        </h1>
        <p className="text-xl text-muted-foreground">
          Ton hub d'intelligence artificielle
        </p>
      </div>

      {/* Post-Workout Analysis (if recent <24h) */}
      {!loading && recentAnalysis && (
        <PostWorkoutAnalysisCard
          analysis={recentAnalysis}
          workout={recentWorkout}
          proposal={recentProposal}
          onValidate={handleValidate}
          onReject={handleReject}
        />
      )}

      {/* Mode Selection Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="race" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span>Objectif Course</span>
          </TabsTrigger>
          <TabsTrigger value="block" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Bloc 4 semaines</span>
          </TabsTrigger>
          <TabsTrigger value="suggestion" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>Suggestion</span>
          </TabsTrigger>
        </TabsList>

        {/* Mode 1: Objectif Course */}
        <TabsContent value="race" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Préparation Course</CardTitle>
              <CardDescription>
                Génère un plan complet (8-12 semaines) pour préparer une course officielle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-base font-bold mb-2">
                  Aucun objectif défini
                </p>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Crée ton premier objectif de course pour recevoir un plan d'entraînement personnalisé avec périodisation complète.
                </p>
                <Button size="lg">
                  <Target className="h-4 w-4 mr-2" />
                  Créer un objectif
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mode 2: Bloc 4 semaines */}
        <TabsContent value="block" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bloc 4 Semaines</CardTitle>
              <CardDescription>
                Un cycle court pour progresser sur un aspect spécifique (volume, vitesse, VMA, endurance)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-base font-bold mb-2">
                  Pas de bloc actif
                </p>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Génère un bloc de 4 semaines pour travailler un focus spécifique. Idéal quand tu n'as pas de course en vue.
                </p>
                <Button size="lg">
                  <Calendar className="h-4 w-4 mr-2" />
                  Générer un bloc
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mode 3: Suggestion ponctuelle */}
        <TabsContent value="suggestion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suggestion Ponctuelle</CardTitle>
              <CardDescription>
                Une séance unique adaptée à ton état actuel et ton historique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-base font-bold mb-2">
                  Besoin d'inspiration ?
                </p>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Génère une séance personnalisée pour aujourd'hui ou demain basée sur ton niveau de forme et tes derniers entraînements.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" variant="outline">
                    Séance spécifique
                  </Button>
                  <AIButton
                    animationType="none"
                    label="Surprise-moi"
                    iconClassName="w-4 h-4 text-purple-500"
                    className="border border-input shadow-sm bg-foreground text-background hover:bg-foreground/90 px-6 py-2.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold">
                Mode Coach IA
              </p>
              <p className="text-sm text-muted-foreground">
                Toutes les suggestions sont générées par Claude en fonction de ton profil, ton historique et tes préférences.
                Tu peux choisir entre le mode intégré (API) ou l'export manuel dans les Réglages.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
