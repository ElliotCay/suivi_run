'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Upload, Edit2, Plus, X } from 'lucide-react'
import { ThemeSwitcherCard } from '@/components/ThemeSwitcherCard'
import { useProfile, useTrainingPreferences } from '@/hooks/useProfile'
import { useShoes, type Shoe, type ShoeCreate } from '@/hooks/useShoes'
import { useInjuries, type Injury, type InjuryCreate, type InjuryLocation, type InjurySeverity, type InjuryStatus } from '@/hooks/useInjuries'
import { ImageCropDialog } from '@/components/ImageCropDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { NavbarStyleCard, type NavbarStyle } from '@/components/NavbarStyleCard'

const DAYS = [
  { value: 'monday', label: 'Lun' },
  { value: 'tuesday', label: 'Mar' },
  { value: 'wednesday', label: 'Mer' },
  { value: 'thursday', label: 'Jeu' },
  { value: 'friday', label: 'Ven' },
  { value: 'saturday', label: 'Sam' },
  { value: 'sunday', label: 'Dim' },
]

export default function SettingsPage() {
  const { profile, loading: profileLoading, updateProfile, uploadProfilePicture } = useProfile()
  const { preferences, updatePreferences } = useTrainingPreferences()
  const { shoes, loading: shoesLoading, createShoe, updateShoe, deleteShoe, reload: reloadShoes } = useShoes(true)
  const { injuries, loading: injuriesLoading, createInjury, updateInjury, deleteInjury, reload: reloadInjuries } = useInjuries(true)

  // Edit mode
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  // Shoes dialog
  const [shoeDialogOpen, setShoeDialogOpen] = useState(false)
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

  // Injuries dialog
  const [injuryDialogOpen, setInjuryDialogOpen] = useState(false)
  const [editingInjury, setEditingInjury] = useState<Injury | null>(null)
  const [injuryFormData, setInjuryFormData] = useState<InjuryCreate>({
    injury_type: '',
    location: 'knee' as InjuryLocation,
    side: 'left',
    severity: 'moderate' as InjurySeverity,
    occurred_at: new Date().toISOString().split('T')[0],
    recurrence_count: 0,
    description: '',
    status: 'monitoring' as InjuryStatus,
    strengthening_focus: []
  })

  // Profile state
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [weight, setWeight] = useState(72)
  const [height, setHeight] = useState(178)
  const [fcmax, setFcmax] = useState(192)
  const [vma, setVma] = useState(16.8)
  const [savingProfile, setSavingProfile] = useState(false)

  // Preferences
  const [preferredDays, setPreferredDays] = useState<string[]>(['monday', 'wednesday', 'saturday'])
  const [preferredTime, setPreferredTime] = useState('18:00')

  // Image upload
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)

  // Navbar preference
  const [navbarStyle, setNavbarStyle] = useState<NavbarStyle>('floating')

  useEffect(() => {
    const storedStyle = localStorage.getItem('navbar-preference')
    if (storedStyle === 'floating-compact') {
      setNavbarStyle('compact')
      localStorage.setItem('navbar-preference', 'compact')
    } else if (storedStyle === 'floating' || storedStyle === 'compact' || storedStyle === 'classic') {
      setNavbarStyle(storedStyle as NavbarStyle)
    }
  }, [])

  // Calculate age
  const calculateAge = (birthDateStr: string): number => {
    if (!birthDateStr) return 0
    const birth = new Date(birthDateStr)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Load profile data
  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setWeight(profile.weight || 72)
      setHeight(profile.height || 178)
      setFcmax(profile.fcmax || 192)
      setVma(profile.vma || 16.8)

      const savedBirthDate = localStorage.getItem('birthDate')
      if (savedBirthDate) {
        setBirthDate(savedBirthDate)
      }
    }
  }, [profile])

  // Load preferences
  useEffect(() => {
    if (preferences) {
      setPreferredDays(preferences.preferred_days || ['monday', 'wednesday', 'saturday'])
      setPreferredTime(preferences.preferred_time || '18:00')
    }
  }, [preferences])

  const handleSaveProfile = async () => {
    setSavingProfile(true)

    // Save birth date to localStorage
    if (birthDate) {
      localStorage.setItem('birthDate', birthDate)
    }

    try {
      const age = calculateAge(birthDate)
      const result = await updateProfile({
        name,
        age,
        weight,
        height,
        fcmax,
        vma
      })

      if (result.success) {
        toast.success('Profil sauvegardé')
        setIsEditingProfile(false)
      } else {
        toast.error('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      toast.error('Une erreur est survenue')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePreferences = async () => {
    try {
      const result = await updatePreferences({
        preferred_days: preferredDays,
        preferred_time: preferredTime
      })

      if (result.success) {
        toast.success('Préférences sauvegardées')
      }
    } catch (error) {
      toast.error('Une erreur est survenue')
    }
  }

  const toggleDay = (day: string) => {
    const newDays = preferredDays.includes(day)
      ? preferredDays.filter(d => d !== day)
      : [...preferredDays, day]

    setPreferredDays(newDays)

    // Auto-save
    updatePreferences({
      preferred_days: newDays,
      preferred_time: preferredTime
    })
  }



  // Shoes handlers
  const handleOpenShoeDialog = (shoe?: Shoe) => {
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
    setShoeDialogOpen(true)
  }

  const handleSaveShoe = async () => {
    if (!shoeFormData.brand || !shoeFormData.model) {
      toast.error('Marque et modèle requis')
      return
    }

    const result = editingShoe
      ? await updateShoe(editingShoe.id, shoeFormData)
      : await createShoe(shoeFormData)

    if (result.success) {
      toast.success(editingShoe ? 'Chaussure modifiée' : 'Chaussure ajoutée')
      setShoeDialogOpen(false)
      reloadShoes()
    } else {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleDeleteShoe = async (shoe: Shoe) => {
    const result = await deleteShoe(shoe.id)
    if (result.success) {
      toast.success('Chaussure archivée')
      reloadShoes()
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  // Injury handlers
  const handleOpenInjuryDialog = (injury?: Injury) => {
    if (injury) {
      setEditingInjury(injury)
      setInjuryFormData({
        injury_type: injury.injury_type,
        location: injury.location,
        side: injury.side || 'left',
        severity: injury.severity,
        occurred_at: injury.occurred_at.split('T')[0],
        resolved_at: injury.resolved_at ? injury.resolved_at.split('T')[0] : undefined,
        recurrence_count: injury.recurrence_count,
        description: injury.description || '',
        status: injury.status,
        strengthening_focus: injury.strengthening_focus || []
      })
    } else {
      setEditingInjury(null)
      setInjuryFormData({
        injury_type: '',
        location: 'knee',
        side: 'left',
        severity: 'moderate',
        occurred_at: new Date().toISOString().split('T')[0],
        recurrence_count: 0,
        description: '',
        status: 'monitoring',
        strengthening_focus: []
      })
    }
    setInjuryDialogOpen(true)
  }

  const handleSaveInjury = async () => {
    if (!injuryFormData.injury_type) {
      toast.error('Type de blessure requis')
      return
    }

    const result = editingInjury
      ? await updateInjury(editingInjury.id, injuryFormData)
      : await createInjury(injuryFormData)

    if (result.success) {
      toast.success(editingInjury ? 'Blessure modifiée' : 'Blessure ajoutée')
      setInjuryDialogOpen(false)
      reloadInjuries()
    } else {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleDeleteInjury = async (injury: Injury) => {
    const result = await deleteInjury(injury.id)
    if (result.success) {
      toast.success('Blessure supprimée')
      reloadInjuries()
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleNavbarStyleChange = (style: NavbarStyle) => {
    setNavbarStyle(style)
    localStorage.setItem('navbar-preference', style)
    window.dispatchEvent(new CustomEvent('navbar-preference-change', { detail: style }))
  }

  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 5 MB)')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Format invalide')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImageToCrop(reader.result as string)
      setCropDialogOpen(true)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropDialogOpen(false)
    setImageToCrop(null)
    setUploadingPicture(true)

    const file = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' })
    const result = await uploadProfilePicture(file)

    if (result.success) {
      toast.success('Photo mise à jour')
    } else {
      toast.error('Erreur lors de l\'upload')
    }

    setUploadingPicture(false)
  }

  const age = calculateAge(birthDate)

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-6xl font-serif font-bold tracking-tight">
          Réglages
        </h1>
        <p className="text-lg text-muted-foreground">
          Ton profil et tes préférences d'entraînement
        </p>
      </div>

      {/* Profile Photo */}
      <div className="flex items-center gap-6">
        <div
          className="relative group cursor-pointer"
          onClick={() => document.getElementById('profile-picture-upload')?.click()}
          title="Modifier la photo"
        >
          <div className="relative">
            {profile?.profile_picture ? (
              <img
                src={profile.profile_picture}
                alt="Photo de profil"
                className="h-32 w-32 rounded-full object-cover transition-all group-hover:brightness-75 group-hover:scale-105"
              />
            ) : (
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-4xl font-bold transition-all group-hover:brightness-75 group-hover:scale-105">
                {name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'EC'}
              </div>
            )}
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload className="h-8 w-8 text-white drop-shadow-lg" />
            </div>
          </div>
        </div>
        <input
          type="file"
          id="profile-picture-upload"
          accept="image/*"
          onChange={handlePictureUpload}
          className="hidden"
        />

        <div className="flex-1">
          <h2 className="text-3xl font-bold">{name || 'Ton nom'}</h2>
          {age > 0 && (
            <p className="text-lg text-muted-foreground mt-1">{age} ans</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Profile Metrics - Display Mode */}
      {!isEditingProfile ? (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">Profil athlète</h3>
            <Button
              variant="outline"
              onClick={() => setIsEditingProfile(true)}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Modifier
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl bg-background/40 border border-border backdrop-blur-sm hover:bg-background/60 transition-colors">
              <p className="text-sm text-muted-foreground mb-2 font-sans">Poids</p>
              <p className="text-3xl font-bold tabular-nums font-mono">{weight}<span className="text-xl text-muted-foreground ml-1 font-sans">kg</span></p>
            </div>
            <div className="p-6 rounded-2xl bg-background/40 border border-border backdrop-blur-sm hover:bg-background/60 transition-colors">
              <p className="text-sm text-muted-foreground mb-2 font-sans">Taille</p>
              <p className="text-3xl font-bold tabular-nums font-mono">{height}<span className="text-xl text-muted-foreground ml-1 font-sans">cm</span></p>
            </div>
            <div className="p-6 rounded-2xl bg-background/40 border border-border backdrop-blur-sm hover:bg-background/60 transition-colors">
              <p className="text-sm text-muted-foreground mb-2 font-sans">FCmax</p>
              <p className="text-3xl font-bold tabular-nums font-mono">{fcmax}<span className="text-xl text-muted-foreground ml-1 font-sans">bpm</span></p>
            </div>
            <div className="p-6 rounded-2xl bg-background/40 border border-border backdrop-blur-sm hover:bg-background/60 transition-colors">
              <p className="text-sm text-muted-foreground mb-2 font-sans">VMA</p>
              <p className="text-3xl font-bold tabular-nums font-mono">{vma}<span className="text-xl text-muted-foreground ml-1 font-sans">km/h</span></p>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">Modifier le profil</h3>
          </div>

          <div className="p-8 rounded-2xl bg-background/40 border border-border backdrop-blur-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground font-sans">Nom</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ton nom"
                  className="focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/30 font-sans"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground font-sans">
                  Date de naissance {age > 0 && `(${age} ans)`}
                </label>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/30 font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground font-sans">Poids (kg)</label>
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/30 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground font-sans">Taille (cm)</label>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/30 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? 'Enregistrement...' : 'Sauvegarder'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditingProfile(false)}
                disabled={savingProfile}
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Training Preferences */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold">Préférences d'entraînement</h3>

        <div className="p-6 rounded-2xl bg-background/40 border border-border backdrop-blur-sm space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">Jours préférés</p>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={`
                    h-12 w-12 rounded-xl text-sm font-medium transition-all duration-300
                    ${preferredDays.includes(day.value)
                      ? 'bg-foreground text-background shadow-lg scale-105'
                      : 'bg-card border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-105'
                    }
                  `}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-xs">
            <p className="text-sm text-muted-foreground mb-3">Heure préférée</p>
            <Input
              type="time"
              value={preferredTime}
              onChange={(e) => {
                setPreferredTime(e.target.value)
                updatePreferences({
                  preferred_days: preferredDays,
                  preferred_time: e.target.value
                })
              }}
              className="focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/30 font-mono text-center text-lg h-12"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Shoes */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold">Chaussures</h3>

        <div className="p-6 rounded-2xl bg-background/40 border border-border backdrop-blur-sm">
          {shoesLoading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : shoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune paire enregistrée</p>
          ) : (
            <div className="space-y-2">
            {shoes.map((shoe) => (
              <div
                key={shoe.id}
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent transition-all duration-300 group cursor-pointer hover:scale-[1.01] hover:shadow-lg"
                onClick={() => handleOpenShoeDialog(shoe)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium font-sans text-lg">{shoe.brand} {shoe.model}</p>
                    {shoe.is_default && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        Défaut
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-sm text-muted-foreground tabular-nums font-mono">
                      {Math.round(shoe.total_km)} / {shoe.max_km} km
                    </p>
                    <div className="flex-1 max-w-xs h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${shoe.wear_percentage >= 90
                          ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                          : shoe.wear_percentage >= 70
                            ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                            : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                          }`}
                        style={{ width: `${Math.min(shoe.wear_percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenShoeDialog(shoe)
                    }}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-red-500/20 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteShoe(shoe)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          )}

          <Button variant="outline" size="sm" onClick={() => handleOpenShoeDialog()} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une paire
          </Button>
        </div>
      </div>

      <Separator />

      {/* Injuries */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold">Blessures</h3>

        <div className="p-6 rounded-2xl bg-background/40 border border-border backdrop-blur-sm">
          {injuriesLoading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : injuries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune blessure enregistrée</p>
          ) : (
            <div className="space-y-2">
            {injuries.map((injury) => {
              const statusColors = {
                active: 'bg-red-500/10 text-red-600 border-red-500/20',
                monitoring: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
                resolved: 'bg-green-500/10 text-green-600 border-green-500/20'
              }
              const statusLabels = {
                active: 'Active',
                monitoring: 'Surveillance',
                resolved: 'Résolue'
              }
              const severityLabels = {
                minor: 'Légère',
                moderate: 'Modérée',
                severe: 'Sévère'
              }
              const locationLabels = {
                ankle: 'Cheville',
                knee: 'Genou',
                it_band: 'Bandelette IT',
                tfl: 'TFL',
                calf: 'Mollet',
                achilles: 'Achille',
                plantar: 'Plantaire',
                shin: 'Tibia'
              }
              const sideLabels = {
                left: 'G',
                right: 'D',
                both: 'Les 2'
              }

              return (
                <div
                  key={injury.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent transition-all duration-300 group cursor-pointer hover:scale-[1.01] hover:shadow-lg"
                  onClick={() => handleOpenInjuryDialog(injury)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium font-sans text-lg">{injury.injury_type}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[injury.status]}`}>
                        {statusLabels[injury.status]}
                      </span>
                      {injury.recurrence_count > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                          Récurrent ({injury.recurrence_count}x)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-sm text-muted-foreground font-sans">
                        {locationLabels[injury.location]}{injury.side ? ` (${sideLabels[injury.side as 'left' | 'right' | 'both']})` : ''} • {severityLabels[injury.severity]}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {new Date(injury.occurred_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenInjuryDialog(injury)
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-red-500/20 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteInjury(injury)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
          )}

          <Button variant="outline" size="sm" onClick={() => handleOpenInjuryDialog()} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une blessure
          </Button>
        </div>
      </div>

      <Separator />

      {/* Theme */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold">Apparence</h3>

        <div className="space-y-6">
          <ThemeSwitcherCard />
          <NavbarStyleCard
            activeStyle={navbarStyle}
            onChange={handleNavbarStyleChange}
          />
        </div>
      </div>

      {/* Image Crop Dialog */}
      {imageToCrop && (
        <ImageCropDialog
          open={cropDialogOpen}
          imageUrl={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setCropDialogOpen(false)
            setImageToCrop(null)
          }}
        />
      )}

      {/* Shoe Dialog */}
      <Dialog open={shoeDialogOpen} onOpenChange={setShoeDialogOpen}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle>{editingShoe ? 'Modifier' : 'Ajouter'} une paire</DialogTitle>
            <DialogDescription>
              Renseigne les informations de ta paire pour suivre son usure
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marque</Label>
                <Input
                  value={shoeFormData.brand}
                  onChange={(e) => setShoeFormData({ ...shoeFormData, brand: e.target.value })}
                  placeholder="Nike, Asics..."
                />
              </div>
              <div className="space-y-2">
                <Label>Modèle</Label>
                <Input
                  value={shoeFormData.model}
                  onChange={(e) => setShoeFormData({ ...shoeFormData, model: e.target.value })}
                  placeholder="Pegasus 40..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Km initiaux</Label>
                <Input
                  type="number"
                  value={shoeFormData.initial_km || ''}
                  onChange={(e) => setShoeFormData({ ...shoeFormData, initial_km: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Km max</Label>
                <Input
                  type="number"
                  value={shoeFormData.max_km || ''}
                  onChange={(e) => setShoeFormData({ ...shoeFormData, max_km: Number(e.target.value) })}
                  placeholder="800"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_default"
                checked={shoeFormData.is_default}
                onCheckedChange={(checked) => setShoeFormData({ ...shoeFormData, is_default: checked })}
              />
              <Label htmlFor="is_default" className="cursor-pointer">Paire par défaut</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShoeDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveShoe}>
              {editingShoe ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Injury Dialog */}
      <Dialog open={injuryDialogOpen} onOpenChange={setInjuryDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle>{editingInjury ? 'Modifier' : 'Ajouter'} une blessure</DialogTitle>
            <DialogDescription>
              Enregistre tes blessures pour un renforcement personnalisé
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type de blessure</Label>
              <Input
                value={injuryFormData.injury_type}
                onChange={(e) => setInjuryFormData({ ...injuryFormData, injury_type: e.target.value })}
                placeholder="Tendinite rotulienne, périostite..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Localisation</Label>
                <select
                  value={injuryFormData.location}
                  onChange={(e) => setInjuryFormData({ ...injuryFormData, location: e.target.value as InjuryLocation })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="knee">Genou</option>
                  <option value="ankle">Cheville</option>
                  <option value="calf">Mollet</option>
                  <option value="achilles">Achille</option>
                  <option value="it_band">Bandelette IT</option>
                  <option value="tfl">TFL</option>
                  <option value="shin">Tibia</option>
                  <option value="plantar">Plantaire</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Côté</Label>
                <select
                  value={injuryFormData.side}
                  onChange={(e) => setInjuryFormData({ ...injuryFormData, side: e.target.value as 'left' | 'right' | 'both' })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="left">Gauche</option>
                  <option value="right">Droit</option>
                  <option value="both">Les deux</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Gravité</Label>
                <select
                  value={injuryFormData.severity}
                  onChange={(e) => setInjuryFormData({ ...injuryFormData, severity: e.target.value as InjurySeverity })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="minor">Légère</option>
                  <option value="moderate">Modérée</option>
                  <option value="severe">Sévère</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date d'occurrence</Label>
                <Input
                  type="date"
                  value={injuryFormData.occurred_at}
                  onChange={(e) => setInjuryFormData({ ...injuryFormData, occurred_at: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label>Statut</Label>
                <select
                  value={injuryFormData.status}
                  onChange={(e) => setInjuryFormData({ ...injuryFormData, status: e.target.value as InjuryStatus })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="active">Active</option>
                  <option value="monitoring">Surveillance</option>
                  <option value="resolved">Résolue</option>
                </select>
              </div>
            </div>

            {injuryFormData.status === 'resolved' && (
              <div className="space-y-2">
                <Label>Date de résolution</Label>
                <Input
                  type="date"
                  value={injuryFormData.resolved_at || ''}
                  onChange={(e) => setInjuryFormData({ ...injuryFormData, resolved_at: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Nombre de récurrences</Label>
              <Input
                type="number"
                min="0"
                value={injuryFormData.recurrence_count}
                onChange={(e) => setInjuryFormData({ ...injuryFormData, recurrence_count: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optionnel)</Label>
              <Input
                value={injuryFormData.description}
                onChange={(e) => setInjuryFormData({ ...injuryFormData, description: e.target.value })}
                placeholder="Douleur lors de la descente, gonflement..."
              />
            </div>

            <div className="space-y-2">
              <Label>Focus renforcement</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const focus = injuryFormData.strengthening_focus || []
                    const newFocus = focus.includes('tfl_hanche')
                      ? focus.filter(f => f !== 'tfl_hanche')
                      : [...focus, 'tfl_hanche']
                    setInjuryFormData({ ...injuryFormData, strengthening_focus: newFocus })
                  }}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${injuryFormData.strengthening_focus?.includes('tfl_hanche')
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                >
                  TFL/Hanche
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const focus = injuryFormData.strengthening_focus || []
                    const newFocus = focus.includes('mollet_cheville')
                      ? focus.filter(f => f !== 'mollet_cheville')
                      : [...focus, 'mollet_cheville']
                    setInjuryFormData({ ...injuryFormData, strengthening_focus: newFocus })
                  }}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${injuryFormData.strengthening_focus?.includes('mollet_cheville')
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                >
                  Mollet/Cheville
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInjuryDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveInjury}>
              {editingInjury ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
