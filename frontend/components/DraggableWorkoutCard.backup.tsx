'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, Calendar } from 'lucide-react'
import { formatPace } from '@/lib/utils'

interface PlannedWorkout {
  id: number
  scheduled_date: string
  week_number: number
  day_of_week: string
  workout_type: string
  distance_km: number | null
  duration_minutes: number | null
  title: string
  description: string
  target_pace_min: number | null
  target_pace_max: number | null
  status: string
  completed_workout_id: number | null
}

interface DraggableWorkoutCardProps {
  workout: PlannedWorkout
  workoutTypeLabels: Record<string, string>
  workoutTypeColors: Record<string, string>
  onExpandToggle: (id: number) => void
  isExpanded: boolean
  onComplete: (id: number) => void
}

export function DraggableWorkoutCard({
  workout,
  workoutTypeLabels,
  onExpandToggle,
  isExpanded,
  onComplete
}: DraggableWorkoutCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: workout.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    })
  }

  // Map workout types to colors for the vertical bar
  const getBarColor = (type: string) => {
    switch (type) {
      case 'easy': return 'bg-emerald-500'
      case 'threshold': return 'bg-orange-500'
      case 'interval': return 'bg-red-500'
      case 'long': return 'bg-blue-500'
      case 'recovery': return 'bg-slate-400'
      case 'strengthening': return 'bg-purple-500'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="touch-none group"
    >
      <div
        {...attributes}
        {...listeners}
        className={`
          relative mb-4 overflow-hidden rounded-xl bg-card transition-all duration-300
          border border-border/50
          ${isDragging ? 'shadow-2xl scale-[1.02] cursor-grabbing z-50' : 'cursor-grab hover:shadow-lg'}
          group-hover:border-transparent
        `}
      >
        {/* Dashboard-style Gradient Border on Hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"
          style={{
            background: 'var(--allure-gradient)',
            padding: '2px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude'
          }}
        />

        {/* Vertical Color Bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${getBarColor(workout.workout_type)}`} />

        <CardContent className="p-4 pl-5">
          <div className="flex items-start gap-4">
            {/* Workout Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className={`flex-1 ${workout.status === 'completed' ? 'opacity-50 grayscale' : ''}`}>
                  <div className="flex items-center gap-3 mb-1">
                    {workout.status === 'completed' ? (
                      <button disabled className="cursor-default">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      </button>
                    ) : (
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          onComplete(workout.id)
                        }}
                        className="hover:scale-110 transition-transform cursor-pointer group/btn"
                        title="Valider la séance"
                      >
                        <Circle className="h-5 w-5 text-muted-foreground group-hover/btn:text-emerald-600 transition-colors" />
                      </button>
                    )}
                    <h4 className="font-bold text-lg tracking-tight truncate">
                      {workout.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(workout.scheduled_date)}</span>
                    <span className="text-border">•</span>
                    <span>{workoutTypeLabels[workout.workout_type] || workout.workout_type}</span>
                  </div>
                </div>
              </div>

              {/* Metrics - Monospace */}
              <div className={`flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm ${workout.status === 'completed' ? 'opacity-50' : ''}`}>
                {workout.distance_km && (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Dist</span>
                    <span className="font-mono font-medium text-foreground">{workout.distance_km.toFixed(1)} <span className="text-xs text-muted-foreground">km</span></span>
                  </div>
                )}
                {workout.duration_minutes && (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Durée</span>
                    <span className="font-mono font-medium text-foreground">{workout.duration_minutes} <span className="text-xs text-muted-foreground">min</span></span>
                  </div>
                )}
                {workout.target_pace_min && workout.target_pace_max && (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Allure</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatPace(workout.target_pace_min)}-{formatPace(workout.target_pace_max)}
                    </span>
                  </div>
                )}
              </div>

              {/* Expand button for description */}
              {workout.description && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    onExpandToggle(workout.id)
                  }}
                  className="mt-3 h-auto p-0 text-xs text-muted-foreground hover:text-foreground cursor-pointer font-medium"
                >
                  {isExpanded ? 'Masquer les détails' : 'Voir les détails'}
                </Button>
              )}

              {/* Description (expanded) */}
              {isExpanded && workout.description && (
                <div className="mt-3 p-4 bg-muted/50 rounded-lg text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap border border-border/50">
                  {workout.description}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  )
}
