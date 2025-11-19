'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Monitor, Cloud, Star } from 'lucide-react'
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

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <div className="relative h-[500px] w-full rounded-[32px] overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl transition-colors duration-700">

                {/* Main Scene Container */}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{
                        scale: activeMode === 'system' ? 0.65 : 1,
                        y: activeMode === 'system' ? -30 : 0
                    }}
                    transition={{ duration: 1.2, type: "spring", bounce: 0.15 }}
                >
                    {/* iMac Frame */}
                    <div className={cn(
                        "relative transition-all duration-700 ease-in-out",
                        activeMode === 'system' ? "w-[680px] h-[440px]" : "w-full h-full"
                    )}>
                        {/* Monitor Bezel */}
                        <div className={cn(
                            "absolute inset-0 transition-all duration-700 rounded-3xl overflow-hidden",
                            activeMode === 'system' ? "bg-[#1A1A1A] p-3 shadow-2xl ring-1 ring-white/10" : "p-0"
                        )}>

                            {/* Screen Content */}
                            <div className="relative w-full h-full overflow-hidden rounded-2xl bg-sky-300 transition-colors duration-1000">

                                {/* Sky Layer */}
                                <div className="absolute inset-0">
                                    {/* Day Sky - Vibrant Blue Gradient */}
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-b from-sky-500 via-sky-400 to-sky-200"
                                        animate={{ opacity: activeMode === 'dark' ? 0 : 1 }}
                                        transition={{ duration: 1.5 }}
                                    />

                                    {/* Night Sky - Deep Space Gradient */}
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-b from-[#0B1026] via-[#2B32B2] to-[#4D4C7D]"
                                        animate={{ opacity: activeMode === 'dark' ? 1 : 0 }}
                                        transition={{ duration: 1.5 }}
                                    />

                                    {/* System Split - Smooth Natural Gradient */}
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-[#0B1026] via-[#4D4C7D] to-sky-400"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: activeMode === 'system' ? 1 : 0 }}
                                        transition={{ duration: 1 }}
                                    />
                                </div>

                                {/* Celestial Bodies */}
                                <div className="absolute inset-0 overflow-hidden">
                                    {/* Sun - Bright & Glowing */}
                                    <motion.div
                                        className="absolute top-12 right-16"
                                        animate={{
                                            y: activeMode === 'dark' ? 200 : 0,
                                            x: activeMode === 'dark' ? 100 : 0,
                                            opacity: activeMode === 'dark' ? 0 : 1,
                                            scale: activeMode === 'system' ? 0.8 : 1
                                        }}
                                        transition={{ duration: 1.5, ease: "easeInOut" }}
                                    >
                                        <div className="w-24 h-24 rounded-full bg-yellow-300 shadow-[0_0_60px_rgba(253,224,71,0.6)] blur-[1px]" />
                                        <div className="absolute inset-4 w-16 h-16 rounded-full bg-yellow-100 blur-sm" />
                                    </motion.div>

                                    {/* Moon - Detailed & Glowing */}
                                    <motion.div
                                        className="absolute top-12 left-16"
                                        initial={{ x: -150, y: 200, opacity: 0 }}
                                        animate={{
                                            x: activeMode === 'light' ? -150 : 0,
                                            y: activeMode === 'light' ? 200 : 0,
                                            opacity: activeMode === 'light' ? 0 : 1,
                                            scale: activeMode === 'system' ? 0.8 : 1
                                        }}
                                        transition={{ duration: 1.5, ease: "easeInOut" }}
                                    >
                                        <div className="w-20 h-20 rounded-full bg-slate-100 shadow-[0_0_40px_rgba(255,255,255,0.3)]" />
                                        <div className="absolute top-4 right-5 w-4 h-4 rounded-full bg-slate-200/50" />
                                        <div className="absolute bottom-6 left-5 w-6 h-6 rounded-full bg-slate-200/50" />
                                        <div className="absolute top-8 left-4 w-3 h-3 rounded-full bg-slate-200/50" />
                                    </motion.div>

                                    {/* Stars */}
                                    <motion.div
                                        className="absolute inset-0"
                                        animate={{ opacity: activeMode === 'dark' || activeMode === 'system' ? 1 : 0 }}
                                        transition={{ duration: 1 }}
                                    >
                                        {[...Array(20)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,0.8)]"
                                                style={{
                                                    top: `${Math.random() * 50}%`,
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
                                        className="absolute top-20 left-1/4 opacity-90"
                                        animate={{ x: [0, 30, 0] }}
                                        transition={{ repeat: Infinity, duration: 25, ease: "easeInOut" }}
                                    >
                                        <Cloud className="w-24 h-24 text-white/90 fill-white/90 drop-shadow-lg" />
                                    </motion.div>
                                    <motion.div
                                        className="absolute top-32 right-1/3 opacity-70"
                                        animate={{ x: [0, -40, 0] }}
                                        transition={{ repeat: Infinity, duration: 35, ease: "easeInOut" }}
                                    >
                                        <Cloud className="w-16 h-16 text-white/80 fill-white/80 drop-shadow-md" />
                                    </motion.div>
                                </div>

                                {/* Landscape - Realistic Organic Forest */}
                                <div className="absolute bottom-0 left-0 right-0 h-[50%]">

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

                                    {/* Mid-Ground Forest - Organic Shapes */}
                                    <motion.div
                                        className="absolute bottom-0 left-0 right-0 h-3/4"
                                        animate={{
                                            filter: activeMode === 'dark' ? 'brightness(0.3)' : 'brightness(1)'
                                        }}
                                        transition={{ duration: 1.5 }}
                                    >
                                        <svg className="absolute bottom-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 200">
                                            {/* Organic Tree Line */}
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

                                    {/* Foreground Forest - Detailed Organic Trees */}
                                    <motion.div
                                        className="absolute bottom-0 left-0 right-0 h-1/2"
                                        animate={{
                                            filter: activeMode === 'dark' ? 'brightness(0.2)' : 'brightness(1)'
                                        }}
                                        transition={{ duration: 1.5 }}
                                    >
                                        <svg className="absolute bottom-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 150">
                                            {/* Detailed Organic Trees */}
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

                        {/* iMac Stand */}
                        <motion.div
                            className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-32 h-24 bg-gradient-to-b from-[#E5E5E5] to-[#D4D4D4] rounded-b-xl"
                            style={{
                                zIndex: -1,
                                transformOrigin: "top"
                            }}
                            initial={{ opacity: 0, scaleY: 0 }}
                            animate={{
                                opacity: activeMode === 'system' ? 1 : 0,
                                scaleY: activeMode === 'system' ? 1 : 0
                            }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-[#D4D4D4] rounded-full shadow-xl" />
                        </motion.div>
                    </div>
                </motion.div>

                {/* Controls */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-xl z-20">
                    <button
                        onClick={() => handleModeChange('light')}
                        className={cn(
                            "relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                            activeMode === 'light'
                                ? "text-sky-600 bg-sky-50 shadow-sm"
                                : "text-neutral-500 hover:text-black dark:hover:text-white"
                        )}
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <Sun className="w-4 h-4" />
                            Jour
                        </span>
                    </button>

                    <button
                        onClick={() => handleModeChange('dark')}
                        className={cn(
                            "relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                            activeMode === 'dark'
                                ? "text-indigo-300 bg-indigo-950 shadow-sm"
                                : "text-neutral-500 hover:text-black dark:hover:text-white"
                        )}
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <Moon className="w-4 h-4" />
                            Nuit
                        </span>
                    </button>

                    <button
                        onClick={() => handleModeChange('system')}
                        className={cn(
                            "relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                            activeMode === 'system'
                                ? "text-white bg-gradient-to-r from-sky-500 to-indigo-600 shadow-sm"
                                : "text-neutral-500 hover:text-black dark:hover:text-white"
                        )}
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            Système
                        </span>
                    </button>
                </div>

            </div>
        </div>
    )
}
