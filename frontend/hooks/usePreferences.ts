'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api'

export interface UserPreferences {
  id: number
  user_id: number
  preferred_days: string[]
  preferred_time: string
  calendar_sync_enabled: boolean
  reminder_minutes: number[]
  created_at: string
  updated_at: string
}

export interface PreferencesUpdate {
  preferred_days?: string[]
  preferred_time?: string
  calendar_sync_enabled?: boolean
  reminder_minutes?: number[]
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPreferences = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.get<UserPreferences>('/api/preferences')
      setPreferences(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load preferences')
      console.error('Error fetching preferences:', err)
    } finally {
      setLoading(false)
    }
  }

  const updatePreferences = async (updates: PreferencesUpdate) => {
    try {
      setError(null)
      const response = await apiClient.patch<UserPreferences>('/api/preferences', updates)
      setPreferences(response.data)
      return { success: true, data: response.data }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to update preferences'
      setError(errorMessage)
      console.error('Error updating preferences:', err)
      return { success: false, error: errorMessage }
    }
  }

  useEffect(() => {
    fetchPreferences()
  }, [])

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    refetch: fetchPreferences
  }
}
