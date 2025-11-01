'use client'

import { motion } from 'framer-motion'
import { Award, TrendingUp, Calendar, Edit2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PRCardProps {
  distance: string
  distanceKm: number
  timeSeconds: number | null
  timeDisplay: string | null
  pace: string | null
  dateAchieved: string | null
  isNew?: boolean
  onEdit: () => void
  index: number
}

export default function PRCard({
  distance,
  distanceKm,
  timeSeconds,
  timeDisplay,
  pace,
  dateAchieved,
  isNew = false,
  onEdit,
  index
}: PRCardProps) {
  const hasRecord = timeSeconds !== null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-300",
        hasRecord
          ? "hover:shadow-xl hover:-translate-y-1 cursor-pointer border-green-200 dark:border-green-900"
          : "hover:shadow-md border-dashed"
      )}>
        {/* Gradient background for records */}
        {hasRecord && (
          <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-blue-50/50 dark:from-green-950/20 dark:to-blue-950/20" />
        )}

        {/* New PR Badge */}
        {isNew && hasRecord && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="absolute top-3 right-3 z-10"
          >
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
              <TrendingUp className="h-3 w-3 mr-1" />
              Nouveau !
            </Badge>
          </motion.div>
        )}

        <CardContent className="relative p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                hasRecord
                  ? "bg-gradient-to-br from-green-500 to-emerald-600"
                  : "bg-muted"
              )}>
                <Award className={cn(
                  "h-5 w-5",
                  hasRecord ? "text-white" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{distance}</h3>
                <p className="text-xs text-muted-foreground">{distanceKm} km</p>
              </div>
            </div>

            {hasRecord && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Time Display */}
          {hasRecord ? (
            <div className="space-y-3">
              {/* Main Time */}
              <div>
                <div className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {timeDisplay}
                </div>
              </div>

              {/* Pace */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm font-mono">
                  {pace}
                </Badge>
              </div>

              {/* Date */}
              {dateAchieved && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(dateAchieved).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">
                Aucun record
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="border-dashed"
              >
                Ajouter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
