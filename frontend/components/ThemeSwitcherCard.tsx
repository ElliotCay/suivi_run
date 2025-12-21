'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { Sun, Moon, Monitor, Cloud } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeSwitcherCard() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [activeMode, setActiveMode] = useState<'light' | 'dark' | 'system'>('system')

    useEffect(() => {
        setMounted(true)
        setActiveMode((theme as 'light' | 'dark' | 'system') || 'system')
    }, [theme])

    const handleModeChange = (mode: 'light' | 'dark' | 'system') => {
        setActiveMode(mode)
        setTheme(mode)
    }

    if (!mounted) return null

    const modes = [
        {
            id: 'light' as const,
            label: 'Jour',
            icon: Sun,
            description: 'Thème clair optimal pour les environnements lumineux.'
        },
        {
            id: 'dark' as const,
            label: 'Nuit',
            icon: Moon,
            description: 'Thème sombre adapté aux sessions nocturnes.'
        },
        {
            id: 'system' as const,
            label: 'Système',
            icon: Monitor,
            description: 'S\'adapte automatiquement aux réglages de ton appareil.'
        }
    ]

    return (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-background/40 backdrop-blur-sm shadow-2xl">
            <div className="grid gap-6 p-6">
                {/* Preview - Animation */}
                <div className="relative h-[240px] w-full rounded-2xl overflow-hidden">{/* Screen Content - Paysage animé */}
            <div className="absolute inset-0">
                {/* Sky Layer */}
                <div className="absolute inset-0">
                    {/* Day Sky - Vibrant Blue Gradient */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-b from-sky-500 via-sky-400 to-sky-200"
                        animate={{ opacity: activeMode === 'dark' ? 0 : activeMode === 'system' ? 0.5 : 1 }}
                        transition={{ duration: 1.5 }}
                    />

                    {/* Night Sky - Deep Space Gradient */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-b from-[#0B1026] via-[#2B32B2] to-[#4D4C7D]"
                        animate={{ opacity: activeMode === 'dark' ? 1 : activeMode === 'system' ? 0.5 : 0 }}
                        transition={{ duration: 1.5 }}
                    />
                </div>

                {/* Celestial Bodies */}
                <div className="absolute inset-0 overflow-hidden">
                    {/* Sun */}
                    <motion.div
                        className="absolute top-8 right-12"
                        animate={{
                            y: activeMode === 'dark' ? 150 : 0,
                            x: activeMode === 'dark' ? 80 : 0,
                            opacity: activeMode === 'dark' ? 0 : 1,
                        }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                    >
                        <div className="w-16 h-16 rounded-full bg-yellow-300 shadow-[0_0_40px_rgba(253,224,71,0.6)] blur-[1px]" />
                        <div className="absolute inset-3 w-10 h-10 rounded-full bg-yellow-100 blur-sm" />
                    </motion.div>

                    {/* Moon */}
                    <motion.div
                        className="absolute top-8 left-12"
                        initial={{ x: -100, y: 150, opacity: 0 }}
                        animate={{
                            x: activeMode === 'light' ? -100 : 0,
                            y: activeMode === 'light' ? 150 : 0,
                            opacity: activeMode === 'light' ? 0 : 1,
                        }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                    >
                        <div className="w-14 h-14 rounded-full bg-slate-100 shadow-[0_0_30px_rgba(255,255,255,0.3)]" />
                        <div className="absolute top-3 right-4 w-3 h-3 rounded-full bg-slate-200/50" />
                        <div className="absolute bottom-5 left-4 w-4 h-4 rounded-full bg-slate-200/50" />
                        <div className="absolute top-6 left-3 w-2 h-2 rounded-full bg-slate-200/50" />
                    </motion.div>

                    {/* Stars */}
                    <motion.div
                        className="absolute inset-0"
                        animate={{ opacity: activeMode === 'dark' || activeMode === 'system' ? 1 : 0 }}
                        transition={{ duration: 1 }}
                    >
                        {[...Array(15)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,0.8)]"
                                style={{
                                    top: `${Math.random() * 40}%`,
                                    left: `${Math.random() * 100}%`,
                                }}
                                animate={{
                                    opacity: [0.3, 1, 0.3],
                                    scale: [0.8, 1.2, 0.8]
                                }}
                                transition={{
                                    duration: 2 + Math.random() * 3,
                                    repeat: Infinity,
                                    delay: Math.random() * 2
                                }}
                            />
                        ))}
                    </motion.div>

                    {/* Clouds */}
                    <motion.div
                        className="absolute top-14 left-1/4 opacity-90"
                        animate={{
                            x: [0, 20, 0],
                            opacity: activeMode === 'dark' ? 0 : 0.9
                        }}
                        transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
                    >
                        <Cloud className="w-16 h-16 text-white/90 fill-white/90 drop-shadow-lg" />
                    </motion.div>
                    <motion.div
                        className="absolute top-20 right-1/3 opacity-70"
                        animate={{
                            x: [0, -30, 0],
                            opacity: activeMode === 'dark' ? 0 : 0.7
                        }}
                        transition={{ repeat: Infinity, duration: 28, ease: "easeInOut" }}
                    >
                        <Cloud className="w-12 h-12 text-white/80 fill-white/80 drop-shadow-md" />
                    </motion.div>
                </div>

                {/* Landscape - Realistic Organic Forest */}
                <div className="absolute bottom-0 left-0 right-0 h-[45%]">
                    {/* Far Mountains/Hills */}
                    <motion.div
                        className="absolute bottom-0 left-0 right-0 h-full"
                        animate={{
                            filter: activeMode === 'dark' ? 'brightness(0.4)' : 'brightness(1)'
                        }}
                        transition={{ duration: 1.5 }}
                    >
                        <svg className="absolute bottom-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 300">
                            <path d="M0,300 L0,150 Q300,100 600,180 Q900,260 1200,150 L1200,300 Z" fill="#15803d" opacity="0.6" />
                        </svg>
                    </motion.div>

                    {/* Mid-Ground Forest */}
                    <motion.div
                        className="absolute bottom-0 left-0 right-0 h-3/4"
                        animate={{
                            filter: activeMode === 'dark' ? 'brightness(0.3)' : 'brightness(1)'
                        }}
                        transition={{ duration: 1.5 }}
                    >
                        <svg className="absolute bottom-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 200">
                            <path d="M0,200
                                 C50,180 80,120 100,160
                                 C120,130 150,180 180,150
                                 C210,120 240,190 270,160
                                 C300,130 330,180 360,140
                                 C390,110 420,170 450,150
                                 C480,130 510,190 540,160
                                 C570,120 600,180 630,140
                                 C660,110 690,170 720,150
                                 C750,130 780,190 810,160
                                 C840,120 870,180 900,140
                                 C930,110 960,170 990,150
                                 C1020,130 1050,190 1080,160
                                 C1110,120 1140,180 1200,150
                                 L1200,200 Z"
                                fill="#14532d" />
                        </svg>
                    </motion.div>

                    {/* Foreground Forest */}
                    <motion.div
                        className="absolute bottom-0 left-0 right-0 h-1/2"
                        animate={{
                            filter: activeMode === 'dark' ? 'brightness(0.2)' : 'brightness(1)'
                        }}
                        transition={{ duration: 1.5 }}
                    >
                        <svg className="absolute bottom-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 150">
                            <path d="M-20,150
                                 Q20,50 60,150
                                 Q100,20 140,150
                                 Q200,60 260,150
                                 Q350,30 440,150
                                 Q500,70 560,150
                                 Q650,40 740,150
                                 Q820,60 900,150
                                 Q1000,20 1100,150
                                 Q1160,60 1220,150 Z"
                                fill="#052e16" />
                        </svg>
                    </motion.div>
                </div>
            </div>
                </div>

                {/* Controls */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-primary">Apparence</p>
                        <h4 className="text-2xl font-semibold">Choisis ton thème</h4>
                        <p className="text-sm text-muted-foreground">
                            Prévisualise et applique le mode de couleur qui te convient. Ton choix est sauvegardé pour tes prochaines sessions.
                        </p>
                    </div>

                    <div className="space-y-3">
                {modes.map((mode) => {
                    const Icon = mode.icon
                    const isActive = activeMode === mode.id

                    return (
                        <button
                            key={mode.id}
                            onClick={() => handleModeChange(mode.id)}
                            className={cn(
                                'group relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition-all duration-300',
                                isActive
                                    ? mode.id === 'light'
                                        ? 'border-sky-500/60 bg-sky-50/70 text-sky-900 shadow-sm dark:border-sky-400/40 dark:bg-sky-500/10 dark:text-sky-50'
                                        : mode.id === 'dark'
                                        ? 'border-indigo-500/60 bg-indigo-50/70 text-indigo-900 shadow-sm dark:border-indigo-400/40 dark:bg-indigo-500/10 dark:text-indigo-50'
                                        : 'bg-gradient-to-r from-sky-500/20 to-indigo-600/20 border-sky-500/60 text-foreground dark:text-foreground'
                                    : 'border-transparent bg-white/80 text-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-lg dark:bg-white/5'
                            )}
                        >
                            {isActive && (
                                <motion.span
                                    layoutId="themeActive"
                                    className="absolute inset-0 rounded-xl"
                                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                                />
                            )}
                            <div className="relative flex items-start gap-3">
                                <div
                                    className={cn(
                                        'flex h-10 w-10 items-center justify-center rounded-lg border transition-colors',
                                        isActive
                                            ? mode.id === 'light'
                                                ? 'border-sky-300/60 bg-white/90 text-sky-600 dark:border-sky-500/30 dark:bg-slate-900/60 dark:text-sky-200'
                                                : mode.id === 'dark'
                                                ? 'border-indigo-300/60 bg-white/90 text-indigo-600 dark:border-indigo-500/30 dark:bg-slate-900/60 dark:text-indigo-200'
                                                : 'border-sky-300/60 bg-white/90 text-sky-600 dark:border-sky-500/30 dark:bg-slate-900/60 dark:text-indigo-200'
                                            : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-base font-semibold">{mode.label}</p>
                                        {isActive && <span className="text-xs font-medium text-sky-600 dark:text-sky-200">Actif</span>}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{mode.description}</p>
                                </div>
                            </div>
                        </button>
                    )
                })}
                    </div>
                </div>
            </div>
        </div>
    )
}
