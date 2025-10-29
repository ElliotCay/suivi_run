/**
 * TypeScript types for the running tracking application
 */

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Workout {
  id: number;
  user_id: number;
  date: string;
  workout_type: 'easy' | 'tempo' | 'intervals' | 'long_run' | 'recovery' | 'race';
  distance_km: number;
  duration_minutes: number;
  average_heart_rate?: number;
  max_heart_rate?: number;
  perceived_effort?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkoutCreate {
  user_id: number;
  date: string;
  workout_type: 'easy' | 'tempo' | 'intervals' | 'long_run' | 'recovery' | 'race';
  distance_km: number;
  duration_minutes: number;
  average_heart_rate?: number;
  max_heart_rate?: number;
  perceived_effort?: number;
  notes?: string;
}

export interface WorkoutUpdate {
  date?: string;
  workout_type?: 'easy' | 'tempo' | 'intervals' | 'long_run' | 'recovery' | 'race';
  distance_km?: number;
  duration_minutes?: number;
  average_heart_rate?: number;
  max_heart_rate?: number;
  perceived_effort?: number;
  notes?: string;
}

export interface StrengthSession {
  id: number;
  user_id: number;
  date: string;
  exercises: string[];
  duration_minutes: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StrengthSessionCreate {
  user_id: number;
  date: string;
  exercises: string[];
  duration_minutes: number;
  notes?: string;
}

export interface Suggestion {
  id: number;
  user_id: number;
  suggestion_date: string;
  workout_type: 'easy' | 'tempo' | 'intervals' | 'long_run' | 'recovery' | 'race';
  suggested_distance_km?: number;
  suggested_duration_minutes?: number;
  reasoning?: string;
  created_at: string;
}

export interface SuggestionCreate {
  user_id: number;
  suggestion_date: string;
  workout_type: 'easy' | 'tempo' | 'intervals' | 'long_run' | 'recovery' | 'race';
  suggested_distance_km?: number;
  suggested_duration_minutes?: number;
  reasoning?: string;
}

export interface WeeklyStats {
  week_start: string;
  week_end: string;
  total_distance_km: number;
  total_duration_minutes: number;
  workout_count: number;
  average_pace?: number;
  average_heart_rate?: number;
}

export interface MonthlyStats {
  month: string;
  year: number;
  total_distance_km: number;
  total_duration_minutes: number;
  workout_count: number;
  average_pace?: number;
  average_heart_rate?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: string;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

export interface HealthCheckResponse {
  status: string;
  timestamp?: string;
}

export interface ImportResult {
  success: boolean;
  workouts_imported: number;
  duplicates_skipped: number;
  date_range?: {
    start: string;
    end: string;
  };
  message?: string;
}

export interface ImportError {
  message: string;
  detail?: string;
}
