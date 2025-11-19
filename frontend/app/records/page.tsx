'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import axios from 'axios'
import { Award, Calendar, X, Save, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import EmptyState from '@/components/EmptyState'
import RecordCelebration from '@/components/RecordCelebration'

interface PersonalRecord {
  id: number
  distance: string
  time_seconds: number
  time_display: string
  date_achieved: string
  is_current: boolean
  notes: string | null
}

const DISTANCES = [
  { value: '400m', label: '400 m', km: 0.4 },
  { value: '500m', label: '500 m', km: 0.5 },
  { value: '800m', label: '800 m', km: 0.8 },
  { value: '1km', label: '1 km', km: 1.0 },
  { value: '1_mile', label: '1 mile', km: 1.6 },
  { value: '2km', label: '2 km', km: 2.0 },
  { value: '3km', label: '3 km', km: 3.0 },
  { value: '5km', label: '5 km', km: 5.0 },
  { value: '10km', label: '10 km', km: 10.0 },
  { value: '15km', label: '15 km', km: 15.0 },
  { value: 'semi', label: 'Semi-marathon', km: 21.1 },
  { value: 'marathon', label: 'Marathon', km: 42.2 },
]

function calculatePace(timeSeconds: number, distanceKm: number): string {
  const paceSeconds = timeSeconds / distanceKm
  const minutes = Math.floor(paceSeconds / 60)
  const seconds = Math.round(paceSeconds % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`
}

export default function RecordsPage() {
  const [records, setRecords] = useState<PersonalRecord[]>([])
  const [editingDistance, setEditingDistance] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    distance: '',
    minutes: '',
    seconds: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [loading, setLoading] = useState(true)
  const [celebration, setCelebration] = useState<{
    open: boolean
    record: {
      distance: string
      newTime: string
      oldTime?: string
      improvement?: string
    }
  }>({
    open: false,
    record: { distance: '', newTime: '' }
  })

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
  }

  const handleSave = async () => {
    if (!formData.minutes || !formData.seconds) {
      toast.error('Veuillez remplir le temps')
      return
    }

    const timeSeconds = parseInt(formData.minutes) * 60 + parseInt(formData.seconds)
    const currentRecord = getRecordForDistance(formData.distance)
    const distanceInfo = DISTANCES.find(d => d.value === formData.distance)

    try {
      await axios.post('http://localhost:8000/api/records', {
        distance: formData.distance,
        time_seconds: timeSeconds,
        date_achieved: formData.date,
        notes: formData.notes || null
      })

      // Check if it's a new record (better time)
      const isNewRecord = !currentRecord || timeSeconds < currentRecord.time_seconds

      if (isNewRecord) {
        // Format times for display
        const newMinutes = Math.floor(timeSeconds / 60)
        const newSeconds = timeSeconds % 60
        const newTimeDisplay = `${newMinutes}:${newSeconds.toString().padStart(2, '0')}`

        let oldTimeDisplay: string | undefined
        let improvement: string | undefined

        if (currentRecord) {
          const oldMinutes = Math.floor(currentRecord.time_seconds / 60)
          const oldSeconds = currentRecord.time_seconds % 60
          oldTimeDisplay = `${oldMinutes}:${oldSeconds.toString().padStart(2, '0')}`

          const improvementSeconds = currentRecord.time_seconds - timeSeconds
          const impMinutes = Math.floor(improvementSeconds / 60)
          const impSeconds = improvementSeconds % 60
          improvement = impMinutes > 0
            ? `${impMinutes}:${impSeconds.toString().padStart(2, '0')}`
            : `${impSeconds}s`
        }

        // Show celebration
        setCelebration({
          open: true,
          record: {
            distance: distanceInfo?.label || formData.distance,
            newTime: newTimeDisplay,
            oldTime: oldTimeDisplay,
            improvement
          }
        })
      } else {
        toast.success('Record enregistré')
      }

      await loadRecords()
      setEditingDistance(null)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'enregistrement')
    }
  }

  // Find best PR for hero section
  const bestPR = records.reduce((best, record) => {
    if (!best) return record
    const distanceInfo = DISTANCES.find(d => d.value === record.distance)
    const bestDistanceInfo = DISTANCES.find(d => d.value === best.distance)
    if (!distanceInfo || !bestDistanceInfo) return best

    const pace = record.time_seconds / distanceInfo.km
    const bestPace = best.time_seconds / bestDistanceInfo.km
    return pace < bestPace ? record : best
  }, null as PersonalRecord | null)

  const bestDistanceInfo = bestPR ? DISTANCES.find(d => d.value === bestPR.distance) : null

  // Render a bento card with different sizes
  const renderBentoCard = (distanceValue: string, className: string, isLarge: boolean = false) => {
    const distanceInfo = DISTANCES.find(d => d.value === distanceValue)
    if (!distanceInfo) return null

    const record = getRecordForDistance(distanceValue)
    const hasRecord = record !== null
    const isEditing = editingDistance === distanceValue

    return (
      <motion.div
        key={distanceValue}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={className}
      >
        <Card
          className={`h-full group cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden ${
            hasRecord ? 'border-foreground/10' : 'border-dashed'
          } ${isEditing ? 'ring-2 ring-emerald-500/70' : ''}`}
          onClick={() => {
            if (!isEditing) {
              startEdit(distanceValue)
            }
          }}
        >
          <div className="relative h-full perspective-1200">
            <div
              className={`relative h-full w-full transition-transform duration-200 preserve-3d ${
                isEditing ? 'rotate-y-180' : ''
              }`}
            >
              <CardContent className="p-4 h-full flex flex-col justify-between absolute inset-0 backface-hidden bg-card">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`font-bold ${isLarge ? 'text-lg' : 'text-sm'}`}>
                      {distanceInfo.label}
                    </h3>
                    {!isLarge && (
                      <p className="text-xs text-muted-foreground">{distanceInfo.km} km</p>
                    )}
                  </div>
                  <Award className={`${isLarge ? 'h-5 w-5' : 'h-4 w-4'} text-muted-foreground`} />
                </div>

                {/* Content */}
                {hasRecord ? (
                  <div className="space-y-1">
                    {/* Time */}
                    <div className={`font-bold ${isLarge ? 'text-4xl' : 'text-2xl'}`}>
                      {record.time_display}
                    </div>

                    {/* Pace */}
                    <div className="text-xs text-muted-foreground font-mono">
                      {calculatePace(record.time_seconds, distanceInfo.km)}
                    </div>

                    {/* Date - always show */}
                    {record.date_achieved && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(record.date_achieved).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-xs text-muted-foreground">Ajouter</span>
                  </div>
                )}
              </CardContent>

              <CardContent className="p-4 h-full flex flex-col justify-between absolute inset-0 backface-hidden [transform:rotateY(180deg)] bg-card overflow-y-auto">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{distanceInfo.label}</h3>
                    <p className="text-xs text-muted-foreground">Modifier le record</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      cancelEdit()
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Minutes</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.minutes}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setFormData({ ...formData, minutes: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Secondes</Label>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={formData.seconds}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setFormData({ ...formData, seconds: e.target.value })}
                        placeholder="00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Notes (optionnel)</Label>
                    <Textarea
                      value={formData.notes}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Course, conditions, sensations..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      cancelEdit()
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSave()
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Minimal Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-6xl font-bold tracking-tight">
          Records
        </h1>
        <p className="text-base text-muted-foreground">
          Vos meilleurs temps
        </p>
      </motion.div>

      {/* Empty State or Bento Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Award className="h-8 w-8 animate-pulse text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Aucun record"
          description="Vous n'avez pas encore de records personnels enregistrés. Ajoutez votre premier record en cliquant sur l'une des distances ci-dessous."
          action={{
            label: "Ajouter un record",
            onClick: () => startEdit('5km')
          }}
        />
      ) : (
        <div className="grid grid-cols-12 gap-3 auto-rows-[140px]">
        {/* 500m */}
        {renderBentoCard('500m', 'col-span-4 row-span-1')}

        {/* 1km */}
        {renderBentoCard('1km', 'col-span-4 row-span-1')}

        {/* 2km */}
        {renderBentoCard('2km', 'col-span-4 row-span-1')}

        {/* 5km - LARGE (hero) */}
        {renderBentoCard('5km', 'col-span-6 row-span-2', true)}

        {/* 10km - LARGE (hero) */}
        {renderBentoCard('10km', 'col-span-6 row-span-2', true)}

        {/* 15km - LARGE */}
        {renderBentoCard('15km', 'col-span-4 row-span-2', true)}

        {/* Semi - LARGE */}
        {renderBentoCard('semi', 'col-span-4 row-span-2', true)}

        {/* Marathon - LARGE */}
        {renderBentoCard('marathon', 'col-span-4 row-span-2', true)}
        </div>
      )}

      {/* Record Celebration */}
      <RecordCelebration
        open={celebration.open}
        onClose={() => setCelebration({ ...celebration, open: false })}
        record={celebration.record}
      />
    </div>
  )
}
