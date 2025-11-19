'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

function StravaCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [athleteName, setAthleteName] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const scope = searchParams.get('scope')
      const state = searchParams.get('state')
      const error = searchParams.get('error')

      if (error) {
        setStatus('error')
        setMessage(`Erreur d'autorisation: ${error}`)
        return
      }

      if (!code || !scope) {
        setStatus('error')
        setMessage('Code d\'autorisation manquant')
        return
      }

      try {
        // Call backend callback endpoint
        const response = await axios.get('http://127.0.0.1:8000/api/strava/callback', {
          params: { code, scope, state }
        })

        setStatus('success')
        setAthleteName(`${response.data.athlete.firstname} ${response.data.athlete.lastname}`)
        setMessage('Connexion réussie ! Redirection vers la page d\'import...')

        // Redirect to import page after 2 seconds
        setTimeout(() => {
          router.push('/import')
        }, 2000)

      } catch (err: any) {
        console.error('Callback error:', err)
        setStatus('error')
        setMessage(err.response?.data?.detail || 'Erreur lors de la connexion')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="container mx-auto py-16 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
            Connexion Strava
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Connexion en cours...'}
            {status === 'success' && 'Connexion réussie'}
            {status === 'error' && 'Échec de la connexion'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="text-center p-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-4">
                Finalisation de la connexion...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center p-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <p className="font-medium text-lg mt-4">Bienvenue {athleteName} !</p>
              <p className="text-sm text-muted-foreground mt-2">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{message}</p>
              </div>
              <Button
                onClick={() => router.push('/import')}
                variant="outline"
                className="w-full"
              >
                Retour à la page d'import
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function StravaCallbackPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-16 flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Connexion Strava
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-4">
                Chargement...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <StravaCallbackContent />
    </Suspense>
  )
}
