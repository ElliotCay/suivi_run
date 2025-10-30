'use client'

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PaceHRData {
  pace_seconds_per_km: number
  avg_heart_rate: number
  date: string
  workout_type: string
}

interface PaceHeartRateScatterProps {
  data: PaceHRData[]
}

const formatPace = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Fonction pour calculer la ligne de tendance (régression linéaire simple)
const calculateTrendLine = (data: PaceHRData[]) => {
  if (data.length < 2) return null

  const n = data.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  data.forEach(point => {
    const x = point.pace_seconds_per_km
    const y = point.avg_heart_rate
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  })

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  return { slope, intercept }
}

export default function PaceHeartRateScatter({ data }: PaceHeartRateScatterProps) {
  // Filtrer les séances d'endurance uniquement (exclure VMA et seuil)
  const enduranceData = data.filter(d =>
    d.workout_type === 'facile' || d.workout_type === 'longue'
  )

  const chartData = enduranceData.map(d => ({
    x: d.pace_seconds_per_km,
    y: d.avg_heart_rate,
    date: d.date,
    type: d.workout_type
  }))

  const trendLine = calculateTrendLine(enduranceData)

  // Calculer les valeurs min et max pour la ligne de tendance
  let trendLineData: Array<{ x: number; y: number }> = []
  if (trendLine && chartData.length > 0) {
    const minPace = Math.min(...chartData.map(d => d.x))
    const maxPace = Math.max(...chartData.map(d => d.x))

    trendLineData = [
      { x: minPace, y: trendLine.slope * minPace + trendLine.intercept },
      { x: maxPace, y: trendLine.slope * maxPace + trendLine.intercept }
    ]
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{new Date(data.date).toLocaleDateString('fr-FR')}</p>
          <p className="text-sm">Allure: {formatPace(data.x)}/km</p>
          <p className="text-sm">FC: {data.y} bpm</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allure vs Fréquence Cardiaque</CardTitle>
        <p className="text-sm text-muted-foreground">
          Séances d'endurance uniquement - Une tendance descendante indique une amélioration de l'efficience
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                dataKey="x"
                name="Allure"
                domain={['auto', 'auto']}
                tickFormatter={(value) => formatPace(value)}
                label={{ value: 'Allure (min/km)', position: 'insideBottom', offset: -10 }}
                reversed
              />
              <YAxis
                type="number"
                dataKey="y"
                name="FC"
                domain={['auto', 'auto']}
                label={{ value: 'FC (bpm)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter
                name="Séances"
                data={chartData}
                fill="hsl(var(--chart-1))"
                fillOpacity={0.6}
                animationDuration={800}
              />
              {trendLineData.length > 0 && (
                <Scatter
                  name="Tendance"
                  data={trendLineData}
                  fill="hsl(var(--chart-4))"
                  line={{ stroke: 'hsl(var(--chart-4))', strokeWidth: 2 }}
                  shape={<></>}
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Aucune donnée de séance d'endurance avec FC disponible
          </div>
        )}
      </CardContent>
    </Card>
  )
}
