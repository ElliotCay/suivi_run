'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AIButton } from '@/components/ui/AIButton'
import { motion } from 'framer-motion'
import {
  Plus,
  Send,
  Edit2,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  MessageSquare,
  Check,
  X,
  Menu,
  Settings,
  Play,
  Pause,
  Heart,
  Star,
  Copy,
  Share,
  Filter,
  Search,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'buttons' | 'inputs' | 'cards' | 'modals' | 'feedback' | 'data'>('all')
  const [selectedTheme, setSelectedTheme] = useState<'both' | 'light' | 'dark'>('both')
  const [demoRating, setDemoRating] = useState(3)
  const [demoSwitch, setDemoSwitch] = useState(false)
  const [demoSlider, setDemoSlider] = useState([50])
  const [demoSelect, setDemoSelect] = useState('')
  const [demoDialogOpen, setDemoDialogOpen] = useState(false)
  const [demoExpandedForm, setDemoExpandedForm] = useState(false)

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Header */}
        <div className="space-y-4">
          <h1 className="font-serif text-5xl tracking-tight">Design System</h1>
          <p className="text-muted-foreground text-lg font-sans">
            Catalogue complet des composants UI Allure
          </p>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 pt-4">
            {(['all', 'buttons', 'inputs', 'cards', 'modals', 'feedback', 'data'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  activeTab === tab
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {tab === 'all' && 'Tous'}
                {tab === 'buttons' && 'Boutons'}
                {tab === 'inputs' && 'Inputs'}
                {tab === 'cards' && 'Cards'}
                {tab === 'modals' && 'Modals & Dialogs'}
                {tab === 'feedback' && 'Feedback'}
                {tab === 'data' && 'Data Display'}
              </button>
            ))}
          </div>
        </div>

        {/* ===================== SECTION: BASE BUTTONS ===================== */}
        {(activeTab === 'all' || activeTab === 'buttons') && (
          <section className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Button Base (shadcn/ui)</h2>
              <p className="text-muted-foreground">
                Composant de base avec variants et tailles
              </p>
            </div>

            {/* Variants */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Variants</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Button variant="default">Default</Button>
                  <p className="text-xs text-muted-foreground">variant="default"</p>
                </div>
                <div className="space-y-2">
                  <Button variant="secondary">Secondary</Button>
                  <p className="text-xs text-muted-foreground">variant="secondary"</p>
                </div>
                <div className="space-y-2">
                  <Button variant="outline">Outline</Button>
                  <p className="text-xs text-muted-foreground">variant="outline"</p>
                </div>
                <div className="space-y-2">
                  <Button variant="ghost">Ghost</Button>
                  <p className="text-xs text-muted-foreground">variant="ghost"</p>
                </div>
                <div className="space-y-2">
                  <Button variant="link">Link</Button>
                  <p className="text-xs text-muted-foreground">variant="link"</p>
                </div>
                <div className="space-y-2">
                  <Button variant="destructive">Destructive</Button>
                  <p className="text-xs text-muted-foreground">variant="destructive"</p>
                </div>
              </div>
            </div>

            {/* Sizes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Tailles</h3>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Button size="sm">Small</Button>
                  <p className="text-xs text-muted-foreground">size="sm"</p>
                </div>
                <div className="space-y-2">
                  <Button size="default">Default</Button>
                  <p className="text-xs text-muted-foreground">size="default"</p>
                </div>
                <div className="space-y-2">
                  <Button size="lg">Large</Button>
                  <p className="text-xs text-muted-foreground">size="lg"</p>
                </div>
                <div className="space-y-2">
                  <Button size="icon"><Plus className="h-4 w-4" /></Button>
                  <p className="text-xs text-muted-foreground">size="icon"</p>
                </div>
              </div>
            </div>

            {/* With Icons */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Avec icones</h3>
              <div className="flex flex-wrap gap-4">
                <Button><Plus className="h-4 w-4" /> Ajouter</Button>
                <Button variant="outline"><Edit2 className="h-4 w-4" /> Modifier</Button>
                <Button variant="destructive"><Trash2 className="h-4 w-4" /> Supprimer</Button>
                <Button variant="secondary"><Download className="h-4 w-4" /> Exporter</Button>
                <Button variant="ghost"><RefreshCw className="h-4 w-4" /> Actualiser</Button>
              </div>
            </div>

            {/* States */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Etats</h3>
              <div className="flex flex-wrap gap-4">
                <Button>Normal</Button>
                <Button disabled>Disabled</Button>
                <Button className="pointer-events-none opacity-70">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Loading...
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* ===================== SECTION: AI BUTTONS ===================== */}
        {(activeTab === 'all' || activeTab === 'buttons') && (
          <section className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">AI Button</h2>
              <p className="text-muted-foreground">
                Bouton spécial avec animations pour les actions IA
              </p>
            </div>

            {/* Animation Types */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Types d'animation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-3 p-4 rounded-xl bg-card border">
                  <AIButton animationType="liquid" label="Liquid" />
                  <p className="text-xs text-muted-foreground">animationType="liquid" (default)</p>
                  <p className="text-xs text-muted-foreground/60">Gradient conique en rotation</p>
                </div>
                <div className="space-y-3 p-4 rounded-xl bg-card border">
                  <AIButton animationType="aurora" label="Aurora" />
                  <p className="text-xs text-muted-foreground">animationType="aurora"</p>
                  <p className="text-xs text-muted-foreground/60">Gradient fluide qui ondule</p>
                </div>
                <div className="space-y-3 p-4 rounded-xl bg-card border">
                  <AIButton animationType="aurora-glass" label="Aurora Glass" />
                  <p className="text-xs text-muted-foreground">animationType="aurora-glass"</p>
                  <p className="text-xs text-muted-foreground/60">Effet verre dépoli</p>
                </div>
                <div className="space-y-3 p-4 rounded-xl bg-card border">
                  <AIButton animationType="aurora-glass-c" label="Aurora Glass C" />
                  <p className="text-xs text-muted-foreground">animationType="aurora-glass-c"</p>
                  <p className="text-xs text-muted-foreground/60">Adaptatif light/dark</p>
                </div>
                <div className="space-y-3 p-4 rounded-xl bg-card border">
                  <AIButton animationType="plasma" label="Plasma" />
                  <p className="text-xs text-muted-foreground">animationType="plasma"</p>
                  <p className="text-xs text-muted-foreground/60">3 blobs animés</p>
                </div>
                <div className="space-y-3 p-4 rounded-xl bg-card border">
                  <AIButton animationType="shimmer" label="Shimmer" />
                  <p className="text-xs text-muted-foreground">animationType="shimmer"</p>
                  <p className="text-xs text-muted-foreground/60">Reflet glissant</p>
                </div>
                <div className="space-y-3 p-4 rounded-xl bg-card border">
                  <AIButton animationType="none" label="Sans animation" />
                  <p className="text-xs text-muted-foreground">animationType="none"</p>
                  <p className="text-xs text-muted-foreground/60">Version statique</p>
                </div>
              </div>
            </div>

            {/* Speed & Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Vitesses (liquid)</h3>
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <AIButton liquidSpeed="slow" label="Slow" />
                  <p className="text-xs text-muted-foreground">liquidSpeed="slow"</p>
                </div>
                <div className="space-y-2">
                  <AIButton liquidSpeed="medium" label="Medium" />
                  <p className="text-xs text-muted-foreground">liquidSpeed="medium"</p>
                </div>
                <div className="space-y-2">
                  <AIButton liquidSpeed="fast" label="Fast" />
                  <p className="text-xs text-muted-foreground">liquidSpeed="fast"</p>
                </div>
              </div>
            </div>

            {/* Icon Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Options d'icone</h3>
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <AIButton showIcon={true} label="Avec icone" />
                  <p className="text-xs text-muted-foreground">showIcon=true</p>
                </div>
                <div className="space-y-2">
                  <AIButton showIcon={false} label="Sans icone" />
                  <p className="text-xs text-muted-foreground">showIcon=false</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===================== SECTION: CUSTOM BUTTONS ===================== */}
        {(activeTab === 'all' || activeTab === 'buttons') && (
          <section className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Boutons Customs Actuels</h2>
              <p className="text-muted-foreground">
                Patterns utilisés dans le code mais non centralisés
              </p>
            </div>

            {/* Gradient Buttons */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Gradient CTA (from-[#ee95b3] to-[#667abf])</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Utilisé dans: TrainingBlockChatModal, PostWorkoutAnalysisCard
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="bg-gradient-to-r from-[#ee95b3] to-[#667abf] text-white font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                  Valider les ajustements
                </button>
                <button className="bg-gradient-to-r from-[#ee95b3] to-[#667abf] text-white font-medium px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity">
                  Envoyer <Send className="inline h-4 w-4 ml-2" />
                </button>
              </div>
            </div>

            {/* Glass Buttons */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Glass / Blur Buttons</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Utilisé dans: Landing page
              </p>
              <div className="flex flex-wrap gap-4 p-6 rounded-xl bg-gradient-to-br from-[#ee95b3]/30 to-[#667abf]/30">
                <button className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white/90 hover:bg-white/20 transition-all flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" />
                  Question FAQ
                </button>
                <button className="px-6 py-3 rounded-full bg-white/95 backdrop-blur-sm text-slate-900 font-semibold shadow-lg hover:shadow-xl transition-all">
                  Connecter Strava
                </button>
              </div>
            </div>

            {/* Toggle Buttons */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Toggle / Tab Buttons</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Utilisé dans: TrainingBlockChatModal (scope), Filters
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 text-sm rounded-lg transition-all bg-gradient-to-r from-[#ee95b3] to-[#667abf] text-white">
                  Actif
                </button>
                <button className="px-4 py-2 text-sm rounded-lg transition-all bg-muted text-muted-foreground hover:bg-muted/80">
                  Inactif
                </button>
                <button className="px-4 py-2 text-sm rounded-lg transition-all bg-muted text-muted-foreground hover:bg-muted/80">
                  Autre option
                </button>
              </div>
            </div>

            {/* Outline Secondary */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Outline Custom</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Utilisé dans: PostWorkoutAnalysisCard (reject)
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="border border-white/10 font-medium px-4 py-2 rounded-lg hover:bg-white/5 transition-colors">
                  Ignorer
                </button>
                <button className="border border-border font-medium px-4 py-2 rounded-lg hover:bg-accent transition-colors">
                  Annuler
                </button>
              </div>
            </div>

            {/* Motion Buttons */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Motion Buttons (Framer)</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Utilisé dans: Landing page CTA
              </p>
              <div className="flex flex-wrap gap-4">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 rounded-full bg-foreground text-background font-semibold shadow-lg"
                >
                  Hover me
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-[#ee95b3] to-[#667abf] text-white font-semibold shadow-lg"
                >
                  With gradient
                </motion.button>
              </div>
            </div>

            {/* Icon-only Buttons */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Icon-only Buttons</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Utilisé dans: Sidebar, DraggableWorkoutCard, etc.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="h-8 w-8 rounded-lg hover:bg-accent transition-colors flex items-center justify-center">
                  <Menu className="h-5 w-5" />
                </button>
                <button className="h-9 w-9 rounded-lg bg-background shadow-lg border flex items-center justify-center hover:bg-accent transition-colors">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button className="hover:scale-110 transition-transform">
                  <Heart className="h-5 w-5 text-muted-foreground hover:text-red-500 transition-colors" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===================== SECTION: PROPOSED BUTTONS ===================== */}
        {(activeTab === 'all' || activeTab === 'buttons') && (
          <section className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Propositions de Centralisation</h2>
              <p className="text-muted-foreground">
                Nouveaux composants à créer pour uniformiser
              </p>
            </div>

            {/* GradientButton */}
            <div className="space-y-4 p-6 rounded-xl bg-card border">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-green-500/10 text-green-600 text-xs font-medium">NOUVEAU</span>
                <h3 className="text-lg font-medium">GradientButton</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Bouton CTA avec bordure gradient Allure. Animation directionnelle au hover.
              </p>
              <div className="flex flex-wrap gap-6">
                {/* GradientButton: bordure gradient uniquement, intérieur transparent/glass */}
                <div className="space-y-2">
                  <button className="relative px-4 py-2 rounded-full font-medium transition-all border-[1.5px] border-transparent bg-clip-padding hover:shadow-lg hover:shadow-pink-500/20" style={{ backgroundImage: 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(90deg, #ee95b3, #667abf)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
                    Default
                  </button>
                  <p className="text-xs text-muted-foreground text-center">default</p>
                </div>
                <div className="space-y-2">
                  <button className="relative px-3 py-1.5 text-sm rounded-full font-medium transition-all border-[1.5px] border-transparent bg-clip-padding" style={{ backgroundImage: 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(90deg, #ee95b3, #667abf)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
                    Small
                  </button>
                  <p className="text-xs text-muted-foreground text-center">size="sm"</p>
                </div>
                <div className="space-y-2">
                  <button className="relative px-6 py-3 rounded-full font-medium transition-all border-[2px] border-transparent bg-clip-padding hover:shadow-lg hover:shadow-pink-500/20" style={{ backgroundImage: 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(90deg, #ee95b3, #667abf)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
                    Large
                  </button>
                  <p className="text-xs text-muted-foreground text-center">size="lg"</p>
                </div>
                <div className="space-y-2">
                  <button className="relative px-4 py-2 rounded-lg font-medium transition-all border-[1.5px] border-transparent bg-clip-padding" style={{ backgroundImage: 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(90deg, #ee95b3, #667abf)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
                    Rounded LG
                  </button>
                  <p className="text-xs text-muted-foreground text-center">rounded="lg"</p>
                </div>
              </div>
              <pre className="mt-4 p-3 rounded-lg bg-muted text-xs overflow-x-auto">
{`<GradientButton>Default</GradientButton>
<GradientButton size="sm">Small</GradientButton>
<GradientButton size="lg">Large</GradientButton>
<GradientButton rounded="lg">Rounded LG</GradientButton>
// Gradient = bordure uniquement, jamais en fond`}
              </pre>
            </div>

            {/* GlassButton */}
            <div className="space-y-4 p-6 rounded-xl bg-card border">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-green-500/10 text-green-600 text-xs font-medium">NOUVEAU</span>
                <h3 className="text-lg font-medium">GlassButton</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Bouton avec effet verre/blur pour les fonds colorés (landing, modals).
              </p>
              <div className="flex flex-wrap gap-4 p-6 rounded-xl bg-gradient-to-br from-[#ee95b3]/40 to-[#667abf]/40">
                <button className="px-4 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white font-medium hover:bg-white/25 transition-all">
                  Transparent
                </button>
                <button className="px-4 py-2 rounded-full bg-white/90 backdrop-blur-md text-slate-900 font-medium hover:bg-white transition-all shadow-lg">
                  Solid
                </button>
              </div>
              <pre className="mt-4 p-3 rounded-lg bg-muted text-xs overflow-x-auto">
{`<GlassButton variant="transparent">Transparent</GlassButton>
<GlassButton variant="solid">Solid</GlassButton>`}
              </pre>
            </div>

            {/* ToggleButtonGroup */}
            <div className="space-y-4 p-6 rounded-xl bg-card border">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-green-500/10 text-green-600 text-xs font-medium">NOUVEAU</span>
                <h3 className="text-lg font-medium">ToggleButtonGroup</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Groupe de boutons toggle pour filtres, tabs, scopes. Style unifié.
              </p>
              <div className="space-y-6">
                {/* Variant: Tabs (contained) */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">variant="tabs"</p>
                  <div className="flex gap-1 p-1 rounded-xl bg-muted">
                    <button className="flex-1 px-4 py-2 text-sm rounded-lg transition-all bg-background text-foreground shadow-sm font-medium">
                      Option 1
                    </button>
                    <button className="flex-1 px-4 py-2 text-sm rounded-lg transition-all text-foreground/60 hover:text-foreground hover:bg-background/50 border border-transparent hover:border-border/50">
                      Option 2
                    </button>
                    <button className="flex-1 px-4 py-2 text-sm rounded-lg transition-all text-foreground/60 hover:text-foreground hover:bg-background/50 border border-transparent hover:border-border/50">
                      Option 3
                    </button>
                  </div>
                </div>
                {/* Variant: Pills with gradient border */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">variant="pills" (gradient border)</p>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 text-sm rounded-full font-medium transition-all border-[1.5px] border-transparent" style={{ backgroundImage: 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(90deg, #ee95b3, #667abf)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
                      Actif
                    </button>
                    <button className="px-4 py-2 text-sm rounded-full transition-all border border-border text-foreground/70 hover:text-foreground hover:border-foreground/30 hover:bg-accent">
                      Inactif
                    </button>
                    <button className="px-4 py-2 text-sm rounded-full transition-all border border-border text-foreground/70 hover:text-foreground hover:border-foreground/30 hover:bg-accent">
                      Autre
                    </button>
                  </div>
                </div>
                {/* Variant: Outline simple */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">variant="outline"</p>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 text-sm rounded-lg transition-all bg-foreground text-background font-medium">
                      Actif
                    </button>
                    <button className="px-4 py-2 text-sm rounded-lg transition-all border border-border text-foreground/70 hover:text-foreground hover:bg-accent">
                      Inactif
                    </button>
                    <button className="px-4 py-2 text-sm rounded-lg transition-all border border-border text-foreground/70 hover:text-foreground hover:bg-accent">
                      Autre
                    </button>
                  </div>
                </div>
              </div>
              <pre className="mt-4 p-3 rounded-lg bg-muted text-xs overflow-x-auto">
{`<ToggleButtonGroup
  options={["Option 1", "Option 2", "Option 3"]}
  value={selected}
  onChange={setSelected}
  variant="tabs" // "pills" | "outline"
/>`}
              </pre>
            </div>

            {/* IconButton */}
            <div className="space-y-4 p-6 rounded-xl bg-card border">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-green-500/10 text-green-600 text-xs font-medium">NOUVEAU</span>
                <h3 className="text-lg font-medium">IconButton</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Bouton icone standardisé avec variants et tailles consistantes.
              </p>
              <div className="flex flex-wrap items-center gap-6">
                {/* Simulated IconButton variants */}
                <div className="space-y-2 flex flex-col items-center">
                  <button className="h-8 w-8 rounded-lg bg-muted hover:bg-accent transition-colors flex items-center justify-center">
                    <Settings className="h-4 w-4" />
                  </button>
                  <p className="text-xs text-muted-foreground">muted</p>
                </div>
                <div className="space-y-2 flex flex-col items-center">
                  <button className="h-9 w-9 rounded-lg border bg-background shadow-sm hover:bg-accent transition-colors flex items-center justify-center">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <p className="text-xs text-muted-foreground">outline</p>
                </div>
                <div className="space-y-2 flex flex-col items-center">
                  <button className="h-10 w-10 rounded-full flex items-center justify-center transition-all border-[1.5px] border-transparent hover:shadow-lg hover:shadow-pink-500/20" style={{ backgroundImage: 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(90deg, #ee95b3, #667abf)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
                    <Send className="h-4 w-4" />
                  </button>
                  <p className="text-xs text-muted-foreground">gradient</p>
                </div>
                <div className="space-y-2 flex flex-col items-center">
                  <button className="h-8 w-8 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors flex items-center justify-center">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <p className="text-xs text-muted-foreground">destructive</p>
                </div>
              </div>
              <pre className="mt-4 p-3 rounded-lg bg-muted text-xs overflow-x-auto">
{`<IconButton icon={Settings} variant="muted" />
<IconButton icon={Edit2} variant="outline" />
<IconButton icon={Send} variant="gradient" /> // gradient = bordure uniquement
<IconButton icon={Trash2} variant="ghost" colorOnHover="destructive" />`}
              </pre>
            </div>

            {/* DialogButtons */}
            <div className="space-y-4 p-6 rounded-xl bg-card border">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-green-500/10 text-green-600 text-xs font-medium">NOUVEAU</span>
                <h3 className="text-lg font-medium">DialogButtons</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Paire de boutons standardisée pour les modals/dialogs (Confirm + Cancel).
              </p>
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">variant="default"</p>
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline">Annuler</Button>
                    <Button>Confirmer</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">variant="destructive"</p>
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline">Annuler</Button>
                    <Button variant="destructive">Supprimer</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">variant="gradient" (bordure uniquement)</p>
                  <div className="flex gap-3 justify-end">
                    <button className="px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors font-medium">
                      Ignorer
                    </button>
                    <button className="px-4 py-2 rounded-lg font-medium transition-all border-[1.5px] border-transparent hover:shadow-lg hover:shadow-pink-500/20" style={{ backgroundImage: 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(90deg, #ee95b3, #667abf)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
                      Valider
                    </button>
                  </div>
                </div>
              </div>
              <pre className="mt-4 p-3 rounded-lg bg-muted text-xs overflow-x-auto">
{`<DialogButtons
  onCancel={handleCancel}
  onConfirm={handleConfirm}
  confirmLabel="Confirmer"
  cancelLabel="Annuler"
  variant="default" // "destructive" | "gradient"
/>`}
              </pre>
            </div>
          </section>
        )}

        {/* ===================== SECTION: INPUTS ===================== */}
        {(activeTab === 'all' || activeTab === 'inputs') && (
          <section className="space-y-8">
            <div className="space-y-2">
              <h2 className="font-serif text-2xl">Inputs & Forms</h2>
              <p className="text-muted-foreground">
                Champs de formulaire et contrôles
              </p>
            </div>

            {/* Text Inputs */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Text Input</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Default</Label>
                  <Input placeholder="Placeholder text..." />
                </div>
                <div className="space-y-2">
                  <Label>Disabled</Label>
                  <Input placeholder="Disabled input" disabled />
                </div>
                <div className="space-y-2">
                  <Label>With icon</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Rechercher..." className="pl-10" />
                  </div>
                </div>
              </div>
            </div>

            {/* Allure Glass Input */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Allure Glass Input</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Style utilisé dans MissingFeedbackModal et autres contextes dark/glass
              </p>
              <div className="p-6 rounded-xl bg-black/80">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white/70">Type de sortie</Label>
                    <Select value={demoSelect} onValueChange={setDemoSelect}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facile">Facile / Endurance</SelectItem>
                        <SelectItem value="tempo">Tempo / Allure soutenue</SelectItem>
                        <SelectItem value="fractionne">Fractionné</SelectItem>
                        <SelectItem value="longue">Sortie longue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Commentaire</Label>
                    <Textarea
                      placeholder="Ressenti, conditions..."
                      className="bg-white/5 border-white/10 text-white resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Textarea</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Default</Label>
                  <Textarea placeholder="Votre message..." rows={4} />
                </div>
                <div className="space-y-2">
                  <Label>Disabled</Label>
                  <Textarea placeholder="Disabled textarea" disabled rows={4} />
                </div>
              </div>
            </div>

            {/* Select */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Select</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Default</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opt1">Option 1</SelectItem>
                      <SelectItem value="opt2">Option 2</SelectItem>
                      <SelectItem value="opt3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Disabled</Label>
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Désactivé" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opt1">Option 1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Rating Stars */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Rating (Étoiles)</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Utilisé dans: MissingFeedbackModal, WorkoutDetailPage
              </p>
              <div className="flex flex-wrap gap-8">
                <div className="space-y-2">
                  <Label>Light mode</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setDemoRating(star)}
                        className={cn(
                          "text-2xl transition-all duration-150 hover:scale-110",
                          star <= demoRating ? "text-amber-400" : "text-gray-300"
                        )}
                      >
                        {star <= demoRating ? "★" : "☆"}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Valeur: {demoRating}/5</p>
                </div>
                <div className="space-y-2 p-4 rounded-lg bg-black/80">
                  <Label className="text-white/70">Dark/Glass mode</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setDemoRating(star)}
                        className={cn(
                          "text-2xl transition-all duration-150 hover:scale-110",
                          star <= demoRating ? "text-amber-400" : "text-white/20"
                        )}
                      >
                        {star <= demoRating ? "★" : "☆"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Switch */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Switch</h3>
              <div className="flex flex-wrap gap-8">
                <div className="flex items-center gap-3">
                  <Switch checked={demoSwitch} onCheckedChange={setDemoSwitch} />
                  <Label>{demoSwitch ? 'Activé' : 'Désactivé'}</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch disabled />
                  <Label className="text-muted-foreground">Disabled</Label>
                </div>
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Slider</h3>
              <div className="max-w-md space-y-4">
                <div className="space-y-2">
                  <Label>Valeur: {demoSlider[0]}%</Label>
                  <Slider value={demoSlider} onValueChange={setDemoSlider} max={100} step={1} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===================== SECTION: CARDS ===================== */}
        {(activeTab === 'all' || activeTab === 'cards') && (
          <section className="space-y-8">
            <div className="space-y-2">
              <h2 className="font-serif text-2xl">Cards</h2>
              <p className="text-muted-foreground">
                Conteneurs et layouts
              </p>
            </div>

            {/* Standard Card */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Card Standard (shadcn)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Titre de la card</CardTitle>
                    <CardDescription>Description optionnelle</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Contenu de la card avec du texte.</p>
                  </CardContent>
                  <CardFooter>
                    <Button size="sm">Action</Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Métriques</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Distance</span>
                      <span className="font-mono font-bold">12.5 km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allure</span>
                      <span className="font-mono font-bold italic">5:24/km</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Glass Card */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Glass Card (Allure)</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Style "Liquid Glass" - utilisé dans MissingFeedbackModal, overlays
              </p>
              <div className="p-8 rounded-xl bg-gradient-to-br from-[#ee95b3]/30 to-[#667abf]/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-medium text-white">Course</span>
                      <span className="text-sm text-white/60">jeu. 5 déc</span>
                    </div>
                    <div className="flex gap-4 text-sm text-white/60">
                      <span className="font-mono">8.50 km</span>
                      <span className="font-mono">45min</span>
                      <span className="font-mono italic">5:18/km</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 shadow-lg shadow-black/5">
                    <p className="text-white/80">Card avec shadow élevée</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Card */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Expandable Card</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Pattern utilisé dans MissingFeedbackModal pour le formulaire inline
              </p>
              <div className="max-w-xl">
                <div className={cn(
                  "rounded-xl overflow-hidden transition-all duration-300 ease-out",
                  "bg-card border",
                  demoExpandedForm ? "shadow-lg" : "hover:bg-accent/50"
                )}>
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">Course du 5 décembre</p>
                      <p className="text-sm text-muted-foreground font-mono">8.5 km · 45min</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setDemoExpandedForm(!demoExpandedForm)}
                      className="gap-1.5"
                      style={{ backgroundImage: 'linear-gradient(90deg, #ee95b3, #667abf)' }}
                    >
                      {demoExpandedForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {demoExpandedForm ? 'Fermer' : 'Ajouter'}
                    </Button>
                  </div>
                  <div className={cn(
                    "overflow-hidden transition-all duration-300 ease-out",
                    demoExpandedForm ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
                  )}>
                    <div className="px-4 pb-4 pt-2 border-t space-y-4">
                      <div className="space-y-2">
                        <Label>Type de sortie</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="facile">Facile</SelectItem>
                            <SelectItem value="tempo">Tempo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Commentaire</Label>
                        <Textarea placeholder="Ressenti..." rows={2} />
                      </div>
                      <Button className="w-full" style={{ backgroundImage: 'linear-gradient(90deg, #ee95b3, #667abf)' }}>
                        Sauvegarder
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===================== SECTION: MODALS & DIALOGS ===================== */}
        {(activeTab === 'all' || activeTab === 'modals') && (
          <section className="space-y-8">
            <div className="space-y-2">
              <h2 className="font-serif text-2xl">Modals & Dialogs</h2>
              <p className="text-muted-foreground">
                Fenêtres modales et dialogues
              </p>
            </div>

            {/* Basic Dialog */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Dialog Standard</h3>
              <div className="flex gap-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Ouvrir Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Titre du Dialog</DialogTitle>
                      <DialogDescription>
                        Description du dialog avec des informations supplémentaires.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p>Contenu du dialog...</p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">Annuler</Button>
                      <Button>Confirmer</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Dialog Destructif</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Supprimer cet élément ?</DialogTitle>
                      <DialogDescription>
                        Cette action est irréversible.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline">Annuler</Button>
                      <Button variant="destructive">Supprimer</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Allure Glass Dialog */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Allure Glass Dialog</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Style utilisé dans MissingFeedbackModal
              </p>
              <Dialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen}>
                <DialogTrigger asChild>
                  <Button style={{ backgroundImage: 'linear-gradient(90deg, #ee95b3, #667abf)' }}>
                    Ouvrir Glass Dialog
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background/95 backdrop-blur-xl border-white/10">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-2xl tracking-tight">
                      2 actions en attente
                    </DialogTitle>
                    <DialogDescription className="font-sans">
                      Complétez vos séances pour un meilleur suivi
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="feedback" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2 bg-white/5">
                      <TabsTrigger value="feedback" className="data-[state=active]:bg-white/10">
                        Feedback (2)
                      </TabsTrigger>
                      <TabsTrigger value="import" className="data-[state=active]:bg-white/10">
                        Strava (0)
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="feedback" className="mt-4 space-y-3">
                      <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Course</p>
                            <p className="text-sm text-muted-foreground font-mono">8.5 km</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="border-white/10">R.A.S.</Button>
                            <Button size="sm" style={{ backgroundImage: 'linear-gradient(90deg, #ee95b3, #667abf)' }}>
                              Ajouter
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  <div className="flex justify-end mt-4 pt-4 border-t border-white/10">
                    <Button variant="outline" onClick={() => setDemoDialogOpen(false)} className="border-white/10">
                      Plus tard
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Tabs */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Tabs</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Default (shadcn)</p>
                  <Tabs defaultValue="tab1" className="max-w-md">
                    <TabsList>
                      <TabsTrigger value="tab1">Onglet 1</TabsTrigger>
                      <TabsTrigger value="tab2">Onglet 2</TabsTrigger>
                      <TabsTrigger value="tab3">Onglet 3</TabsTrigger>
                    </TabsList>
                    <TabsContent value="tab1" className="p-4 border rounded-lg mt-2">
                      Contenu onglet 1
                    </TabsContent>
                    <TabsContent value="tab2" className="p-4 border rounded-lg mt-2">
                      Contenu onglet 2
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Glass style (Allure)</p>
                  <Tabs defaultValue="tab1" className="max-w-md">
                    <TabsList className="bg-white/5">
                      <TabsTrigger value="tab1" className="data-[state=active]:bg-white/10">Onglet 1</TabsTrigger>
                      <TabsTrigger value="tab2" className="data-[state=active]:bg-white/10">Onglet 2</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===================== SECTION: FEEDBACK ===================== */}
        {(activeTab === 'all' || activeTab === 'feedback') && (
          <section className="space-y-8">
            <div className="space-y-2">
              <h2 className="font-serif text-2xl">Feedback & Alerts</h2>
              <p className="text-muted-foreground">
                Notifications, alertes et états
              </p>
            </div>

            {/* Toast */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Toast (Sonner)</h3>
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => toast.success('Séance mise à jour')}>
                  Toast Success
                </Button>
                <Button variant="outline" onClick={() => toast.error('Erreur lors de la sauvegarde')}>
                  Toast Error
                </Button>
                <Button variant="outline" onClick={() => toast.info('Information')}>
                  Toast Info
                </Button>
                <Button variant="outline" onClick={() => toast('Toast default')}>
                  Toast Default
                </Button>
              </div>
            </div>

            {/* Alert Boxes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Alert Boxes</h3>
              <div className="space-y-4 max-w-xl">
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">Succès</p>
                    <p className="text-sm text-green-600 dark:text-green-300/80">Votre séance a été sauvegardée.</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-400">Erreur</p>
                    <p className="text-sm text-red-600 dark:text-red-300/80">Une erreur est survenue.</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700 dark:text-amber-400">Attention</p>
                    <p className="text-sm text-amber-600 dark:text-amber-300/80">Cette action est irréversible.</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-700 dark:text-blue-400">Information</p>
                    <p className="text-sm text-blue-600 dark:text-blue-300/80">Conseil pour améliorer vos performances.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading States */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Loading States</h3>
              <div className="flex flex-wrap gap-6">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Spinner</p>
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Button loading</p>
                  <Button disabled>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Chargement...
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Skeleton</p>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Progress</h3>
              <div className="max-w-md space-y-4">
                <Progress value={33} />
                <Progress value={66} />
                <Progress value={100} />
              </div>
            </div>
          </section>
        )}

        {/* ===================== SECTION: DATA DISPLAY ===================== */}
        {(activeTab === 'all' || activeTab === 'data') && (
          <section className="space-y-8">
            <div className="space-y-2">
              <h2 className="font-serif text-2xl">Data Display</h2>
              <p className="text-muted-foreground">
                Badges, tags et affichage de données
              </p>
            </div>

            {/* Badges */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Badges</h3>
              <div className="flex flex-wrap gap-4">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </div>

            {/* Workout Type Badges */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Workout Type Badges</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Couleurs sémantiques pour les types de séances (green=facile, orange=tempo, red=fractionné)
              </p>
              <div className="flex flex-wrap gap-4">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                  Facile
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  Tempo
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500/10 text-red-600 border border-red-500/20">
                  Fractionné
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  Sortie longue
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-500/10 text-slate-600 border border-slate-500/20">
                  Récupération
                </span>
              </div>
            </div>

            {/* NEW Badge (Allure gradient) */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">NEW Badge (Allure)</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Badge avec gradient Allure pour les nouveaux records
              </p>
              <div className="flex gap-4 items-center">
                <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundImage: 'linear-gradient(90deg, #ee95b3, #667abf)' }}>
                  NEW
                </span>
                <span className="text-sm text-muted-foreground">Record du 10km - 42:30</span>
              </div>
            </div>

            {/* Action Badges */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Action Badges</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Utilisé dans TrainingBlockChatModal pour les ajustements
              </p>
              <div className="flex flex-wrap gap-4">
                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded">Modifié</span>
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">Supprimé</span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">Reprogrammé</span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Créé</span>
              </div>
            </div>

            {/* Typography for Data */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-muted-foreground">Typography for Data</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Conventions typographiques Allure: font-mono pour les métriques, italic pour l'allure
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-serif">Course du 5 décembre</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-sans">Distance</span>
                      <span className="font-mono tabular-nums font-bold">12.50 km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-sans">Durée</span>
                      <span className="font-mono tabular-nums">1h07min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-sans">Allure</span>
                      <span className="font-mono tabular-nums italic">5:24/km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-sans">FC moyenne</span>
                      <span className="font-mono tabular-nums">156 bpm</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}

        {/* ===================== SECTION: ICONS REFERENCE ===================== */}
        {activeTab === 'all' && (
          <section className="space-y-8">
            <div className="space-y-2">
              <h2 className="font-serif text-2xl">Icones fréquemment utilisées</h2>
              <p className="text-muted-foreground">
                Référence des icones Lucide utilisées avec les boutons
              </p>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {[
                { icon: Plus, name: 'Plus' },
                { icon: Send, name: 'Send' },
                { icon: Edit2, name: 'Edit2' },
                { icon: Trash2, name: 'Trash2' },
                { icon: Download, name: 'Download' },
                { icon: Upload, name: 'Upload' },
                { icon: RefreshCw, name: 'RefreshCw' },
                { icon: ChevronRight, name: 'ChevronRight' },
                { icon: ChevronLeft, name: 'ChevronLeft' },
                { icon: Sparkles, name: 'Sparkles' },
                { icon: Calendar, name: 'Calendar' },
                { icon: MessageSquare, name: 'MessageSquare' },
                { icon: Check, name: 'Check' },
                { icon: X, name: 'X' },
                { icon: Menu, name: 'Menu' },
                { icon: Settings, name: 'Settings' },
                { icon: Play, name: 'Play' },
                { icon: Pause, name: 'Pause' },
                { icon: Heart, name: 'Heart' },
                { icon: Star, name: 'Star' },
                { icon: Copy, name: 'Copy' },
                { icon: Share, name: 'Share' },
                { icon: Filter, name: 'Filter' },
                { icon: Search, name: 'Search' },
                { icon: ArrowRight, name: 'ArrowRight' },
                { icon: ExternalLink, name: 'ExternalLink' },
              ].map(({ icon: Icon, name }) => (
                <div key={name} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-card border hover:bg-accent transition-colors">
                  <Icon className="h-5 w-5" />
                  <span className="text-xs text-muted-foreground">{name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===================== SECTION: SUMMARY ===================== */}
        {activeTab === 'all' && (
          <section className="space-y-8 pb-12">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Resume</h2>
              <p className="text-muted-foreground">
                Structure proposée pour les composants boutons
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card border font-mono text-sm">
              <pre className="overflow-x-auto">
{`frontend/components/ui/buttons/
├── Button.tsx           # Base shadcn (existant)
├── AIButton.tsx         # Bouton IA animé (existant, à déplacer)
├── GradientButton.tsx   # CTA gradient Allure
├── GlassButton.tsx      # Style glass/blur
├── IconButton.tsx       # Bouton icone standardisé
├── ToggleButtonGroup.tsx # Groupe toggle/tabs
├── DialogButtons.tsx    # Paire confirm/cancel
└── index.ts             # Export centralisé`}
              </pre>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Note:</strong> Une fois validés, ces composants remplaceront les styles inline
                dans tout le projet pour garantir une cohérence parfaite.
              </p>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
