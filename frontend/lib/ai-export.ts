/**
 * AI Export utilities for manual mode
 *
 * When ai_mode is set to 'export', instead of calling the API,
 * we generate a markdown file with all context and copy it to clipboard.
 */

interface WorkoutData {
  id: number
  date: string
  distance: number
  duration: number
  avg_pace: number
  avg_hr?: number
  max_hr?: number
  elevation_gain?: number
  workout_type?: string
  user_comment?: string
}

interface ProfileData {
  name: string
  age?: number
  weight?: number
  height?: number
  level?: string
  fcmax?: number
  vma?: number
  injury_history?: any[]
  objectives?: any[]
}

/**
 * Generate markdown for workout analysis export
 */
export function generateWorkoutAnalysisMarkdown(
  workout: WorkoutData,
  recentWorkouts: WorkoutData[],
  profile: ProfileData
): string {
  const formatPace = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${String(secs).padStart(2, '0')}/km`
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  let markdown = `# Analyse de séance - ${formatDate(workout.date)}

## Métriques clés

- **Distance** : ${workout.distance.toFixed(2)} km
- **Durée** : ${formatDuration(workout.duration)}
- **Allure moyenne** : ${formatPace(workout.avg_pace)}
${workout.elevation_gain ? `- **Dénivelé** : +${workout.elevation_gain}m` : ''}

## Cardio

${workout.avg_hr ? `- **FC moyenne** : ${workout.avg_hr} bpm (${profile.fcmax ? Math.round((workout.avg_hr / profile.fcmax) * 100) : '?'}% FCmax)` : '- FC moyenne : Non disponible'}
${workout.max_hr ? `- **FC max** : ${workout.max_hr} bpm (${profile.fcmax ? Math.round((workout.max_hr / profile.fcmax) * 100) : '?'}% FCmax)` : ''}
${workout.workout_type ? `- **Type de séance** : ${workout.workout_type}` : ''}

## Contexte

### Profil athlète
- **Nom** : ${profile.name}
${profile.age ? `- **Âge** : ${profile.age} ans` : ''}
${profile.level ? `- **Niveau** : ${profile.level}` : ''}
${profile.fcmax ? `- **FCmax** : ${profile.fcmax} bpm` : ''}
${profile.vma ? `- **VMA** : ${profile.vma} km/h` : ''}

${profile.injury_history && profile.injury_history.length > 0 ? `
### Blessures/zones sensibles
${profile.injury_history.map((injury: any) => `- ${injury.type || 'Non spécifié'} : ${injury.status || 'Guéri'}`).join('\n')}
` : ''}

${profile.objectives && profile.objectives.length > 0 ? `
### Objectifs
${profile.objectives.map((obj: any) => `- ${obj.name || 'Objectif'} : ${obj.date ? new Date(obj.date).toLocaleDateString('fr-FR') : 'Date non définie'}`).join('\n')}
` : ''}

${workout.user_comment ? `
### Ressenti
${workout.user_comment}
` : ''}

## Dernières séances (contexte)

${recentWorkouts.slice(0, 3).map((w, i) => `
### ${i === 0 ? 'Avant-dernière séance' : i === 1 ? 'Il y a 2 séances' : 'Il y a 3 séances'} - ${formatDate(w.date)}
- Distance : ${w.distance.toFixed(2)} km
- Durée : ${formatDuration(w.duration)}
- Allure : ${formatPace(w.avg_pace)}
${w.avg_hr ? `- FC moyenne : ${w.avg_hr} bpm` : ''}
${w.workout_type ? `- Type : ${w.workout_type}` : ''}
`).join('\n')}

---

## Question

Analyse cette séance en tenant compte de mon profil et de mes dernières séances. Sois factuel et direct (pas de cheerleading excessif).

Points à couvrir :
1. **Qualité de la séance** : Allure et FC cohérentes avec le type de séance ?
2. **Progression** : Comparaison avec mes séances précédentes
3. **Zones de travail** : Ai-je bien respecté mes zones cibles ?
4. **Points d'amélioration** : Conseils concrets pour la prochaine fois
5. **Récupération** : Besoin de repos ou prêt pour une séance qualité ?
`

  return markdown
}

/**
 * Generate markdown for training plan generation export
 */
export function generatePlanGenerationMarkdown(
  planType: 'race' | 'block' | 'suggestion',
  params: any,
  profile: ProfileData,
  recentWorkouts: WorkoutData[]
): string {
  let markdown = ''

  if (planType === 'race') {
    markdown = `# Génération de plan - Objectif Course

## Objectif
- **Distance** : ${params.distance || '?'} km
- **Date de course** : ${params.date ? new Date(params.date).toLocaleDateString('fr-FR') : 'Non définie'}
- **Temps visé** : ${params.targetTime || 'Non défini'}
- **Nombre de semaines** : ${params.weeks || '12'} semaines

`
  } else if (planType === 'block') {
    markdown = `# Génération de bloc d'entraînement

## Objectif du bloc
- **Focus** : ${params.focus || 'Volume'}
- **Durée** : 4 semaines
- **Fréquence** : ${params.frequency || '3'} séances/semaine

`
  } else {
    markdown = `# Suggestion de séance

## Contexte de la demande
${params.context || 'Suggestion ponctuelle pour aujourd\'hui'}

`
  }

  markdown += `## Profil athlète
- **Nom** : ${profile.name}
${profile.age ? `- **Âge** : ${profile.age} ans` : ''}
${profile.level ? `- **Niveau** : ${profile.level}` : ''}
${profile.fcmax ? `- **FCmax** : ${profile.fcmax} bpm` : ''}
${profile.vma ? `- **VMA** : ${profile.vma} km/h` : ''}

${profile.injury_history && profile.injury_history.length > 0 ? `
### Blessures/zones sensibles
${profile.injury_history.map((injury: any) => `- ${injury.type || 'Non spécifié'} : ${injury.status || 'Guéri'}`).join('\n')}

**IMPORTANT** : Éviter les exercices qui sollicitent ces zones.
` : ''}

## Historique récent (4 dernières semaines)

${recentWorkouts.length > 0 ? `
- **Volume total** : ${recentWorkouts.reduce((sum, w) => sum + w.distance, 0).toFixed(1)} km sur ${recentWorkouts.length} séances
- **Allure moyenne** : ${Math.floor(recentWorkouts.reduce((sum, w) => sum + w.avg_pace, 0) / recentWorkouts.length / 60)}:${String(Math.round(recentWorkouts.reduce((sum, w) => sum + w.avg_pace, 0) / recentWorkouts.length % 60)).padStart(2, '0')}/km
` : '- Aucune séance récente'}

---

## Consignes pour la génération

${planType === 'race' ? `
Génère un plan d'entraînement complet pour atteindre cet objectif de course.

**Méthodologie** : Jack Daniels (VDOT)

**Règles strictes** :
1. **70-80% du volume en Endurance Fondamentale** (allure facile)
2. **Progression de 10% max par semaine**
3. **1 semaine de récupération toutes les 3-4 semaines**
4. **Périodisation** : Base → Build → Peak → Taper

**Format attendu** :
- Planning semaine par semaine
- Détail de chaque séance (échauffement, corps, retour au calme)
- Allures cibles basées sur ma VMA/VDOT
- Conseils spécifiques selon mon profil

` : planType === 'block' ? `
Génère un bloc de 4 semaines pour progresser sur le focus "${params.focus}".

**Règles strictes** :
1. **70-80% du volume en Endurance Fondamentale**
2. **Progression cohérente**
3. **Respect de mes contraintes** (blessures, fréquence)

**Format attendu** :
- 4 semaines détaillées
- ${params.frequency || '3'} séances par semaine
- Allures cibles précises
- Conseils d'exécution

` : `
Suggère UNE séance pour aujourd'hui basée sur :
- Mon historique récent
- Mon niveau actuel
- Mes contraintes éventuelles

**Format attendu** :
- Type de séance
- Distance et durée estimée
- Allure cible
- Structure détaillée (échauffement, corps, retour au calme)
- Justification du choix
`}

Ton factuel, direct, sans superlatifs. Concentre-toi sur la science et la méthodologie.
`

  return markdown
}

/**
 * Copy markdown to clipboard and show toast notification
 */
export async function copyMarkdownToClipboard(markdown: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(markdown)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}
