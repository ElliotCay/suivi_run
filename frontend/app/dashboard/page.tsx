'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import VolumeChart from '@/components/VolumeChart'
import RecordsProgressionChart from '@/components/charts/RecordsProgressionChart'
import ActivityHeatmap from '@/components/charts/ActivityHeatmap'
import WorkoutTypeDistribution from '@/components/charts/WorkoutTypeDistribution'
import PaceHeartRateScatter from '@/components/charts/PaceHeartRateScatter'
import axios from 'axios'
import { Activity, Calendar, Heart, TrendingUp, Zap } from 'lucide-react'

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

interface RecordEntry {
  date: string
  time_seconds: number
  distance_km: number
  pace_per_km: string
}

interface PaceHRData {
  pace_seconds_per_km: number
  avg_heart_rate: number
  date: string
  workout_type: string
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [volumeHistory, setVolumeHistory] = useState<VolumeData[]>([])
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutTypeData[]>([])
  const [trainingLoad, setTrainingLoad] = useState<TrainingLoad | null>(null)
  const [records, setRecords] = useState<Record<string, RecordEntry[]>>({})
  const [activityHeatmap, setActivityHeatmap] = useState<any[]>([])
  const [paceHRData, setPaceHRData] = useState<PaceHRData[]>([])
  const [loading, setLoading] = useState(true)

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
        recordsRes,
        workoutsRes
      ] = await Promise.all([
        axios.get('http://localhost:8000/api/dashboard/summary'),
        axios.get('http://localhost:8000/api/dashboard/volume-history?weeks=12'),
        axios.get('http://localhost:8000/api/dashboard/workout-types'),
        axios.get('http://localhost:8000/api/dashboard/training-load'),
        axios.get('http://localhost:8000/api/records?include_history=true'),
        axios.get('http://localhost:8000/api/workouts')
      ])

      setSummary(summaryRes.data)
      setVolumeHistory(volumeRes.data)
      setTrainingLoad(loadRes.data)

      // Process workout types with percentages
      const total = typesRes.data.reduce((sum: number, t: any) => sum + t.count, 0)
      const typesWithPercentage = typesRes.data.map((t: any) => ({
        ...t,
        percentage: total > 0 ? (t.count / total) * 100 : 0
      }))
      setWorkoutTypes(typesWithPercentage)

      // Process records for progression chart
      const recordsByDistance: Record<string, RecordEntry[]> = {}
      recordsRes.data.forEach((record: any) => {
        const distanceKey = record.distance.toString()
        if (!recordsByDistance[distanceKey]) {
          recordsByDistance[distanceKey] = []
        }
        recordsByDistance[distanceKey].push({
          date: record.date_achieved,
          time_seconds: record.time_seconds,
          distance_km: parseFloat(record.distance),
          pace_per_km: record.time_display
        })
      })
      setRecords(recordsByDistance)

      // Process workouts for heatmap (group by date)
      const workoutsByDate: Record<string, { distance: number; count: number }> = {}
      workoutsRes.data.forEach((workout: any) => {
        const dateKey = workout.date
        if (!workoutsByDate[dateKey]) {
          workoutsByDate[dateKey] = { distance: 0, count: 0 }
        }
        workoutsByDate[dateKey].distance += workout.distance || 0
        workoutsByDate[dateKey].count += 1
      })

      const heatmapData = Object.entries(workoutsByDate).map(([date, data]) => ({
        date,
        distance: data.distance,
        count: data.count
      }))
      setActivityHeatmap(heatmapData)

      // Process workouts for pace vs HR scatter
      const paceHRWorkouts = workoutsRes.data
        .filter((w: any) => w.avg_hr && w.pace_seconds_per_km)
        .map((w: any) => ({
          pace_seconds_per_km: w.pace_seconds_per_km,
          avg_heart_rate: w.avg_hr,
          date: w.date,
          workout_type: w.workout_type || 'non_defini'
        }))
      setPaceHRData(paceHRWorkouts)

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

  return (
    <div className="space-y-6">
      {/* Minimal Header */}
      <div className="space-y-2">
        <h1 className="text-6xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-base text-muted-foreground">
          Vue d'ensemble de votre entraînement
        </p>
      </div>

      {/* Key Metrics - Bento Grid (no gaps) */}
      <div className="grid grid-cols-12 gap-3 auto-rows-[120px]">
        {/* Volume 7j */}
        <Card className="col-span-4 row-span-1 hover:shadow-md transition-shadow">
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Volume 7j</p>
                <div className="text-4xl font-bold mt-1">{summary?.week_volume_km || 0} km</div>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.workout_count || 0} séances cette semaine
            </p>
          </CardContent>
        </Card>

        {/* FC moyenne */}
        <Card className="col-span-4 row-span-1 hover:shadow-md transition-shadow">
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground">FC moyenne</p>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">
              {summary?.avg_heart_rate ? `${summary.avg_heart_rate}` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">bpm</p>
          </CardContent>
        </Card>

        {/* Charge */}
        <Card className="col-span-4 row-span-1 hover:shadow-md transition-shadow">
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground">Charge</p>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">
              {trainingLoad?.ratio?.toFixed(2) || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Ratio 7j/28j</p>
          </CardContent>
        </Card>

        {/* Total - Full Width */}
        <Card className="col-span-12 row-span-1 hover:shadow-md transition-shadow">
          <CardContent className="p-4 h-full flex flex-row items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total carrière</p>
              <div className="text-4xl font-bold mt-1">{summary?.total_all_time_km || 0} km</div>
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

      {/* Full Width Charts */}
      <div className="space-y-4">
        {/* Volume History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Évolution du volume</CardTitle>
          </CardHeader>
          <CardContent>
            {volumeHistory.length > 0 ? (
              <VolumeChart data={volumeHistory} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Heatmap */}
        <ActivityHeatmap data={activityHeatmap} />

        {/* Records Progression */}
        <RecordsProgressionChart records={records} />

        {/* Pace vs HR Scatter */}
        <PaceHeartRateScatter data={paceHRData} />
      </div>
    </div>
  )
}
