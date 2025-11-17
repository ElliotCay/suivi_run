import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Shoe {
  id: number
  user_id: number
  brand: string
  model: string
  type?: string // training, competition, trail, recovery
  purchase_date?: string
  initial_km: number
  current_km: number // km run since purchase
  total_km: number // initial_km + current_km
  max_km: number
  is_active: boolean
  is_default: boolean
  description?: string
  wear_percentage: number
  km_remaining: number
  alert_level?: string // none, warning, danger, critical
  created_at: string
  updated_at: string
}

export interface ShoeCreate {
  brand: string
  model: string
  type?: string
  purchase_date?: string
  initial_km?: number
  max_km?: number
  is_active?: boolean
  is_default?: boolean
  description?: string
}

export interface ShoeUpdate {
  brand?: string
  model?: string
  type?: string
  purchase_date?: string
  initial_km?: number
  current_km?: number
  max_km?: number
  is_active?: boolean
  is_default?: boolean
  description?: string
}

export interface ShoeAlert {
  shoe_id: number
  brand: string
  model: string
  current_km: number
  max_km: number
  alert_level: string
  wear_percentage: number
  km_remaining: number
}

export function useShoes(activeOnly: boolean = false) {
  const [shoes, setShoes] = useState<Shoe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadShoes = async () => {
    try {
      setLoading(true)
      const params = activeOnly ? { active_only: true } : {}
      const response = await axios.get(`${API_BASE}/api/shoes`, { params })
      setShoes(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des chaussures')
      console.error('Error loading shoes:', err)
    } finally {
      setLoading(false)
    }
  }

  const createShoe = async (data: ShoeCreate) => {
    try {
      const response = await axios.post(`${API_BASE}/api/shoes`, data)
      await loadShoes() // Reload list after creation
      return { success: true, data: response.data }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de la création' }
    }
  }

  const updateShoe = async (shoeId: number, data: ShoeUpdate) => {
    try {
      const response = await axios.patch(`${API_BASE}/api/shoes/${shoeId}`, data)
      await loadShoes() // Reload list after update
      return { success: true, data: response.data }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de la mise à jour' }
    }
  }

  const deleteShoe = async (shoeId: number) => {
    try {
      await axios.delete(`${API_BASE}/api/shoes/${shoeId}`)
      await loadShoes() // Reload list after deletion
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de la suppression' }
    }
  }

  const addKilometers = async (shoeId: number, km: number) => {
    try {
      const response = await axios.post(`${API_BASE}/api/shoes/${shoeId}/add-km`, null, {
        params: { km }
      })
      await loadShoes() // Reload list after update
      return { success: true, data: response.data }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de l\'ajout de km' }
    }
  }

  useEffect(() => {
    loadShoes()
  }, [activeOnly])

  return {
    shoes,
    loading,
    error,
    createShoe,
    updateShoe,
    deleteShoe,
    addKilometers,
    reload: loadShoes
  }
}

export function useShoeAlerts() {
  const [alerts, setAlerts] = useState<ShoeAlert[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadAlerts = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE}/api/shoes/alerts/active`)
      setAlerts(response.data.alerts)
      setCount(response.data.count)
    } catch (err) {
      console.error('Error loading shoe alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  return {
    alerts,
    count,
    loading,
    reload: loadAlerts
  }
}
