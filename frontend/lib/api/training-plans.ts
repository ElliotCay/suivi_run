/**
 * Training Plans API Client
 *
 * API calls for multi-week training plan management
 */

import { apiRequest } from './base';

export interface TrainingPlanCreate {
  name: string;
  goal_type: '5km' | '10km' | 'half_marathon' | 'marathon';
  target_date?: string;
  current_level?: string;
  weeks_count?: number;
}

export interface TrainingSession {
  id: number;
  week_id: number;
  day_of_week: string;
  session_order: number;
  session_type: string;
  description?: string;
  distance?: number;
  pace_target?: string;
  structure?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'missed';
  scheduled_date?: string;
  created_at: string;
}

export interface TrainingWeek {
  id: number;
  plan_id: number;
  week_number: number;
  phase: 'base' | 'build' | 'peak' | 'taper';
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  start_date?: string;
  end_date?: string;
  sessions: TrainingSession[];
  created_at: string;
}

export interface TrainingPlan {
  id: number;
  user_id: number;
  name: string;
  goal_type: string;
  target_date?: string;
  current_level?: string;
  weeks_count: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  weeks: TrainingWeek[];
  created_at: string;
  updated_at: string;
}

export interface TrainingPlanListItem {
  id: number;
  user_id: number;
  name: string;
  goal_type: string;
  target_date?: string;
  weeks_count: number;
  start_date: string;
  end_date: string;
  status: string;
  progress_percentage: number;
  created_at: string;
}

export interface TrainingPlanUpdate {
  name?: string;
  status?: string;
  target_date?: string;
}

export interface TrainingWeekUpdate {
  status?: string;
  description?: string;
}

export interface TrainingSessionUpdate {
  status?: string;
  completed_workout_id?: number;
}

/**
 * Create a new training plan
 */
export async function createTrainingPlan(data: TrainingPlanCreate): Promise<TrainingPlan> {
  return apiRequest<TrainingPlan>('/training-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get all training plans
 */
export async function getTrainingPlans(status?: string): Promise<TrainingPlanListItem[]> {
  const params = status ? `?status=${status}` : '';
  return apiRequest<TrainingPlanListItem[]>(`/training-plans${params}`);
}

/**
 * Get a specific training plan with all details
 */
export async function getTrainingPlan(planId: number): Promise<TrainingPlan> {
  return apiRequest<TrainingPlan>(`/training-plans/${planId}`);
}

/**
 * Update a training plan
 */
export async function updateTrainingPlan(
  planId: number,
  data: TrainingPlanUpdate
): Promise<TrainingPlan> {
  return apiRequest<TrainingPlan>(`/training-plans/${planId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a training plan
 */
export async function deleteTrainingPlan(planId: number): Promise<{ message: string; id: number }> {
  return apiRequest<{ message: string; id: number }>(`/training-plans/${planId}`, {
    method: 'DELETE',
  });
}

/**
 * Update a training week
 */
export async function updateTrainingWeek(
  planId: number,
  weekNumber: number,
  data: TrainingWeekUpdate
): Promise<TrainingWeek> {
  return apiRequest<TrainingWeek>(`/training-plans/${planId}/weeks/${weekNumber}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Update a training session (mark as completed, skipped, etc.)
 */
export async function updateTrainingSession(
  planId: number,
  sessionId: number,
  data: TrainingSessionUpdate
): Promise<TrainingSession> {
  return apiRequest<TrainingSession>(`/training-plans/${planId}/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Mark a session as completed
 */
export async function completeSession(
  planId: number,
  sessionId: number,
  workoutId?: number
): Promise<TrainingSession> {
  return updateTrainingSession(planId, sessionId, {
    status: 'completed',
    completed_workout_id: workoutId,
  });
}

/**
 * Mark a session as skipped
 */
export async function skipSession(planId: number, sessionId: number): Promise<TrainingSession> {
  return updateTrainingSession(planId, sessionId, {
    status: 'skipped',
  });
}

/**
 * Adapt a training plan based on performance and feedback
 */
export async function adaptTrainingPlan(planId: number, userFeedback: string): Promise<any> {
  return apiRequest<any>(`/training-plans/${planId}/adapt`, {
    method: 'POST',
    body: JSON.stringify({ user_feedback: userFeedback }),
  });
}

/**
 * Get current week from a training plan
 */
export function getCurrentWeek(plan: TrainingPlan): TrainingWeek | null {
  const now = new Date();

  for (const week of plan.weeks) {
    if (!week.start_date || !week.end_date) continue;

    const start = new Date(week.start_date);
    const end = new Date(week.end_date);

    if (now >= start && now <= end) {
      return week;
    }
  }

  // If no current week, return first pending week
  return plan.weeks.find(w => w.status === 'pending') || null;
}

/**
 * Get next pending session from current week
 */
export function getNextSession(plan: TrainingPlan): TrainingSession | null {
  const currentWeek = getCurrentWeek(plan);
  if (!currentWeek) return null;

  return currentWeek.sessions.find(s => s.status === 'scheduled') || null;
}

/**
 * Calculate plan progress
 */
export function calculateProgress(plan: TrainingPlan): number {
  const totalSessions = plan.weeks.reduce((sum, week) => sum + week.sessions.length, 0);
  const completedSessions = plan.weeks.reduce(
    (sum, week) => sum + week.sessions.filter(s => s.status === 'completed').length,
    0
  );

  return totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
}

/**
 * Get sessions by status
 */
export function getSessionsByStatus(
  plan: TrainingPlan,
  status: 'pending' | 'completed' | 'skipped'
): TrainingSession[] {
  const sessions: TrainingSession[] = [];

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.status === status) {
        sessions.push(session);
      }
    }
  }

  return sessions;
}

/**
 * Get week by number
 */
export function getWeekByNumber(plan: TrainingPlan, weekNumber: number): TrainingWeek | null {
  return plan.weeks.find(w => w.week_number === weekNumber) || null;
}

/**
 * Format phase name for display
 */
export function formatPhaseName(phase: string): string {
  const phaseNames: Record<string, string> = {
    base: 'Base - Endurance',
    build: 'Construction - Intensité',
    peak: 'Pic - Performance',
    taper: 'Affûtage - Récupération',
  };

  return phaseNames[phase] || phase;
}

/**
 * Format workout type for display
 */
export function formatWorkoutType(type: string): string {
  const typeNames: Record<string, string> = {
    facile: 'Facile',
    tempo: 'Tempo',
    fractionne: 'Fractionné',
    longue: 'Sortie longue',
  };

  return typeNames[type] || type;
}

/**
 * Get phase color for UI
 */
export function getPhaseColor(phase: string): string {
  const colors: Record<string, string> = {
    base: 'bg-green-100 text-green-800',
    build: 'bg-blue-100 text-blue-800',
    peak: 'bg-red-100 text-red-800',
    taper: 'bg-yellow-100 text-yellow-800',
  };

  return colors[phase] || 'bg-gray-100 text-gray-800';
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    skipped: 'bg-orange-100 text-orange-800',
    active: 'bg-blue-100 text-blue-800',
    paused: 'bg-yellow-100 text-yellow-800',
    abandoned: 'bg-red-100 text-red-800',
  };

  return colors[status] || 'bg-gray-100 text-gray-800';
}
