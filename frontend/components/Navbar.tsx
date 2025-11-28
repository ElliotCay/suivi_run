'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Activity, BarChart3, Sparkles, Award, Settings, CalendarDays } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useEffect, useRef, useState } from 'react'
import { motion, LayoutGroup } from 'framer-motion'
import { useTheme } from 'next-themes'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/workouts', label: 'Séances', icon: Activity },
    { href: '/records', label: 'Records', icon: Award },
    { href: '/training-block', label: 'Bloc 4 sem.', icon: CalendarDays },
    { href: '/planning', label: 'Planning', icon: Sparkles },
    { href: '/settings', label: 'Plus', icon: Settings },
]

export type NavbarMode = 'classic' | 'floating' | 'compact'

interface NavbarProps {
    mode: NavbarMode
}

export default function Navbar({ mode }: NavbarProps) {
    const pathname = usePathname()
    const { theme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [hasScrolled, setHasScrolled] = useState(false)
    const lastScrollY = useRef(0)

    useEffect(() => {
        setMounted(true)
        lastScrollY.current = window.scrollY

        const handleScroll = () => {
            const currentY = window.scrollY
            setHasScrolled(currentY > 32)
            lastScrollY.current = currentY
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark')
    const isHomePage = pathname === '/'

    // --- Style Logic ---

    // "Super Glass" Style - Defined in ALLURE_DESIGN_PHILOSOPHY.md
    const superGlassStyle = {
        backdropFilter: 'blur(40px) saturate(150%)',
        WebkitBackdropFilter: 'blur(40px) saturate(150%)',
        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 10px 30px -10px rgba(0, 0, 0, 0.3)',
    }

    // Background classes
    // Classic: Adaptive based on theme/home
    const classicBgClass = isHomePage
        ? (isDark ? 'bg-black/60' : 'bg-white/35')
        : (isDark ? 'bg-black/70' : 'bg-white/70')

    // Floating: Consistent semi-transparent white/black
    const floatingBgClass = isDark ? "bg-black/60" : "bg-white/35"

    const borderClass = isHomePage
        ? "border-white/40"
        : (isDark ? "border-white/20" : "border-black/10")

    const classicTextClass = isHomePage ? 'text-white' : (isDark ? 'text-white' : 'text-black')

    // "Floating" style helpers (from FloatingNavbar.tsx)
    // const floatingBgClass = "bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg" // Replaced

    // --- Mode Logic ---

    const isClassic = mode === 'classic'
    const isCompact = mode === 'compact' || mode === 'floating-compact'

    // Compact logic: 
    // - If NOT scrolled: behave like floating (all visible)
    // - If scrolled AND NOT hovered: hide nav items (only logo visible)
    // - If scrolled AND hovered: show all items
    const shouldHideItems = isCompact && hasScrolled && !isHovered

    // Container Styles
    const containerBaseClasses = "flex items-center transition-all duration-500 ease-out"

    return (
        <div className={cn(
            "sticky z-50 flex px-4 transition-all duration-500 pointer-events-none",
            isClassic ? "top-4 w-full justify-between" : "top-2 left-0 right-0 justify-center"
        )}>
            <motion.nav
                layout
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={cn(
                    containerBaseClasses,
                    isClassic
                        ? "bg-transparent shadow-none border-none gap-0 p-0 w-full justify-between pointer-events-none"
                        : cn("pointer-events-auto rounded-full px-4 py-2 min-h-[56px] w-fit gap-3 border shadow-xl", floatingBgClass, borderClass, shouldHideItems && "gap-0")
                )}
                style={!isClassic ? superGlassStyle : undefined}
            >
                {/* --- LOGO SECTION --- */}
                <motion.div
                    layout
                    className={cn(
                        "flex items-center justify-center relative overflow-hidden transition-all duration-300",
                        isClassic
                            ? cn("pointer-events-auto h-12 px-4 rounded-full border shadow-xl hover:scale-105 hover:shadow-2xl", classicBgClass, borderClass)
                            : cn("mr-2", shouldHideItems && "mr-0")
                    )}
                    style={isClassic ? superGlassStyle : undefined}
                >
                    <Link href="/" className="flex items-center justify-center h-full">
                        <span className={cn(
                            "font-branch text-[1.7rem] font-bold tracking-tight transition-all duration-300 lowercase -mt-1",
                            isClassic ? cn("hover:scale-105", classicTextClass) : (pathname === '/' ? "text-white" : "text-foreground")
                        )}>
                            allure
                        </span>
                    </Link>
                </motion.div>

                {/* --- NAV ITEMS SECTION --- */}
                <motion.div
                    layout
                    className={cn(
                        "flex items-center transition-all duration-500 ease-in-out relative overflow-hidden",
                        isClassic
                            ? cn("pointer-events-auto h-12 px-4 rounded-full border shadow-xl", classicBgClass, borderClass)
                            : cn("px-1", shouldHideItems ? "max-w-0 opacity-0 px-0" : "max-w-[800px] opacity-100")
                    )}
                    style={isClassic ? superGlassStyle : undefined}
                >
                    <div className="flex items-center gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'group relative flex items-center justify-center rounded-full text-sm font-medium transition-all duration-300',
                                        isClassic
                                            ? "px-3 py-1.5 gap-2"
                                            : "px-3.5 py-2.5",
                                        // Colors
                                        isClassic
                                            ? (isHomePage ? (isActive ? 'text-white bg-white/20' : 'text-white/80 hover:text-white hover:bg-white/10')
                                                : (isActive ? (isDark ? 'text-white bg-white/20' : 'text-black bg-black/10') : (isDark ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-black/70 hover:text-black hover:bg-black/5')))
                                            : (isActive ? 'text-primary-foreground' : (pathname === '/' ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'))
                                    )}
                                >
                                    {/* Active Background for Floating Mode */}
                                    {!isClassic && isActive && (
                                        <motion.span
                                            layoutId="activeNav"
                                            className="absolute inset-0 rounded-full bg-primary -z-10 shadow-[0_0_12px_rgba(0,0,0,0.15)]"
                                        />
                                    )}

                                    <Icon className={cn("h-4 w-4 transition-transform duration-300", isActive && !isClassic && "scale-110")} />

                                    {/* Label */}
                                    <span className={cn(
                                        "overflow-hidden whitespace-nowrap transition-all duration-300 ease-out",
                                        isClassic
                                            ? "max-w-[100px] opacity-100" // Always show in classic
                                            : "max-w-[100px] ml-2 opacity-100" // Always show in floating/compact (visibility controlled by parent container)
                                    )}>
                                        {item.label}
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </motion.div>

                {/* --- ACTIONS SECTION --- */}
                <motion.div
                    layout
                    className={cn(
                        "flex items-center transition-all duration-500 ease-in-out relative overflow-hidden",
                        isClassic
                            ? cn("pointer-events-auto h-12 w-12 justify-center rounded-full border shadow-xl hover:scale-105 hover:shadow-2xl", classicBgClass, borderClass)
                            : cn(shouldHideItems ? "max-w-0 opacity-0" : "max-w-[120px] opacity-100")
                    )}
                    style={isClassic ? superGlassStyle : undefined}
                >
                    {/* Separator for Floating Mode */}
                    {!isClassic && <div className="mx-2 h-6 w-px bg-white/10" />}

                    <div className={cn("flex items-center", !isClassic && "gap-1")}>
                        <ThemeToggle />
                    </div>
                </motion.div>

            </motion.nav>
        </div>
    )
}
