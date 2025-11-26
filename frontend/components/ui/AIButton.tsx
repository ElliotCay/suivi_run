'use client'

import React from 'react'
import { cn } from "@/lib/utils"
import { MessageSquare, Sparkles } from "lucide-react"

interface AIButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'subtle' | 'intense'
    liquidSpeed?: 'slow' | 'medium' | 'fast'
    liquidOpacity?: number
    showIcon?: boolean
    label?: string
    animationType?: 'liquid' | 'aurora' | 'plasma' | 'shimmer' | 'aurora-glass' | 'aurora-glass-c' | 'none'
    iconClassName?: string
}

export function AIButton({
    className,
    variant = 'default',
    liquidSpeed = 'slow',
    liquidOpacity = 0.4,
    showIcon = true,
    label = "Ajuster avec l'IA",
    animationType = 'liquid',
    iconClassName,
    ...props
}: AIButtonProps) {

    // Speed configuration
    const speedClass = {
        slow: 'duration-[12s]',
        medium: 'duration-[8s]',
        fast: 'duration-[4s]'
    }

    // Opacity configuration (using inline style for precise control)
    const opacityStyle = { opacity: liquidOpacity }

    return (
        <button
            className={cn(
                "relative group overflow-hidden rounded-full px-6 py-2.5 font-medium transition-all duration-300",
                animationType !== 'none' && "text-neutral-900 dark:text-white", // Adaptive text color only for animated buttons
                "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-500/20",
                "active:scale-95",
                className
            )}
            {...props}
        >
            {/* 1. Glass Container Background */}
            {animationType !== 'none' && <div className="absolute inset-0 bg-white/5 backdrop-blur-xl z-0" />}

            {/* --- ANIMATION LAYERS --- */}

            {/* TYPE: LIQUID (Original) */}
            {animationType === 'liquid' && (
                <>
                    <div
                        className={cn(
                            "absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0_340deg,white_360deg)] opacity-20 animate-spin-slow",
                            speedClass[liquidSpeed]
                        )}
                    />
                    <div
                        className={cn(
                            "absolute inset-[-50%] bg-[conic-gradient(from_90deg,#ee95b3,#667abf,#9333ea,#ee95b3)] animate-spin-slow",
                            "blur-2xl transition-opacity duration-500 group-hover:opacity-60",
                            speedClass[liquidSpeed]
                        )}
                        style={opacityStyle}
                    />
                </>
            )}

            {/* TYPE: AURORA */}
            {animationType === 'aurora' && (
                <div
                    className="absolute inset-0 bg-gradient-to-r from-[#ee95b3] via-[#667abf] to-[#9333ea] animate-aurora opacity-40 blur-xl group-hover:opacity-60 transition-opacity duration-500"
                    style={opacityStyle}
                />
            )}

            {/* TYPE: AURORA GLASS (More transparent, stronger blur, sharper edges) */}
            {animationType === 'aurora-glass' && (
                <>
                    {/* Ultra-subtle moving gradient */}
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-[#ee95b3] via-[#667abf] to-[#9333ea] animate-aurora opacity-20 blur-2xl group-hover:opacity-30 transition-opacity duration-500"
                    />
                    {/* Stronger glass reflection */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent opacity-60 z-0" />
                    {/* Inner white glow for "frosted" look */}
                    <div className="absolute inset-0 bg-white/5 mix-blend-overlay" />
                </>
            )}

            {/* TYPE: AURORA GLASS 6C (Adaptive: Vibrant in Light, Sober in Dark) */}
            {animationType === 'aurora-glass-c' && (
                <>
                    {/* Moving gradient: Saturated in light mode, softer in dark mode */}
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-[#ee95b3] via-[#667abf] to-[#9333ea] animate-aurora transition-opacity duration-500 blur-xl group-hover:opacity-50
            opacity-40 saturate-150 dark:opacity-40 dark:saturate-125"
                    />
                    {/* Glass reflection */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50 z-0" />
                    {/* Inner shadow/glow */}
                    <div className="absolute inset-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] rounded-full" />
                </>
            )}
            {/* TYPE: PLASMA */}
            {animationType === 'plasma' && (
                <>
                    <div className="absolute top-0 left-0 w-full h-full bg-[#ee95b3] opacity-30 blur-2xl animate-plasma" style={{ animationDelay: '0s' }} />
                    <div className="absolute top-0 right-0 w-full h-full bg-[#667abf] opacity-30 blur-2xl animate-plasma" style={{ animationDelay: '2s' }} />
                    <div className="absolute bottom-0 left-0 w-full h-full bg-[#9333ea] opacity-30 blur-2xl animate-plasma" style={{ animationDelay: '4s' }} />
                </>
            )}

            {/* TYPE: SHIMMER */}
            {animationType === 'shimmer' && (
                <>
                    {/* Static deep background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#ee95b3]/20 to-[#667abf]/20" />
                    {/* Moving shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-slide" />
                </>
            )}

            {/* 3. Noise Texture */}
            {animationType !== 'none' && <div className="absolute inset-0 bg-noise opacity-20 z-0 mix-blend-overlay" />}

            {/* 4. Top Reflection (Sheen) - Only for non-shimmer types to avoid conflict */}
            {animationType !== 'shimmer' && animationType !== 'none' && (
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50 z-0" />
            )}

            {/* 5. Content */}
            <div className="relative z-10 flex items-center justify-center gap-2">
                {showIcon && <Sparkles className={cn("w-4 h-4 opacity-90 animate-pulse", iconClassName)} />}
                <span
                    className="tracking-wide text-sm"
                    style={animationType === 'none' ? { color: 'hsl(var(--foreground))' } : undefined}
                >{label}</span>
            </div>

            {/* 6. Border Glow */}
            {animationType !== 'none' && <div className="absolute inset-0 rounded-full border border-white/10 group-hover:border-white/20 transition-colors z-20" />}
        </button>
    )
}
