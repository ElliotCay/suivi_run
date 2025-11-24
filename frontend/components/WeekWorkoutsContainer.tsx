'use client'

import { memo, useState, useEffect, useCallback, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { DraggableWorkoutCard } from './DraggableWorkoutCard'
import { DraggableStrengtheningCard } from './DraggableStrengtheningCard'
import { Card, CardContent } from '@/components/ui/card'
import axios from 'axios'
import { toast } from 'sonner'

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

interface StrengtheningReminder {
  id: number
  scheduled_date: string
  day_of_week: string
  session_type: string
  title: string
  duration_minutes: number
  completed: boolean
}

export type TrainingSession =
  | ({ type: 'workout' } & PlannedWorkout)
  | ({ type: 'strengthening' } & StrengtheningReminder)

interface WeekWorkoutsContainerProps {
  weekNumber: number
  sessions: TrainingSession[]
  workoutTypeLabels: Record<string, string>
  workoutTypeColors: Record<string, string>
  strengtheningDetails: Record<string, string>
  onWorkoutsSwapped: () => void
  onCompleteWorkout: (id: number) => void
  onCompleteStrengthening: (id: number) => void
}

export const WeekWorkoutsContainer = memo(function WeekWorkoutsContainer({
  weekNumber,
  sessions,
  workoutTypeLabels,
  workoutTypeColors,
  strengtheningDetails,
  onWorkoutsSwapped,
  onCompleteWorkout,
  onCompleteStrengthening
}: WeekWorkoutsContainerProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)

  const api = useMemo(() => axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'
  }), [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  )

  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  const [items, setItems] = useState(sessions)

  // Sync local state when props change
  useEffect(() => {
    setItems(sessions)
  }, [sessions])

  const getDndId = (session: TrainingSession) =>
    session.type === 'workout' ? session.id : `strengthening-${session.id}`

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      return
    }

    // Find indices
    const oldIndex = items.findIndex(s => getDndId(s) == active.id)
    const newIndex = items.findIndex(s => getDndId(s) == over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const item1 = items[oldIndex]
    const item2 = items[newIndex]

    // Only allow swapping if BOTH are workouts
    if (item1.type !== 'workout' || item2.type !== 'workout') {
      // toast.info("Le réarrangement n'est possible qu'entre séances de course pour le moment")
      return
    }

    // Optimistic update: Swap dates and re-sort
    const workout1 = { ...item1 }
    const workout2 = { ...item2 }

    // Swap dates and days
    const tempDate = workout1.scheduled_date
    const tempDay = workout1.day_of_week

    workout1.scheduled_date = workout2.scheduled_date
    workout1.day_of_week = workout2.day_of_week

    workout2.scheduled_date = tempDate
    workout2.day_of_week = tempDay

    // Create new array with updated workouts
    const newItems = [...items]
    newItems[oldIndex] = workout1
    newItems[newIndex] = workout2

    // Sort by date to maintain chronological order
    newItems.sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())

    setItems(newItems)

    // Don't swap if one is completed
    if (workout1.status === 'completed' || workout2.status === 'completed') {
      toast.error("Impossible d'échanger une séance déjà complétée")
      // Revert optimistic update
      setItems(items)
      return
    }

    try {
      await api.post('/api/training/swap-workout-dates', {
        workout_1_id: workout1.id,
        workout_2_id: workout2.id
      })
      toast.success(`📅 Séances échangées : ${workout1.workout_type} ↔ ${workout2.workout_type}`)
      onWorkoutsSwapped?.()
    } catch (error: any) {
      console.error('Error swapping workouts:', error)
      const errorMsg = error?.response?.data?.detail || 'Erreur lors de l\'échange'
      toast.error(errorMsg)
      // Revert on error
      setItems(items)
    }
  }, [api, items, onWorkoutsSwapped])

  const activeSession = items.find(s => getDndId(s) == activeId)

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(getDndId)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((session) => (
            session.type === 'workout' ? (
              <DraggableWorkoutCard
                key={session.id}
                workout={session}
                workoutTypeLabels={workoutTypeLabels}
                workoutTypeColors={workoutTypeColors}
                onExpandToggle={() => toggleExpanded(session.id.toString())}
                isExpanded={expandedItems.has(session.id.toString())}
                onComplete={onCompleteWorkout}
              />
            ) : (
              <DraggableStrengtheningCard
                key={`strengthening-${session.id}`}
                reminder={session}
                onExpandToggle={() => toggleExpanded(`strengthening-${session.id}`)}
                isExpanded={expandedItems.has(`strengthening-${session.id}`)}
                onComplete={onCompleteStrengthening}
                details={strengtheningDetails[session.session_type] || "Routine personnalisée"}
              />
            )
          ))}
        </SortableContext>

        <DragOverlay>
          {activeSession && (
            <div className="shadow-2xl">
              {activeSession.type === 'workout' ? (
                <DraggableWorkoutCard
                  workout={activeSession}
                  workoutTypeLabels={workoutTypeLabels}
                  workoutTypeColors={workoutTypeColors}
                  onExpandToggle={() => { }}
                  isExpanded={false}
                  onComplete={() => { }}
                />
              ) : (
                <DraggableStrengtheningCard
                  reminder={activeSession}
                  onExpandToggle={() => { }}
                  isExpanded={false}
                  onComplete={() => { }}
                  details={strengtheningDetails[activeSession.session_type] || "Routine personnalisée"}
                />
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {items.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="text-sm text-muted-foreground text-center py-8">
            Aucune séance prévue cette semaine
          </CardContent>
        </Card>
      )}
    </div>
  )
})
