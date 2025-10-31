'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import axios from 'axios'
import { Award, History, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

interface PersonalRecord {
  id: number
  distance: string
  time_seconds: number
  time_display: string
  date_achieved: string
  is_current: boolean
  notes: string | null
}

interface RecordHistory {
  id: number
  time_seconds: number
  time_display: string
  date_achieved: string
  is_current: boolean
  notes: string | null
}

const DISTANCES = [
  { value: '400m', label: '400 m' },
  { value: '800m', label: '800 m' },
  { value: '1km', label: '1 km' },
  { value: '1_mile', label: '1 mile (1.6 km)' },
  { value: '2km', label: '2 km' },
  { value: '3km', label: '3 km' },
  { value: '5km', label: '5 km' },
  { value: '10km', label: '10 km' },
  { value: 'semi', label: 'Semi-marathon (21.1 km)' },
  { value: 'marathon', label: 'Marathon (42.2 km)' },
]

export default function RecordsPage() {
  const [records, setRecords] = useState<PersonalRecord[]>([])
  const [history, setHistory] = useState<{ [key: string]: RecordHistory[] }>({})
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/records')
      setRecords(response.data)
    } catch (error) {
      console.error('Error loading records:', error)
      toast.error('Erreur lors du chargement des records')
    } finally {
      setLoading(false)
    }
  }

  const autoDetectRecords = async () => {
    setDetecting(true)
    try {
      const response = await axios.post('http://localhost:8000/api/records/auto-detect')
      toast.success(response.data.message, {
        description: `${response.data.records_found} records trouvés, ${response.data.records_updated} mis à jour`
      })
      loadRecords()
    } catch (error: any) {
      console.error('Error auto-detecting records:', error)
      toast.error('Erreur lors de la détection automatique', {
        description: error.response?.data?.detail || 'Une erreur est survenue'
      })
    } finally {
      setDetecting(false)
    }
  }

  const loadHistory = async (distance: string) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/records/${distance}`)
      setHistory(prev => ({ ...prev, [distance]: response.data }))
      setShowHistoryFor(showHistoryFor === distance ? null : distance)
    } catch (error) {
      console.error('Error loading history:', error)
      toast.error('Erreur lors du chargement de l\'historique')
    }
  }

  const getRecordForDistance = (distance: string): PersonalRecord | null => {
    return records.find(r => r.distance === distance && r.is_current) || null
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Skeleton className="h-10 w-96 mb-2" />
          <Skeleton className="h-5 w-[500px]" />
        </div>
        <div className="grid gap-4">
          {DISTANCES.map(({ value }) => (
            <Card key={value}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-32 mb-2" />
                <Skeleton className="h-4 w-64" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Award className="h-8 w-8 text-yellow-500" />
            Mes Records Personnels
          </h1>
          <p className="text-muted-foreground mt-2">
            Records détectés automatiquement depuis vos séances d'entraînement
          </p>
        </div>
        <Button
          onClick={autoDetectRecords}
          disabled={detecting}
          className="flex items-center gap-2"
        >
          {detecting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Détection...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Mettre à jour les records
            </>
          )}
        </Button>
      </div>

      {records.length === 0 && (
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Aucun record détecté</h3>
            <p className="text-muted-foreground mb-4">
              Cliquez sur "Mettre à jour les records" pour détecter automatiquement vos meilleurs temps depuis vos séances.
            </p>
            <Button onClick={autoDetectRecords} disabled={detecting}>
              <Sparkles className="h-4 w-4 mr-2" />
              Détecter mes records
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {DISTANCES.map(({ value, label }) => {
          const record = getRecordForDistance(value)
          const isShowingHistory = showHistoryFor === value

          return (
            <Card key={value} className={record ? 'border-l-4 border-l-green-500' : 'opacity-60'}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">{label}</span>
                  {record && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadHistory(value)}
                    >
                      <History className="h-4 w-4 mr-1" />
                      {isShowingHistory ? 'Masquer' : 'Historique'}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!record ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      Aucun record détecté pour cette distance
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-4">
                      <div className="text-4xl font-bold text-green-600 dark:text-green-500">
                        {record.time_display}
                      </div>
                      <div className="text-lg text-muted-foreground">
                        {(() => {
                          // Calculate pace per km
                          const distanceKm = {
                            '400m': 0.4,
                            '800m': 0.8,
                            '1km': 1.0,
                            '1_mile': 1.609,
                            '2km': 2.0,
                            '3km': 3.0,
                            '5km': 5.0,
                            '10km': 10.0,
                            'semi': 21.1,
                            'marathon': 42.2,
                          }[value] || 1
                          const paceSecondsPerKm = record.time_seconds / distanceKm
                          const paceMinutes = Math.floor(paceSecondsPerKm / 60)
                          const paceSeconds = Math.floor(paceSecondsPerKm % 60)
                          return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`
                        })()}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>Réalisé le {new Date(record.date_achieved).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}</span>
                    </div>
                    {record.notes && (
                      <div className="text-xs text-muted-foreground italic mt-2 bg-muted/50 p-2 rounded">
                        {record.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* History Display */}
                {isShowingHistory && history[value] && history[value].length > 1 && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                      <History className="h-4 w-4" />
                      Progression ({history[value].length} enregistrements)
                    </h4>
                    <div className="space-y-2">
                      {history[value].map((h, index) => (
                        <div
                          key={h.id}
                          className={`p-3 rounded-lg border text-sm ${
                            h.is_current
                              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                              : 'bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold">{h.time_display}</span>
                              {h.is_current && (
                                <span className="ml-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                                  Record actuel
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(h.date_achieved).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                          {index > 0 && history[value][index - 1] && (
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                              ↓ Amélioration de {(history[value][index - 1].time_seconds - h.time_seconds)} secondes
                            </div>
                          )}
                          {h.notes && (
                            <div className="text-xs text-muted-foreground mt-1 italic">
                              {h.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
