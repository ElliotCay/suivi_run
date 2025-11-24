'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Activity, BarChart3, Sparkles, Award, Settings, CalendarDays } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/workouts', label: 'Séances', icon: Activity },
    { href: '/records', label: 'Records', icon: Award },
    { href: '/training-block', label: 'Bloc 4 sem.', icon: CalendarDays },
    { href: '/suggestions', label: 'Coach AI', icon: Sparkles },
    { href: '/settings', label: 'Plus', icon: Settings },
]

export default function NavbarClassic() {
    const pathname = usePathname()
    const { theme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark')
    const isHomePage = pathname === '/'

    // Super Glass Style - Defined in ALLURE_DESIGN_PHILOSOPHY.md
    const superGlassStyle = {
        backdropFilter: 'blur(40px) saturate(150%)',
        WebkitBackdropFilter: 'blur(40px) saturate(150%)',
        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 10px 30px -10px rgba(0, 0, 0, 0.3)',
    }

    // Background classes
    const classicBgClass = isHomePage
        ? (isDark ? 'bg-black/60' : 'bg-white/35')
        : (isDark ? 'bg-black/70' : 'bg-white/70')

    const borderClass = isHomePage
        ? "border-white/40"
        : (isDark ? "border-white/20" : "border-black/10")

    const classicTextClass = isHomePage ? 'text-white' : (isDark ? 'text-white' : 'text-black')

    return (
        <div className="flex w-full justify-between px-4 pointer-events-none">
            {/* Logo Pill (Left) */}
            <motion.div
                layoutId="navbar-logo"
                className={cn(
                    "pointer-events-auto flex items-center justify-center h-12 px-4 rounded-full border shadow-xl hover:scale-105 hover:shadow-2xl transition-transform duration-300",
                    classicBgClass,
                    borderClass
                )}
                style={superGlassStyle}
                transition={{
                    layout: {
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        duration: 0.5
                    }
                }}
            >
                <Link href="/" className="flex items-center justify-center h-full">
                    <span className={cn(
                        "font-branch text-[1.7rem] font-bold tracking-tight lowercase -mt-1 hover:scale-105 transition-transform duration-300",
                        classicTextClass
                    )}>
                        allure
                    </span>
                </Link>
            </motion.div>

            {/* Nav Items Pill (Center) */}
            <motion.div
                layoutId="navbar-nav"
                className={cn(
                    "pointer-events-auto flex items-center h-12 px-4 rounded-full border shadow-xl",
                    classicBgClass,
                    borderClass
                )}
                style={superGlassStyle}
                transition={{
                    layout: {
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        duration: 0.5
                    }
                }}
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
                                    'group relative flex items-center justify-center rounded-full text-sm font-medium transition-all duration-300 px-3 py-1.5 gap-2',
                                    isHomePage
                                        ? (isActive ? 'text-white bg-white/20' : 'text-white/80 hover:text-white hover:bg-white/10')
                                        : (isActive
                                            ? (isDark ? 'text-white bg-white/20' : 'text-black bg-black/10')
                                            : (isDark ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-black/70 hover:text-black hover:bg-black/5')
                                        )
                                )}
                            >
                                <Icon className={cn("h-4 w-4 transition-transform duration-300")} />
                                <span className="whitespace-nowrap">
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </motion.div>

            {/* Theme Toggle Pill (Right) */}
            <motion.div
                layoutId="navbar-theme"
                className={cn(
                    "pointer-events-auto flex items-center justify-center h-12 w-12 rounded-full border shadow-xl hover:scale-105 hover:shadow-2xl transition-transform duration-300",
                    classicBgClass,
                    borderClass
                )}
                style={superGlassStyle}
                transition={{
                    layout: {
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        duration: 0.5
                    }
                }}
            >
                <ThemeToggle />
            </motion.div>
        </div>
    )
}
