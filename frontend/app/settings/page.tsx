'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  User,
  Heart,
  Activity,
  ShieldAlert,
  Footprints,
  Settings as SettingsIcon,
  Sparkles,
  Database,
  Palette,
  ChevronDown,
  Upload,
  Trash2,
  Plus,
  X
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const DAYS = [
  { value: 'monday', label: 'Lun' },
  { value: 'tuesday', label: 'Mar' },
  { value: 'wednesday', label: 'Mer' },
  { value: 'thursday', label: 'Jeu' },
  { value: 'friday', label: 'Ven' },
  { value: 'saturday', label: 'Sam' },
  { value: 'sunday', label: 'Dim' },
]

const INJURY_ZONES = [
  'Genou gauche',
  'Genou droit',
  'Mollet gauche',
  'Mollet droit',
  'Tendon Achille',
  'IT Band',
  'Pied',
  'Dos',
  'Autre'
]

import { useProfile, useTrainingPreferences } from '@/hooks/useProfile'
import { useShoes, type Shoe, type ShoeCreate } from '@/hooks/useShoes'
import { useTheme } from 'next-themes'
import { ImageCropDialog } from '@/components/ImageCropDialog'

export default function SettingsPage() {
  const { profile, loading: profileLoading, updateProfile, uploadProfilePicture } = useProfile()
  const { preferences, loading: preferencesLoading, updatePreferences } = useTrainingPreferences()
  const { shoes, loading: shoesLoading, createShoe, updateShoe, deleteShoe, reload: reloadShoes } = useShoes(true)
  const { theme, setTheme } = useTheme()
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)

  // Profile state
  const [name, setName] = useState('')
  const [age, setAge] = useState(28)
  const [birthDate, setBirthDate] = useState('')
  const [weight, setWeight] = useState(72)
  const [height, setHeight] = useState(178)
  const [level, setLevel] = useState('intermediate')
  const [fcmax, setFcmax] = useState(192)
  const [vma, setVma] = useState(16.8)
  const [savingProfile, setSavingProfile] = useState(false)

  // Calculate age from birth date
  const calculateAge = (birthDateStr: string): number => {
    if (!birthDateStr) return 28
    const birth = new Date(birthDateStr)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Injuries state
  const [injuries, setInjuries] = useState<any[]>([])
  const [sensibleZones, setSensibleZones] = useState<string[]>(['Tendon Achille gauche'])

  // Shoes form state
  const [shoeFormOpen, setShoeFormOpen] = useState(false)
  const [editingShoe, setEditingShoe] = useState<Shoe | null>(null)
  const [shoeFormData, setShoeFormData] = useState<ShoeCreate>({
    brand: '',
    model: '',
    type: 'training',
    initial_km: 0,
    max_km: 800,
    is_default: false,
    description: ''
  })

  // Training preferences state
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3)
  const [preferredDays, setPreferredDays] = useState<string[]>(['monday', 'wednesday', 'saturday'])
  const [preferredTime, setPreferredTime] = useState('18:00')
  const [maxSessionDuration, setMaxSessionDuration] = useState(90)
  const [savingPreferences, setSavingPreferences] = useState(false)

  // Coach AI state
  const [aiMode, setAiMode] = useState<'integrated' | 'export'>('integrated')

  // Data & Sync state
  const [stravaConnected, setStravaConnected] = useState(true)
  const [appleHealthSyncActive, setAppleHealthSyncActive] = useState(true)

  // Appearance state - sync with next-themes
  const [colorMode, setColorMode] = useState<'light' | 'dark' | 'system'>('system')

  // Section collapse state
  const [openSections, setOpenSections] = useState<string[]>(['profile'])

  // Sync color mode with theme on mount
  useEffect(() => {
    if (theme) {
      setColorMode(theme as 'light' | 'dark' | 'system')
    }
  }, [theme])

  // Load birth date from localStorage on mount
  useEffect(() => {
    const savedBirthDate = localStorage.getItem('birthDate')
    if (savedBirthDate) {
      setBirthDate(savedBirthDate)
      setAge(calculateAge(savedBirthDate))
    }
  }, [])

  // Load profile data when available
  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setAge(profile.age || 28)
      setWeight(profile.weight || 72)
      setHeight(profile.height || 178)
      setLevel(profile.level || 'intermediate')
      setFcmax(profile.fcmax || 192)
      setVma(profile.vma || 16.8)
      setAiMode((profile.ai_mode as 'integrated' | 'export') || 'integrated')

      // If we have birth date in localStorage, use it to calculate age
      const savedBirthDate = localStorage.getItem('birthDate')
      if (savedBirthDate) {
        setBirthDate(savedBirthDate)
        setAge(calculateAge(savedBirthDate))
      }
    }
  }, [profile])

  // Update age when birth date changes
  useEffect(() => {
    if (birthDate) {
      const newAge = calculateAge(birthDate)
      setAge(newAge)
      localStorage.setItem('birthDate', birthDate)
    }
  }, [birthDate])

  // Load preferences when available
  useEffect(() => {
    if (preferences) {
      setPreferredDays(preferences.preferred_days || ['monday', 'wednesday', 'saturday'])
      setPreferredTime(preferences.preferred_time || '18:00')
    }
  }, [preferences])

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const result = await updateProfile({
        name,
        age,
        weight,
        height,
        level,
        fcmax,
        vma
      })

      if (result.success) {
        toast.success('Profil sauvegardé', {
          description: 'Tes informations ont été mises à jour'
        })
      } else {
        toast.error('Erreur', {
          description: result.error || 'Impossible de sauvegarder le profil'
        })
      }
    } catch (error) {
      toast.error('Erreur', {
        description: 'Une erreur est survenue'
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePreferences = async () => {
    setSavingPreferences(true)
    try {
      const result = await updatePreferences({
        preferred_days: preferredDays,
        preferred_time: preferredTime
      })

      if (result.success) {
        toast.success('Préférences sauvegardées', {
          description: 'Tes préférences ont été mises à jour'
        })
      } else {
        toast.error('Erreur', {
          description: result.error || 'Impossible de sauvegarder les préférences'
        })
      }
    } catch (error) {
      toast.error('Erreur', {
        description: 'Une erreur est survenue'
      })
    } finally {
      setSavingPreferences(false)
    }
  }

  const toggleDay = (day: string) => {
    setPreferredDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  const addSensibleZone = (zone: string) => {
    if (!sensibleZones.includes(zone)) {
      setSensibleZones([...sensibleZones, zone])
    }
  }

  const removeSensibleZone = (zone: string) => {
    setSensibleZones(sensibleZones.filter(z => z !== zone))
  }

  // Shoes handlers
  const handleOpenShoeForm = (shoe?: Shoe) => {
    if (shoe) {
      setEditingShoe(shoe)
      setShoeFormData({
        brand: shoe.brand,
        model: shoe.model,
        type: shoe.type || 'training',
        initial_km: shoe.initial_km,
        max_km: shoe.max_km,
        is_default: shoe.is_default,
        description: shoe.description || ''
      })
    } else {
      setEditingShoe(null)
      setShoeFormData({
        brand: '',
        model: '',
        type: 'training',
        initial_km: 0,
        max_km: 800,
        is_default: false,
        description: ''
      })
    }
    setShoeFormOpen(true)
  }

  const handleSaveShoe = async () => {
    if (!shoeFormData.brand || !shoeFormData.model) {
      toast.error('Erreur', {
        description: 'Marque et modèle sont requis'
      })
      return
    }

    const result = editingShoe
      ? await updateShoe(editingShoe.id, shoeFormData)
      : await createShoe(shoeFormData)

    if (result.success) {
      toast.success(editingShoe ? 'Chaussure modifiée' : 'Chaussure ajoutée', {
        description: `${shoeFormData.brand} ${shoeFormData.model}`
      })
      setShoeFormOpen(false)
      reloadShoes()
    } else {
      toast.error('Erreur', {
        description: result.error || 'Impossible de sauvegarder'
      })
    }
  }

  const handleDeleteShoe = async (shoe: Shoe) => {
    const result = await deleteShoe(shoe.id)
    if (result.success) {
      toast.success('Chaussure archivée', {
        description: `${shoe.brand} ${shoe.model}`
      })
      reloadShoes()
    } else {
      toast.error('Erreur', {
        description: result.error || 'Impossible de supprimer'
      })
    }
  }

  const getShoeAlertColor = (alertLevel?: string) => {
    switch (alertLevel) {
      case 'critical':
        return 'text-red-500'
      case 'danger':
        return 'text-red-500'
      case 'warning':
        return 'text-orange-500'
      default:
        return 'text-muted-foreground'
    }
  }

  const getShoeTypeLabel = (type?: string) => {
    switch (type) {
      case 'training':
        return 'Entraînement'
      case 'competition':
        return 'Compétition'
      case 'trail':
        return 'Trail'
      case 'recovery':
        return 'Récupération'
      default:
        return 'Entraînement'
    }
  }

  const handleColorModeChange = (mode: 'light' | 'dark' | 'system') => {
    setColorMode(mode)
    setTheme(mode)
    toast.success('Thème mis à jour', {
      description: `Mode ${mode === 'light' ? 'clair' : mode === 'dark' ? 'sombre' : 'automatique'} activé`
    })
  }

  const handleAiModeChange = async (mode: 'integrated' | 'export') => {
    setAiMode(mode)

    // Sauvegarder en base de données
    const result = await updateProfile({ ai_mode: mode })

    if (result.success) {
      toast.success('Mode Coach IA mis à jour', {
        description: mode === 'integrated'
          ? 'Mode intégré activé - API Claude du backend'
          : 'Mode export manuel activé - Copier/coller dans Claude'
      })
    } else {
      toast.error('Erreur', {
        description: 'Impossible de sauvegarder le mode Coach IA'
      })
    }
  }

  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fichier trop volumineux', {
        description: 'La taille maximale est de 5 MB'
      })
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Format invalide', {
        description: 'Veuillez sélectionner une image'
      })
      return
    }

    // Convert file to data URL for cropper
    const reader = new FileReader()
    reader.onload = () => {
      setImageToCrop(reader.result as string)
      setCropDialogOpen(true)
    }
    reader.readAsDataURL(file)

    // Reset input value to allow selecting the same file again
    event.target.value = ''
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropDialogOpen(false)
    setImageToCrop(null)
    setUploadingPicture(true)

    // Convert blob to file
    const file = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' })

    const result = await uploadProfilePicture(file)

    if (result.success) {
      toast.success('Photo mise à jour', {
        description: 'Votre photo de profil a été mise à jour'
      })
    } else {
      toast.error('Erreur', {
        description: result.error || 'Impossible d\'uploader la photo'
      })
    }

    setUploadingPicture(false)
  }

  const handleCropCancel = () => {
    setCropDialogOpen(false)
    setImageToCrop(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-6xl font-bold tracking-tight">
          Réglages
        </h1>
        <p className="text-base text-muted-foreground">
          Configure ton profil et tes préférences
        </p>
      </div>

      <div className="space-y-4">
        {/* Section 1: Profile */}
        <Collapsible
          open={openSections.includes('profile')}
          onOpenChange={() => toggleSection('profile')}
        >
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <CardTitle>Profil</CardTitle>
                      <CardDescription>Informations personnelles et métriques</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.includes('profile') ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6 pt-6">
                {/* Profile Photo */}
                <div className="flex flex-col items-center gap-4">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => document.getElementById('profile-picture-upload')?.click()}
                    title="Cliquer pour modifier la photo"
                  >
                    {profile?.profile_picture ? (
                      <img
                        src={profile.profile_picture}
                        alt="Photo de profil"
                        className="h-24 w-24 rounded-full object-cover transition-all group-hover:brightness-75 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold transition-all group-hover:brightness-75 group-hover:scale-105">
                        {name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'EC'}
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                      <Upload className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <input
                    type="file"
                    id="profile-picture-upload"
                    accept="image/*"
                    onChange={handlePictureUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">Cliquez sur la photo pour la modifier</p>
                </div>

                <Separator />

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">
                      Date de naissance
                      {birthDate && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({age} ans)
                        </span>
                      )}
                    </Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Poids (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Taille (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Level */}
                <div className="space-y-2">
                  <Label htmlFor="level">Niveau</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger id="level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Débutant</SelectItem>
                      <SelectItem value="intermediate">Intermédiaire</SelectItem>
                      <SelectItem value="advanced">Avancé</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fcmax" className="flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      FCmax (bpm)
                    </Label>
                    <Input
                      id="fcmax"
                      type="number"
                      value={fcmax}
                      onChange={(e) => setFcmax(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Détectée automatiquement ou calculée (220 - âge)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vma" className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      VMA (km/h)
                    </Label>
                    <Input
                      id="vma"
                      type="number"
                      step="0.1"
                      value={vma}
                      onChange={(e) => setVma(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Calculée depuis tes records
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Enregistrement...' : 'Sauvegarder le profil'}
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 2: Injuries */}
        <Collapsible
          open={openSections.includes('injuries')}
          onOpenChange={() => toggleSection('injuries')}
        >
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <ShieldAlert className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="text-left">
                      <CardTitle>Blessures & Zones Sensibles</CardTitle>
                      <CardDescription>Historique et zones à surveiller</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.includes('injuries') ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6 pt-6">
                {/* Current Sensible Zones */}
                <div className="space-y-3">
                  <Label>Zones sensibles actuelles</Label>
                  <div className="flex flex-wrap gap-2">
                    {sensibleZones.map((zone) => (
                      <Badge key={zone} variant="outline" className="gap-2">
                        {zone}
                        <button
                          onClick={() => removeSensibleZone(zone)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Select onValueChange={addSensibleZone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ajouter une zone sensible" />
                    </SelectTrigger>
                    <SelectContent>
                      {INJURY_ZONES.map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {zone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Past Injuries */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Historique des blessures</Label>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>
                  {injuries.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucune blessure enregistrée
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {/* Injuries list will be displayed here */}
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 3: Shoes */}
        <Collapsible
          open={openSections.includes('shoes')}
          onOpenChange={() => toggleSection('shoes')}
        >
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Footprints className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <CardTitle>Mes Chaussures</CardTitle>
                      <CardDescription>Suivi de l'usure de tes paires</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.includes('shoes') ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6 pt-6">
                {shoesLoading ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Chargement...
                  </div>
                ) : shoes.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Aucune paire de chaussures enregistrée
                  </div>
                ) : (
                  <div className="space-y-4">
                    {shoes.map((shoe) => {
                      const alertColor = getShoeAlertColor(shoe.alert_level)

                      return (
                        <Card key={shoe.id} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-bold">{shoe.brand} {shoe.model}</h3>
                                  <p className="text-sm text-muted-foreground">{getShoeTypeLabel(shoe.type)}</p>
                                  {shoe.is_default && (
                                    <Badge variant="secondary" className="mt-1">Par défaut</Badge>
                                  )}
                                </div>
                                <Badge variant="outline">{Math.round(shoe.wear_percentage)}%</Badge>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className={alertColor}>
                                    {Math.round(shoe.total_km)} km / {shoe.max_km} km
                                  </span>
                                  <span className="text-muted-foreground">
                                    {Math.round(shoe.km_remaining)} km restants
                                  </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      shoe.alert_level === 'critical' || shoe.alert_level === 'danger'
                                        ? 'bg-red-500'
                                        : shoe.alert_level === 'warning'
                                        ? 'bg-orange-500'
                                        : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.min(shoe.wear_percentage, 100)}%` }}
                                  />
                                </div>
                              </div>

                              {shoe.purchase_date && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>Achetées le {new Date(shoe.purchase_date).toLocaleDateString('fr-FR')}</span>
                                </div>
                              )}

                              <div className="flex gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleOpenShoeForm(shoe)}
                                >
                                  Modifier
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteShoe(shoe)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleOpenShoeForm()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une paire
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 4: Training Preferences */}
        <Collapsible
          open={openSections.includes('preferences')}
          onOpenChange={() => toggleSection('preferences')}
        >
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <SettingsIcon className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="text-left">
                      <CardTitle>Préférences d'Entraînement</CardTitle>
                      <CardDescription>Personnalise tes plans IA</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.includes('preferences') ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6 pt-6">
                {/* Sessions per week */}
                <div className="space-y-3">
                  <Label>Séances par semaine</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="range"
                      min="2"
                      max="6"
                      value={sessionsPerWeek}
                      onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
                      className="flex-1"
                    />
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      {sessionsPerWeek}
                    </Badge>
                  </div>
                </div>

                {/* Preferred days */}
                <div className="space-y-3">
                  <Label>Jours préférés</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS.map((day) => (
                      <Button
                        key={day.value}
                        variant={preferredDays.includes(day.value) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleDay(day.value)}
                        className="h-12"
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Preferred time */}
                <div className="space-y-3">
                  <Label htmlFor="time">Heure préférée (pour calendrier)</Label>
                  <Input
                    id="time"
                    type="time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="max-w-xs"
                  />
                </div>

                {/* Max duration */}
                <div className="space-y-3">
                  <Label>Durée max séance (minutes)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="range"
                      min="30"
                      max="180"
                      step="15"
                      value={maxSessionDuration}
                      onChange={(e) => setMaxSessionDuration(Number(e.target.value))}
                      className="flex-1"
                    />
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      {maxSessionDuration} min
                    </Badge>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSavePreferences}
                  disabled={savingPreferences}
                >
                  {savingPreferences ? 'Enregistrement...' : 'Sauvegarder les préférences'}
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 5: Coach AI */}
        <Collapsible
          open={openSections.includes('coach')}
          onOpenChange={() => toggleSection('coach')}
        >
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="text-left">
                      <CardTitle>Coach IA</CardTitle>
                      <CardDescription>Mode d'utilisation de l'intelligence artificielle</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.includes('coach') ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <Card
                    className={`cursor-pointer transition-all ${
                      aiMode === 'integrated'
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'hover:border-muted-foreground/50'
                    }`}
                    onClick={() => handleAiModeChange('integrated')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                          aiMode === 'integrated' ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {aiMode === 'integrated' && (
                            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold mb-1">Intégré (recommandé)</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            Utilise l'API Claude du backend pour des analyses instantanées et des ajustements en temps réel
                          </p>
                          <Badge variant="outline" className="text-xs">
                            Coût estimé : ~2€/mois
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-all ${
                      aiMode === 'export'
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'hover:border-muted-foreground/50'
                    }`}
                    onClick={() => handleAiModeChange('export')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                          aiMode === 'export' ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {aiMode === 'export' && (
                            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold mb-1">Export manuel (gratuit)</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            Génère un markdown à copier dans l'app Claude. Nécessite ton propre compte Claude
                          </p>
                          <Badge variant="outline" className="text-xs">
                            Aucun coût
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {aiMode === 'integrated' && (
                  <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full">
                      Voir les coûts API détaillés
                    </Button>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 6: Data & Sync */}
        <Collapsible
          open={openSections.includes('data')}
          onOpenChange={() => toggleSection('data')}
        >
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                      <Database className="h-5 w-5 text-cyan-500" />
                    </div>
                    <div className="text-left">
                      <CardTitle>Données & Synchronisation</CardTitle>
                      <CardDescription>Strava, Apple Health et export</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.includes('data') ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6 pt-6">
                {/* Strava */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Strava</Label>
                      {stravaConnected && (
                        <p className="text-sm text-muted-foreground">
                          Dernière synchro : Aujourd'hui à 14:32
                        </p>
                      )}
                    </div>
                    <Badge variant={stravaConnected ? 'default' : 'outline'}>
                      {stravaConnected ? 'Connecté' : 'Déconnecté'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      {stravaConnected ? 'Déconnecter' : 'Connecter'}
                    </Button>
                    {stravaConnected && (
                      <Button variant="outline">
                        Forcer une synchro
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Apple Health */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Apple Health</Label>
                      {appleHealthSyncActive && (
                        <p className="text-sm text-muted-foreground">
                          Dernier import : Hier à 3:05
                        </p>
                      )}
                    </div>
                    <Badge variant={appleHealthSyncActive ? 'default' : 'outline'}>
                      {appleHealthSyncActive ? 'Import automatique actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      Voir le tutoriel Raccourci iOS
                    </Button>
                    <Button variant="outline">
                      Forcer un import
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Export */}
                <div className="space-y-3">
                  <Label className="text-base">Export de mes données</Label>
                  <p className="text-sm text-muted-foreground">
                    Télécharge toutes tes données (séances, records, plans, feedbacks)
                  </p>
                  <Button variant="outline" className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Télécharger mes données (CSV)
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 7: Appearance */}
        <Collapsible
          open={openSections.includes('appearance')}
          onOpenChange={() => toggleSection('appearance')}
        >
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                      <Palette className="h-5 w-5 text-pink-500" />
                    </div>
                    <div className="text-left">
                      <CardTitle>Apparence</CardTitle>
                      <CardDescription>Mode d'affichage de l'application</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.includes('appearance') ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-3">
                  <Label>Mode couleur</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Card
                      className={`cursor-pointer transition-all ${
                        colorMode === 'light'
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => handleColorModeChange('light')}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="h-12 w-full rounded bg-white border mb-2" />
                        <p className="text-sm font-medium">Clair</p>
                      </CardContent>
                    </Card>
                    <Card
                      className={`cursor-pointer transition-all ${
                        colorMode === 'dark'
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => handleColorModeChange('dark')}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="h-12 w-full rounded bg-black border mb-2" />
                        <p className="text-sm font-medium">Sombre</p>
                      </CardContent>
                    </Card>
                    <Card
                      className={`cursor-pointer transition-all ${
                        colorMode === 'system'
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => handleColorModeChange('system')}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="h-12 w-full rounded bg-gradient-to-r from-white to-black border mb-2" />
                        <p className="text-sm font-medium">Auto</p>
                      </CardContent>
                    </Card>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Le mode Auto suit les paramètres système de macOS
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Shoe Form Dialog */}
      <Dialog open={shoeFormOpen} onOpenChange={setShoeFormOpen}>
        <DialogContent className="max-w-md overflow-visible">
          <DialogHeader>
            <DialogTitle>{editingShoe ? 'Modifier' : 'Ajouter'} une paire de chaussures</DialogTitle>
            <DialogDescription>
              Renseigne les informations de ta paire pour suivre son usure
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marque *</Label>
              <Input
                id="brand"
                value={shoeFormData.brand}
                onChange={(e) => setShoeFormData({ ...shoeFormData, brand: e.target.value })}
                placeholder="Nike, Asics, Hoka..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modèle *</Label>
              <Input
                id="model"
                value={shoeFormData.model}
                onChange={(e) => setShoeFormData({ ...shoeFormData, model: e.target.value })}
                placeholder="Pegasus 40, Gel-Nimbus..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={shoeFormData.type || 'training'}
                onChange={(e) => {
                  console.log('Type changed to:', e.target.value)
                  setShoeFormData({ ...shoeFormData, type: e.target.value })
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="training">Entraînement</option>
                <option value="competition">Compétition</option>
                <option value="trail">Trail</option>
                <option value="recovery">Récupération</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initial_km">Km initiaux</Label>
                <Input
                  id="initial_km"
                  type="text"
                  inputMode="decimal"
                  value={shoeFormData.initial_km === 0 ? '' : shoeFormData.initial_km}
                  onChange={(e) => {
                    const value = e.target.value.trim()
                    if (value === '') {
                      setShoeFormData({ ...shoeFormData, initial_km: 0 })
                    } else {
                      const parsed = parseFloat(value)
                      if (!isNaN(parsed) && parsed >= 0) {
                        setShoeFormData({ ...shoeFormData, initial_km: parsed })
                      }
                    }
                  }}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_km">Km max</Label>
                <Input
                  id="max_km"
                  type="text"
                  inputMode="decimal"
                  value={shoeFormData.max_km === 0 ? '' : shoeFormData.max_km}
                  onChange={(e) => {
                    const value = e.target.value.trim()
                    if (value === '') {
                      setShoeFormData({ ...shoeFormData, max_km: 800 })
                    } else {
                      const parsed = parseFloat(value)
                      if (!isNaN(parsed) && parsed >= 100) {
                        setShoeFormData({ ...shoeFormData, max_km: parsed })
                      }
                    }
                  }}
                  placeholder="800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (pour l'IA)</Label>
              <Input
                id="description"
                value={shoeFormData.description || ''}
                onChange={(e) => setShoeFormData({ ...shoeFormData, description: e.target.value })}
                placeholder="Ex: paire rapide pour séances VMA"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_default"
                checked={shoeFormData.is_default}
                onCheckedChange={(checked) => setShoeFormData({ ...shoeFormData, is_default: checked })}
              />
              <Label htmlFor="is_default">Paire par défaut</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShoeFormOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveShoe}>
              {editingShoe ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Crop Dialog */}
      {imageToCrop && (
        <ImageCropDialog
          open={cropDialogOpen}
          imageUrl={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}
