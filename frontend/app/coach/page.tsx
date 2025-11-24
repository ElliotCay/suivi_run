'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Target, Calendar, Sparkles } from 'lucide-react'

export default function CoachPage() {
  const [activeTab, setActiveTab] = useState('race')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-6xl font-serif font-bold tracking-tight">
          Coach
        </h1>
        <p className="text-base text-muted-foreground">
          Ton assistant d'entraînement personnalisé
        </p>
      </div>

      {/* Mode Selection Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="race" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span>Objectif Course</span>
          </TabsTrigger>
          <TabsTrigger value="block" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Bloc 4 semaines</span>
          </TabsTrigger>
          <TabsTrigger value="suggestion" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>Suggestion</span>
          </TabsTrigger>
        </TabsList>

        {/* Mode 1: Objectif Course */}
        <TabsContent value="race" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Préparation Course</CardTitle>
              <CardDescription>
                Génère un plan complet (8-12 semaines) pour préparer une course officielle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-base font-bold mb-2">
                  Aucun objectif défini
                </p>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Crée ton premier objectif de course pour recevoir un plan d'entraînement personnalisé avec périodisation complète.
                </p>
                <Button size="lg">
                  <Target className="h-4 w-4 mr-2" />
                  Créer un objectif
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mode 2: Bloc 4 semaines */}
        <TabsContent value="block" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bloc 4 Semaines</CardTitle>
              <CardDescription>
                Un cycle court pour progresser sur un aspect spécifique (volume, vitesse, VMA, endurance)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-base font-bold mb-2">
                  Pas de bloc actif
                </p>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Génère un bloc de 4 semaines pour travailler un focus spécifique. Idéal quand tu n'as pas de course en vue.
                </p>
                <Button size="lg">
                  <Calendar className="h-4 w-4 mr-2" />
                  Générer un bloc
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mode 3: Suggestion ponctuelle */}
        <TabsContent value="suggestion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suggestion Ponctuelle</CardTitle>
              <CardDescription>
                Une séance unique adaptée à ton état actuel et ton historique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-base font-bold mb-2">
                  Besoin d'inspiration ?
                </p>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Génère une séance personnalisée pour aujourd'hui ou demain basée sur ton niveau de forme et tes derniers entraînements.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" variant="outline">
                    Séance spécifique
                  </Button>
                  <Button size="lg">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Surprise-moi
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold">
                Mode Coach IA
              </p>
              <p className="text-sm text-muted-foreground">
                Toutes les suggestions sont générées par Claude en fonction de ton profil, ton historique et tes préférences.
                Tu peux choisir entre le mode intégré (API) ou l'export manuel dans les Réglages.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
