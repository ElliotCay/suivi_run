'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import axios from 'axios'
import { TrendingUp, Target, Zap, Edit2, Sparkles, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { useBadges, useBadgeStats } from '@/hooks/useBadges'
import { BadgeCard } from '@/components/BadgeCard'
import { Skeleton } from '@/components/ui/skeleton'

interface RaceObjective {
  event: string
  date: string
  target_pace_min: number
  target_pace_max: number
  priority: 'primary' | 'secondary'
}

interface Injury {
  type: string
  status: string
  date?: string
}

interface UserProfile {
  id: number
  name: string
  email: string
  injury_history: Injury[]
  current_level: any
  objectives: RaceObjective[]
  weekly_volume: number
  preferences: any
  equipment: any
}

interface ProfileInsights {
  phase: string
  avg_weekly_volume_km: number
  training_load: number | null
  injury_status: string | null
  workouts_count_4w: number
}

const DISTANCE_LABELS: Record<string, string> = {
  '5km': '5 km',
  '10km': '10 km',
  '15km': '15 km',
  'semi': 'Semi-marathon',
  'marathon': 'Marathon'
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [insights, setInsights] = useState<ProfileInsights | null>(null)
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [editingName, setEditingName] = useState(false)
  const [editingObjective, setEditingObjective] = useState(false)
  const [editingInjury, setEditingInjury] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [weeklyVolume, setWeeklyVolume] = useState(0)
  const [objectiveEvent, setObjectiveEvent] = useState('')
  const [objectiveDate, setObjectiveDate] = useState('')
  const [targetPaceMin, setTargetPaceMin] = useState('5:20')
  const [targetPaceMax, setTargetPaceMax] = useState('5:40')
  const [injuryType, setInjuryType] = useState('')
  const [injuryStatus, setInjuryStatus] = useState('gueri')
  const [injuryDate, setInjuryDate] = useState('')
  const [injuryNotes, setInjuryNotes] = useState('')

  // Badges hooks
  const { badges, loading: badgesLoading } = useBadges(true)
  const { stats: badgeStats } = useBadgeStats()

  useEffect(() => {
    loadProfile()
    loadInsights()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/profile')
      setProfile(response.data)
      setName(response.data.name)
      setWeeklyVolume(response.data.weekly_volume)

      // Load primary objective if exists
      if (response.data.objectives && response.data.objectives.length > 0) {
        const primaryObj = response.data.objectives.find((obj: RaceObjective) => obj.priority === 'primary') || response.data.objectives[0]
        setObjectiveEvent(primaryObj.event || '')
        setObjectiveDate(primaryObj.date || '')
        if (primaryObj.target_pace_min) {
          const minMinutes = Math.floor(primaryObj.target_pace_min / 60)
          const minSeconds = primaryObj.target_pace_min % 60
          setTargetPaceMin(`${minMinutes}:${minSeconds.toString().padStart(2, '0')}`)
        }
        if (primaryObj.target_pace_max) {
          const maxMinutes = Math.floor(primaryObj.target_pace_max / 60)
          const maxSeconds = primaryObj.target_pace_max % 60
          setTargetPaceMax(`${maxMinutes}:${maxSeconds.toString().padStart(2, '0')}`)
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Erreur lors du chargement du profil')
    } finally {
      setLoading(false)
    }
  }

  const loadInsights = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/profile/insights')
      setInsights(response.data)
    } catch (error) {
      console.error('Error loading insights:', error)
    }
  }

  const parsePace = (paceStr: string): number => {
    const parts = paceStr.split(':')
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }
    return 0
  }

  const formatPace = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getDaysUntilObjective = () => {
    if (!primaryObjective?.date) return null
    const now = new Date()
    const objectiveDate = new Date(primaryObjective.date)
    const diffTime = objectiveDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleSaveName = async () => {
    try {
      await axios.patch('http://127.0.0.1:8000/api/profile', { name })
      toast.success('Nom mis à jour')
      setEditingName(false)
      loadProfile()
    } catch (error) {
      console.error('Error saving name:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleSaveObjective = async () => {
    if (!objectiveEvent || !objectiveDate) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    try {
      const objectives: RaceObjective[] = [{
        event: objectiveEvent,
        date: objectiveDate,
        target_pace_min: parsePace(targetPaceMin),
        target_pace_max: parsePace(targetPaceMax),
        priority: 'primary'
      }]

      await axios.patch('http://127.0.0.1:8000/api/profile', {
        weekly_volume: weeklyVolume,
        objectives
      })
      toast.success('Objectif mis à jour')
      setEditingObjective(false)
      loadProfile()
      loadInsights()
    } catch (error) {
      console.error('Error saving objective:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleSaveInjury = async () => {
    if (!injuryType) {
      toast.error('Veuillez indiquer le type de blessure')
      return
    }

    try {
      const newInjury = {
        type: injuryType,
        status: injuryStatus,
        date: injuryDate || new Date().toISOString().split('T')[0],
        notes: injuryNotes
      }

      const updatedHistory = [...(profile?.injury_history || []), newInjury]

      await axios.patch('http://127.0.0.1:8000/api/profile', {
        injury_history: updatedHistory
      })

      toast.success('Blessure enregistrée')
      setEditingInjury(false)
      setInjuryType('')
      setInjuryStatus('gueri')
      setInjuryDate('')
      setInjuryNotes('')
      loadProfile()
      loadInsights()
    } catch (error) {
      console.error('Error saving injury:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  // Get primary objective
  const primaryObjective = profile?.objectives?.find(obj => obj.priority === 'primary') || profile?.objectives?.[0]

  // Get most recent injury
  const latestInjury = profile?.injury_history?.[profile.injury_history.length - 1]

  // Generate dynamic narrative
  const getNarrative = () => {
    if (!profile) return ''

    if (!primaryObjective) {
      return 'Profil incomplet — ajoutez un objectif pour recevoir des séances personnalisées'
    }

    const daysUntil = getDaysUntilObjective()
    const distance = DISTANCE_LABELS[primaryObjective.event] || primaryObjective.event

    if (daysUntil !== null && daysUntil > 0) {
      return `${profile.name}, ${profile.weekly_volume} km/semaine · ${distance} dans ${daysUntil} jours`
    }

    return `${profile.name}, ${profile.weekly_volume} km/semaine · ${distance}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with dynamic narrative */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-6xl font-bold tracking-tight">
          Profil
        </h1>
        <p className="text-base text-foreground">
          {getNarrative()}
        </p>
      </motion.div>

      {/* Hero Summary - 3 cards with micro-contexts */}
      <div className="grid grid-cols-12 gap-4 auto-rows-[130px]">
        {/* Volume cible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="col-span-4"
        >
          <Card className="h-full hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                 style={{
                   background: 'var(--allure-gradient)',
                   padding: '2px',
                   WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                   WebkitMaskComposite: 'xor',
                   maskComposite: 'exclude'
                 }} />
            <CardContent className="p-5 h-full flex flex-col justify-between relative z-10">
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground">Volume cible</p>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-4xl font-bold">{profile?.weekly_volume || 0} km</div>
                <p className="text-[10px] text-muted-foreground mt-1">Base pour votre charge hebdo</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Objectif */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="col-span-4"
        >
          <Card className="h-full hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                 style={{
                   background: 'var(--allure-gradient)',
                   padding: '2px',
                   WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                   WebkitMaskComposite: 'xor',
                   maskComposite: 'exclude'
                 }} />
            <CardContent className="p-5 h-full flex flex-col justify-between relative z-10">
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground">Objectif</p>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              {primaryObjective ? (
                <div>
                  <div className="text-2xl font-bold">
                    {DISTANCE_LABELS[primaryObjective.event] || primaryObjective.event}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Guide vos plans d'entraînement
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Aucun objectif défini
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Allure cible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="col-span-4"
        >
          <Card className="h-full hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                 style={{
                   background: 'var(--allure-gradient)',
                   padding: '2px',
                   WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                   WebkitMaskComposite: 'xor',
                   maskComposite: 'exclude'
                 }} />
            <CardContent className="p-5 h-full flex flex-col justify-between relative z-10">
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground">Allure cible</p>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </div>
              {primaryObjective ? (
                <div>
                  <div className="text-2xl font-bold font-mono tabular-nums">
                    {formatPace(primaryObjective.target_pace_min)} - {formatPace(primaryObjective.target_pace_max)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Calibre vos séances tempo et seuil</p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Non définie
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main content cards */}
      <div className="grid gap-4 max-w-3xl">
        {/* AI Insights Card */}
        {insights && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="hover:shadow-md transition-all relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(to right, hsl(var(--card)), hsl(var(--card)))',
                  }}>
              {/* Gradient bar on the left */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px]"
                style={{ background: 'var(--allure-gradient)' }}
              />
              <CardHeader className="pb-3 pl-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" style={{ color: '#a683d5' }} />
                  <CardTitle className="text-lg font-bold">Votre profil athlétique</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pl-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Phase</span>
                    <div className="font-bold">{insights.phase}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Volume moyen</span>
                    <div className="font-bold">{insights.avg_weekly_volume_km} km/sem</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Charge</span>
                    <div className="font-bold">
                      {insights.training_load ? insights.training_load.toFixed(2) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Santé</span>
                    <div className="font-bold">
                      {insights.injury_status || 'Aucune blessure'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Objectif Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">Objectif Principal</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingObjective(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {primaryObjective ? (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      {DISTANCE_LABELS[primaryObjective.event] || primaryObjective.event}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-base text-muted-foreground">
                      {formatDate(primaryObjective.date)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Votre coach IA adapte l'intensité et le volume des séances pour vous préparer à atteindre cet objectif dans les meilleures conditions.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Définissez un objectif pour bénéficier de recommandations personnalisées.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Santé & Blessures */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Card className="hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">Santé & Blessures</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingInjury(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Gérer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {latestInjury ? (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold">{latestInjury.type}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className={`text-xs font-medium ${
                      latestInjury.status === 'gueri' ? 'text-green-600 dark:text-green-400' :
                      latestInjury.status === 'en_cours' ? 'text-orange-600 dark:text-orange-400' :
                      'text-muted-foreground'
                    }`}>
                      {latestInjury.status === 'gueri' ? 'Guéri' :
                       latestInjury.status === 'en_cours' ? 'En cours' :
                       latestInjury.status}
                    </span>
                  </div>
                  {latestInjury.date && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(latestInjury.date)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune blessure enregistrée
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Équipement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          <Card className="hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold">Équipement</CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.equipment ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-bold">Chaussures</span>
                    <span className="text-sm text-muted-foreground">{profile.equipment.shoes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-bold">Montre</span>
                    <span className="text-sm text-muted-foreground">{profile.equipment.watch}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-bold">Écouteurs</span>
                    <span className="text-sm text-muted-foreground">{profile.equipment.earbuds}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun équipement renseigné
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Identité */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <Card className="hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">Identité</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingName(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-bold">Nom</span>
                  <span className="text-sm text-muted-foreground">{profile?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-bold">Email</span>
                  <span className="text-sm text-muted-foreground">{profile?.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Edit Name Dialog */}
      <Dialog open={editingName} onOpenChange={setEditingName}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier les informations</DialogTitle>
            <DialogDescription>
              Mettez à jour votre nom
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingName(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveName}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Objective Dialog */}
      <Dialog open={editingObjective} onOpenChange={setEditingObjective}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'objectif</DialogTitle>
            <DialogDescription>
              Définissez votre objectif de course principal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Volume hebdomadaire cible (km)</Label>
              <Input
                type="number"
                value={weeklyVolume}
                onChange={(e) => setWeeklyVolume(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Type de course</Label>
              <Select value={objectiveEvent} onValueChange={setObjectiveEvent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une distance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5km">5 km</SelectItem>
                  <SelectItem value="10km">10 km</SelectItem>
                  <SelectItem value="15km">15 km</SelectItem>
                  <SelectItem value="semi">Semi-marathon (21.1 km)</SelectItem>
                  <SelectItem value="marathon">Marathon (42.2 km)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date de l'objectif</Label>
              <Input
                type="date"
                value={objectiveDate}
                onChange={(e) => setObjectiveDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Allure cible min (min:sec/km)</Label>
                <Input
                  type="text"
                  placeholder="5:20"
                  value={targetPaceMin}
                  onChange={(e) => setTargetPaceMin(e.target.value)}
                />
              </div>
              <div>
                <Label>Allure cible max (min:sec/km)</Label>
                <Input
                  type="text"
                  placeholder="5:40"
                  value={targetPaceMax}
                  onChange={(e) => setTargetPaceMax(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingObjective(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveObjective}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Injury Dialog */}
      <Dialog open={editingInjury} onOpenChange={setEditingInjury}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gérer les blessures</DialogTitle>
            <DialogDescription>
              Ajoutez une nouvelle blessure à votre historique
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type de blessure</Label>
              <Input
                value={injuryType}
                onChange={(e) => setInjuryType(e.target.value)}
                placeholder="Ex: TFL, périostite, entorse..."
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={injuryStatus} onValueChange={setInjuryStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gueri">Guéri</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="attention">Attention / Fragile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={injuryDate}
                onChange={(e) => setInjuryDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={injuryNotes}
                onChange={(e) => setInjuryNotes(e.target.value)}
                placeholder="Détails, recommandations..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingInjury(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveInjury}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Badges Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="bg-white/80 dark:bg-black/40 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Mes Badges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {badgesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : badges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun badge débloqué pour le moment</p>
                <p className="text-sm mt-1">Continue à t'entraîner pour débloquer des badges !</p>
              </div>
            ) : (
              <>
                {/* Badge Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {badgeStats?.by_type?.volume || 0}
                    </div>
                    <div className="text-xs text-blue-600/80 dark:text-blue-400/80">Volume</div>
                  </div>
                  <div className="bg-yellow-500/10 dark:bg-yellow-500/20 border border-yellow-500/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {badgeStats?.by_type?.record || 0}
                    </div>
                    <div className="text-xs text-yellow-600/80 dark:text-yellow-400/80">Records</div>
                  </div>
                  <div className="bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {badgeStats?.by_type?.regularity || 0}
                    </div>
                    <div className="text-xs text-orange-600/80 dark:text-orange-400/80">Régularité</div>
                  </div>
                  <div className="bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {badgeStats?.by_type?.progression || 0}
                    </div>
                    <div className="text-xs text-green-600/80 dark:text-green-400/80">Progression</div>
                  </div>
                </div>

                {/* Badge Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {badges.map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} showDate={true} />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
