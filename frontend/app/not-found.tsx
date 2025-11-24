'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function NotFound() {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    const isDark = resolvedTheme === 'dark'

    return (
        <div className="min-h-[80vh] w-full flex flex-col items-center justify-center text-center p-4 relative overflow-hidden">

            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-pink-500/20 to-blue-500/20 blur-[100px] rounded-full pointer-events-none opacity-50" />

            {/* Background Image Container */}
            <div className="w-full max-w-2xl aspect-video relative mb-6 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <Image
                    src={isDark ? "/404-dark.jpeg" : "/404-light.jpeg"}
                    alt="404 - Page introuvable"
                    fill
                    className="object-cover"
                    priority
                />

                {/* Subtle overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4 max-w-md relative z-10"
            >
                <div className="space-y-2">
                    <h1 className="text-4xl font-serif font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        Sortie de piste ?
                    </h1>
                    <p className="text-muted-foreground font-[family-name:var(--font-outfit)] text-base">
                        Il semblerait que vous ayez pris un mauvais virage. Cette page n'existe pas ou a été déplacée.
                    </p>
                </div>

                <div className="pt-2">
                    <Button asChild size="lg" className="rounded-full px-8 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-foreground to-foreground/80 hover:scale-105">
                        <Link href="/">
                            Retour au parcours
                        </Link>
                    </Button>
                </div>
            </motion.div>
        </div>
    )
}
