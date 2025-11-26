'use client'

import React from 'react'
import { AIButton } from "@/components/ui/AIButton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ButtonPlaygroundPage() {
    return (
        <div className="min-h-screen bg-neutral-950 text-white p-12 space-y-12">
            <div className="space-y-4">
                <h1 className="text-4xl font-serif font-bold">Playground: Liquid Intelligence</h1>
                <p className="text-neutral-400 max-w-2xl">
                    Exploration des variations pour le bouton d'appel à l'IA.
                    L'objectif est de trouver l'équilibre parfait entre "Wow" et "Subtil".
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                {/* Variation 1: Subtil & Lent */}
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-neutral-200">1. Subtil & Lent</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center py-12 bg-neutral-950/50 rounded-b-lg">
                        <AIButton
                            liquidSpeed="slow"
                            liquidOpacity={0.3}
                            label="Ajuster avec l'IA"
                        />
                    </CardContent>
                </Card>

                {/* Variation 2: Standard (Recommandé) */}
                <Card className="bg-neutral-900 border-neutral-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-bl">Recommandé</div>
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-neutral-200">2. Standard</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center py-12 bg-neutral-950/50 rounded-b-lg">
                        <AIButton
                            liquidSpeed="medium"
                            liquidOpacity={0.5}
                            label="Ajuster avec l'IA"
                        />
                    </CardContent>
                </Card>

                {/* Variation 3: Intense & Rapide */}
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-neutral-200">3. Intense & Rapide</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center py-12 bg-neutral-950/50 rounded-b-lg">
                        <AIButton
                            liquidSpeed="fast"
                            liquidOpacity={0.8}
                            label="Ajuster avec l'IA"
                        />
                    </CardContent>
                </Card>

                {/* Variation 4: Sans Icône */}
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-neutral-200">4. Minimaliste (Sans Icône)</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center py-12 bg-neutral-950/50 rounded-b-lg">
                        <AIButton
                            liquidSpeed="slow"
                            liquidOpacity={0.4}
                            showIcon={false}
                            label="Intelligence Artificielle"
                        />
                    </CardContent>
                </Card>

                {/* Variation 5: Contexte Sombre (Simulation Navbar) */}
                <Card className="bg-neutral-900 border-neutral-800 col-span-1 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-neutral-200">5. Simulation Navbar (Glass sur Glass)</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between px-8 py-6 bg-white/5 backdrop-blur-md rounded-b-lg border-t border-white/10">
                        <div className="text-white/50 font-serif">allure</div>
                        <AIButton
                            liquidSpeed="medium"
                            liquidOpacity={0.5}
                        />
                        <div className="w-8 h-8 rounded-full bg-white/10"></div>
                    </CardContent>
                </Card>

                {/* --- NEW ANIMATIONS --- */}

                {/* Variation 6: Aurora */}
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-neutral-200">6. L'Aurore (Aurora)</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center py-12 bg-neutral-950/50 rounded-b-lg">
                        <AIButton
                            animationType="aurora"
                            liquidOpacity={0.5}
                            label="Ajuster avec l'IA"
                        />
                    </CardContent>
                </Card>

                {/* Variation 6b: Aurora Glass */}
                <Card className="bg-neutral-900 border-neutral-800 relative overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-neutral-200">6b. Aurore "Ultra Glass"</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center py-12 bg-neutral-950/50 rounded-b-lg">
                        <AIButton
                            animationType="aurora-glass"
                            label="Ajuster avec l'IA"
                            className="border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                        />
                    </CardContent>
                </Card>

                {/* Variation 6c: Aurora Glass Saturated */}
                <Card className="bg-neutral-900 border-neutral-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-bl">Vibrant</div>
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-neutral-200">6c. Aurore "Super Glass"</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center py-12 bg-neutral-950/50 rounded-b-lg">
                        <AIButton
                            animationType="aurora-glass-c"
                            label="Ajuster avec l'IA"
                            className="border-white/20 shadow-[0_0_20px_rgba(238,149,179,0.15)]"
                        />
                    </CardContent>
                </Card>

                {/* Variation 7: Plasma */}
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-neutral-200">7. Le Plasma</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center py-12 bg-neutral-950/50 rounded-b-lg">
                        <AIButton
                            animationType="plasma"
                            label="Ajuster avec l'IA"
                        />
                    </CardContent>
                </Card>

                {/* Variation 8: Shimmer */}
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-neutral-200">8. Le Reflet (Shimmer)</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center py-12 bg-neutral-950/50 rounded-b-lg">
                        <AIButton
                            animationType="shimmer"
                            label="Ajuster avec l'IA"
                        />
                    </CardContent>
                </Card>

            </div>

            {/* LIGHT MODE SIMULATION */}
            <div className="space-y-4 pt-12 border-t border-neutral-800">
                <h2 className="text-2xl font-serif font-bold">Simulation Light Mode (Fond Blanc)</h2>
                <p className="text-neutral-400">Test du rendu sur fond clair (#FAFAF9).</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Current State */}
                    <Card className="bg-[#FAFAF9] border-neutral-200">
                        <CardHeader>
                            <CardTitle className="text-lg font-medium text-neutral-900">Actuel (Texte Blanc)</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center py-12 bg-[#FAFAF9] rounded-b-lg">
                            <AIButton
                                animationType="aurora-glass-c"
                                label="Ajuster avec l'IA"
                                className="border-black/5 shadow-[0_0_20px_rgba(238,149,179,0.15)]"
                            />
                        </CardContent>
                    </Card>

                    {/* Proposed Fix: Dark Text */}
                    <Card className="bg-[#FAFAF9] border-neutral-200">
                        <CardHeader>
                            <CardTitle className="text-lg font-medium text-neutral-900">Proposition (Texte Sombre)</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center py-12 bg-[#FAFAF9] rounded-b-lg">
                            <AIButton
                                animationType="aurora-glass-c"
                                label="Ajuster avec l'IA"
                                className="border-black/5 shadow-[0_0_20px_rgba(238,149,179,0.15)] !text-neutral-900"
                                showIcon={true}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* FINAL ADAPTIVE DEMO */}
            <div className="space-y-4 pt-12 border-t border-neutral-800">
                <h2 className="text-2xl font-serif font-bold">Rendu Final (Adaptatif)</h2>
                <p className="text-neutral-400">Le même composant s'adapte automatiquement au mode clair/sombre.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Light Mode Context */}
                    <Card className="bg-[#FAFAF9] border-neutral-200">
                        <CardHeader>
                            <CardTitle className="text-lg font-medium text-neutral-900">Contexte Clair</CardTitle>
                            <p className="text-sm text-neutral-500">Texte sombre, couleurs vibrantes</p>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center py-12 bg-[#FAFAF9] rounded-b-lg">
                            <AIButton
                                animationType="aurora-glass-c"
                                label="Ajuster avec l'IA"
                                className="border-black/5 shadow-[0_0_20px_rgba(238,149,179,0.15)]"
                            />
                        </CardContent>
                    </Card>

                    {/* Dark Mode Context */}
                    <Card className="bg-neutral-950 border-neutral-800 dark">
                        <CardHeader>
                            <CardTitle className="text-lg font-medium text-neutral-200">Contexte Sombre</CardTitle>
                            <p className="text-sm text-neutral-400">Texte blanc, couleurs adoucies</p>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center py-12 bg-neutral-950 rounded-b-lg">
                            <div className="dark">
                                <AIButton
                                    animationType="aurora-glass-c"
                                    label="Ajuster avec l'IA"
                                    className="border-white/10 shadow-[0_0_20px_rgba(238,149,179,0.1)]"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
