'use client'

import { Calendar, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface CalendarExportButtonProps {
  suggestionId?: number
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  text?: string
}

export function CalendarExportButton({
  suggestionId,
  variant = 'outline',
  size = 'default',
  text = 'Ajouter au calendrier'
}: CalendarExportButtonProps) {
  const handleExport = async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
      const url = suggestionId
        ? `${API_BASE}/api/calendar/suggestion/${suggestionId}.ics`
        : `${API_BASE}/api/calendar/export.ics`

      // Fetch the .ics file
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to generate calendar file')
      }

      // Get the blob
      const blob = await response.blob()

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl

      // Set filename
      const filename = suggestionId
        ? `workout_${suggestionId}.ics`
        : 'suivi_course_workouts.ics'
      link.download = filename

      // Trigger download
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      toast.success('Fichier calendrier téléchargé', {
        description: 'Ouvrez le fichier pour l\'ajouter à votre calendrier'
      })
    } catch (error) {
      console.error('Error exporting calendar:', error)
      toast.error('Erreur lors de l\'export', {
        description: 'Impossible de générer le fichier calendrier'
      })
    }
  }

  return (
    <Button
      onClick={handleExport}
      variant={variant}
      size={size}
    >
      <Calendar className="h-4 w-4 mr-2" />
      {text}
    </Button>
  )
}

interface CalendarDownloadAllButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function CalendarDownloadAllButton({
  variant = 'default',
  size = 'default'
}: CalendarDownloadAllButtonProps) {
  const handleDownloadAll = async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
      const url = `${API_BASE}/api/calendar/export.ics`

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to generate calendar file')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = 'suivi_course_workouts.ics'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      toast.success('Calendrier téléchargé', {
        description: 'Toutes vos suggestions ont été exportées'
      })
    } catch (error: any) {
      console.error('Error downloading calendar:', error)
      toast.error('Erreur lors du téléchargement', {
        description: error.message || 'Impossible de générer le fichier calendrier'
      })
    }
  }

  return (
    <Button onClick={handleDownloadAll} variant={variant} size={size}>
      <Download className="h-4 w-4 mr-2" />
      Télécharger .ics
    </Button>
  )
}
