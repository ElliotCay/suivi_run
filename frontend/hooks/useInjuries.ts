import { useState, useEffect } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export type InjuryStatus = 'active' | 'monitoring' | 'resolved'
export type InjurySeverity = 'minor' | 'moderate' | 'severe'
export type InjuryLocation = 'ankle' | 'knee' | 'it_band' | 'tfl' | 'calf' | 'achilles' | 'plantar' | 'shin'

export interface Injury {
  id: number
  user_id: number
  injury_type: string
  location: InjuryLocation
  side?: 'left' | 'right' | 'both'
  severity: InjurySeverity
  occurred_at: string
  resolved_at?: string
  recurrence_count: number
  description?: string
  status: InjuryStatus
  strengthening_focus?: string[]
  created_at: string
  updated_at: string
}

export interface InjuryCreate {
  injury_type: string
  location: InjuryLocation
  side?: 'left' | 'right' | 'both'
  severity: InjurySeverity
  occurred_at: string
  resolved_at?: string
  recurrence_count: number
  description?: string
  status: InjuryStatus
  strengthening_focus?: string[]
}

export interface InjuryUpdate {
  injury_type?: string
  location?: InjuryLocation
  side?: 'left' | 'right' | 'both'
  severity?: InjurySeverity
  resolved_at?: string
  recurrence_count?: number
  description?: string
  status?: InjuryStatus
  strengthening_focus?: string[]
}

export function useInjuries(autoLoad = true) {
  const [injuries, setInjuries] = useState<Injury[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInjuries = async (status?: InjuryStatus) => {
    setLoading(true)
    setError(null)
    try {
      const url = status
        ? `${API_BASE}/injury-history?status=${status}`
        : `${API_BASE}/injury-history`

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch injuries')

      const data = await response.json()
      setInjuries(data)
      return { success: true, data }
    } catch (err: any) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const createInjury = async (injury: InjuryCreate) => {
    try {
      const response = await fetch(`${API_BASE}/injury-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(injury)
      })

      if (!response.ok) throw new Error('Failed to create injury')

      const data = await response.json()
      setInjuries([data, ...injuries])
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const updateInjury = async (id: number, update: InjuryUpdate) => {
    try {
      const response = await fetch(`${API_BASE}/injury-history/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update)
      })

      if (!response.ok) throw new Error('Failed to update injury')

      const data = await response.json()
      setInjuries(injuries.map(i => i.id === id ? data : i))
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const deleteInjury = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE}/injury-history/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete injury')

      setInjuries(injuries.filter(i => i.id !== id))
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  useEffect(() => {
    if (autoLoad) {
      fetchInjuries()
    }
  }, [autoLoad])

  return {
    injuries,
    loading,
    error,
    fetchInjuries,
    createInjury,
    updateInjury,
    deleteInjury,
    reload: fetchInjuries
  }
}
