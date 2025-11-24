'use client'

import { motion } from 'framer-motion'
import { LayoutTemplate, PanelTop, PanelsTopLeft } from 'lucide-react'
import type { ElementType } from 'react'
import { cn } from '@/lib/utils'

export type NavbarStyle = 'floating' | 'compact' | 'classic'

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
    id: 'compact',
    title: 'Compact',
    description: 'Version compacte centrée qui se replie au scroll.',
    icon: PanelTop,
  },
]

interface NavbarStyleCardProps {
  activeStyle: NavbarStyle
  onChange: (style: NavbarStyle) => void
}

export function NavbarStyleCard({ activeStyle, onChange }: NavbarStyleCardProps) {
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="relative overflow-hidden rounded-[24px] border border-neutral-200/70 dark:border-neutral-800/80 bg-neutral-50/80 dark:bg-neutral-900/60 shadow-2xl">
        <div className="grid gap-4 md:grid-cols-[1.2fr,1fr] p-6">
          {/* Preview */}
          <MiniNavbarMock activeStyle={activeStyle} />

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

function MiniNavbarMock({ activeStyle }: { activeStyle: NavbarStyle }) {
  const pillBase = 'rounded-full border border-white/30 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl bg-white/70 dark:bg-white/10'
  const textBase = 'text-xs font-medium text-slate-800 dark:text-slate-100'
  const navItems = ['Dashboard', 'Séances', 'Records', 'Bloc 4 sem.', 'Coach AI', 'Plus']
  const compactIcons = ['🏠', '🏃', '🏅', '📅', '✨', '⋯']

  return (
    <div className="relative h-[260px] rounded-2xl bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border border-white/60 dark:border-white/5 shadow-inner overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute -left-10 top-6 h-24 w-24 rounded-full bg-sky-200/40 blur-3xl"
          animate={{ x: [0, 18, 0], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-0 -bottom-6 h-28 w-28 rounded-full bg-indigo-300/50 blur-3xl"
          animate={{ x: [0, -14, 0], opacity: [0.45, 0.75, 0.45] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative flex flex-col gap-4 w-full max-w-3xl px-6 pointer-events-none">
        <ModeRow
          label="Classic"
          active={activeStyle === 'classic'}
          hint="Pills séparées"
          render={() => (
            <div className="flex items-center gap-3 w-full justify-between">
              <div className={cn(pillBase, 'px-3 py-1.5 min-w-[96px] text-center font-semibold lowercase text-sm text-slate-900 dark:text-white')}>allure</div>
              <div className={cn(pillBase, 'flex-1 flex items-center justify-center gap-1 px-3 py-1.5 max-w-[520px]')}
                   style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 10px 30px rgba(0,0,0,0.05)' }}>
                {navItems.map((item) => (
                  <div
                    key={item}
                    className={cn(
                      textBase,
                      'px-2 py-1 rounded-full transition-colors',
                      item === 'Séances' ? 'bg-black/10 dark:bg-white/10 font-semibold' : 'bg-transparent'
                    )}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className={cn(pillBase, 'h-10 w-10 flex items-center justify-center text-white bg-black dark:bg-white/20 border-none')}>
                ☾
              </div>
            </div>
          )}
        />

        <ModeRow
          label="Floating"
          active={activeStyle === 'floating'}
          hint="Tout dans une pill"
          render={() => (
            <div className={cn(pillBase, 'flex items-center gap-3 px-4 py-2 justify-center w-full')}
                 style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 10px 30px rgba(0,0,0,0.05)' }}>
              <div className={cn('font-semibold text-sm text-slate-900 dark:text-white px-2 lowercase')}>allure</div>
              {navItems.map((item) => (
                <div
                  key={item}
                  className={cn(
                    textBase,
                    'px-2.5 py-1 rounded-full transition-colors',
                    item === 'Séances' ? 'bg-black/10 dark:bg-white/10 font-semibold' : 'bg-transparent'
                  )}
                >
                  {item}
                </div>
              ))}
              <div className={cn('h-8 w-8 flex items-center justify-center rounded-full text-white bg-black dark:bg-white/20 border border-white/20 ml-1')}>
                ☾
              </div>
            </div>
          )}
        />

        <ModeRow
          label="Compact"
          active={activeStyle === 'compact'}
          hint="Pictos uniquement"
          render={() => (
            <div className={cn(pillBase, 'flex items-center gap-2 px-3 py-2 justify-center w-full')}
                 style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 10px 30px rgba(0,0,0,0.05)' }}>
              <div className={cn('font-semibold text-sm text-slate-900 dark:text-white px-2 lowercase')}>allure</div>
              <div className="flex items-center gap-1">
                {compactIcons.map((item, idx) => (
                  <div
                    key={idx}
                    className="h-7 w-7 rounded-full bg-white/25 dark:bg-white/10 text-[11px] flex items-center justify-center text-slate-800 dark:text-white shadow-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className={cn('h-8 w-8 flex items-center justify-center rounded-full text-white bg-black dark:bg-white/20 border border-white/20 ml-1')}>
                ☾
              </div>
            </div>
          )}
        />
      </div>
    </div>
  )
}

function ModeRow({
  label,
  hint,
  active,
  render,
}: {
  label: string
  hint: string
  active: boolean
  render: () => React.ReactNode
}) {
  return (
    <div className={cn('rounded-xl border border-white/50 dark:border-white/10 p-3 shadow-sm bg-white/60 dark:bg-white/5', active && 'ring-2 ring-blue-400/60')}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>{label}</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </div>
        {active && <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">Actif</span>}
      </div>
      {render()}
    </div>
  )
}
