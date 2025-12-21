'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, Activity, BarChart3, Sparkles, User, Upload, Award, Settings, Calendar, CalendarDays } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import Image from 'next/image'
import { useEffect, useState } from 'react'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/workouts', label: 'Séances', icon: Activity },
    { href: '/records', label: 'Records', icon: Award },
    { href: '/training-block', label: 'Bloc 4 sem.', icon: CalendarDays },
    { href: '/planning', label: 'Coach AI', icon: Sparkles },
    { href: '/settings', label: 'Plus', icon: Settings },
]

export default function MinimalNavbar() {
    const pathname = usePathname()
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <nav
            className={cn(
                "sticky top-0 z-50 w-full border-b transition-all duration-500",
                scrolled
                    ? "bg-background/80 backdrop-blur-xl border-border/40 supports-[backdrop-filter]:bg-background/60"
                    : "bg-transparent border-transparent"
            )}
        >
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-2 group">
                            <Image
                                src="/favicon.ico"
                                alt="Logo"
                                width={24}
                                height={24}
                                className="h-6 w-6 transition-transform group-hover:rotate-12"
                            />
                            <span className="font-branch text-xl font-bold">Allure</span>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            'group relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                            isActive
                                                ? 'text-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
                                        <span className={cn(
                                            "hidden sm:inline transition-all duration-300",
                                            isActive ? "font-semibold" : "font-normal"
                                        )}>{item.label}</span>

                                        {/* Active Indicator */}
                                        {isActive && (
                                            <span className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-primary rounded-t-full" />
                                        )}
                                    </Link>
                                )
                            })}
                        </div>

                        <div className="h-4 w-px bg-border" />

                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </nav>
    )
}
