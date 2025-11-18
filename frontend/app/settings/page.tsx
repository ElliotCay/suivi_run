'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Upload, Moon, Sun, Monitor, Edit2, Plus, X } from 'lucide-react'
import { useProfile, useTrainingPreferences } from '@/hooks/useProfile'
import { useShoes, type Shoe, type ShoeCreate } from '@/hooks/useShoes'
import { useTheme } from 'next-themes'
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
  const { theme, setTheme } = useTheme()

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

  // Prevent hydration mismatch for theme-dependent elements
  const [mounted, setMounted] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Demo transition state
  const [demoTransitioning, setDemoTransitioning] = useState(false)
  const [demoIsNight, setDemoIsNight] = useState(false)

  useEffect(() => {
    setMounted(true)
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

  const handleThemeChange = (newTheme: string) => {
    if (theme === newTheme) return

    // Trigger cosmic transition in the card itself
    setIsTransitioning(true)

    // Change theme immediately to start the transition
    setTheme(newTheme)

    // Reset transition state after animation completes
    setTimeout(() => {
      setIsTransitioning(false)
      toast.success('Thème mis à jour')
    }, 2000) // 2 seconds for the full cosmic rotation
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
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-6xl font-bold tracking-tight">
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
            <div>
              <p className="text-sm text-muted-foreground mb-1">Poids</p>
              <p className="text-3xl font-bold tabular-nums">{weight}<span className="text-xl text-muted-foreground ml-1">kg</span></p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Taille</p>
              <p className="text-3xl font-bold tabular-nums">{height}<span className="text-xl text-muted-foreground ml-1">cm</span></p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">FCmax</p>
              <p className="text-3xl font-bold tabular-nums">{fcmax}<span className="text-xl text-muted-foreground ml-1">bpm</span></p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">VMA</p>
              <p className="text-3xl font-bold tabular-nums">{vma}<span className="text-xl text-muted-foreground ml-1">km/h</span></p>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">Modifier le profil</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Nom</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ton nom"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Date de naissance {age > 0 && `(${age} ans)`}
                </label>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Poids (kg)</label>
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Taille (cm)</label>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">FCmax (bpm)</label>
                <Input
                  type="number"
                  value={fcmax}
                  onChange={(e) => setFcmax(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">VMA (km/h)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={vma}
                  onChange={(e) => setVma(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
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
      )}

      <Separator />

      {/* Training Preferences */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold">Préférences d'entraînement</h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">Jours préférés</p>
            <div className="flex gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={`
                    h-12 w-12 rounded-lg text-sm font-medium transition-all
                    ${preferredDays.includes(day.value)
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Shoes */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold">Chaussures</h3>

        {shoesLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : shoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune paire enregistrée</p>
        ) : (
          <div className="space-y-2">
            {shoes.map((shoe) => (
              <div
                key={shoe.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-all group cursor-pointer"
                onClick={() => handleOpenShoeDialog(shoe)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{shoe.brand} {shoe.model}</p>
                    {shoe.is_default && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Défaut
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {Math.round(shoe.total_km)} / {shoe.max_km} km
                    </p>
                    <div className="flex-1 max-w-xs h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          shoe.wear_percentage >= 90
                            ? 'bg-red-500'
                            : shoe.wear_percentage >= 70
                            ? 'bg-orange-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(shoe.wear_percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
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

        <Button variant="outline" size="sm" onClick={() => handleOpenShoeDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une paire
        </Button>
      </div>

      <Separator />

      {/* Theme */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold">Apparence</h3>

        <div className="flex gap-3">
          {/* Light Mode - Day Scene */}
          <button
            onClick={() => handleThemeChange('light')}
            disabled={isTransitioning}
            className={`
              relative flex-1 h-24 rounded-lg border-2 transition-all duration-300 ease-out overflow-hidden
              ${!mounted
                ? 'border-muted'
                : theme === 'light'
                ? 'border-yellow-400 scale-105 shadow-xl shadow-yellow-400/20'
                : 'border-muted hover:border-muted-foreground/50 hover:scale-[1.02]'
              }
              ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {/* Sky */}
            <div className={`absolute inset-0 transition-all duration-700 ${
              !mounted
                ? 'bg-muted/5'
                : theme === 'light'
                ? 'bg-gradient-to-b from-sky-400/40 via-sky-300/30 to-sky-200/20'
                : 'bg-muted/5'
            }`} />

            {/* Sun */}
            <div className={`absolute top-2 right-4 transition-all duration-500 ${
              !mounted ? 'opacity-30' : theme === 'light' ? 'opacity-100' : 'opacity-30'
            }`}>
              <div className={`w-5 h-5 rounded-full transition-all duration-500 ${
                !mounted
                  ? 'bg-muted-foreground/50'
                  : theme === 'light'
                  ? 'bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]'
                  : 'bg-muted-foreground/50'
              }`} />
            </div>

            {/* Clouds */}
            {mounted && theme === 'light' && (
              <>
                <div className="absolute top-3 left-2 w-6 h-2 bg-white/60 rounded-full animate-[drift_15s_ease-in-out_infinite]" />
                <div className="absolute top-3 left-3 w-4 h-2 bg-white/60 rounded-full animate-[drift_15s_ease-in-out_infinite]" />
                <div className="absolute top-5 right-8 w-5 h-2 bg-white/50 rounded-full animate-[drift_20s_ease-in-out_infinite] [animation-delay:2s]" />
                <div className="absolute top-5 right-9 w-3 h-2 bg-white/50 rounded-full animate-[drift_20s_ease-in-out_infinite] [animation-delay:2s]" />
              </>
            )}

            {/* Horizon */}
            <div className={`absolute bottom-12 left-0 right-0 h-[1px] transition-all duration-500 ${
              !mounted ? 'bg-muted/20' : theme === 'light' ? 'bg-yellow-300/40' : 'bg-muted/20'
            }`} />

            {/* Ground/Earth */}
            <div className={`absolute bottom-0 left-0 right-0 h-12 transition-all duration-700 ${
              !mounted
                ? 'bg-muted/10'
                : theme === 'light'
                ? 'bg-gradient-to-b from-green-600/30 to-green-700/40'
                : 'bg-muted/10'
            }`} />

            {/* Trees - asymmetric placement */}
            {mounted && theme === 'light' && (
              <>
                {/* Tree 1 - left, smaller */}
                <div className="absolute bottom-12 left-3">
                  <div className="w-1 h-2.5 bg-amber-800/60" />
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-green-700/70" />
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-green-600/70" />
                </div>
                {/* Tree 2 - middle-left, taller */}
                <div className="absolute bottom-12 left-[35%]">
                  <div className="w-1 h-4 bg-amber-800/60" />
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[7px] border-b-green-700/70" />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-green-600/70" />
                </div>
                {/* Tree 3 - right, medium */}
                <div className="absolute bottom-12 right-4">
                  <div className="w-1 h-3 bg-amber-800/60" />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-green-700/70" />
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[7px] border-b-green-600/70" />
                </div>
              </>
            )}

            <span className={`absolute bottom-2 left-0 right-0 text-center text-sm font-medium transition-all duration-300 ${
              !mounted ? 'text-muted-foreground' : theme === 'light' ? 'text-foreground' : 'text-muted-foreground'
            }`}>Clair</span>
          </button>

          {/* Dark Mode - Night Scene */}
          <button
            onClick={() => handleThemeChange('dark')}
            disabled={isTransitioning}
            className={`
              relative flex-1 h-24 rounded-lg border-2 transition-all duration-300 ease-out overflow-hidden
              ${!mounted
                ? 'border-muted'
                : theme === 'dark'
                ? 'border-blue-400 scale-105 shadow-xl shadow-blue-400/20'
                : 'border-muted hover:border-muted-foreground/50 hover:scale-[1.02]'
              }
              ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {/* Night Sky */}
            <div className={`absolute inset-0 transition-all duration-700 ${
              !mounted
                ? 'bg-muted/5'
                : theme === 'dark'
                ? 'bg-gradient-to-b from-blue-950/50 via-indigo-950/40 to-blue-900/30'
                : 'bg-muted/5'
            }`} />

            {/* Moon */}
            <div className={`absolute top-2 left-4 transition-all duration-500 ${
              !mounted ? 'opacity-30' : theme === 'dark' ? 'opacity-100' : 'opacity-30'
            }`}>
              <div className={`w-4 h-4 rounded-full transition-all duration-500 ${
                !mounted
                  ? 'bg-muted-foreground/50'
                  : theme === 'dark'
                  ? 'bg-blue-100 shadow-[0_0_20px_rgba(191,219,254,0.5)]'
                  : 'bg-muted-foreground/50'
              }`} />
            </div>

            {/* Stars */}
            {mounted && theme === 'dark' && (
              <>
                <div className="absolute top-2 right-3 w-1 h-1 bg-white rounded-full animate-[twinkle_2s_ease-in-out_infinite]" />
                <div className="absolute top-4 right-8 w-0.5 h-0.5 bg-white/80 rounded-full animate-[twinkle_2.5s_ease-in-out_infinite] [animation-delay:0.3s]" />
                <div className="absolute top-6 right-12 w-0.5 h-0.5 bg-white/60 rounded-full animate-[twinkle_3s_ease-in-out_infinite] [animation-delay:0.7s]" />
                <div className="absolute top-3 left-8 w-1 h-1 bg-white/70 rounded-full animate-[twinkle_2.2s_ease-in-out_infinite] [animation-delay:0.5s]" />
                <div className="absolute top-5 left-12 w-0.5 h-0.5 bg-white/50 rounded-full animate-[twinkle_2.8s_ease-in-out_infinite] [animation-delay:1s]" />
                <div className="absolute top-7 right-6 w-0.5 h-0.5 bg-white/70 rounded-full animate-[twinkle_3.2s_ease-in-out_infinite] [animation-delay:1.3s]" />
              </>
            )}

            {/* Horizon */}
            <div className={`absolute bottom-12 left-0 right-0 h-[1px] transition-all duration-500 ${
              !mounted ? 'bg-muted/20' : theme === 'dark' ? 'bg-blue-400/30' : 'bg-muted/20'
            }`} />

            {/* Ground/Earth */}
            <div className={`absolute bottom-0 left-0 right-0 h-12 transition-all duration-700 ${
              !mounted
                ? 'bg-muted/10'
                : theme === 'dark'
                ? 'bg-gradient-to-b from-slate-800/40 to-slate-900/50'
                : 'bg-muted/10'
            }`} />

            {/* Trees - dark silhouettes, asymmetric */}
            {mounted && theme === 'dark' && !isTransitioning && (
              <>
                {/* Tree 1 - left, smaller */}
                <div className="absolute bottom-12 left-3">
                  <div className="w-1 h-2.5 bg-slate-900/80" />
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-slate-900/80" />
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-slate-800/80" />
                </div>
                {/* Tree 2 - middle-left, taller */}
                <div className="absolute bottom-12 left-[35%]">
                  <div className="w-1 h-4 bg-slate-900/80" />
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[7px] border-b-slate-900/80" />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-slate-800/80" />
                </div>
                {/* Tree 3 - right, medium */}
                <div className="absolute bottom-12 right-4">
                  <div className="w-1 h-3 bg-slate-900/80" />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-slate-900/80" />
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[7px] border-b-slate-800/80" />
                </div>
              </>
            )}

            {/* Orbital animation container - centered on horizon */}
            {mounted && isTransitioning && theme === 'dark' && (
              <div
                className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                style={{
                  bottom: '48px', // horizon position (h-12 = 48px)
                  width: '120px',
                  height: '120px'
                }}
              >
                {/* Sun descending (day to night) */}
                <div
                  className="absolute w-5 h-5 rounded-full bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]"
                  style={{
                    left: '50%',
                    top: '50%',
                    transformOrigin: '0 0',
                    animation: 'orbitSunDown 2s ease-in-out forwards'
                  }}
                />

                {/* Moon ascending */}
                <div
                  className="absolute w-4 h-4 rounded-full bg-blue-100 shadow-[0_0_20px_rgba(191,219,254,0.5)]"
                  style={{
                    left: '50%',
                    top: '50%',
                    transformOrigin: '0 0',
                    animation: 'orbitMoonUp 2s ease-in-out forwards'
                  }}
                />
              </div>
            )}

            <span className={`absolute bottom-2 left-0 right-0 text-center text-sm font-medium transition-all duration-300 ${
              !mounted ? 'text-muted-foreground' : theme === 'dark' ? 'text-foreground' : 'text-muted-foreground'
            }`}>Sombre</span>
          </button>

          {/* System Mode - Day/Night Split */}
          <button
            onClick={() => handleThemeChange('system')}
            disabled={isTransitioning}
            className={`
              relative flex-1 h-24 rounded-lg border-2 transition-all duration-300 ease-out overflow-hidden
              ${!mounted
                ? 'border-muted'
                : theme === 'system'
                ? 'border-purple-500 scale-105 shadow-xl shadow-purple-500/20'
                : 'border-muted hover:border-muted-foreground/50 hover:scale-[1.02]'
              }
              ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {/* Left Half - Day */}
            <div className={`absolute inset-y-0 left-0 right-1/2 transition-all duration-700 ${
              !mounted
                ? 'bg-muted/5'
                : theme === 'system'
                ? 'bg-gradient-to-b from-sky-400/30 via-sky-300/20 to-sky-200/15'
                : 'bg-muted/5'
            }`} />

            {/* Right Half - Night */}
            <div className={`absolute inset-y-0 left-1/2 right-0 transition-all duration-700 ${
              !mounted
                ? 'bg-muted/5'
                : theme === 'system'
                ? 'bg-gradient-to-b from-blue-950/40 via-indigo-950/30 to-blue-900/20'
                : 'bg-muted/5'
            }`} />

            {/* Vertical separator */}
            <div className={`absolute inset-y-0 left-1/2 w-[1px] -translate-x-1/2 transition-all duration-500 ${
              !mounted ? 'bg-muted/20' : theme === 'system' ? 'bg-purple-400/40' : 'bg-muted/20'
            }`} />

            {/* Sun (left side) */}
            {mounted && theme === 'system' && (
              <div className="absolute top-2 left-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]" />
              </div>
            )}

            {/* Cloud (left side) */}
            {mounted && theme === 'system' && (
              <div className="absolute top-4 left-3 w-4 h-1.5 bg-white/50 rounded-full animate-[drift_12s_ease-in-out_infinite]" />
            )}

            {/* Moon (right side) */}
            {mounted && theme === 'system' && (
              <div className="absolute top-2 right-2">
                <div className="w-3 h-3 rounded-full bg-blue-100 shadow-[0_0_12px_rgba(191,219,254,0.4)]" />
              </div>
            )}

            {/* Stars (right side) */}
            {mounted && theme === 'system' && (
              <>
                <div className="absolute top-3 right-5 w-0.5 h-0.5 bg-white rounded-full animate-[twinkle_2s_ease-in-out_infinite]" />
                <div className="absolute top-5 right-3 w-0.5 h-0.5 bg-white/70 rounded-full animate-[twinkle_2.5s_ease-in-out_infinite] [animation-delay:0.4s]" />
                <div className="absolute top-6 right-7 w-0.5 h-0.5 bg-white/60 rounded-full animate-[twinkle_2.8s_ease-in-out_infinite] [animation-delay:0.8s]" />
              </>
            )}

            {/* Horizon */}
            <div className={`absolute bottom-12 left-0 right-0 h-[1px] transition-all duration-500 ${
              !mounted ? 'bg-muted/20' : theme === 'system' ? 'bg-purple-300/30' : 'bg-muted/20'
            }`} />

            {/* Ground - split like sky */}
            <div className="absolute bottom-0 left-0 right-0 h-12">
              <div className={`absolute inset-y-0 left-0 right-1/2 transition-all duration-700 ${
                !mounted
                  ? 'bg-muted/10'
                  : theme === 'system'
                  ? 'bg-gradient-to-b from-green-600/25 to-green-700/35'
                  : 'bg-muted/10'
              }`} />
              <div className={`absolute inset-y-0 left-1/2 right-0 transition-all duration-700 ${
                !mounted
                  ? 'bg-muted/10'
                  : theme === 'system'
                  ? 'bg-gradient-to-b from-slate-800/35 to-slate-900/45'
                  : 'bg-muted/10'
              }`} />
            </div>

            {/* Trees - asymmetric on both sides */}
            {mounted && theme === 'system' && (
              <>
                {/* Day tree - left side, offset */}
                <div className="absolute bottom-12 left-[18%]">
                  <div className="w-1 h-3 bg-amber-800/60" />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-green-700/70" />
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[7px] border-b-green-600/70" />
                </div>
                {/* Night tree - right side, offset */}
                <div className="absolute bottom-12 right-[15%]">
                  <div className="w-1 h-3 bg-slate-900/80" />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-slate-900/80" />
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[7px] border-b-slate-800/80" />
                </div>
              </>
            )}

            <span className={`absolute bottom-2 left-0 right-0 text-center text-sm font-medium transition-all duration-300 ${
              !mounted ? 'text-muted-foreground' : theme === 'system' ? 'text-foreground' : 'text-muted-foreground'
            }`}>Auto</span>
          </button>
        </div>

        {/* Demo Transition Component */}
        <div className="mt-8 space-y-4">
          <h4 className="text-lg font-semibold text-muted-foreground">Demo - Transition cosmique</h4>
          <button
            onClick={() => {
              setDemoTransitioning(true)
              setTimeout(() => {
                setDemoTransitioning(false)
                setDemoIsNight(!demoIsNight)
              }, 3000)
            }}
            className="relative w-full h-48 rounded-2xl border-2 border-muted overflow-hidden hover:border-muted-foreground/50 transition-all"
          >
            {/* Sky - progressive gradient transition */}
            <div
              className="absolute inset-0 transition-all duration-[3000ms] ease-in-out"
              style={{
                background: demoIsNight
                  ? 'linear-gradient(180deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #533483 100%)'
                  : 'linear-gradient(180deg, #87CEEB 0%, #87CEEB 50%, #E0F6FF 100%)',
              }}
            />

            {/* Horizon line */}
            <div className="absolute bottom-16 left-0 right-0 h-[1px] bg-orange-400/40" />

            {/* Ground */}
            <div
              className="absolute bottom-0 left-0 right-0 h-16 transition-all duration-[3000ms]"
              style={{
                background: demoIsNight
                  ? 'linear-gradient(to bottom, #1a1a1a 0%, #0a0a0a 100%)'
                  : 'linear-gradient(to bottom, #22c55e 0%, #15803d 100%)',
              }}
            />

            {/* Orbital container centered on horizon */}
            {mounted && (
              <div
                className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                style={{
                  bottom: '64px', // horizon position (h-16 = 64px)
                  width: '1px',
                  height: '1px',
                }}
              >
                {/* Sun - continuous circular orbit */}
                <div
                  className="absolute w-8 h-8 rounded-full bg-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.8)] transition-all duration-[3000ms] ease-in-out"
                  style={{
                    left: '0',
                    top: '0',
                    transformOrigin: '0 0',
                    // Jour (0°→180°): visible en haut, descend à droite et disparaît
                    // Nuit (180°→360°): invisible sous terre, continue de tourner et revient à 0° (360°)
                    transform: demoIsNight
                      ? 'rotate(360deg) translateY(-100px) rotate(-360deg)'
                      : 'rotate(0deg) translateY(-100px) rotate(0deg)',
                    // Visible seulement entre 0° et 180° (au-dessus de l'horizon)
                    opacity: demoIsNight ? 0 : 1,
                  }}
                />

                {/* Moon - same circle but offset by 180° */}
                <div
                  className="absolute w-6 h-6 rounded-full bg-slate-200 shadow-[0_0_30px_rgba(226,232,240,0.6)] transition-all duration-[3000ms] ease-in-out"
                  style={{
                    left: '0',
                    top: '0',
                    transformOrigin: '0 0',
                    // Lune commence à 180° de décalage
                    // Jour: lune à 180°→360° (sous terre, invisible)
                    // Nuit: lune à 360°→540° = 0°→180° (visible, monte de gauche, descend à droite)
                    transform: demoIsNight
                      ? 'rotate(540deg) translateY(-100px) rotate(-540deg)'
                      : 'rotate(180deg) translateY(-100px) rotate(-180deg)',
                    // Visible seulement quand elle est au-dessus (entre son 0° et 180°, soit notre 180° à 360°)
                    opacity: demoIsNight ? 1 : 0,
                  }}
                />
              </div>
            )}

            {/* Clouds (day) */}
            {mounted && (
              <>
                <div
                  className="absolute top-8 left-[15%] w-16 h-4 bg-white/70 rounded-full transition-all duration-[3000ms]"
                  style={{ opacity: demoIsNight ? 0 : 1 }}
                />
                <div
                  className="absolute top-12 right-[20%] w-12 h-3 bg-white/60 rounded-full transition-all duration-[3000ms]"
                  style={{ opacity: demoIsNight ? 0 : 1 }}
                />
              </>
            )}

            {/* Stars (night) */}
            {mounted && (
              <>
                <div
                  className="absolute top-6 left-[20%] w-1.5 h-1.5 bg-white rounded-full transition-all duration-[3000ms] delay-500"
                  style={{ opacity: demoIsNight ? 1 : 0 }}
                />
                <div
                  className="absolute top-10 right-[15%] w-1 h-1 bg-white/80 rounded-full transition-all duration-[3000ms] delay-500"
                  style={{ opacity: demoIsNight ? 1 : 0 }}
                />
                <div
                  className="absolute top-14 left-[40%] w-1.5 h-1.5 bg-white/90 rounded-full transition-all duration-[3000ms] delay-500"
                  style={{ opacity: demoIsNight ? 1 : 0 }}
                />
                <div
                  className="absolute top-8 right-[35%] w-1 h-1 bg-white/70 rounded-full transition-all duration-[3000ms] delay-500"
                  style={{ opacity: demoIsNight ? 1 : 0 }}
                />
              </>
            )}

            <span className="absolute bottom-4 left-0 right-0 text-center text-sm font-medium text-foreground/80">
              Cliquer pour voir la transition
            </span>
          </button>
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
        <DialogContent className="max-w-md">
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
    </div>
  )
}
