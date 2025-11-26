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
    const [hoverOrigin, setHoverOrigin] = useState('center')
    const lastScrollY = useRef(0)
    const navRef = useRef<HTMLElement>(null)

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

    // Handle mouse enter to determine expansion origin
    const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
        setIsHovered(true)

        if (navRef.current) {
            const rect = navRef.current.getBoundingClientRect()
            const mouseX = e.clientX
            const navCenter = rect.left + rect.width / 2
            const relativeX = mouseX - rect.left
            const position = relativeX / rect.width

            // Determine origin: left (0-0.33), center (0.33-0.66), right (0.66-1)
            if (position < 0.33) {
                setHoverOrigin('left')
            } else if (position > 0.66) {
                setHoverOrigin('right')
            } else {
                setHoverOrigin('center')
            }
        }
    }

    return (
        <div className="flex justify-center px-4 pointer-events-none">
            <motion.nav
                ref={navRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setIsHovered(false)}
                className={cn(
                    "pointer-events-auto flex items-center rounded-full px-4 py-2 min-h-[56px] w-fit border shadow-xl",
                    floatingBgClass,
                    borderClass
                )}
                style={{
                    ...superGlassStyle,
                    transformOrigin: hoverOrigin === 'left' ? 'left center' : hoverOrigin === 'right' ? 'right center' : 'center center',
                }}
                animate={{
                    gap: shouldHideItems ? 0 : 12,
                    scale: shouldHideItems ? 1 : 1.01,
                }}
                transition={{
                    duration: 0.2,
                    ease: "easeOut"
                }}
            >
                {/* Logo Section */}
                <motion.div
                    className="flex items-center"
                    animate={{
                        marginRight: shouldHideItems ? 0 : 8,
                    }}
                    transition={{
                        duration: 0.2,
                        ease: "easeOut"
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
                    className="flex items-center overflow-hidden"
                    animate={{
                        width: shouldHideItems ? 0 : 'auto',
                        opacity: shouldHideItems ? 0 : 1,
                        paddingLeft: shouldHideItems ? 0 : 4,
                        paddingRight: shouldHideItems ? 0 : 4,
                    }}
                    transition={{
                        duration: 0.2,
                        ease: "easeOut"
                    }}
                >
                    <div className="flex items-center gap-1 whitespace-nowrap">
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
                                            transition={{ type: "spring", stiffness: 400, damping: 35 }}
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
                    className="flex items-center overflow-hidden"
                    animate={{
                        width: shouldHideItems ? 0 : 'auto',
                        opacity: shouldHideItems ? 0 : 1,
                    }}
                    transition={{
                        duration: 0.2,
                        ease: "easeOut"
                    }}
                >
                    {/* Separator */}
                    <div className="mx-2 h-6 w-px bg-white/10" />

                    {/* Theme Toggle Section */}
                    <div className="flex items-center">
                        <ThemeToggle />
                    </div>
                </motion.div>
            </motion.nav>
        </div>
    )
}
