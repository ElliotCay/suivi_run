import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Profile {
  id: number
  name: string
  age: number
  weight: number
  height: number
  level: string
  fcmax: number
  vma: number
  ai_mode: string
  profile_picture: string | null
}

interface TrainingPreferences {
  id?: number
  user_id?: number
  preferred_days: string[]
  preferred_time: string
  calendar_sync_enabled?: boolean
  reminder_minutes?: number[]
  created_at?: string
  updated_at?: string
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE}/api/profile`)
      setProfile(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du profil')
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (data: Partial<Profile>) => {
    try {
      const response = await axios.patch(`${API_BASE}/api/profile`, data)
      setProfile(response.data)
      return { success: true, data: response.data }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de la mise à jour' }
    }
  }

  const uploadProfilePicture = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(`${API_BASE}/api/profile/picture`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setProfile(response.data)
      return { success: true, data: response.data }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de l\'upload' }
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  return {
    profile,
    loading,
    error,
    updateProfile,
    uploadProfilePicture,
    reload: loadProfile
  }
}

export function useTrainingPreferences() {
  const [preferences, setPreferences] = useState<TrainingPreferences | null>(null)
  const [loading, setLoading] = useState(true)

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE}/api/preferences`)
      setPreferences(response.data)
    } catch (err) {
      console.error('Error loading preferences:', err)
    } finally {
      setLoading(false)
    }
  }

  const updatePreferences = async (data: Partial<TrainingPreferences>) => {
    try {
      const response = await axios.patch(`${API_BASE}/api/preferences`, data)
      setPreferences(response.data)
      return { success: true, data: response.data }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de la mise à jour' }
    }
  }

  useEffect(() => {
    loadPreferences()
  }, [])

  return {
    preferences,
    loading,
    updatePreferences,
    reload: loadPreferences
  }
}
