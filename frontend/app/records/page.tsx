'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import axios from 'axios'
import { Award, Calendar, X, Save, Trophy, Plus } from 'lucide-react'
import { toast } from 'sonner'
import EmptyState from '@/components/EmptyState'
import RecordCelebration from '@/components/RecordCelebration'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

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
  { value: '500m', label: '500 m', km: 0.5 },
  { value: '1km', label: '1 km', km: 1.0 },
  { value: '2km', label: '2 km', km: 2.0 },
  { value: '5km', label: '5 km', km: 5.0 },
  { value: '10km', label: '10 km', km: 10.0 },
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
  const [savedId, setSavedId] = useState<string | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/records')
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
      const response = await axios.get(`http://127.0.0.1:8000/api/records/${distance}`)
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
    const currentRecord = getRecordForDistance(formData.distance)
    const distanceInfo = DISTANCES.find(d => d.value === formData.distance)

    try {
      await axios.post('http://127.0.0.1:8000/api/records', {
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
        // Trigger Green Flash only for normal saves (celebration covers new records)
        setSavedId(formData.distance)
        setTimeout(() => setSavedId(null), 2000)
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

  // Find the most recent record date
  const mostRecentDate = records.length > 0
    ? records.reduce((latest, record) => {
      const recordDate = new Date(record.date_achieved)
      return recordDate > latest ? recordDate : latest
    }, new Date(records[0].date_achieved))
    : null

  // Render a record card (Flip Interaction)
  const renderRecordCard = (distanceValue: string, className: string) => {
    const distanceInfo = DISTANCES.find(d => d.value === distanceValue)
    if (!distanceInfo) return null

    const record = getRecordForDistance(distanceValue)
    const hasRecord = record !== null
    const isFlipped = editingDistance === distanceValue
    const isJustSaved = savedId === distanceValue

    // Check if this record was achieved on the most recent date
    const isNew = record && mostRecentDate && (() => {
      const recordDate = new Date(record.date_achieved)
      return recordDate.toDateString() === mostRecentDate.toDateString()
    })()

    // Should we show the KM label? Only for Semi and Marathon
    const showKmLabel = distanceValue === 'semi' || distanceValue === 'marathon'

    return (
      <div className={cn("perspective-1000", className)} key={distanceValue}>
        <motion.div
          className="relative w-full h-full transition-all duration-300 preserve-3d"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {/* FRONT FACE */}
          <div
            className={cn(
              "absolute inset-0 backface-hidden w-full h-full overflow-hidden border transition-all duration-500 cursor-pointer group rounded-xl",
              hasRecord
                ? "bg-background/40 hover:bg-background/60 border-foreground/10 hover:border-foreground/20 shadow-sm"
                : "bg-transparent border-dashed border-muted hover:border-muted-foreground/50 hover:bg-muted/5",
              isJustSaved && "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]"
            )}
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            onClick={() => startEdit(distanceValue)}
          >
            <div className="relative z-10 p-5 h-full flex flex-col justify-between">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={cn(
                    "font-[family-name:var(--font-branch)] font-bold tracking-tight text-lg transition-colors",
                    isJustSaved && "text-emerald-500"
                  )}>
                    {distanceInfo.label}
                  </h3>
                  {showKmLabel && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-[family-name:var(--font-outfit)] uppercase tracking-wider">
                      {distanceInfo.km} km
                    </p>
                  )}
                </div>
                {isNew && !isJustSaved && (
                  <div className="h-2 w-2 rounded-full animate-pulse"
                    style={{
                      background: 'var(--allure-gradient)'
                    }}
                  />
                )}
                {isJustSaved && (
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </div>

              {/* Main Content */}
              {hasRecord ? (
                <div className="space-y-1">
                  <div className={cn(
                    "font-[family-name:var(--font-jetbrains)] font-bold tabular-nums tracking-tighter leading-none text-3xl transition-colors",
                    isJustSaved && "text-emerald-500"
                  )}>
                    {record.time_display}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-[family-name:var(--font-outfit)] pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground/80">{calculatePace(record.time_seconds, distanceInfo.km)}</span>
                    </div>
                    {record.date_achieved && (
                      <div className="flex items-center gap-1 opacity-60">
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
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full pb-4 gap-2 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors">
                  <Plus className="h-6 w-6" />
                </div>
              )}
            </div>
          </div>

          {/* BACK FACE (EDIT FORM) */}
          <div
            className="absolute inset-0 backface-hidden w-full h-full overflow-hidden border border-foreground/10 bg-background rounded-xl rotate-y-180 shadow-xl"
            style={{
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="p-4 h-full flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="font-[family-name:var(--font-branch)] text-sm font-bold">{distanceInfo.label}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mr-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingDistance(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-3">
                {/* Time Inputs */}
                <div className="flex items-end gap-2 justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <Input
                      type="number"
                      value={formData.minutes}
                      onChange={(e) => setFormData({ ...formData, minutes: e.target.value })}
                      className="h-10 w-16 text-center font-mono text-lg p-0 border-border/50 bg-transparent focus-visible:ring-0 focus-visible:border-foreground"
                      placeholder="0"
                    />
                    <span className="text-[10px] text-muted-foreground uppercase">Min</span>
                  </div>
                  <span className="text-xl font-mono pb-3">:</span>
                  <div className="flex flex-col items-center gap-1">
                    <Input
                      type="number"
                      value={formData.seconds}
                      onChange={(e) => setFormData({ ...formData, seconds: e.target.value })}
                      className="h-10 w-16 text-center font-mono text-lg p-0 border-border/50 bg-transparent focus-visible:ring-0 focus-visible:border-foreground"
                      placeholder="00"
                    />
                    <span className="text-[10px] text-muted-foreground uppercase">Sec</span>
                  </div>
                </div>

                {/* Date Input */}
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="h-8 text-xs text-center border-border/50 bg-transparent focus-visible:ring-0 focus-visible:border-foreground"
                />
              </div>

              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSave()
                }}
                className="w-full h-8 text-xs font-medium bg-foreground text-background hover:bg-foreground/90"
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Add global styles for 3D transforms */}
      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-7xl font-[family-name:var(--font-branch)] font-bold tracking-tight">
          Records
        </h1>
        <p className="text-xl text-muted-foreground font-[family-name:var(--font-outfit)] font-light">
          Vos meilleures performances, gravées dans le marbre.
        </p>
      </motion.div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-muted border-t-foreground animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Award className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Aucun record"
          description="Vous n'avez pas encore de records personnels enregistrés. Ajoutez votre premier record pour commencer votre collection."
          action={{
            label: "Ajouter un record",
            onClick: () => startEdit('5km')
          }}
        />
      ) : (
        /* Dynamic Grid Layout (No Holes) */
        <div className="grid grid-cols-12 gap-4">
          {/* Row 1: Short Distances (3 items -> span 4) */}
          {DISTANCES.slice(0, 3).map(distance =>
            renderRecordCard(distance.value, "col-span-12 md:col-span-4 h-[200px]")
          )}

          {/* Row 2: Long Distances (4 items -> span 3) */}
          {DISTANCES.slice(3).map(distance =>
            renderRecordCard(distance.value, "col-span-12 md:col-span-3 h-[200px]")
          )}
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
