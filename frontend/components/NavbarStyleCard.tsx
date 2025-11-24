'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Award, BarChart3, CalendarDays, LayoutTemplate, PanelTop, PanelsTopLeft, Settings, Sparkles, Sun } from 'lucide-react'
import type { ElementType } from 'react'
import { cn } from '@/lib/utils'

export type NavbarStyle = 'floating' | 'floating-compact' | 'classic'

const NAVBAR_OPTIONS: { id: NavbarStyle; title: string; description: string; icon: ElementType }[] = [
  {
    id: 'classic',
    title: 'Classic',
    description: 'Top bar pleine largeur avec repères classiques.',
    icon: LayoutTemplate,
  },
  {
    id: 'floating',
    title: 'Floating',
    description: 'Barre en apesanteur centrée, labels visibles au survol.',
    icon: PanelsTopLeft,
  },
  {
    id: 'floating-compact',
    title: 'Floating compact',
    description: 'Version compacte qui se replie quand tu scrolles.',
    icon: PanelTop,
  },
]

interface NavbarStyleCardProps {
  activeStyle: NavbarStyle
  onChange: (style: NavbarStyle) => void
}

export function NavbarStyleCard({ activeStyle, onChange }: NavbarStyleCardProps) {
  const current = NAVBAR_OPTIONS.find((option) => option.id === activeStyle) ?? NAVBAR_OPTIONS[0]

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="relative overflow-hidden rounded-[24px] border border-neutral-200/70 dark:border-neutral-800/80 bg-neutral-50/80 dark:bg-neutral-900/60 shadow-2xl">
        <div className="grid gap-4 md:grid-cols-[1.2fr,1fr] p-6">
          {/* Preview */}
          <div className="relative h-[260px] rounded-2xl bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border border-white/60 dark:border-white/5 shadow-inner overflow-hidden">
            <div className="absolute inset-0">
              <motion.div
                className="absolute -left-10 top-6 h-24 w-24 rounded-full bg-sky-200/50 blur-3xl"
                animate={{ x: [0, 20, 0], opacity: [0.7, 0.9, 0.7] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute right-0 -bottom-4 h-28 w-28 rounded-full bg-indigo-300/60 blur-3xl"
                animate={{ x: [0, -15, 0], opacity: [0.6, 0.85, 0.6] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeStyle}
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.45, ease: [0.25, 0.25, 0.01, 1] }}
                className="relative h-full w-full"
              >
                {activeStyle === 'floating' && <FloatingPreview />}
                {activeStyle === 'floating-compact' && <FloatingCompactPreview />}
                {activeStyle === 'classic' && <ClassicPreview />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary">Navigation</p>
              <h4 className="text-2xl font-semibold">Choisis ton style de navbar</h4>
              <p className="text-sm text-muted-foreground">
                Prévisualise et applique instantanément la barre que tu préfères. La sélection est sauvegardée pour tes prochaines sessions.
              </p>
            </div>

            <div className="space-y-3">
              {NAVBAR_OPTIONS.map((option) => {
                const Icon = option.icon
                const isActive = option.id === activeStyle

                return (
                  <button
                    key={option.id}
                    onClick={() => onChange(option.id)}
                    className={cn(
                      'group relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition-all duration-300',
                      isActive
                        ? 'border-blue-500/60 bg-blue-50/70 text-blue-900 shadow-sm dark:border-blue-400/40 dark:bg-blue-500/10 dark:text-blue-50'
                        : 'border-transparent bg-white/80 text-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-lg dark:bg-white/5'
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="navbarStyleActive"
                        className="absolute inset-0 rounded-xl border border-blue-200/70 dark:border-blue-500/30 bg-gradient-to-br from-white/80 via-blue-50/70 to-white/60 dark:from-blue-500/10 dark:via-slate-900/50 dark:to-blue-500/5"
                        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                      />
                    )}

                    <div className="relative flex items-start gap-3">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg border transition-colors',
                          isActive
                            ? 'border-blue-300/60 bg-white/90 text-blue-600 dark:border-blue-500/30 dark:bg-slate-900/60 dark:text-blue-200'
                            : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-semibold">{option.title}</p>
                          {isActive && <span className="text-xs font-medium text-blue-600 dark:text-blue-200">Actif</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FloatingPreview() {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        layoutId="navbarPreviewShell"
        className="group relative flex items-center gap-3 rounded-full border border-white/20 bg-white/70 px-5 py-3 shadow-2xl ring-1 ring-black/5 backdrop-blur-2xl dark:border-white/10 dark:bg-white/10 dark:ring-white/10"
        transition={{ type: 'spring', stiffness: 200, damping: 26 }}
      >
        <GlassPill label="allure" />
        <div className="flex items-center gap-1 overflow-hidden">
          {floatingItems.map((item, index) => (
            <FloatingChip key={item.label} {...item} emphasize={index === 1} />
          ))}
        </div>
        <div className="mx-1 h-8 w-px bg-white/30 dark:bg-white/10" />
        <ThemeDot />
      </motion.div>
    </div>
  )
}

function FloatingCompactPreview() {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        layoutId="navbarPreviewShell"
        className="group relative flex items-center gap-2 rounded-full border border-white/25 bg-white/60 px-4 py-2 shadow-xl ring-1 ring-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:ring-white/10"
        animate={{
          gap: [8, 3, 8],
          paddingRight: [16, 10, 16],
          paddingLeft: [16, 10, 16],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <GlassPill label="A" compact />
        <motion.div
          className="flex items-center gap-1 overflow-hidden"
          animate={{
            width: ['220px', '130px', '220px'],
            opacity: [1, 0.35, 1],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {floatingItems.map((item, index) => (
            <FloatingChip key={item.label} {...item} compact emphasize={index === 1} />
          ))}
        </motion.div>
        <div className="mx-1 h-7 w-px bg-white/25 dark:bg-white/10" />
        <ThemeDot compact />
      </motion.div>
    </div>
  )
}

function ClassicPreview() {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        layoutId="navbarPreviewShell"
        className="flex w-[70%] max-w-[620px] items-center rounded-2xl px-3.5 py-2 gap-3"
        transition={{ type: 'spring', stiffness: 200, damping: 26 }}
      >
        <GlassPill label="allure" wide />

        <div className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-black/5 bg-white/70 px-2.5 py-1.5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          {classicItems.map((item, index) => (
            <NavChip key={item.label} {...item} active={index === 0} />
          ))}
        </div>

        <ThemePill />
      </motion.div>
    </div>
  )
}

function GlassPill({ label, wide, compact }: { label: string; wide?: boolean; compact?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full border border-white/30 bg-white/80 px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-lg backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:text-white',
        wide && 'tracking-tight text-sm px-3.5',
        compact && 'px-2 py-1 text-xs'
      )}
    >
      {label}
    </div>
  )
}

function NavChip({
  label,
  icon: Icon,
  active,
}: {
  label: string
  icon: ElementType
  active?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[10px] font-medium transition-all',
        active
          ? 'bg-black/10 text-black shadow-inner ring-1 ring-black/10 dark:bg-white/20 dark:text-white'
          : 'text-slate-600 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10'
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
  )
}

function FloatingChip({
  label,
  icon: Icon,
  emphasize,
  compact,
}: {
  label: string
  icon: ElementType
  emphasize?: boolean
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'group/nav relative flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-slate-800 transition-all dark:text-white',
        emphasize ? 'bg-black/80 text-white shadow-lg dark:bg-white/20' : 'bg-white/40 dark:bg-white/10'
      )}
    >
      <Icon className={cn('h-4 w-4', emphasize ? 'text-white' : 'text-slate-700 dark:text-white/70')} />
      <motion.span
        className={cn(
          'ml-2 whitespace-nowrap text-[11px] font-semibold text-slate-700 dark:text-white/80',
          compact && 'overflow-hidden'
        )}
        animate={
          compact
            ? {
                width: ['56px', '0px', '56px'],
                opacity: [1, 0, 1],
              }
            : undefined
        }
        transition={
          compact
            ? {
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }
            : undefined
        }
      >
        {label}
      </motion.span>
    </div>
  )
}

function ThemeDot({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-lg',
        compact && 'h-8 w-8'
      )}
    >
      <Sun className="h-4 w-4" />
    </div>
  )
}

function ThemePill() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/90 text-slate-800 shadow-lg backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:text-white">
      <Sun className="h-4 w-4" />
    </div>
  )
}

const classicItems = [
  { label: 'Dashboard', icon: BarChart3 },
  { label: 'Séances', icon: Activity },
  { label: 'Records', icon: Award },
  { label: 'Blocs', icon: CalendarDays },
  { label: 'Coach', icon: Sparkles },
  { label: 'Réglages', icon: Settings },
]

const floatingItems = [
  { label: 'Dashboard', icon: BarChart3 },
  { label: 'Séances', icon: Activity },
  { label: 'Records', icon: Award },
  { label: 'Bloc', icon: CalendarDays },
  { label: 'Coach AI', icon: Sparkles },
  { label: 'Plus', icon: Settings },
]
