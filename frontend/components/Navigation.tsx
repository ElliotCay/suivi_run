'use client'

import { useState, useEffect } from 'react'
import Navbar from './Navbar'
import { Button } from '@/components/ui/button'
import { LayoutTemplate, MonitorPlay, History, Minimize } from 'lucide-react'

type NavbarStyle = 'floating' | 'floating-compact' | 'classic'
const NAVBAR_STORAGE_KEY = 'navbar-preference'
const isNavbarStyle = (value: any): value is NavbarStyle =>
  value === 'floating' || value === 'floating-compact' || value === 'classic'

export default function Navigation() {
  // Default to floating (Concept 1) as recommended
  const [activeDesign, setActiveDesign] = useState<NavbarStyle>('floating')
  const [mounted, setMounted] = useState(false)

  const persistNavbarStyle = (style: NavbarStyle) => {
    setActiveDesign(style)
    localStorage.setItem(NAVBAR_STORAGE_KEY, style)
    window.dispatchEvent(new CustomEvent('navbar-preference-change', { detail: style }))
  }

  useEffect(() => {
    setMounted(true)
    // Try to restore preference from local storage
    const saved = localStorage.getItem(NAVBAR_STORAGE_KEY)
    if (isNavbarStyle(saved)) {
      setActiveDesign(saved)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === NAVBAR_STORAGE_KEY && isNavbarStyle(event.newValue)) {
        setActiveDesign(event.newValue)
      }
    }

    const handleCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (isNavbarStyle(detail)) {
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
    let newDesign: NavbarStyle

    if (activeDesign === 'floating') newDesign = 'floating-compact'
    else if (activeDesign === 'floating-compact') newDesign = 'classic'
    else newDesign = 'floating'

    persistNavbarStyle(newDesign)
  }

  if (!mounted) return null

  return (
    <>
      <Navbar mode={activeDesign} />

      {/* Dev Toggle Button */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <Button
          onClick={toggleDesign}
          size="sm"
          className="bg-blue-600 text-white hover:bg-blue-700 shadow-2xl border-2 border-white/20 gap-2"
        >
          {activeDesign === 'floating' ? (
            <>
              <Minimize className="h-4 w-4" />
              <span>Switch to Compact</span>
            </>
          ) : activeDesign === 'floating-compact' ? (
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
