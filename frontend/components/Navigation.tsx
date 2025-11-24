'use client'

import { useState, useEffect } from 'react'
import NavbarOrchestrator, { type NavbarMode } from './NavbarOrchestrator'
import { Button } from '@/components/ui/button'
import { LayoutTemplate, MonitorPlay, History, Minimize } from 'lucide-react'

const NAVBAR_STORAGE_KEY = 'navbar-preference'
const isNavbarMode = (value: any): value is NavbarMode =>
  value === 'floating' || value === 'compact' || value === 'classic'

export default function Navigation() {
  // Default to floating as recommended
  const [activeDesign, setActiveDesign] = useState<NavbarMode>('floating')
  const [mounted, setMounted] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const persistNavbarStyle = (style: NavbarMode) => {
    if (isTransitioning) return // Lock during transition

    setIsTransitioning(true)
    setActiveDesign(style)
    localStorage.setItem(NAVBAR_STORAGE_KEY, style)
    window.dispatchEvent(new CustomEvent('navbar-preference-change', { detail: style }))

    // Unlock after max transition duration (1200ms as per spec)
    setTimeout(() => setIsTransitioning(false), 1200)
  }

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

  const toggleDesign = () => {
    let newDesign: NavbarMode

    if (activeDesign === 'floating') newDesign = 'compact'
    else if (activeDesign === 'compact') newDesign = 'classic'
    else newDesign = 'floating'

    persistNavbarStyle(newDesign)
  }

  if (!mounted) return null

  return (
    <>
      <NavbarOrchestrator mode={activeDesign} />

      {/* Dev Toggle Button */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <Button
          onClick={toggleDesign}
          size="sm"
          disabled={isTransitioning}
          className="bg-blue-600 text-white hover:bg-blue-700 shadow-2xl border-2 border-white/20 gap-2 disabled:opacity-50"
        >
          {activeDesign === 'floating' ? (
            <>
              <Minimize className="h-4 w-4" />
              <span>Switch to Compact</span>
            </>
          ) : activeDesign === 'compact' ? (
            <>
              <History className="h-4 w-4" />
              <span>Switch to Classic</span>
            </>
          ) : (
            <>
              <MonitorPlay className="h-4 w-4" />
              <span>Switch to Floating</span>
            </>
          )}
        </Button>
      </div>
    </>
  )
}
