'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface StrengtheningReminder {
    id: number
    scheduled_date: string
    day_of_week: string
    session_type: string
    title: string
    duration_minutes: number
    completed: boolean
}

interface DraggableStrengtheningCardProps {
    reminder: StrengtheningReminder
    onExpandToggle: (id: number) => void
    isExpanded: boolean
    onComplete: (id: number) => void
    details: string
}

export function DraggableStrengtheningCard({
    reminder,
    onExpandToggle,
    isExpanded,
    onComplete,
    details
}: DraggableStrengtheningCardProps) {
    // We use a string ID for dnd-kit to avoid collisions with workouts if they happen to share IDs
    const dndId = `strengthening-${reminder.id}`

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: dndId })

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

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="touch-none group"
        >
            <motion.div
                layout
                {...attributes}
                {...listeners}
                onClick={() => onExpandToggle(reminder.id)}
                className={`
          relative mb-3 overflow-hidden rounded-lg transition-all duration-300
          border border-white/10
          bg-muted/30 backdrop-blur-sm
          ${isDragging ? 'opacity-0' : 'cursor-pointer hover:bg-muted/50'}
          group-hover:border-white/20
        `}
            >
                {/* Vertical Color Bar - Gray/Muted for reinforcement */}
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-slate-400/50" />

                <CardContent className="p-3 pl-4 pr-12">
                    <div className="flex items-center justify-between gap-3">
                        {/* Left side: Icon + Title + Date */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`flex-shrink-0 ${reminder.completed ? 'opacity-50 grayscale' : ''}`}>
                                {reminder.completed ? (
                                    <button disabled className="cursor-default">
                                        <CheckCircle className="h-4 w-4 text-slate-500" />
                                    </button>
                                ) : (
                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onComplete(reminder.id)
                                        }}
                                        className="hover:scale-110 transition-transform cursor-pointer group/btn"
                                        title="Valider le renforcement"
                                    >
                                        <Circle className="h-4 w-4 text-slate-400 group-hover/btn:text-slate-600 transition-colors" />
                                    </button>
                                )}
                            </div>

                            <div className={`flex flex-col min-w-0 ${reminder.completed ? 'opacity-50' : ''}`}>
                                <div className="flex items-baseline gap-2">
                                    <h4 className="font-medium text-sm truncate text-foreground/80">
                                        {reminder.title}
                                    </h4>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {reminder.duration_minutes} min
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(reminder.scheduled_date)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right side: Expand button (fixed top position) */}
                        <div className="absolute right-4 top-4 text-muted-foreground/50">
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                    </div>

                    {/* Details (expanded) */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-3 p-4 bg-muted/50 rounded-lg text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap border border-white/5">
                                    {details}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </motion.div>
        </div>
    )
}
