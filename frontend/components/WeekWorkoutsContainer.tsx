'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { DraggableWorkoutCard } from './DraggableWorkoutCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface WeekWorkoutsContainerProps {
  weekNumber: number
  workouts: PlannedWorkout[]
  workoutTypeLabels: Record<string, string>
  workoutTypeColors: Record<string, string>
  onWorkoutsSwapped: () => void
  onComplete: (id: number) => void
}

export function WeekWorkoutsContainer({
  weekNumber,
  workouts,
  workoutTypeLabels,
  workoutTypeColors,
  onWorkoutsSwapped,
  onComplete
}: WeekWorkoutsContainerProps) {
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<number>>(new Set())
  const [activeId, setActiveId] = useState<number | null>(null)

  const toggleExpanded = (workoutId: number) => {
    setExpandedWorkouts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(workoutId)) {
        newSet.delete(workoutId)
      } else {
        newSet.add(workoutId)
      }
      return newSet
    })
  }

  const [items, setItems] = useState(workouts)

  // Sync local state when props change
  useEffect(() => {
    setItems(workouts)
  }, [workouts])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      return
    }

    // Find indices
    const oldIndex = items.findIndex(w => w.id === active.id)
    const newIndex = items.findIndex(w => w.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Optimistic update: Swap dates and re-sort
    const workout1 = { ...items[oldIndex] }
    const workout2 = { ...items[newIndex] }

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
      console.log('Swapping workouts:', workout1.id, workout2.id)
      const response = await axios.post('http://127.0.0.1:8000/api/training/swap-workout-dates', {
        workout_1_id: workout1.id,
        workout_2_id: workout2.id
      })
      console.log('Swap response:', response.data)

      toast.success(`📅 Séances échangées : ${workout1.workout_type} ↔ ${workout2.workout_type}`)
      // Don't reload - the optimistic update is already applied
      // This prevents scrolling to top and unnecessary API calls
    } catch (error: any) {
      console.error('Error swapping workouts:', error)
      const errorMsg = error?.response?.data?.detail || 'Erreur lors de l\'échange'
      toast.error(errorMsg)
      // Revert on error
      setItems(items)
    }
  }

  const activeWorkout = workouts.find(w => w.id === activeId)

  return (
    <div className="space-y-4">
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(w => w.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((workout) => (
            <DraggableWorkoutCard
              key={workout.id}
              workout={workout}
              workoutTypeLabels={workoutTypeLabels}
              workoutTypeColors={workoutTypeColors}
              onExpandToggle={toggleExpanded}
              isExpanded={expandedWorkouts.has(workout.id)}
              onComplete={onComplete}
            />
          ))}
        </SortableContext>

        <DragOverlay>
          {activeWorkout && (
            <div className="shadow-2xl">
              <DraggableWorkoutCard
                workout={activeWorkout}
                workoutTypeLabels={workoutTypeLabels}
                workoutTypeColors={workoutTypeColors}
                onExpandToggle={() => { }}
                isExpanded={false}
                onComplete={() => { }}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {workouts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="text-sm text-muted-foreground text-center py-8">
            Aucune séance prévue cette semaine
          </CardContent>
        </Card>
      )}
    </div>
  )
}
