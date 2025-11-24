'use client'

import NavbarUnified, { type NavbarMode } from './NavbarUnified'

interface NavbarOrchestratorProps {
  mode: NavbarMode
  isPreview?: boolean
}

export type { NavbarMode }

export default function NavbarOrchestrator({ mode, isPreview = false }: NavbarOrchestratorProps) {
  return <NavbarUnified mode={mode} isPreview={isPreview} />
}
