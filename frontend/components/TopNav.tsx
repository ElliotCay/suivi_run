'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Activity, BarChart3, Sparkles, Award, Settings, CalendarDays } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/workouts', label: 'Séances', icon: Activity },
  { href: '/records', label: 'Records', icon: Award },
  { href: '/training-block', label: 'Blocs', icon: CalendarDays },
  { href: '/coach', label: 'Coach', icon: Sparkles },
  { href: '/settings', label: 'Réglages', icon: Settings },
]

export default function TopNav() {
  const pathname = usePathname()
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark')
  const isHomePage = pathname === '/'

  // Sur la homepage: fond adaptatif comme avant
  // Sur les autres pages: fond avec glassmorphism visible
  const bgClass = isHomePage
    ? (isDark ? 'bg-black/60' : 'bg-white/35')
    : (isDark ? 'bg-black/70' : 'bg-white/70')

  const textClass = isHomePage ? 'text-white' : (isDark ? 'text-white' : 'text-black')

  return (
    <nav className="sticky top-4 z-50 w-full px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          {/* Logo pill - Left */}
          <Link href="/" className={cn(
            "flex items-center justify-center gap-0 group h-12 px-4 rounded-full border shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl relative overflow-hidden",
            bgClass,
            isHomePage
              ? "border-white/40 hover:bg-white/30"
              : (isDark ? "border-white/20 hover:bg-black/90" : "border-black/10 hover:bg-white/95")
          )} style={{
            backdropFilter: 'blur(40px) saturate(150%)',
            WebkitBackdropFilter: 'blur(40px) saturate(150%)',
            boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 10px 30px -10px rgba(0, 0, 0, 0.3)',
          }}>
            <div className="flex items-center justify-center h-full px-1">
              <span className={cn("font-branch text-[1.7rem] font-bold tracking-tight transition-all duration-300 hover:scale-105 lowercase -mt-1", textClass)}>
                allure
              </span>
            </div>
          </Link>

          {/* Navigation Items - Center */}
          <div className={cn(
            "flex items-center gap-1 h-12 px-4 rounded-full border shadow-xl transition-all duration-300 relative overflow-hidden",
            bgClass,
            isHomePage
              ? "border-white/40"
              : (isDark ? "border-white/20" : "border-black/10")
          )} style={{
            backdropFilter: 'blur(40px) saturate(150%)',
            WebkitBackdropFilter: 'blur(40px) saturate(150%)',
            boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 10px 30px -10px rgba(0, 0, 0, 0.3)',
          }}>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative"
                >
                  <div className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200',
                    isHomePage ? (
                      isActive
                        ? 'text-white bg-white/20'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    ) : (
                      isActive
                        ? (isDark ? 'text-white bg-white/20' : 'text-black bg-black/10')
                        : (isDark ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-black/70 hover:text-black hover:bg-black/5')
                    )
                  )}>
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Theme Toggle pill - Right */}
          <div className={cn(
            "flex items-center h-12 w-12 rounded-full border shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl relative overflow-hidden",
            bgClass,
            isHomePage
              ? "border-white/40 hover:bg-white/30"
              : (isDark ? "border-white/20 hover:bg-black/90" : "border-black/10 hover:bg-white/95")
          )} style={{
            backdropFilter: 'blur(40px) saturate(150%)',
            WebkitBackdropFilter: 'blur(40px) saturate(150%)',
            boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 10px 30px -10px rgba(0, 0, 0, 0.3)',
          }}>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  )
}
