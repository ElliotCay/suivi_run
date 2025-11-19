'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import VolumeChart from '@/components/VolumeChart'
import CardiacEfficiency from '@/components/charts/CardiacEfficiency'
import {
  getDashboardSummary,
  getVolumeHistory,
  getWorkoutTypes,
  getTrainingLoad,
  getReadinessScore,
  getWorkouts
} from '@/lib/api'
import Link from 'next/link'
import { Activity, Calendar, Heart, TrendingUp, Zap, Award, ArrowRight, Upload, Info, TrendingDown, Clock, CheckCircle2, XCircle, Footprints, AlertTriangle } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import { useShoeAlerts } from '@/hooks/useShoes'
import { BadgeToast } from '@/components/BadgeToast'
import { useWeeklyRecaps } from '@/hooks/useWeeklyRecaps'
import WeeklyRecapCard from '@/components/WeeklyRecapCard'
import { Sparkles } from 'lucide-react'

interface DashboardSummary {
  week_volume_km: number
  workout_count: number
  avg_heart_rate: number | null
  week_start: string
  total_all_time_km: number
  total_workouts: number
}

interface VolumeData {
  week: string
  total_distance: number
  workout_count: number
}

interface WorkoutTypeData {
  type: string
  count: number
  percentage: number
}

interface TrainingLoad {
  acute_load_km: number
  chronic_load_km: number
  ratio: number | null
  status: string
  last_7_days_count: number
  last_28_days_count: number
}


interface EfficiencyData {
  date: string
  avg_heart_rate: number
  avg_pace: number
  workout_type: string
}

interface ReadinessScore {
  score: number
  level: string
  emoji: string
  message: string
  details: {
    volume?: any
    recovery?: any
    pace?: any
  }
  penalties: Record<string, number>
  bonuses: Record<string, number>
  available_criteria: number
  max_criteria: number
}

function getLoadMessage(ratio: number | null) {
  if (!ratio) return {
    icon: '📊',
    text: 'Commencez à vous entraîner régulièrement',
    color: 'text-muted-foreground'
  }

  if (ratio < 0.8) return {
    icon: '😴',
    text: 'Charge faible. Tu peux augmenter !',
    color: 'text-blue-600 dark:text-blue-400'
  }

  if (ratio < 1.3) return {
    icon: '💪',
    text: 'Charge optimale. Continue comme ça !',
    color: 'text-green-600 dark:text-green-400'
  }

  return {
    icon: '⚠️',
    text: 'Attention à la fatigue. Prends du repos !',
    color: 'text-orange-600 dark:text-orange-400'
  }
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [volumeHistory, setVolumeHistory] = useState<VolumeData[]>([])
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutTypeData[]>([])
  const [trainingLoad, setTrainingLoad] = useState<TrainingLoad | null>(null)
  const [efficiencyData, setEfficiencyData] = useState<EfficiencyData[]>([])
  const [readiness, setReadiness] = useState<ReadinessScore | null>(null)
  const [readinessDialogOpen, setReadinessDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { alerts, count: alertsCount } = useShoeAlerts()
  const { latestRecap, loading: recapLoading, markAsViewed, generateRecap } = useWeeklyRecaps()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [
        summaryRes,
        volumeRes,
        typesRes,
        loadRes,
        workoutsRes,
        readinessRes
      ] = await Promise.all([
        getDashboardSummary(),
        getVolumeHistory(12),
        getWorkoutTypes(),
        getTrainingLoad(),
        getWorkouts(),
        getReadinessScore()
      ])

      // Handle errors from API helpers
      if (summaryRes.error) {
        console.error('Error loading summary:', summaryRes.error)
        return
      }
      if (volumeRes.error) {
        console.error('Error loading volume history:', volumeRes.error)
        return
      }
      if (typesRes.error) {
        console.error('Error loading workout types:', typesRes.error)
        return
      }
      if (loadRes.error) {
        console.error('Error loading training load:', loadRes.error)
        return
      }
      if (workoutsRes.error) {
        console.error('Error loading workouts:', workoutsRes.error)
        return
      }
      if (readinessRes.error) {
        console.error('Error loading readiness:', readinessRes.error)
        return
      }

      setSummary(summaryRes.data)
      setVolumeHistory(volumeRes.data)
      setTrainingLoad(loadRes.data)
      setReadiness(readinessRes.data)

      // Process workout types with percentages
      const total = typesRes.data.reduce((sum: number, t: any) => sum + t.count, 0)
      const typesWithPercentage = typesRes.data.map((t: any) => ({
        ...t,
        percentage: total > 0 ? (t.count / total) * 100 : 0
      }))
      setWorkoutTypes(typesWithPercentage)

      // Process workouts for cardiac efficiency (endurance sessions only)
      const efficiencyWorkouts = workoutsRes.data
        .filter((w: any) =>
          w.avg_hr &&
          w.avg_pace &&
          (w.workout_type === 'facile' || w.workout_type === 'longue')
        )
        .map((w: any) => ({
          date: w.date,
          avg_heart_rate: w.avg_hr,
          avg_pace: w.avg_pace,
          workout_type: w.workout_type
        }))
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

      setEfficiencyData(efficiencyWorkouts)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Tableau de bord</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] mb-6" />
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    )
  }

  // Empty state when no workouts exist
  const hasNoWorkouts = summary?.total_workouts === 0 || volumeHistory.length === 0

  if (hasNoWorkouts) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-base text-muted-foreground">
            Vue d'ensemble de votre entraînement
          </p>
        </div>
        <EmptyState
          icon={Activity}
          title="Bienvenue sur StrideAI !"
          description="Importez vos données Apple Health pour commencer à suivre vos entraînements, analyser vos performances et bénéficier de votre coach IA personnel."
          action={{
            label: "Importer mes séances",
            href: "/import"
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Badge Toast Notifications */}
      <BadgeToast />

      {/* Minimal Header */}
      <div className="space-y-2">
        <h1 className="text-6xl font-serif font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-base text-muted-foreground">
          Vue d'ensemble de votre entraînement
        </p>
      </div>

      {/* Key Metrics - Bento Grid */}
      <div className="grid grid-cols-12 gap-4 auto-rows-[130px]">
        {/* Readiness Score - Featured */}
        <Card className="col-span-6 row-span-2 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
            style={{
              background: 'var(--allure-gradient)',
              padding: '2px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude'
            }} />
          <CardContent className="p-6 h-full flex flex-col justify-between relative z-10">
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground font-medium">Forme du jour</p>
                <button
                  onClick={() => setReadinessDialogOpen(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="text-7xl">
                  {readiness?.emoji || '💚'}
                </div>
                <div>
                  <div className="text-5xl font-mono font-bold">
                    {readiness?.score ?? '--'}/100
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {readiness?.level ? (
                      readiness.level === 'excellent' ? 'Excellente' :
                        readiness.level === 'good' ? 'Bonne' :
                          readiness.level === 'moderate' ? 'Modérée' :
                            readiness.level === 'fatigue' ? 'Fatigué' : 'Repos'
                    ) : 'Calcul...'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">
                {readiness?.message || 'Chargement...'}
              </p>
              {readiness && readiness.available_criteria > 0 && (
                <p className="text-xs text-muted-foreground">
                  Basé sur {readiness.available_criteria}/{readiness.max_criteria} critères
                  {readiness.available_criteria < readiness.max_criteria && ' (certaines données manquantes)'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Readiness Details Dialog */}
        <Dialog open={readinessDialogOpen} onOpenChange={setReadinessDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-3xl">{readiness?.emoji}</span>
                Détails du score de forme
              </DialogTitle>
              <DialogDescription>
                Analyse détaillée des facteurs influençant votre disponibilité à l'effort
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Score récapitulatif */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Score final</p>
                  <p className="text-4xl font-bold">{readiness?.score ?? '--'}/100</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Niveau</p>
                  <p className="text-lg font-semibold">
                    {readiness?.level === 'excellent' ? 'Excellente' :
                      readiness?.level === 'good' ? 'Bonne' :
                        readiness?.level === 'moderate' ? 'Modérée' :
                          readiness?.level === 'fatigue' ? 'Fatigué' : 'Repos'}
                  </p>
                </div>
              </div>

              {/* Facteurs détaillés */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Facteurs analysés</h3>

                {/* Volume (7j/28j ratio) */}
                {readiness?.details?.volume ? (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Charge d'entraînement</span>
                      </div>
                      <span className={cn(
                        "text-sm font-semibold",
                        readiness.details.volume.penalty === 0 ? "text-green-600" : "text-orange-600"
                      )}>
                        {readiness.details.volume.penalty > 0 ? `-${readiness.details.volume.penalty}` : '0'} points
                      </span>
                    </div>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p>Volume 7 jours : <span className="font-medium text-foreground">{readiness.details.volume.acute_volume_km} km</span></p>
                      <p>Moyenne 28 jours : <span className="font-medium text-foreground">{readiness.details.volume.chronic_volume_km} km/semaine</span></p>
                      <p>Ratio : <span className="font-medium text-foreground">{readiness.details.volume.ratio}</span></p>
                      <p className="text-xs pt-1">
                        {readiness.details.volume.status === 'surcharge' && '⚠️ Surcharge détectée (ratio > 1.5) - risque de blessure'}
                        {readiness.details.volume.status === 'sous-entraînement' && '📉 Sous-entraînement (ratio < 0.5)'}
                        {readiness.details.volume.status === 'optimal' && '✅ Charge optimale (ratio entre 0.8 et 1.2)'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                    <XCircle className="h-4 w-4 inline mr-2" />
                    Données de charge indisponibles
                  </div>
                )}

                {/* Recovery */}
                {readiness?.details?.recovery ? (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Récupération</span>
                      </div>
                      <span className={cn(
                        "text-sm font-semibold",
                        readiness.details.recovery.penalty === 0 ? "text-green-600" : "text-orange-600"
                      )}>
                        {readiness.details.recovery.penalty > 0 ? `-${readiness.details.recovery.penalty}` : '0'} points
                      </span>
                    </div>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      {readiness.details.recovery.last_hard_session_date ? (
                        <>
                          <p>Dernière séance dure : <span className="font-medium text-foreground">{new Date(readiness.details.recovery.last_hard_session_date).toLocaleDateString('fr-FR')}</span></p>
                          <p>Type : <span className="font-medium text-foreground">{readiness.details.recovery.last_hard_session_type}</span></p>
                          <p>Il y a : <span className="font-medium text-foreground">{readiness.details.recovery.hours_since}h</span></p>
                          <p className="text-xs pt-1">
                            {readiness.details.recovery.status === 'insufficient' && '⚠️ Récupération insuffisante (< 24h)'}
                            {readiness.details.recovery.status === 'partial' && '🟡 Récupération partielle (24-48h)'}
                            {readiness.details.recovery.status === 'recovered' && '✅ Récupération complète (> 48h)'}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs">✅ Aucune séance dure récente (28 derniers jours)</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                    <XCircle className="h-4 w-4 inline mr-2" />
                    Données de récupération indisponibles
                  </div>
                )}

                {/* Pace progression */}
                {readiness?.details?.pace ? (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Progression allure</span>
                      </div>
                      <span className={cn(
                        "text-sm font-semibold",
                        readiness.details.pace.bonus > 0 ? "text-green-600" : "text-muted-foreground"
                      )}>
                        {readiness.details.pace.bonus > 0 ? `+${readiness.details.pace.bonus}` : '0'} points
                      </span>
                    </div>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p>Allure moyenne 7j : <span className="font-medium text-foreground">{Math.floor(readiness.details.pace.avg_pace_7d_sec_per_km / 60)}:{String(Math.round(readiness.details.pace.avg_pace_7d_sec_per_km % 60)).padStart(2, '0')}/km</span></p>
                      <p>Allure moyenne 28j : <span className="font-medium text-foreground">{Math.floor(readiness.details.pace.avg_pace_28d_sec_per_km / 60)}:{String(Math.round(readiness.details.pace.avg_pace_28d_sec_per_km % 60)).padStart(2, '0')}/km</span></p>
                      <p>Différence : <span className="font-medium text-foreground">{readiness.details.pace.diff_seconds > 0 ? '+' : ''}{Math.round(readiness.details.pace.diff_seconds)}s/km</span></p>
                      <p className="text-xs pt-1">
                        {readiness.details.pace.status === 'improving' && '🚀 Forme en hausse ! Allure améliorée de 10+ sec/km'}
                        {readiness.details.pace.status === 'stable' && '✅ Allure stable (±5 sec/km)'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                    <XCircle className="h-4 w-4 inline mr-2" />
                    Données d'allure indisponibles
                  </div>
                )}

                {/* Critères non implémentés */}
                <div className="border border-dashed rounded-lg p-4 space-y-2 opacity-50">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">FC repos (non disponible)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nécessite Apple Watch portée la nuit
                  </p>
                </div>

                <div className="border border-dashed rounded-lg p-4 space-y-2 opacity-50">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Séances manquées (non disponible)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nécessite un plan d'entraînement actif
                  </p>
                </div>
              </div>

              {/* Note explicative */}
              <div className="bg-muted/30 rounded-lg p-4 text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">💡 Comment le score est calculé</p>
                <p>Le score de forme part de 100 points et applique des pénalités selon les facteurs de fatigue détectés, puis ajoute des bonus si tu es en progression.</p>
                <p className="pt-2">
                  <span className="font-semibold">Calcul :</span> 100 - Pénalités (volume + récupération) + Bonus (allure)
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Volume 7j */}
        <Card className="col-span-3 row-span-1 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
            style={{
              background: 'var(--allure-gradient)',
              padding: '2px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude'
            }} />
          <CardContent className="p-5 h-full flex flex-col justify-between relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Volume 7j</p>
                <div className="text-3xl font-mono font-bold mt-1">{summary?.week_volume_km || 0} km</div>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.workout_count || 0} séances
            </p>
          </CardContent>
        </Card>

        {/* FC moyenne */}
        <Card className="col-span-3 row-span-1 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
            style={{
              background: 'var(--allure-gradient)',
              padding: '2px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude'
            }} />
          <CardContent className="p-5 h-full flex flex-col justify-between relative z-10">
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground">FC moyenne</p>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-mono font-bold">
              {summary?.avg_heart_rate ? `${summary.avg_heart_rate}` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">bpm</p>
          </CardContent>
        </Card>

        {/* Charge */}
        <Card className="col-span-3 row-span-1 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
            style={{
              background: 'var(--allure-gradient)',
              padding: '2px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude'
            }} />
          <CardContent className="p-5 h-full flex flex-col justify-between relative z-10">
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground">Charge</p>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-3xl font-mono font-bold mb-1">
                {trainingLoad?.ratio?.toFixed(2) || 'N/A'}
              </div>
              {(() => {
                const message = getLoadMessage(trainingLoad?.ratio || null)
                return (
                  <div className={cn("flex items-center gap-1.5 text-xs font-medium", message.color)}>
                    <span className="text-sm">{message.icon}</span>
                    <span className="truncate">{message.text}</span>
                  </div>
                )
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Shoe Alerts */}
        {alertsCount > 0 && (
          <Link href="/settings" className="col-span-3 row-span-1">
            <Card className="h-full hover:shadow-lg transition-all duration-300 relative overflow-hidden group cursor-pointer">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                style={{
                  background: 'var(--allure-gradient)',
                  padding: '2px',
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude'
                }} />
              <CardContent className="p-5 h-full flex flex-col justify-between relative z-10">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground">Chaussures</p>
                  <Footprints className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <span className="text-3xl font-bold">{alertsCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                    <span className="truncate">
                      {alertsCount === 1 ? 'Paire à surveiller' : 'Paires à surveiller'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Total - Second Row */}
        <Card className="col-span-6 row-span-1 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
            style={{
              background: 'var(--allure-gradient)',
              padding: '2px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude'
            }} />
          <CardContent className="p-5 h-full flex flex-row items-center justify-between relative z-10">
            <div>
              <p className="text-sm text-muted-foreground">Total carrière</p>
              <div className="text-4xl font-mono font-bold mt-1">{summary?.total_all_time_km || 0} km</div>
            </div>
            <div className="text-right">
              <TrendingUp className="h-5 w-5 text-muted-foreground mb-2 ml-auto" />
              <p className="text-xs text-muted-foreground">
                {summary?.total_workouts || 0} séances
              </p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Weekly Recap Section */}
      {!recapLoading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="text-2xl font-serif font-bold">Récap hebdomadaire</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateRecap()}
              className="gap-2"
              disabled={recapLoading}
            >
              <Sparkles className="h-4 w-4" />
              {latestRecap ? 'Générer nouveau' : 'Générer le récap'}
            </Button>
          </div>
          {latestRecap ? (
            <WeeklyRecapCard
              recap={latestRecap}
              onMarkAsViewed={markAsViewed}
              showMetrics={true}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Sparkles className="h-12 w-12 text-muted-foreground opacity-50" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Aucun récap disponible</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Générez votre premier récap hebdomadaire pour voir vos progrès
                    </p>
                    <Button
                      onClick={() => generateRecap()}
                      className="gap-2"
                      disabled={recapLoading}
                    >
                      <Sparkles className="h-4 w-4" />
                      Générer mon récap
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Full Width Charts */}
      <div className="space-y-6">
        {/* Volume History */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-serif font-bold">Évolution du volume</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {volumeHistory.length > 0 ? (
              <VolumeChart data={volumeHistory} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cardiac Efficiency */}
        <CardiacEfficiency data={efficiencyData} />
      </div>
    </div>
  )
}
