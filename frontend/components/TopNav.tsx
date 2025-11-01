'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, Activity, BarChart3, Sparkles, User, Upload, Award, Settings, Calendar } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { motion } from 'framer-motion'

const navItems = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/workouts', label: 'Séances', icon: Activity },
  { href: '/records', label: 'Records', icon: Award },
  { href: '/suggestions', label: 'Suggestions', icon: Sparkles },
  { href: '/training-plans', label: 'Plans', icon: Calendar },
  { href: '/profile', label: 'Profil', icon: User },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/settings', label: 'Paramètres', icon: Settings },
]

export default function TopNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-6">
        <div className="flex h-14 items-center justify-between">
          {/* Logo - Minimal */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground group-hover:bg-foreground/90 transition-colors">
              <Activity className="h-4 w-4 text-background" />
            </div>
            <span className="text-lg font-bold">
              Suivi Course
            </span>
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center gap-1">
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
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'text-foreground bg-accent'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}>
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              )
            })}

            {/* Theme Toggle */}
            <div className="ml-2 pl-2 border-l border-border">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
