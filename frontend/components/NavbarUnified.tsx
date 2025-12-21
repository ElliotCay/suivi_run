'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Activity, Award, BarChart3, CalendarDays, Settings, Sparkles } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'

export type NavbarMode = 'classic' | 'floating' | 'compact'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/workouts', label: 'Séances', icon: Activity },
  { href: '/records', label: 'Records', icon: Award },
  { href: '/planning', label: 'Coach AI', icon: Sparkles },
  { href: '/settings', label: 'Plus', icon: Settings },
]

interface NavbarUnifiedProps {
  mode: NavbarMode
  isPreview?: boolean
}

export default function NavbarUnified({ mode, isPreview = false }: NavbarUnifiedProps) {
  const pathname = usePathname()
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const previousMode = useRef<NavbarMode | null>(null)

  useEffect(() => {
    setMounted(true)

    const handleScroll = () => {
      setHasScrolled(window.scrollY > 32)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark')
  const isHomePage = pathname === '/'
  const shouldCollapse = mode === 'compact' && hasScrolled && !isHovered
  const cameFrom = previousMode.current
  const showCompactLabels = mode === 'compact' ? isHovered : true

  const superGlassStyle = useMemo(
    () => ({
      backdropFilter: 'blur(40px) saturate(150%)',
      WebkitBackdropFilter: 'blur(40px) saturate(150%)',
      boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 10px 30px -10px rgba(0, 0, 0, 0.3)',
    }),
    []
  )

  const classicBgClass = isHomePage ? (isDark ? 'bg-black/60' : 'bg-white/35') : isDark ? 'bg-black/70' : 'bg-white/70'
  const floatingBgClass = isDark ? 'bg-black/35' : 'bg-white/10'
  const floatingBgColor = isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.1)'
  const transparentBgColor = 'rgba(0,0,0,0)'
  const classicBgColor = isHomePage ? (isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.35)') : isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'
  const borderClass = isHomePage ? 'border-white/40' : isDark ? 'border-white/20' : 'border-black/10'
  const classicTextClass = isHomePage ? 'text-white' : isDark ? 'text-white' : 'text-black'

  const topOffset = isPreview ? 0 : mode === 'classic' ? 16 : 8
  const containerGap = mode === 'classic' ? 12 : shouldCollapse ? 0 : 12

  const navPaddingX = mode === 'classic' ? 0 : shouldCollapse ? 12 : 16
  const navPaddingY = mode === 'classic' ? 0 : 8
  const navMaxWidth =
    mode === 'compact'
      ? shouldCollapse
        ? 0
        : isHovered
        ? 980
        : 360
      : 980

  const navBackgroundClass = mode === 'classic' ? 'bg-transparent' : floatingBgClass
  const navBorderWidth = mode === 'classic' ? 0 : 1
  const softEase = [0.16, 1, 0.3, 1] as const

  // Slightly stagger label animation when coming from classic to compact to respect merge + reduction sequencing
  const labelDelay = 0

  return (
    <motion.div
      className={cn(isPreview ? 'relative px-4 pointer-events-none' : 'sticky z-50 px-4')}
      style={{ top: topOffset }}
      layout
    >
      <div className={cn('flex w-full max-w-6xl mx-auto pointer-events-none', mode === 'classic' ? 'justify-between' : 'justify-center')}>
        <motion.nav
          layout
          initial={false}
          animate={{
            gap: containerGap,
            paddingLeft: navPaddingX,
            paddingRight: navPaddingX,
            paddingTop: navPaddingY,
            paddingBottom: navPaddingY,
            borderWidth: navBorderWidth,
            backgroundColor: mode === 'classic' ? transparentBgColor : floatingBgColor,
          }}
          transition={{
            type: 'tween',
            duration: 0.36,
            ease: softEase,
            layout: { type: 'tween', duration: 0.4, ease: softEase },
          }}
          className={cn(
            isPreview ? 'pointer-events-none' : 'pointer-events-auto',
            'flex items-center',
            mode === 'classic' ? 'w-full justify-between' : 'rounded-full shadow-xl',
            navBackgroundClass,
            navBorderWidth ? borderClass : 'border-transparent',
            mode === 'classic' && 'shadow-none'
          )}
          style={mode === 'classic' ? { boxShadow: 'none' } : superGlassStyle}
        >
          <motion.div
            key={`logo-${mode}`}
            layoutId="navbar-logo"
            layout
            className={cn(
              'flex items-center justify-center transition-all duration-300',
              mode === 'classic'
                ? cn(
                    'h-12 px-4 rounded-full border shadow-xl hover:scale-105 hover:shadow-2xl',
                    classicBgClass,
                    borderClass
                  )
                : cn(shouldCollapse ? 'mr-0' : 'mr-2')
            )}
            animate={{
              backgroundColor: mode === 'classic' ? classicBgColor : transparentBgColor,
              marginRight: mode === 'classic' ? 0 : shouldCollapse ? 0 : 8,
            }}
            style={mode === 'classic' ? superGlassStyle : { backgroundColor: transparentBgColor }}
            transition={{
              marginRight: { duration: 0.35, ease: softEase },
              layout: { type: 'tween', duration: 0.4, ease: softEase },
              backgroundColor: { duration: 0.25, ease: 'easeInOut' },
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <Link href="/" className="flex items-center justify-center h-full">
              <span
                className={cn(
                  'font-branch text-[1.7rem] font-bold tracking-tight lowercase -mt-1 transition-transform duration-300 hover:scale-105',
                  mode === 'classic' ? classicTextClass : pathname === '/' ? 'text-white' : 'text-foreground'
                )}
              >
                allure
              </span>
            </Link>
          </motion.div>

          <motion.div
            key={`nav-${mode}`}
            layoutId="navbar-nav"
            layout
            initial={false}
            className={cn(
              'flex items-center overflow-hidden',
              mode === 'classic'
                ? cn('h-12 px-4 rounded-full border shadow-xl', classicBgClass, borderClass)
                : 'px-1'
            )}
            style={mode === 'classic' ? superGlassStyle : { backgroundColor: transparentBgColor }}
            animate={{
              backgroundColor: mode === 'classic' ? classicBgColor : transparentBgColor,
              maxWidth: navMaxWidth,
              opacity: mode === 'compact' && shouldCollapse ? 0 : 1,
              paddingLeft: mode === 'classic' ? 16 : mode === 'compact' && shouldCollapse ? 0 : 4,
              paddingRight: mode === 'classic' ? 16 : mode === 'compact' && shouldCollapse ? 0 : 4,
            }}
            transition={{
              maxWidth: { duration: 0.2, ease: 'easeOut' },
              opacity: { duration: 0.2, ease: 'easeOut' },
              paddingLeft: { duration: 0.2, ease: 'easeOut' },
              paddingRight: { duration: 0.2, ease: 'easeOut' },
              layout: { type: 'tween', duration: 0.4, ease: softEase },
              backgroundColor: { duration: 0.3, ease: 'easeInOut' },
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                const linkTransparentStyle = mode === 'classic' ? undefined : { backgroundColor: 'transparent' as const }

                const labelTarget =
                  mode === 'compact'
                    ? showCompactLabels
                      ? { maxWidth: 110, opacity: 1, marginLeft: 8 }
                      : { maxWidth: 0, opacity: 0, marginLeft: 0 }
                    : { maxWidth: 110, opacity: 1, marginLeft: mode === 'classic' ? 0 : 8 }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center justify-center rounded-full text-sm font-medium transition-all duration-300',
                      mode === 'classic' ? 'px-3 py-1.5 gap-2' : 'px-3.5 py-2.5',
                      mode === 'classic'
                        ? isHomePage
                          ? isActive
                            ? 'text-white bg-white/20'
                            : 'text-white/80 hover:text-white hover:bg-white/10'
                          : isActive
                          ? isDark
                            ? 'text-white bg-white/20'
                            : 'text-black bg-black/10'
                          : isDark
                          ? 'text-white/80 hover:text-white hover:bg-white/10'
                          : 'text-black/70 hover:text-black hover:bg-black/5'
                        : isActive
                        ? 'text-primary-foreground'
                        : pathname === '/'
                        ? 'text-white/80 hover:text-white bg-transparent hover:bg-transparent'
                        : 'text-muted-foreground hover:text-foreground bg-transparent hover:bg-transparent'
                    )}
                    style={linkTransparentStyle}
                  >
                      {! (mode === 'classic') && isActive && (
                        <motion.span
                          layoutId="activeNav"
                          className="absolute inset-0 rounded-full bg-primary -z-10 shadow-[0_0_12px_rgba(0,0,0,0.15)]"
                          transition={{ type: 'tween', duration: 0.2, ease: 'easeInOut' }}
                      />
                    )}
                    <Icon className={cn('h-4 w-4 transition-transform duration-300', isActive && mode !== 'classic' && 'scale-110')} />
                    <motion.span
                      className="overflow-hidden whitespace-nowrap"
                      initial={false}
                      animate={labelTarget}
                      transition={{ duration: 0.4, ease: softEase, delay: labelDelay }}
                    >
                      {item.label}
                    </motion.span>
                  </Link>
                )
              })}
            </div>
          </motion.div>

          <motion.div
            layoutId="navbar-theme"
            layout
            className={cn(
              'flex items-center overflow-hidden',
              mode === 'classic'
                ? cn('h-12 w-12 justify-center rounded-full border shadow-xl hover:scale-105 hover:shadow-2xl', classicBgClass, borderClass)
                : ''
            )}
            style={mode === 'classic' ? superGlassStyle : undefined}
            animate={{
              maxWidth: mode === 'classic' ? 56 : mode === 'compact' && shouldCollapse ? 0 : 140,
              opacity: mode === 'compact' && shouldCollapse ? 0 : 1,
            }}
            transition={{
              maxWidth: { duration: 0.2, ease: 'easeOut' },
              opacity: { duration: 0.2, ease: 'easeOut' },
              layout: { type: 'tween', duration: 0.4, ease: softEase },
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {mode !== 'classic' && (
              <motion.div
                className="mx-2 h-6 w-px bg-white/10"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: mode === 'compact' && shouldCollapse ? 0 : 1, scaleY: mode === 'compact' && shouldCollapse ? 0 : 1 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              />
            )}
            <div className={cn('flex items-center', mode !== 'classic' && 'gap-1')}>
              <ThemeToggle />
            </div>
          </motion.div>
        </motion.nav>
      </div>
    </motion.div>
  )
}
