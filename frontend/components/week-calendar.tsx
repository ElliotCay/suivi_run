"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrainingWeek, TrainingSession } from "@/lib/api/training-plans"
import { CheckCircle2, Circle, XCircle } from "lucide-react"

interface WeekCalendarProps {
  week: TrainingWeek
  onSessionClick: (session: TrainingSession) => void
}

export function WeekCalendar({ week, onSessionClick }: WeekCalendarProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "missed":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "scheduled":
      default:
        return <Circle className="h-4 w-4 text-blue-600" />
    }
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "base":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "build":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "peak":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "taper":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case "base":
        return "Base"
      case "build":
        return "Build"
      case "peak":
        return "Peak"
      case "taper":
        return "Taper"
      default:
        return phase
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Semaine {week.week_number}</CardTitle>
          <Badge className={getPhaseColor(week.phase)}>
            {getPhaseLabel(week.phase)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {week.sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSessionClick(session)}
            className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getStatusIcon(session.status)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{session.session_type}</span>
                  {session.distance && (
                    <span className="text-sm text-muted-foreground">
                      {session.distance} km
                    </span>
                  )}
                </div>
                {session.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {session.description}
                  </p>
                )}
                {session.scheduled_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(session.scheduled_date).toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}

        {week.sessions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune séance pour cette semaine
          </p>
        )}
      </CardContent>
    </Card>
  )
}
