'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import VolumeChart from '@/components/VolumeChart'
import axios from 'axios'
import { Activity, Calendar, Heart, TrendingUp } from 'lucide-react'

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
}

interface PaceByType {
  workout_type: string
  avg_pace_seconds_per_km: number
  avg_pace_display: string
  min_pace_seconds_per_km: number
  max_pace_seconds_per_km: number
  workout_count: number
}

interface PaceProgression {
  workout_type: string
  progression: Array<{
    week: string
    avg_pace_seconds_per_km: number
    workout_count: number
  }>
}

interface TrainingLoad {
  acute_load_km: number
  chronic_load_km: number
  ratio: number | null
  status: string
  last_7_days_count: number
  last_28_days_count: number
}

interface VolumeAlert {
  current_week_km: number
  previous_week_km: number
  progression_percent: number | null
  alert: boolean
  status: string
  message: string
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [volumeHistory, setVolumeHistory] = useState<VolumeData[]>([])
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutTypeData[]>([])
  const [paceByType, setPaceByType] = useState<PaceByType[]>([])
  const [paceProgression, setPaceProgression] = useState<PaceProgression[]>([])
  const [trainingLoad, setTrainingLoad] = useState<TrainingLoad | null>(null)
  const [volumeAlert, setVolumeAlert] = useState<VolumeAlert | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [summaryRes, volumeRes, typesRes, paceRes, progressionRes, loadRes, alertRes] = await Promise.all([
        axios.get('http://localhost:8000/api/dashboard/summary'),
        axios.get('http://localhost:8000/api/dashboard/volume-history?weeks=8'),
        axios.get('http://localhost:8000/api/dashboard/workout-types'),
        axios.get('http://localhost:8000/api/dashboard/pace-by-type'),
        axios.get('http://localhost:8000/api/dashboard/pace-progression-by-type?weeks=8'),
        axios.get('http://localhost:8000/api/dashboard/training-load'),
        axios.get('http://localhost:8000/api/dashboard/volume-progression-alert')
      ])

      setSummary(summaryRes.data)
      setVolumeHistory(volumeRes.data)
      setWorkoutTypes(typesRes.data)
      setPaceByType(paceRes.data)
      setPaceProgression(progressionRes.data)
      setTrainingLoad(loadRes.data)
      setVolumeAlert(alertRes.data)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto py-8">Chargement...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Tableau de bord</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume cette semaine</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.week_volume_km || 0} km</div>
            <p className="text-xs text-muted-foreground">
              {summary?.workout_count || 0} séances
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FC moyenne</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.avg_heart_rate ? `${summary.avg_heart_rate} bpm` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Semaine du {summary?.week_start && new Date(summary.week_start).toLocaleDateString('fr-FR')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total kilométrage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_all_time_km || 0} km</div>
            <p className="text-xs text-muted-foreground">
              Depuis le début
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total séances</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_workouts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Toutes périodes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Volume History Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Évolution du volume hebdomadaire (8 dernières semaines)</CardTitle>
        </CardHeader>
        <CardContent>
          {volumeHistory.length > 0 ? (
            <VolumeChart data={volumeHistory} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Aucune donnée disponible
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pace by Workout Type */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Allure moyenne par type de séance</CardTitle>
        </CardHeader>
        <CardContent>
          {paceByType.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {paceByType.map((pace) => {
                const typeLabels: Record<string, string> = {
                  'facile': 'Sortie facile',
                  'tempo': 'Tempo',
                  'fractionne': 'Fractionné',
                  'longue': 'Sortie longue'
                }

                const typeColors: Record<string, string> = {
                  'facile': 'text-green-600',
                  'tempo': 'text-orange-600',
                  'fractionne': 'text-red-600',
                  'longue': 'text-blue-600'
                }

                return (
                  <div
                    key={pace.workout_type}
                    className="p-4 border rounded-lg"
                  >
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      {typeLabels[pace.workout_type] || pace.workout_type}
                    </div>
                    <div className={`text-3xl font-bold mb-1 ${typeColors[pace.workout_type] || 'text-gray-600'}`}>
                      {pace.avg_pace_display}/km
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pace.workout_count} séance{pace.workout_count > 1 ? 's' : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Aucune donnée disponible
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pace Progression by Type */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Progression de l'allure par type de séance</CardTitle>
        </CardHeader>
        <CardContent>
          {paceProgression.length > 0 ? (
            <div className="space-y-6">
              {paceProgression.map((prog) => {
                const typeLabels: Record<string, string> = {
                  'facile': 'Sortie facile',
                  'tempo': 'Tempo',
                  'fractionne': 'Fractionné',
                  'longue': 'Sortie longue'
                }

                const formatPace = (seconds: number) => {
                  const minutes = Math.floor(seconds / 60)
                  const secs = Math.floor(seconds % 60)
                  return `${minutes}:${secs.toString().padStart(2, '0')}`
                }

                // Calculate trend
                const firstPace = prog.progression[0]?.avg_pace_seconds_per_km
                const lastPace = prog.progression[prog.progression.length - 1]?.avg_pace_seconds_per_km
                const trend = firstPace && lastPace ? ((lastPace - firstPace) / firstPace) * 100 : 0

                return (
                  <div key={prog.workout_type} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-medium mb-3">{typeLabels[prog.workout_type] || prog.workout_type}</h3>
                    <div className="flex items-center gap-4 flex-wrap">
                      {prog.progression.map((week) => (
                        <div key={week.week} className="text-center">
                          <div className="text-xs text-muted-foreground">{week.week}</div>
                          <div className="text-sm font-medium">{formatPace(week.avg_pace_seconds_per_km)}/km</div>
                          <div className="text-xs text-muted-foreground">{week.workout_count} séance{week.workout_count > 1 ? 's' : ''}</div>
                        </div>
                      ))}
                    </div>
                    <div className={`text-sm mt-2 ${trend < 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {trend < 0 ? '↓' : '↑'} {Math.abs(trend).toFixed(1)}% sur la période
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Aucune donnée disponible
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Load & Volume Alert */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Training Load Card */}
        <Card>
          <CardHeader>
            <CardTitle>Charge d'entraînement (Ratio 7j/28j)</CardTitle>
          </CardHeader>
          <CardContent>
            {trainingLoad ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`text-5xl font-bold mb-2 ${
                    trainingLoad.status === 'optimal' ? 'text-green-600' :
                    trainingLoad.status === 'low' ? 'text-blue-600' :
                    trainingLoad.status === 'high_risk' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {trainingLoad.ratio?.toFixed(2) || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    {trainingLoad.status === 'optimal' && '✓ Zone optimale (0.8-1.3)'}
                    {trainingLoad.status === 'low' && '↓ Charge faible'}
                    {trainingLoad.status === 'high_risk' && '⚠️ Risque de blessure élevé'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Charge aigüe (7j)</div>
                    <div className="font-bold">{trainingLoad.acute_load_km} km</div>
                    <div className="text-xs text-muted-foreground">{trainingLoad.last_7_days_count} séances</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Charge chronique (28j)</div>
                    <div className="font-bold">{trainingLoad.chronic_load_km} km/sem</div>
                    <div className="text-xs text-muted-foreground">{trainingLoad.last_28_days_count} séances</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Volume Progression Alert Card */}
        <Card className={volumeAlert?.alert ? 'border-red-500 border-2' : ''}>
          <CardHeader>
            <CardTitle>Alerte progression volume hebdomadaire</CardTitle>
          </CardHeader>
          <CardContent>
            {volumeAlert ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  volumeAlert.alert ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                }`}>
                  <div className={`text-sm font-medium mb-2 ${volumeAlert.alert ? 'text-red-800' : 'text-green-800'}`}>
                    {volumeAlert.message}
                  </div>
                  {volumeAlert.alert && (
                    <div className="text-xs text-red-700">
                      La règle des 10% recommande d'augmenter progressivement le volume pour éviter les blessures.
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Cette semaine</div>
                    <div className="font-bold text-2xl">{volumeAlert.current_week_km} km</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Semaine dernière</div>
                    <div className="font-bold text-2xl">{volumeAlert.previous_week_km} km</div>
                  </div>
                </div>
                {volumeAlert.progression_percent !== null && (
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${
                      volumeAlert.progression_percent > 10 ? 'text-red-600' :
                      volumeAlert.progression_percent > 0 ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {volumeAlert.progression_percent > 0 ? '+' : ''}{volumeAlert.progression_percent}%
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workout Types Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition des types de séances</CardTitle>
        </CardHeader>
        <CardContent>
          {workoutTypes.length > 0 ? (
            <div className="space-y-4">
              {workoutTypes.map((type) => {
                const total = workoutTypes.reduce((sum, t) => sum + t.count, 0)
                const percentage = ((type.count / total) * 100).toFixed(1)

                const typeLabels: Record<string, string> = {
                  'facile': 'Sortie facile',
                  'tempo': 'Tempo',
                  'fractionne': 'Fractionné',
                  'longue': 'Sortie longue',
                  'non_defini': 'Non défini'
                }

                return (
                  <div key={type.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {typeLabels[type.type] || type.type}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {type.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Aucune donnée disponible
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
