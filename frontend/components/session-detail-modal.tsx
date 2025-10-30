"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrainingSession, updateTrainingSession } from "@/lib/api/training-plans"
import { CheckCircle2, Circle, XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface SessionDetailModalProps {
  session: TrainingSession | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSessionUpdated: () => void
  planId: number
}

export function SessionDetailModal({
  session,
  open,
  onOpenChange,
  onSessionUpdated,
  planId,
}: SessionDetailModalProps) {
  const [updating, setUpdating] = useState(false)

  if (!session) return null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "missed":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "scheduled":
      default:
        return <Circle className="h-5 w-5 text-blue-600" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Réalisée"
      case "missed":
        return "Manquée"
      case "scheduled":
      default:
        return "Planifiée"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "missed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "scheduled":
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    }
  }

  async function handleMarkCompleted() {
    if (!session) return
    try {
      setUpdating(true)
      await updateTrainingSession(planId, session.id, { status: "completed" })
      toast.success("Séance marquée comme réalisée !")
      onSessionUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update session:", error)
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setUpdating(false)
    }
  }

  async function handleMarkMissed() {
    if (!session) return
    try {
      setUpdating(true)
      await updateTrainingSession(planId, session.id, { status: "missed" })
      toast.success("Séance marquée comme manquée")
      onSessionUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update session:", error)
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setUpdating(false)
    }
  }

  async function handleMarkScheduled() {
    if (!session) return
    try {
      setUpdating(true)
      await updateTrainingSession(planId, session.id, { status: "scheduled" })
      toast.success("Séance marquée comme planifiée")
      onSessionUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update session:", error)
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon(session.status)}
            <DialogTitle className="text-2xl">{session.session_type}</DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(session.status)}>
              {getStatusLabel(session.status)}
            </Badge>
            {session.distance && (
              <Badge variant="outline">{session.distance} km</Badge>
            )}
            {session.scheduled_date && (
              <Badge variant="outline">
                {new Date(session.scheduled_date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {session.description && (
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-muted-foreground">{session.description}</p>
            </div>
          )}

          {session.structure && (
            <div>
              <h4 className="font-medium mb-2">Structure de la séance</h4>
              <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                {session.structure}
              </div>
            </div>
          )}

          {session.notes && (
            <div>
              <h4 className="font-medium mb-2">Notes</h4>
              <p className="text-sm text-muted-foreground">{session.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {session.status !== "completed" && (
            <Button
              onClick={handleMarkCompleted}
              disabled={updating}
              variant="default"
              className="w-full sm:w-auto"
            >
              {updating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Marquer comme faite
            </Button>
          )}

          {session.status !== "missed" && (
            <Button
              onClick={handleMarkMissed}
              disabled={updating}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              {updating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Marquer comme manquée
            </Button>
          )}

          {session.status !== "scheduled" && (
            <Button
              onClick={handleMarkScheduled}
              disabled={updating}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {updating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Circle className="mr-2 h-4 w-4" />
              )}
              Remettre en planifié
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
