import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * API error handler wrapper
 */
export async function handleApiRequest<T>(
  request: () => Promise<T>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await request();
    return { data, error: null };
  } catch (error) {
    if (error instanceof AxiosError) {
      const message = error.response?.data?.message || error.message || 'An error occurred';
      console.error('API Error:', message);
      return { data: null, error: message };
    }
    console.error('Unexpected error:', error);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Health check endpoint
 */
export async function getHealthCheck(): Promise<{ data: { status: string } | null; error: string | null }> {
  return handleApiRequest(async () => {
    const response = await apiClient.get('/api/health');
    return response.data;
  });
}

/**
 * Get all workouts
 */
export async function getWorkouts() {
  return handleApiRequest(async () => {
    const response = await apiClient.get('/api/workouts');
    return response.data;
  });
}

/**
 * Get workout by ID
 */
export async function getWorkout(id: number) {
  return handleApiRequest(async () => {
    const response = await apiClient.get(`/api/workouts/${id}`);
    return response.data;
  });
}

/**
 * Create new workout
 */
export async function createWorkout(workout: any) {
  return handleApiRequest(async () => {
    const response = await apiClient.post('/api/workouts', workout);
    return response.data;
  });
}

/**
 * Update workout
 */
export async function updateWorkout(id: number, workout: any) {
  return handleApiRequest(async () => {
    const response = await apiClient.put(`/api/workouts/${id}`, workout);
    return response.data;
  });
}

/**
 * Delete workout
 */
export async function deleteWorkout(id: number) {
  return handleApiRequest(async () => {
    const response = await apiClient.delete(`/api/workouts/${id}`);
    return response.data;
  });
}

/**
 * Upload Apple Health export file
 */
export async function uploadAppleHealthExport(
  file: File,
  onUploadProgress?: (progressEvent: any) => void
) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await apiClient.post('/api/import/apple-health', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      // Extract the detailed error message from the backend
      const errorMessage = error.response?.data?.detail || error.message || 'Erreur lors de l\'import';
      throw new Error(errorMessage);
    }
    throw error;
  }
}

/**
 * Dashboard API endpoints
 */

/**
 * Get dashboard summary
 */
export async function getDashboardSummary() {
  return handleApiRequest(async () => {
    const response = await apiClient.get('/api/dashboard/summary');
    return response.data;
  });
}

/**
 * Get volume history
 */
export async function getVolumeHistory(weeks: number = 12) {
  return handleApiRequest(async () => {
    const response = await apiClient.get(`/api/dashboard/volume-history?weeks=${weeks}`);
    return response.data;
  });
}

/**
 * Get workout types distribution
 */
export async function getWorkoutTypes() {
  return handleApiRequest(async () => {
    const response = await apiClient.get('/api/dashboard/workout-types');
    return response.data;
  });
}

/**
 * Get training load
 */
export async function getTrainingLoad() {
  return handleApiRequest(async () => {
    const response = await apiClient.get('/api/dashboard/training-load');
    return response.data;
  });
}

/**
 * Get readiness score
 */
export async function getReadinessScore() {
  return handleApiRequest(async () => {
    const response = await apiClient.get('/api/profile/readiness');
    return response.data;
  });
}

/**
 * Ask a natural language query about training data
 */
export async function askNaturalQuery(
  message: string,
  conversationHistory: Array<{ role: string; content: string }> = []
) {
  return handleApiRequest(async () => {
    const response = await apiClient.post('/api/queries/ask', {
      message,
      conversation_history: conversationHistory
    });
    return response.data;
  });
}

export default apiClient;
