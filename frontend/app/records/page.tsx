'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import axios from 'axios'
import { Award, Calendar, X, Save } from 'lucide-react'
import { toast } from 'sonner'

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
  const [history, setHistory] = useState<{ [key: string]: RecordHistory[] }>({})
  const [editingDistance, setEditingDistance] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState<string | null>(null)
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
      toast.error('Erreur lors du chargement des records')
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async (distance: string) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/records/${distance}`)
      setHistory(prev => ({ ...prev, [distance]: response.data }))
      setShowHistory(distance)
    } catch (error) {
      console.error('Error loading history:', error)
      toast.error('Erreur lors du chargement de l\'historique')
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

  const handleSave = async () => {
    if (!formData.minutes || !formData.seconds) {
      toast.error('Veuillez remplir le temps')
      return
    }

    const timeSeconds = parseInt(formData.minutes) * 60 + parseInt(formData.seconds)

    try {
      await axios.post('http://localhost:8000/api/records', {
        distance: formData.distance,
        time_seconds: timeSeconds,
        date_achieved: formData.date,
        notes: formData.notes || null
      })

      toast.success('Record enregistré')
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

    return (
      <motion.div
        key={distanceValue}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={className}
      >
        <Card
          className={`h-full group cursor-pointer transition-all duration-200 hover:shadow-lg ${
            hasRecord ? 'border-foreground/10' : 'border-dashed'
          }`}
          onClick={() => startEdit(distanceValue)}
        >
          <CardContent className="p-4 h-full flex flex-col justify-between">
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

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-3 auto-rows-[140px]">
        {/* 400m - small */}
        {renderBentoCard('400m', 'col-span-3 row-span-1')}

        {/* 500m - small */}
        {renderBentoCard('500m', 'col-span-3 row-span-1')}

        {/* 800m - medium */}
        {renderBentoCard('800m', 'col-span-3 row-span-1')}

        {/* 1km - medium */}
        {renderBentoCard('1km', 'col-span-3 row-span-1')}

        {/* 1 mile - medium */}
        {renderBentoCard('1_mile', 'col-span-4 row-span-1')}

        {/* 2km - medium */}
        {renderBentoCard('2km', 'col-span-4 row-span-1')}

        {/* 3km - medium */}
        {renderBentoCard('3km', 'col-span-4 row-span-1')}

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

      {/* Edit Dialog */}
      <Dialog open={!!editingDistance} onOpenChange={(open) => !open && setEditingDistance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {getRecordForDistance(editingDistance || '') ? 'Modifier' : 'Ajouter'} un record
            </DialogTitle>
            <DialogDescription>
              {DISTANCES.find(d => d.value === editingDistance)?.label}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Minutes</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.minutes}
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
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div>
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Course, conditions, sensations..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingDistance(null)}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
