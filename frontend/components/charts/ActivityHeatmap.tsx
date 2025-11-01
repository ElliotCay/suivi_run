'use client'

import { useState } from 'react'
import CalendarHeatmap from 'react-calendar-heatmap'
import 'react-calendar-heatmap/dist/styles.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ActivityDay {
  date: string
  count: number
  distance: number
}

interface ActivityHeatmapProps {
  data: ActivityDay[]
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())

  // Générer les années disponibles
  const availableYears = Array.from(new Set(data.map(d => new Date(d.date).getFullYear())))
    .sort((a, b) => b - a)

  // Filtrer les données par année
  const yearData = data.filter(d => new Date(d.date).getFullYear() === parseInt(selectedYear))

  // Préparer les données pour le heatmap
  const heatmapData = yearData.map(d => ({
    date: d.date,
    count: d.distance
  }))

  const startDate = new Date(parseInt(selectedYear), 0, 1)
  const endDate = new Date(parseInt(selectedYear), 11, 31)

  // Déterminer la valeur max pour le scaling
  const maxDistance = Math.max(...yearData.map(d => d.distance), 20)

  const getColorClass = (value: number | undefined) => {
    if (!value || value === 0) return 'color-empty'
    const intensity = Math.min((value / maxDistance) * 4, 4)

    if (intensity < 0.5) return 'color-scale-1'
    if (intensity < 1.5) return 'color-scale-2'
    if (intensity < 2.5) return 'color-scale-3'
    return 'color-scale-4'
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">Activité</CardTitle>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="w-full overflow-x-auto">
          <style jsx global>{`
            .react-calendar-heatmap {
              width: 100%;
            }

            .react-calendar-heatmap text {
              font-size: 10px;
              fill: hsl(var(--muted-foreground));
            }

            .react-calendar-heatmap .color-empty {
              fill: hsl(var(--muted) / 0.3);
            }

            .react-calendar-heatmap .color-scale-1 {
              fill: hsl(var(--chart-2) / 0.3);
            }

            .react-calendar-heatmap .color-scale-2 {
              fill: hsl(var(--chart-2) / 0.5);
            }

            .react-calendar-heatmap .color-scale-3 {
              fill: hsl(var(--chart-2) / 0.7);
            }

            .react-calendar-heatmap .color-scale-4 {
              fill: hsl(var(--chart-2));
            }

            .react-calendar-heatmap rect:hover {
              stroke: hsl(var(--foreground));
              stroke-width: 2;
            }
          `}</style>
          <CalendarHeatmap
            startDate={startDate}
            endDate={endDate}
            values={heatmapData}
            classForValue={(value) => {
              if (!value) return 'color-empty'
              return getColorClass(value.count)
            }}
            showWeekdayLabels
          />
        </div>
        <div className="flex items-center justify-end gap-2 mt-2 text-xs text-muted-foreground">
          <span>Moins</span>
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(var(--muted) / 0.3)' }}></div>
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-2) / 0.3)' }}></div>
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-2) / 0.5)' }}></div>
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-2) / 0.7)' }}></div>
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-2))' }}></div>
          </div>
          <span>Plus</span>
        </div>
      </CardContent>
    </Card>
  )
}
