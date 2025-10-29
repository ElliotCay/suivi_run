'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import axios from 'axios'
import { Award, Plus, History, Edit2, Save, X } from 'lucide-react'

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
  { value: 'half_mile', label: '1/2 mile (800 m)' },
  { value: '1km', label: '1 km' },
  { value: '1_mile', label: '1 mile (1.6 km)' },
  { value: '2_miles', label: '2 miles (3.2 km)' },
  { value: '5km', label: '5 km' },
  { value: '10km', label: '10 km' },
  { value: 'semi', label: 'Semi-marathon (21.1 km)' },
  { value: 'marathon', label: 'Marathon (42.2 km)' },
]

export default function RecordsPage() {
  const [records, setRecords] = useState<PersonalRecord[]>([])
  const [history, setHistory] = useState<{ [key: string]: RecordHistory[] }>({})
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null)
  const [editingDistance, setEditingDistance] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    distance: '',
    minutes: '',
    seconds: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/records')
      setRecords(response.data)
    } catch (error) {
      console.error('Error loading records:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async (distance: string) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/records/${distance}`)
      setHistory(prev => ({ ...prev, [distance]: response.data }))
      setShowHistoryFor(distance)
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const getRecordForDistance = (distance: string): PersonalRecord | null => {
    return records.find(r => r.distance === distance && r.is_current) || null
  }

  const startEdit = (distance: string) => {
    const record = getRecordForDistance(distance)
    if (record) {
      const minutes = Math.floor(record.time_seconds / 60)
      const seconds = record.time_seconds % 60
      setFormData({
        distance,
        minutes: minutes.toString(),
        seconds: seconds.toString(),
        date: record.date_achieved.split('T')[0],
        notes: record.notes || ''
      })
    } else {
      setFormData({
        distance,
        minutes: '',
        seconds: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      })
    }
    setEditingDistance(distance)
  }

  const cancelEdit = () => {
    setEditingDistance(null)
    setFormData({
      distance: '',
      minutes: '',
      seconds: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    })
  }

  const saveRecord = async () => {
    if (!formData.distance || !formData.minutes || !formData.seconds) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    const time_seconds = parseInt(formData.minutes) * 60 + parseInt(formData.seconds)

    try {
      await axios.post('http://localhost:8000/api/records', {
        distance: formData.distance,
        time_seconds,
        date_achieved: new Date(formData.date).toISOString(),
        notes: formData.notes || null
      })

      alert('Record enregistré !')
      loadRecords()
      cancelEdit()
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors de l\'enregistrement'
      alert(errorMessage)
    }
  }

  if (loading) {
    return <div className="container mx-auto py-8">Chargement...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Award className="h-8 w-8" />
          Mes Records Personnels
        </h1>
        <p className="text-muted-foreground mt-2">
          Gérez vos meilleurs chronos sur toutes les distances. L'historique est conservé pour voir votre progression.
        </p>
      </div>

      <div className="grid gap-4">
        {DISTANCES.map(({ value, label }) => {
          const record = getRecordForDistance(value)
          const isEditing = editingDistance === value

          return (
            <Card key={value} className={record ? 'border-green-500' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{label}</span>
                  {record && (
                    <div className="flex gap-2">
                      {!isEditing && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadHistory(value)}
                          >
                            <History className="h-4 w-4 mr-1" />
                            Historique
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(value)}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Modifier
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isEditing && !record && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Aucun record enregistré</p>
                    <Button onClick={() => startEdit(value)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter mon record
                    </Button>
                  </div>
                )}

                {!isEditing && record && (
                  <div className="space-y-2">
                    <div className="text-4xl font-bold text-green-600">
                      {record.time_display}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Réalisé le {new Date(record.date_achieved).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    {record.notes && (
                      <div className="text-sm italic text-muted-foreground mt-2">
                        "{record.notes}"
                      </div>
                    )}
                  </div>
                )}

                {isEditing && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Minutes</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.minutes}
                          onChange={(e) => setFormData({ ...formData, minutes: e.target.value })}
                          placeholder="15"
                        />
                      </div>
                      <div>
                        <Label>Secondes</Label>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          value={formData.seconds}
                          onChange={(e) => setFormData({ ...formData, seconds: e.target.value })}
                          placeholder="45"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Notes (optionnel)</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Course officielle, conditions météo, etc."
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveRecord} className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer
                      </Button>
                      <Button onClick={cancelEdit} variant="outline">
                        <X className="h-4 w-4 mr-2" />
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}

                {/* History Display */}
                {showHistoryFor === value && history[value] && history[value].length > 1 && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Historique des records
                    </h4>
                    <div className="space-y-3">
                      {history[value].map((h, index) => (
                        <div
                          key={h.id}
                          className={`p-3 rounded-lg border ${h.is_current ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-lg">{h.time_display}</span>
                              {h.is_current && (
                                <span className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded">
                                  Actuel
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(h.date_achieved).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                          {index > 0 && history[value][index - 1] && (
                            <div className="text-xs text-green-600 mt-1">
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
