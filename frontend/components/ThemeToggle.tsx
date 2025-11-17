'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isHomePage = pathname === '/'
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark')

  const iconClass = isHomePage ? 'text-white' : (isDark ? 'text-white' : 'text-black')
  const hoverClass = isHomePage
    ? 'hover:bg-white/10'
    : (isDark ? 'hover:bg-white/10' : 'hover:bg-black/5')

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={cn("w-full h-full rounded-full", iconClass, hoverClass)}>
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn("w-full h-full rounded-full transition-all duration-300", iconClass, hoverClass)}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
