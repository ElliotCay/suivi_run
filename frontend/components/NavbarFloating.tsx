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

export default function NavbarFloating() {
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

    // Floating background
    const floatingBgClass = isDark ? "bg-black/60" : "bg-white/35"

    const borderClass = isHomePage
        ? "border-white/40"
        : (isDark ? "border-white/20" : "border-black/10")

    return (
        <div className="flex justify-center px-4 pointer-events-none">
            <motion.nav
                className={cn(
                    "pointer-events-auto flex items-center rounded-full px-4 py-2 min-h-[56px] w-fit gap-3 border shadow-xl transition-all duration-500",
                    floatingBgClass,
                    borderClass
                )}
                style={superGlassStyle}
            >
                {/* Logo Section */}
                <motion.div
                    layoutId="navbar-logo"
                    className="flex items-center mr-2"
                    transition={{
                        layout: {
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                            duration: 0.5
                        }
                    }}
                >
                    <Link href="/" className="flex items-center">
                        <span className={cn(
                            "font-branch text-[1.7rem] font-bold tracking-tight lowercase -mt-1 transition-all duration-300 hover:scale-105",
                            pathname === '/' ? "text-white" : "text-foreground"
                        )}>
                            allure
                        </span>
                    </Link>
                </motion.div>

                {/* Nav Items Section */}
                <motion.div
                    layoutId="navbar-nav"
                    className="flex items-center px-1"
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
                                        'group relative flex items-center justify-center rounded-full text-sm font-medium transition-all duration-300 px-3.5 py-2.5',
                                        isActive
                                            ? 'text-primary-foreground'
                                            : (pathname === '/' ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-white/5')
                                    )}
                                >
                                    {isActive && (
                                        <motion.span
                                            layoutId="activeNav"
                                            className="absolute inset-0 rounded-full bg-primary -z-10 shadow-[0_0_12px_rgba(0,0,0,0.15)]"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    <Icon className={cn("h-4 w-4 transition-transform duration-300", isActive && "scale-110")} />
                                    <span className="ml-2 overflow-hidden whitespace-nowrap">
                                        {item.label}
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </motion.div>

                {/* Separator */}
                <motion.div
                    className="mx-2 h-6 w-px bg-white/10"
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                />

                {/* Theme Toggle Section */}
                <motion.div
                    layoutId="navbar-theme"
                    className="flex items-center"
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
            </motion.nav>
        </div>
    )
}
