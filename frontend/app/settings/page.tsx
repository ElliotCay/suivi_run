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
    <div className="space-y-12 pb-20">
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
                        className={`h-full transition-all ${shoe.wear_percentage >= 90
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

        <ThemeSwitcherCard />
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
