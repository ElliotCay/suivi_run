'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { uploadAppleHealthExport } from '@/lib/api'
import type { ImportResult } from '@/types'
import axios from 'axios'
import { Play, Square, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface AutoImportStatus {
  is_running: boolean
  watch_folder: string
  check_interval: number
  export_file_exists: boolean
  export_file_path?: string
  export_file_modified?: string
  last_import_time?: string
}

interface StravaStatus {
  connected: boolean
  athlete: any
  last_sync: string | null
  auto_sync_enabled: boolean
  strava_athlete_id?: number
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Auto-import state
  const [autoImportStatus, setAutoImportStatus] = useState<AutoImportStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  // Strava state
  const [stravaStatus, setStravaStatus] = useState<StravaStatus | null>(null)
  const [syncing, setSyncing] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.zip')) {
        setError('Seuls les fichiers .zip sont acceptés')
        return
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('Le fichier est trop volumineux (max 50MB)')
        return
      }
      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }

  useEffect(() => {
    loadAutoImportStatus()
    loadStravaStatus()
    // Refresh status every 10 seconds
    const interval = setInterval(() => {
      loadAutoImportStatus()
      loadStravaStatus()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadAutoImportStatus = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/auto-import/status')
      setAutoImportStatus(response.data)
    } catch (error) {
      console.error('Error loading auto-import status:', error)
    }
  }

  const loadStravaStatus = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/strava/status')
      setStravaStatus(response.data)
    } catch (error) {
      console.error('Error loading Strava status:', error)
    }
  }

  const connectStrava = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/strava/auth-url')
      window.location.href = response.data.auth_url
    } catch (error: any) {
      console.error('Error getting Strava auth URL:', error)
      toast.error('Erreur lors de la connexion à Strava')
    }
  }

  const syncStrava = async () => {
    setSyncing(true)
    try {
      const response = await axios.post('http://localhost:8000/api/strava/sync')
      toast.success(`Synchronisation réussie : ${response.data.imported} activités importées`)
      await loadStravaStatus()
    } catch (error: any) {
      console.error('Error syncing Strava:', error)
      toast.error(error?.response?.data?.detail || 'Erreur lors de la synchronisation')
    } finally {
      setSyncing(false)
    }
  }

  const disconnectStrava = async () => {
    if (!confirm('Voulez-vous vraiment déconnecter votre compte Strava ?')) return

    try {
      await axios.delete('http://localhost:8000/api/strava/disconnect')
      toast.success('Compte Strava déconnecté')
      await loadStravaStatus()
    } catch (error: any) {
      console.error('Error disconnecting Strava:', error)
      toast.error('Erreur lors de la déconnexion')
    }
  }

  const startAutoImport = async () => {
    setLoadingStatus(true)
    try {
      await axios.post('http://localhost:8000/api/auto-import/start')
      await loadAutoImportStatus()
      toast.success('Import automatique démarré ! Le système surveille maintenant le dossier iCloud Drive.')
    } catch (error: any) {
      console.error('Error starting auto-import:', error)
      toast.error(error?.response?.data?.detail || 'Erreur lors du démarrage de l\'import automatique')
    } finally {
      setLoadingStatus(false)
    }
  }

  const stopAutoImport = async () => {
    setLoadingStatus(true)
    try {
      await axios.post('http://localhost:8000/api/auto-import/stop')
      await loadAutoImportStatus()
      toast.success('Import automatique arrêté')
    } catch (error: any) {
      console.error('Error stopping auto-import:', error)
      toast.error(error?.response?.data?.detail || 'Erreur lors de l\'arrêt de l\'import automatique')
    } finally {
      setLoadingStatus(false)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const data = await uploadAppleHealthExport(file)
      setResult(data)
      setFile(null)
      toast.success(`Import réussi : ${data.workouts_imported} séances importées`)
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de l\'import'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Importer mes données</h1>
      <p className="text-muted-foreground mb-8">
        Connectez Strava ou importez depuis Apple Santé
      </p>

      {/* Strava Connection Card */}
      <Card className="max-w-2xl mb-6">
        <CardHeader>
          <CardTitle>🚴 Connexion Strava</CardTitle>
          <CardDescription>
            Synchronisez automatiquement vos activités running depuis Strava
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stravaStatus && (
            <>
              {stravaStatus.connected ? (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ Connecté en tant que {stravaStatus.athlete?.firstname} {stravaStatus.athlete?.lastname}
                    </p>
                    {stravaStatus.last_sync && (
                      <p className="text-xs text-green-600 mt-1">
                        Dernière synchronisation: {new Date(stravaStatus.last_sync).toLocaleString('fr-FR')}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={syncStrava}
                      disabled={syncing}
                      className="flex-1"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
                    </Button>
                    <Button
                      onClick={disconnectStrava}
                      variant="outline"
                      className="flex-1"
                    >
                      Déconnecter
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Connectez votre compte Strava pour importer automatiquement vos courses
                    </p>
                  </div>

                  <Button
                    onClick={connectStrava}
                    className="w-full bg-[#FC4C02] hover:bg-[#E34402]"
                  >
                    Se connecter avec Strava
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Auto-Import Card */}
      <Card className="max-w-2xl mb-6">
        <CardHeader>
          <CardTitle>Import Automatique via iCloud Drive</CardTitle>
          <CardDescription>
            Configuration de la synchronisation automatique depuis votre iPhone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {autoImportStatus && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Statut:</span>
                <Badge variant={autoImportStatus.is_running ? "default" : "secondary"}>
                  {autoImportStatus.is_running ? "✓ Actif" : "○ Inactif"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Dossier surveillé:</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {autoImportStatus.watch_folder.replace(/^\/Users\/[^/]+/, '~')}
                </span>
              </div>

              {autoImportStatus.export_file_exists && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ Fichier export.zip détecté
                  </p>
                  {autoImportStatus.export_file_modified && (
                    <p className="text-xs text-green-600 mt-1">
                      Dernière modification: {new Date(autoImportStatus.export_file_modified).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              )}

              {!autoImportStatus.export_file_exists && autoImportStatus.is_running && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    En attente du fichier export.zip...
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Déposez votre export Apple Health dans le dossier iCloud Drive
                  </p>
                </div>
              )}

              {autoImportStatus.last_import_time && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Dernier import:</span>
                  <span>{new Date(autoImportStatus.last_import_time).toLocaleString('fr-FR')}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {!autoImportStatus?.is_running ? (
              <Button
                onClick={startAutoImport}
                disabled={loadingStatus}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Démarrer l'import automatique
              </Button>
            ) : (
              <Button
                onClick={stopAutoImport}
                disabled={loadingStatus}
                variant="outline"
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                Arrêter
              </Button>
            )}
            <Button
              onClick={loadAutoImportStatus}
              disabled={loadingStatus}
              variant="outline"
              size="icon"
            >
              <RefreshCw className={`h-4 w-4 ${loadingStatus ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 font-medium mb-1">
              📱 Configuration requise sur iPhone
            </p>
            <p className="text-xs text-yellow-700">
              Vous devez créer un raccourci iOS pour exporter automatiquement vos données vers iCloud Drive.
              Instructions détaillées ci-dessous après avoir démarré l'import automatique.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Manual Import Card */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Import Manuel</CardTitle>
          <CardDescription>
            Ou importez manuellement un export Apple Santé :<br/>
            1. Ouvrez l'app Santé sur votre iPhone<br/>
            2. Touchez votre photo de profil<br/>
            3. Faites défiler vers le bas et touchez "Exporter toutes les données de santé"<br/>
            4. Partagez le fichier ZIP avec votre Mac et téléversez-le ci-dessous
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {file ? (
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium">Cliquez pour sélectionner un fichier</p>
                  <p className="text-xs text-muted-foreground">ou glissez-déposez ici</p>
                  <p className="text-xs text-muted-foreground mt-2">Fichier .zip (max 50MB)</p>
                </div>
              )}
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">✅ Import réussi!</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• {result.workouts_imported} séances importées</li>
                {result.duplicates_skipped > 0 && (
                  <li>• {result.duplicates_skipped} doublons ignorés</li>
                )}
                {result.date_range && (
                  <li>
                    • Période: du {new Date(result.date_range.start).toLocaleDateString('fr-FR')} au{' '}
                    {new Date(result.date_range.end).toLocaleDateString('fr-FR')}
                  </li>
                )}
              </ul>
              <Button
                className="mt-4"
                onClick={() => window.location.href = '/workouts'}
              >
                Voir mes entraînements
              </Button>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? 'Import en cours...' : 'Importer'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
