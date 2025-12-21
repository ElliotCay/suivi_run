'use client'

import { useState, useEffect } from 'react'
import NavbarOrchestrator, { type NavbarMode } from './NavbarOrchestrator'

const NAVBAR_STORAGE_KEY = 'navbar-preference'
const isNavbarMode = (value: any): value is NavbarMode =>
  value === 'floating' || value === 'compact' || value === 'classic'

export default function Navigation() {
  // Default to floating as recommended
  const [activeDesign, setActiveDesign] = useState<NavbarMode>('floating')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Try to restore preference from local storage
    const saved = localStorage.getItem(NAVBAR_STORAGE_KEY)
    if (isNavbarMode(saved)) {
      setActiveDesign(saved)
    } else if (saved === 'floating-compact') {
      // Migrate old value to new name
      setActiveDesign('compact')
      localStorage.setItem(NAVBAR_STORAGE_KEY, 'compact')
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === NAVBAR_STORAGE_KEY && isNavbarMode(event.newValue)) {
        setActiveDesign(event.newValue)
      }
    }

    const handleCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (isNavbarMode(detail)) {
        setActiveDesign(detail)
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('navbar-preference-change', handleCustomEvent)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('navbar-preference-change', handleCustomEvent)
    }
  }, [])

  if (!mounted) return null

  return <NavbarOrchestrator mode={activeDesign} />
}
