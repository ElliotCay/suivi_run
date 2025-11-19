'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useMemo } from 'react'

interface EfficiencyData {
  date: string
  avg_heart_rate: number
  avg_pace: number
  workout_type: string
}

interface CardiacEfficiencyProps {
  data: EfficiencyData[]
}

const formatPace = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// Calculer la ligne de tendance (régression linéaire)
const calculateTrendLine = (data: Array<{ x: number; y: number }>) => {
  if (data.length < 2) return null

  const n = data.length
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0

  data.forEach((point, idx) => {
    const x = idx // utiliser l'index comme position temporelle
    const y = point.y
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  })

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  return { slope, intercept }
}

export default function CardiacEfficiency({ data }: CardiacEfficiencyProps) {
  // Transformer les données pour le graphe
  const chartData = useMemo(() => {
    return data.map((d, idx) => ({
      date: d.date,
      dateLabel: formatDate(d.date),
      hr: d.avg_heart_rate,
      pace: d.avg_pace,
      index: idx
    }))
  }, [data])

  // Calculer la tendance
  const trend = useMemo(() => {
    if (chartData.length < 3) return null

    const trendData = chartData.map((d, idx) => ({ x: idx, y: d.hr }))
    const trendLine = calculateTrendLine(trendData)

    if (!trendLine) return null

    // Calculer la tendance en bpm/séance
    const firstValue = trendLine.intercept
    const lastValue = trendLine.slope * (chartData.length - 1) + trendLine.intercept
    const totalChange = lastValue - firstValue
    const avgChangePerSession = totalChange / chartData.length

    return {
      slope: trendLine.slope,
      intercept: trendLine.intercept,
      direction: avgChangePerSession < -0.5 ? 'improving' : avgChangePerSession > 0.5 ? 'declining' : 'stable',
      changePerSession: avgChangePerSession
    }
  }, [chartData])

  // Données de la ligne de tendance
  const trendLineData = useMemo(() => {
    if (!trend || chartData.length === 0) return []

    return chartData.map((d, idx) => ({
      ...d,
      trendHr: trend.slope * idx + trend.intercept
    }))
  }, [trend, chartData])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{new Date(data.date).toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
          })}</p>
          <p className="text-sm">FC moyenne: <span className="font-semibold">{data.hr} bpm</span></p>
          <p className="text-sm">Allure: <span className="font-semibold">{formatPace(data.pace)}/km</span></p>
        </div>
      )
    }
    return null
  }

  // Calcul des moyennes pour les 4 premières et 4 dernières séances
  const earlyAvgHR = useMemo(() => {
    if (chartData.length < 4) return null
    const early = chartData.slice(0, 4)
    return early.reduce((sum, d) => sum + d.hr, 0) / early.length
  }, [chartData])

  const recentAvgHR = useMemo(() => {
    if (chartData.length < 4) return null
    const recent = chartData.slice(-4)
    return recent.reduce((sum, d) => sum + d.hr, 0) / recent.length
  }, [chartData])

  const improvement = earlyAvgHR && recentAvgHR ? earlyAvgHR - recentAvgHR : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Efficience Cardiaque</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Fréquence cardiaque moyenne lors des séances d'endurance (facile/longue)
            </p>
          </div>

          {/* Indicateur de tendance */}
          {trend && chartData.length >= 3 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              trend.direction === 'improving'
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                : trend.direction === 'declining'
                ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
                : 'bg-muted/50 border-border'
            }`}>
              {trend.direction === 'improving' && (
                <>
                  <TrendingDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div className="text-sm">
                    <p className="font-semibold text-green-700 dark:text-green-400">Progression ✓</p>
                    <p className="text-xs text-green-600 dark:text-green-500">
                      {Math.abs(trend.changePerSession).toFixed(1)} bpm/séance
                    </p>
                  </div>
                </>
              )}
              {trend.direction === 'declining' && (
                <>
                  <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <div className="text-sm">
                    <p className="font-semibold text-orange-700 dark:text-orange-400">Attention</p>
                    <p className="text-xs text-orange-600 dark:text-orange-500">
                      +{Math.abs(trend.changePerSession).toFixed(1)} bpm/séance
                    </p>
                  </div>
                </>
              )}
              {trend.direction === 'stable' && (
                <>
                  <Minus className="h-5 w-5 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="font-semibold">Stable</p>
                    <p className="text-xs text-muted-foreground">±{Math.abs(trend.changePerSession).toFixed(1)} bpm</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={trendLineData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  label={{ value: 'FC moyenne (bpm)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {/* Ligne de tendance */}
                {trend && (
                  <Line
                    type="monotone"
                    dataKey="trendHr"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Tendance"
                    opacity={0.6}
                  />
                )}

                {/* Données réelles */}
                <Line
                  type="monotone"
                  dataKey="hr"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'hsl(var(--chart-1))' }}
                  activeDot={{ r: 6 }}
                  name="FC moyenne"
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Statistiques de progression */}
            {improvement !== null && chartData.length >= 8 && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium mb-2">📊 Analyse de progression</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">4 premières séances</p>
                    <p className="text-lg font-semibold">{earlyAvgHR?.toFixed(0)} bpm</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">4 dernières séances</p>
                    <p className="text-lg font-semibold">{recentAvgHR?.toFixed(0)} bpm</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Évolution</p>
                    <p className={`text-lg font-semibold ${
                      improvement > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                    }`}>
                      {improvement > 0 ? '-' : '+'}{Math.abs(improvement).toFixed(0)} bpm
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  💡 {improvement > 3
                    ? 'Excellente progression ! Ton système cardiovasculaire s\'adapte bien à l\'entraînement.'
                    : improvement > 0
                    ? 'Bonne progression. Continue à respecter tes allures d\'endurance.'
                    : improvement > -3
                    ? 'Stabilité normale. Assure-toi de bien récupérer entre les séances.'
                    : 'Attention à la fatigue. Envisage une semaine de récupération active.'}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg">Aucune donnée d'efficience disponible</p>
              <p className="text-sm">
                Effectue des séances d'endurance (facile/longue) avec cardio-fréquencemètre pour voir ce graphe
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
