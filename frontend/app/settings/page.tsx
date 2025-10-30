'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { usePreferences } from '@/hooks/usePreferences'
import { CalendarDownloadAllButton } from '@/components/CalendarExportButton'
import { Calendar, Clock, Bell, Info } from 'lucide-react'

const DAYS = [
  { value: 'monday', label: 'Lundi' },
  { value: 'tuesday', label: 'Mardi' },
  { value: 'wednesday', label: 'Mercredi' },
  { value: 'thursday', label: 'Jeudi' },
  { value: 'friday', label: 'Vendredi' },
  { value: 'saturday', label: 'Samedi' },
  { value: 'sunday', label: 'Dimanche' },
]

const REMINDER_OPTIONS = [
  { value: 15, label: '15 minutes avant' },
  { value: 60, label: '1 heure avant' },
  { value: 1440, label: '1 jour avant (24h)' },
  { value: 2880, label: '2 jours avant' },
]

export default function SettingsPage() {
  const { preferences, loading, updatePreferences } = usePreferences()
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [selectedTime, setSelectedTime] = useState('18:00')
  const [syncEnabled, setSyncEnabled] = useState(false)
  const [selectedReminders, setSelectedReminders] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  // Initialize state when preferences load
  useEffect(() => {
    if (preferences) {
      setSelectedDays(preferences.preferred_days || [])
      setSelectedTime(preferences.preferred_time || '18:00')
      setSyncEnabled(preferences.calendar_sync_enabled || false)
      setSelectedReminders(preferences.reminder_minutes || [])
    }
  }, [preferences])

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  const toggleReminder = (minutes: number) => {
    setSelectedReminders(prev =>
      prev.includes(minutes)
        ? prev.filter(m => m !== minutes)
        : [...prev, minutes]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updatePreferences({
        preferred_days: selectedDays,
        preferred_time: selectedTime,
        calendar_sync_enabled: syncEnabled,
        reminder_minutes: selectedReminders,
      })

      if (result.success) {
        toast.success('Paramètres enregistrés', {
          description: 'Vos préférences ont été mises à jour'
        })
      } else {
        toast.error('Erreur', {
          description: result.error || 'Impossible de sauvegarder les paramètres'
        })
      }
    } catch (error) {
      toast.error('Erreur', {
        description: 'Une erreur est survenue'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Paramètres</h1>
        <p className="text-muted-foreground">
          Configurez vos préférences d'entraînement et de synchronisation calendrier
        </p>
      </div>

      <div className="space-y-6">
        {/* Calendar Sync Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Synchronisation Calendrier
            </CardTitle>
            <CardDescription>
              Exportez vos séances d'entraînement vers votre calendrier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sync-enabled">Activer la synchronisation</Label>
                <p className="text-sm text-muted-foreground">
                  Permettre l'export des suggestions vers le calendrier
                </p>
              </div>
              <Switch
                id="sync-enabled"
                checked={syncEnabled}
                onCheckedChange={setSyncEnabled}
              />
            </div>

            {/* Preferred Days */}
            <div className="space-y-3">
              <Label>Jours préférés pour l'entraînement</Label>
              <p className="text-sm text-muted-foreground">
                Sélectionnez les jours où vous préférez vous entraîner
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DAYS.map((day) => (
                  <Button
                    key={day.value}
                    variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDay(day.value)}
                    className="justify-start"
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Preferred Time */}
            <div className="space-y-3">
              <Label htmlFor="preferred-time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Heure préférée
              </Label>
              <p className="text-sm text-muted-foreground">
                Heure à laquelle vous préférez planifier vos entraînements
              </p>
              <input
                id="preferred-time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Reminders */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Rappels
              </Label>
              <p className="text-sm text-muted-foreground">
                Choisissez quand recevoir les rappels pour vos séances
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REMINDER_OPTIONS.map((reminder) => (
                  <Button
                    key={reminder.value}
                    variant={selectedReminders.includes(reminder.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleReminder(reminder.value)}
                    className="justify-start"
                  >
                    {reminder.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Export Button */}
            <div className="pt-4 border-t">
              <div className="flex flex-col sm:flex-row gap-3">
                <CalendarDownloadAllButton variant="default" />
                <Button
                  variant="outline"
                  onClick={() => {
                    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                    window.open(`${API_BASE}/api/calendar/webcal`, '_blank')
                  }}
                >
                  <Info className="h-4 w-4 mr-2" />
                  Infos abonnement calendrier
                </Button>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving}
                size="lg"
                className="w-full sm:w-auto"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Instructions d'installation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Apple Calendar</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Téléchargez le fichier .ics en cliquant sur "Télécharger .ics"</li>
                <li>Ouvrez le fichier téléchargé (il s'ouvrira dans Apple Calendar)</li>
                <li>Sélectionnez le calendrier de destination et importez les événements</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Google Calendar</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Téléchargez le fichier .ics</li>
                <li>Allez sur Google Calendar (calendar.google.com)</li>
                <li>Cliquez sur l'icône d'engrenage {'>'} Paramètres</li>
                <li>Dans "Importer et exporter", sélectionnez "Importer"</li>
                <li>Choisissez le fichier .ics téléchargé</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
