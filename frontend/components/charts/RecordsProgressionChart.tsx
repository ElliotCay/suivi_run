'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RecordEntry {
  date: string
  time_seconds: number
  distance_km: number
  pace_per_km: string
}

interface RecordsProgressionChartProps {
  records: Record<string, RecordEntry[]>
}

// Formule de Riegel pour prédire les performances : T2 = T1 * (D2/D1)^1.06
const riegelPrediction = (timeSeconds: number, fromDistance: number, toDistance: number): number => {
  return timeSeconds * Math.pow(toDistance / fromDistance, 1.06)
}

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export default function RecordsProgressionChart({ records }: RecordsProgressionChartProps) {
  const distances = [5, 10, 21.1, 42.2]
  const distanceLabels: Record<number, string> = {
    5: '5km',
    10: '10km',
    21.1: 'Semi',
    42.2: 'Marathon'
  }

  // Préparer les données pour le graphique
  const chartData: Array<{
    date: string
    [key: string]: string | number
  }> = []

  const allDates = new Set<string>()
  Object.values(records).forEach(distanceRecords => {
    distanceRecords.forEach(record => allDates.add(record.date))
  })

  const sortedDates = Array.from(allDates).sort()

  sortedDates.forEach(date => {
    const dataPoint: { date: string; [key: string]: string | number } = { date }

    distances.forEach(distance => {
      const distanceKey = distance.toString()
      const distanceRecords = records[distanceKey] || []
      const recordAtDate = distanceRecords.find(r => r.date === date)

      if (recordAtDate) {
        dataPoint[distanceLabels[distance]] = recordAtDate.time_seconds / 60 // Convertir en minutes
      }
    })

    if (Object.keys(dataPoint).length > 1) {
      chartData.push(dataPoint)
    }
  })

  const colors = {
    '5km': 'hsl(var(--chart-2))',
    '10km': 'hsl(var(--chart-1))',
    'Semi': 'hsl(var(--chart-3))',
    'Marathon': 'hsl(var(--chart-4))'
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{new Date(label).toLocaleDateString('fr-FR')}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatTime(entry.value * 60)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progression des Records</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
                className="text-xs"
              />
              <YAxis
                label={{ value: 'Temps (minutes)', angle: -90, position: 'insideLeft' }}
                tickFormatter={(value) => formatTime(value * 60)}
                className="text-xs"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {Object.entries(distanceLabels).map(([distance, label]) => (
                <Line
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={colors[label as keyof typeof colors]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                  animationDuration={1000}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Aucun record disponible
          </div>
        )}
      </CardContent>
    </Card>
  )
}
