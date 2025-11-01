'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import axios from 'axios'

interface RaceObjective {
  event: string
  date: string
  target_pace_min: number
  target_pace_max: number
  priority: 'primary' | 'secondary'
}

interface UserProfile {
  id: number
  name: string
  email: string
  injury_history: any[]
  current_level: any
  objectives: RaceObjective[]
  weekly_volume: number
  preferences: any
  equipment: any
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [weeklyVolume, setWeeklyVolume] = useState(0)

  // Primary objective fields
  const [objectiveEvent, setObjectiveEvent] = useState('')
  const [objectiveDate, setObjectiveDate] = useState('')
  const [targetPaceMin, setTargetPaceMin] = useState('5:20')
  const [targetPaceMax, setTargetPaceMax] = useState('5:40')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/profile')
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
    } finally {
      setLoading(false)
    }
  }

  const parsePace = (paceStr: string): number => {
    const parts = paceStr.split(':')
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }
    return 0
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Build objectives array
      const objectives: RaceObjective[] = []
      if (objectiveEvent && objectiveDate) {
        objectives.push({
          event: objectiveEvent,
          date: objectiveDate,
          target_pace_min: parsePace(targetPaceMin),
          target_pace_max: parsePace(targetPaceMax),
          priority: 'primary'
        })
      }

      await axios.patch('http://localhost:8000/api/profile', {
        name,
        weekly_volume: weeklyVolume,
        objectives
      })
      alert('Profil mis à jour!')
      loadProfile()
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Minimal Header */}
      <div className="space-y-2">
        <h1 className="text-6xl font-bold tracking-tight">
          Profil
        </h1>
        <p className="text-base text-muted-foreground">
          Gérez vos informations et objectifs
        </p>
      </div>

      <div className="grid gap-3 max-w-2xl">
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={profile?.email || ''} disabled />
            </div>
            <div>
              <Label>Volume hebdomadaire cible (km)</Label>
              <Input
                type="number"
                value={weeklyVolume}
                onChange={(e) => setWeeklyVolume(Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold">Historique blessures</CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.injury_history && profile.injury_history.length > 0 ? (
              <ul className="space-y-2">
                {profile.injury_history.map((injury: any, index: number) => (
                  <li key={index} className="border-l-2 border-foreground pl-3">
                    <p className="text-sm font-bold">{injury.type}</p>
                    <p className="text-xs text-muted-foreground">{injury.status}</p>
                    {injury.date && <p className="text-xs text-muted-foreground">Date: {injury.date}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune blessure enregistrée</p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold">Objectif Principal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="text-xs text-muted-foreground">
              L'allure cible sera utilisée pour les suggestions d'entraînement et le compte à rebours sur l'écran d'accueil
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold">Équipement</CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.equipment && (
              <div className="space-y-1.5">
                <p className="text-sm"><span className="font-bold">Chaussures:</span> <span className="text-muted-foreground">{profile.equipment.shoes}</span></p>
                <p className="text-sm"><span className="font-bold">Montre:</span> <span className="text-muted-foreground">{profile.equipment.watch}</span></p>
                <p className="text-sm"><span className="font-bold">Écouteurs:</span> <span className="text-muted-foreground">{profile.equipment.earbuds}</span></p>
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} variant="outline" size="sm" className="w-full">
          {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
        </Button>
      </div>
    </div>
  )
}
