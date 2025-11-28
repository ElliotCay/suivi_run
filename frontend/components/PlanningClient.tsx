'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Target, Loader2 } from 'lucide-react'
import { AIButton } from '@/components/ui/AIButton'
import { toast } from 'sonner'
import axios from 'axios'
import TrainingBlockClient, { TrainingBlock } from '@/components/TrainingBlockClient'
import { useRouter } from 'next/navigation'

interface RaceObjective {
  id: number
  name: string
  race_date: string
  distance: string
  target_time_seconds: number | null
  location: string | null
  status: string
}

interface PlanningData {
  race_objective: RaceObjective | null
  blocks: TrainingBlock[]
  periodization_summary: {
    total_weeks: number
    base_weeks: number
    development_weeks: number
    peak_weeks: number
    taper_weeks: number
  }
}

interface PlanningClientProps {
  initialPlan: PlanningData | null
  initialRaceObjective: RaceObjective | null
}

export default function PlanningClient({ initialPlan, initialRaceObjective }: PlanningClientProps) {
  const router = useRouter()
  const [plan, setPlan] = useState<PlanningData | null>(initialPlan)
  const [selectedMode, setSelectedMode] = useState<'simple' | 'race' | null>(null)
  const [generating, setGenerating] = useState(false)
  const [showRaceForm, setShowRaceForm] = useState(false)

  // Race form state
  const [raceForm, setRaceForm] = useState({
    name: '',
    date: '',
    distance: 'half_marathon',
    target_time: '',
    location: '',
    days_per_week: 4
  })

  const generateSimpleBlock = async () => {
    setGenerating(true)
    try {
      // Calculate next Monday
      const today = new Date()
      const daysUntilMonday = (8 - today.getDay()) % 7 || 7
      const nextMonday = new Date(today)
      nextMonday.setDate(today.getDate() + daysUntilMonday)
      nextMonday.setHours(0, 0, 0, 0)

      const response = await axios.post('http://127.0.0.1:8000/api/planning/generate-preparation', {
        mode: 'simple',
        phase: 'base',
        days_per_week: 3,
        start_date: nextMonday.toISOString()
      })

      toast.success('Bloc 4 semaines généré avec succès !')
      router.refresh()
    } catch (error: any) {
      console.error('Error generating block:', error)
      toast.error(error?.response?.data?.detail || 'Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  const generateRacePlan = async () => {
    // Validate form
    if (!raceForm.name || !raceForm.date) {
      toast.error('Nom et date de la course obligatoires')
      return
    }

    const raceDate = new Date(raceForm.date)
    const today = new Date()
    if (raceDate <= today) {
      toast.error('La date de la course doit être dans le futur')
      return
    }

    setGenerating(true)
    try {
      // Step 1: Create race objective
      const targetTimeSeconds = raceForm.target_time
        ? parseInt(raceForm.target_time.split(':')[0]) * 3600 +
          parseInt(raceForm.target_time.split(':')[1]) * 60 +
          parseInt(raceForm.target_time.split(':')[2] || '0')
        : null

      const raceObjectiveResponse = await axios.post('http://127.0.0.1:8000/api/race-objectives', {
        name: raceForm.name,
        race_date: new Date(raceForm.date).toISOString(),
        distance: raceForm.distance,
        target_time_seconds: targetTimeSeconds,
        location: raceForm.location || null
      })

      const raceObjectiveId = raceObjectiveResponse.data.id

      // Step 2: Calculate start date (next Monday)
      const daysUntilMonday = (8 - today.getDay()) % 7 || 7
      const nextMonday = new Date(today)
      nextMonday.setDate(today.getDate() + daysUntilMonday)
      nextMonday.setHours(0, 0, 0, 0)

      // Step 3: Generate race preparation plan
      await axios.post('http://127.0.0.1:8000/api/planning/generate-preparation', {
        mode: 'race',
        race_objective_id: raceObjectiveId,
        start_date: nextMonday.toISOString(),
        days_per_week: raceForm.days_per_week
      })

      toast.success('Plan de préparation généré avec succès !')
      router.refresh()
    } catch (error: any) {
      console.error('Error generating race plan:', error)
      toast.error(error?.response?.data?.detail || 'Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  // If there's an active plan, display it
  if (plan && plan.blocks.length > 0) {
    const currentBlock = plan.blocks[0] // Display first active block

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-6xl font-serif font-bold tracking-tight">
            Planning
          </h1>
          <p className="text-base text-muted-foreground">
            {plan.race_objective
              ? `Préparation ${plan.race_objective.distance} · ${plan.periodization_summary.total_weeks} semaines`
              : 'Ton programme d\'entraînement'}
          </p>
        </div>

        {/* Race countdown header or create race button */}
        {plan.race_objective ? (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="text-5xl font-mono italic font-bold">
                  J-{Math.ceil((new Date(plan.race_objective.race_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-serif font-bold">{plan.race_objective.name}</h2>
                  <p className="text-sm text-muted-foreground font-mono">
                    {new Date(plan.race_objective.race_date).toLocaleDateString('fr-FR')} · {plan.race_objective.distance}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-serif font-bold mb-1">Aucun objectif de course</h3>
                  <p className="text-sm text-muted-foreground">
                    Créer un objectif pour générer un plan de préparation adapté
                  </p>
                </div>
                <Button
                  onClick={() => setShowRaceForm(!showRaceForm)}
                  variant="outline"
                  className="gap-2"
                >
                  <Target className="h-4 w-4" />
                  {showRaceForm ? 'Annuler' : 'Créer un objectif'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Race objective creation form */}
        {showRaceForm && !plan.race_objective && (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xl font-serif font-bold mb-4">Nouvel objectif de course</h3>

              <div className="space-y-2">
                <Label htmlFor="race-name-active">Nom de la course *</Label>
                <Input
                  id="race-name-active"
                  placeholder="Marathon de Paris"
                  value={raceForm.name}
                  onChange={(e) => setRaceForm({ ...raceForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="race-date-active">Date de la course *</Label>
                <Input
                  id="race-date-active"
                  type="date"
                  value={raceForm.date}
                  onChange={(e) => setRaceForm({ ...raceForm, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="race-distance-active">Distance</Label>
                <Select
                  value={raceForm.distance}
                  onValueChange={(value) => setRaceForm({ ...raceForm, distance: value })}
                >
                  <SelectTrigger id="race-distance-active">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5k">5 km</SelectItem>
                    <SelectItem value="10k">10 km</SelectItem>
                    <SelectItem value="half_marathon">Semi-marathon</SelectItem>
                    <SelectItem value="marathon">Marathon</SelectItem>
                    <SelectItem value="ultra">Ultra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="race-target-active">Temps objectif (optionnel)</Label>
                <Input
                  id="race-target-active"
                  placeholder="HH:MM:SS (ex: 01:45:00)"
                  value={raceForm.target_time}
                  onChange={(e) => setRaceForm({ ...raceForm, target_time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="race-location-active">Lieu (optionnel)</Label>
                <Input
                  id="race-location-active"
                  placeholder="Paris, France"
                  value={raceForm.location}
                  onChange={(e) => setRaceForm({ ...raceForm, location: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="days-per-week-active">Séances par semaine</Label>
                <Select
                  value={raceForm.days_per_week.toString()}
                  onValueChange={(value) => setRaceForm({ ...raceForm, days_per_week: parseInt(value) })}
                >
                  <SelectTrigger id="days-per-week-active">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 séances</SelectItem>
                    <SelectItem value="4">4 séances</SelectItem>
                    <SelectItem value="5">5 séances</SelectItem>
                    <SelectItem value="6">6 séances</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <AIButton
                onClick={generateRacePlan}
                disabled={generating}
                animationType="none"
                label={generating ? "Génération..." : "Générer le plan"}
                iconClassName="w-4 h-4 text-purple-500"
                className="w-full border border-input shadow-sm bg-foreground text-background hover:bg-foreground/90"
                showIcon={!generating}
              >
                {generating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              </AIButton>
            </CardContent>
          </Card>
        )}

        {/* Display current block using existing TrainingBlockClient */}
        <TrainingBlockClient initialBlock={currentBlock} />
      </div>
    )
  }

  // No active plan - show mode selector
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-6xl font-serif font-bold tracking-tight">
          Planning
        </h1>
        <p className="text-base text-muted-foreground">
          Choisis ton mode d'entraînement
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Simple Block Mode */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg bg-white/5 backdrop-blur-xl border-white/10 hover:border-white/20 ${
            selectedMode === 'simple' ? 'border-white/30' : ''
          }`}
          onClick={() => setSelectedMode('simple')}
        >
          <CardContent className="p-8 space-y-4">
            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold mb-2">Bloc Simple</h3>
              <p className="text-sm text-muted-foreground mb-4">
                4 semaines sans objectif précis
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>Périodisation intelligente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>3-6 séances / semaine</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>Renforcement intégré</span>
                </li>
              </ul>
            </div>
            {selectedMode === 'simple' && (
              <AIButton
                onClick={(e) => {
                  e.stopPropagation()
                  generateSimpleBlock()
                }}
                disabled={generating}
                animationType="none"
                label={generating ? "Génération..." : "Démarrer"}
                iconClassName="w-4 h-4 text-purple-500"
                className="w-full border border-input shadow-sm bg-foreground text-background hover:bg-foreground/90"
                showIcon={!generating}
              >
                {generating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              </AIButton>
            )}
          </CardContent>
        </Card>

        {/* Race Prep Mode */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg bg-white/5 backdrop-blur-xl border-white/10 hover:border-white/20 ${
            selectedMode === 'race' ? 'border-white/30' : ''
          }`}
          onClick={() => setSelectedMode('race')}
        >
          <CardContent className="p-8 space-y-4">
            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold mb-2">Préparation Course</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Plan adapté à ton objectif
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>Jusqu'à 12 semaines</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>Affûtage automatique</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>Spécifique à ta course</span>
                </li>
              </ul>
            </div>
            {selectedMode === 'race' && (
              <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2">
                  <Label htmlFor="race-name">Nom de la course *</Label>
                  <Input
                    id="race-name"
                    placeholder="Marathon de Paris"
                    value={raceForm.name}
                    onChange={(e) => setRaceForm({ ...raceForm, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="race-date">Date de la course *</Label>
                  <Input
                    id="race-date"
                    type="date"
                    value={raceForm.date}
                    onChange={(e) => setRaceForm({ ...raceForm, date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="race-distance">Distance</Label>
                  <Select
                    value={raceForm.distance}
                    onValueChange={(value) => setRaceForm({ ...raceForm, distance: value })}
                  >
                    <SelectTrigger id="race-distance">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5k">5 km</SelectItem>
                      <SelectItem value="10k">10 km</SelectItem>
                      <SelectItem value="half_marathon">Semi-marathon</SelectItem>
                      <SelectItem value="marathon">Marathon</SelectItem>
                      <SelectItem value="ultra">Ultra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="race-target">Temps objectif (optionnel)</Label>
                  <Input
                    id="race-target"
                    placeholder="HH:MM:SS (ex: 01:45:00)"
                    value={raceForm.target_time}
                    onChange={(e) => setRaceForm({ ...raceForm, target_time: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="race-location">Lieu (optionnel)</Label>
                  <Input
                    id="race-location"
                    placeholder="Paris, France"
                    value={raceForm.location}
                    onChange={(e) => setRaceForm({ ...raceForm, location: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="days-per-week">Séances par semaine</Label>
                  <Select
                    value={raceForm.days_per_week.toString()}
                    onValueChange={(value) => setRaceForm({ ...raceForm, days_per_week: parseInt(value) })}
                  >
                    <SelectTrigger id="days-per-week">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 séances</SelectItem>
                      <SelectItem value="4">4 séances</SelectItem>
                      <SelectItem value="5">5 séances</SelectItem>
                      <SelectItem value="6">6 séances</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <AIButton
                  onClick={generateRacePlan}
                  disabled={generating}
                  animationType="none"
                  label={generating ? "Génération..." : "Générer le plan"}
                  iconClassName="w-4 h-4 text-purple-500"
                  className="w-full border border-input shadow-sm bg-foreground text-background hover:bg-foreground/90"
                  showIcon={!generating}
                >
                  {generating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                </AIButton>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!selectedMode && (
        <Card className="bg-muted/30 border-white/5">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Sélectionne un mode pour commencer ton entraînement
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
