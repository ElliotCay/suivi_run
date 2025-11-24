'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Activity, BarChart3, Sparkles, Award, Settings, CalendarDays } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useState, useEffect, useRef } from 'react'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/workouts', label: 'Séances', icon: Activity },
    { href: '/records', label: 'Records', icon: Award },
    { href: '/training-block', label: 'Bloc 4 sem.', icon: CalendarDays },
    { href: '/suggestions', label: 'Coach AI', icon: Sparkles },
    { href: '/settings', label: 'Plus', icon: Settings },
]

interface NavbarCompactProps {
    onScrollStateChange?: (scrolled: boolean) => void
}

export default function NavbarCompact({ onScrollStateChange }: NavbarCompactProps) {
    const pathname = usePathname()
    const { theme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [hasScrolled, setHasScrolled] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const lastScrollY = useRef(0)

    useEffect(() => {
        setMounted(true)
        lastScrollY.current = window.scrollY

        const handleScroll = () => {
            const currentY = window.scrollY
            const scrolled = currentY > 32
            setHasScrolled(scrolled)
            onScrollStateChange?.(scrolled)
            lastScrollY.current = currentY
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [onScrollStateChange])

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

    // Compact mode logic:
    // When scrolled and NOT hovered, hide nav items and theme toggle
    const shouldHideItems = hasScrolled && !isHovered

    return (
        <div className="flex justify-center px-4 pointer-events-none">
            <motion.nav
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={cn(
                    "pointer-events-auto flex items-center rounded-full px-4 py-2 min-h-[56px] w-fit border shadow-xl transition-all duration-500",
                    floatingBgClass,
                    borderClass,
                    shouldHideItems ? "gap-0" : "gap-3"
                )}
                style={superGlassStyle}
                animate={{
                    gap: shouldHideItems ? 0 : 12,
                }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
                {/* Logo Section */}
                <motion.div
                    layoutId="navbar-logo"
                    className={cn(
                        "flex items-center transition-all duration-500",
                        shouldHideItems ? "mr-0" : "mr-2"
                    )}
                    animate={{
                        marginRight: shouldHideItems ? 0 : 8,
                    }}
                    transition={{
                        marginRight: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
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
                    className={cn(
                        "flex items-center overflow-hidden transition-all duration-500 ease-in-out px-1",
                        shouldHideItems ? "max-w-0 opacity-0 px-0" : "max-w-[800px] opacity-100"
                    )}
                    animate={{
                        maxWidth: shouldHideItems ? 0 : 800,
                        opacity: shouldHideItems ? 0 : 1,
                        paddingLeft: shouldHideItems ? 0 : 4,
                        paddingRight: shouldHideItems ? 0 : 4,
                    }}
                    transition={{
                        maxWidth: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
                        opacity: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
                        paddingLeft: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
                        paddingRight: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
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
                                    {/* Labels hidden in compact mode but present for transitions */}
                                    <motion.span
                                        className="overflow-hidden whitespace-nowrap"
                                        initial={{ maxWidth: 0, marginLeft: 0, opacity: 0 }}
                                        animate={{ maxWidth: 0, marginLeft: 0, opacity: 0 }}
                                        exit={{ maxWidth: 0, marginLeft: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                                    >
                                        {item.label}
                                    </motion.span>
                                </Link>
                            )
                        })}
                    </div>
                </motion.div>

                {/* Separator & Theme Section Container */}
                <motion.div
                    className={cn(
                        "flex items-center overflow-hidden transition-all duration-500 ease-in-out",
                        shouldHideItems ? "max-w-0 opacity-0" : "max-w-[120px] opacity-100"
                    )}
                    animate={{
                        maxWidth: shouldHideItems ? 0 : 120,
                        opacity: shouldHideItems ? 0 : 1,
                    }}
                    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                >
                    {/* Separator */}
                    <motion.div
                        className="mx-2 h-6 w-px bg-white/10"
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={{ opacity: shouldHideItems ? 0 : 1, scaleY: shouldHideItems ? 0 : 1 }}
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
                </motion.div>
            </motion.nav>
        </div>
    )
}
