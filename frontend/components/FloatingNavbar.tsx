'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, Activity, BarChart3, Sparkles, User, Upload, Award, Settings, Calendar, CalendarDays } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/workouts', label: 'Séances', icon: Activity },
    { href: '/records', label: 'Records', icon: Award },
    { href: '/training-block', label: 'Bloc 4 sem.', icon: CalendarDays },
    { href: '/planning', label: 'Coach AI', icon: Sparkles },
    { href: '/settings', label: 'Plus', icon: Settings },
]

export default function FloatingNavbar({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
    const pathname = usePathname()
    const [hasScrolled, setHasScrolled] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const lastScrollY = useRef(0)

    useEffect(() => {
        lastScrollY.current = window.scrollY

        const handleScroll = () => {
            const currentY = window.scrollY
            setHasScrolled(currentY > 32)
            lastScrollY.current = currentY
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const isCompactMode = variant === 'compact'

    // Compact mode logic:
    // 1. Labels are hidden by default (width 0), visible on hover
    // 2. When scrolled and NOT hovered, the entire nav items container is hidden
    const hideNavItems = isCompactMode && hasScrolled && !isHovered

    // In compact mode, labels are only visible on hover
    // In default mode, labels are always visible (or as per original design)
    const showLabels = isCompactMode ? isHovered : true

    return (
        <div className="sticky top-2 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <nav
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={cn(
                    "pointer-events-auto flex items-center p-2 transition-all duration-500 ease-out",
                    "bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg",
                    // Remove fixed min-w and max-w constraints that forced it to be wide
                    "rounded-full px-4 py-2 min-h-[56px] w-fit",
                    // Fix centering: Remove gap when nav items are hidden
                    hideNavItems ? "gap-0" : "gap-3"
                )}
            >
                {/* Logo */}
                <Link href="/" className={cn(
                    "flex items-center gap-2 group transition-all duration-500 ease-in-out",
                    // Fix centering: Remove margin when nav items are hidden
                    hideNavItems ? "mr-0" : "mr-2"
                )}>
                    <span className={cn(
                        "font-branch text-[1.7rem] font-bold tracking-tight transition-all duration-300 hover:scale-105 lowercase -mt-1",
                        pathname === '/' ? "text-white" : "text-foreground"
                    )}>
                        allure
                    </span>
                </Link>

                {/* Navigation Items Container */}
                <div className={cn(
                    "flex items-center gap-1 transition-all duration-500 ease-in-out",
                    // Fix shadow clipping: Add padding to container so shadows don't get cut off
                    // But we need to compensate for the padding in the width calculation or layout
                    // Actually, just adding px-1 might be enough.
                    "px-1",
                    hideNavItems ? "max-w-0 opacity-0 px-0" : "max-w-[800px] opacity-100"
                )}>
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
                                    <span className="absolute inset-0 rounded-full bg-primary -z-10 shadow-[0_0_12px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-300" />
                                )}
                                <Icon className={cn("h-4 w-4 transition-transform duration-300", isActive && "scale-110")} />

                                {/* Label: Animate width instead of fixed width */}
                                <span className={cn(
                                    "overflow-hidden whitespace-nowrap transition-all duration-300 ease-out",
                                    showLabels ? "max-w-[100px] ml-2 opacity-100" : "max-w-0 ml-0 opacity-0"
                                )}>
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </div>

                {/* Separator & Actions Container */}
                <div className={cn(
                    "flex items-center overflow-hidden transition-all duration-500 ease-in-out",
                    // Hide separator/actions in compact scrolled mode too? 
                    // User said "only see the logo", so we should probably hide this too or keep it minimal.
                    // Let's keep it visible for now as it contains ThemeToggle which might be useful, 
                    // but if user wants strictly ONLY logo, we can hide this too.
                    // Based on "ne voir que le logo", I will hide this too in that state.
                    hideNavItems ? "max-w-0 opacity-0" : "max-w-[120px] opacity-100"
                )}>
                    {/* Separator */}
                    <div className="mx-2 h-6 w-px bg-white/10" />

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        <ThemeToggle />
                    </div>
                </div>
            </nav>
        </div>
    )
}
