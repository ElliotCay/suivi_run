/**
 * Custom hook for fetching and managing weekly recaps.
 */
import { useState, useEffect, useCallback } from 'react';

export interface WeeklyRecap {
  id: number;
  user_id: number;
  week_start_date: string;
  week_end_date: string;
  recap_text: string;
  sessions_completed: number | null;
  sessions_planned: number | null;
  total_volume_km: number | null;
  avg_pace_seconds: number | null;
  avg_heart_rate: number | null;
  readiness_avg: number | null;
  generated_at: string;
  is_viewed: boolean;
}

interface UseWeeklyRecapsReturn {
  recaps: WeeklyRecap[];
  latestRecap: WeeklyRecap | null;
  loading: boolean;
  error: string | null;
  generateRecap: (weekStartDate?: string) => Promise<void>;
  markAsViewed: (recapId: number) => Promise<void>;
  refreshRecaps: () => Promise<void>;
}

export function useWeeklyRecaps(limit: number = 10): UseWeeklyRecapsReturn {
  const [recaps, setRecaps] = useState<WeeklyRecap[]>([]);
  const [latestRecap, setLatestRecap] = useState<WeeklyRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Fetch all recaps
  const fetchRecaps = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/weekly-recaps?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch weekly recaps');

      const data = await response.json();
      setRecaps(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  }, [API_URL, limit]);

  // Fetch latest recap
  const fetchLatestRecap = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/weekly-recaps/latest`);
      if (!response.ok) throw new Error('Failed to fetch latest recap');

      const data = await response.json();
      setLatestRecap(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [API_URL]);

  // Generate a new recap
  const generateRecap = useCallback(async (weekStartDate?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/weekly-recaps/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week_start_date: weekStartDate || null
        })
      });

      if (!response.ok) throw new Error('Failed to generate weekly recap');

      const newRecap = await response.json();

      // Update state with new recap
      setLatestRecap(newRecap);
      setRecaps(prev => [newRecap, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // Check if we need to generate a recap for last week
  const checkAndGenerateLastWeekRecap = useCallback(async () => {
    try {
      // Call the dedicated endpoint that auto-generates last week's recap if needed
      const response = await fetch(`${API_URL}/api/weekly-recaps/generate-last-week`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        // 404 or error is ok - might be no workouts last week
        console.log('No recap generated for last week (might be no workouts)');
        return;
      }

      const recap = await response.json();

      if (recap) {
        console.log('✅ Generated recap for last week:', recap.week_start_date);

        // Update state with the new/existing recap
        setLatestRecap(recap);
        setRecaps(prev => {
          // Check if recap already exists in state
          const exists = prev.some(r => r.id === recap.id);
          if (exists) {
            return prev;
          }
          return [recap, ...prev];
        });
      }
    } catch (err) {
      console.error('Error checking for last week recap:', err);
    }
  }, [API_URL]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      await Promise.all([
        fetchRecaps(),
        fetchLatestRecap()
      ]);

      // After loading, check if we need to generate last week's recap
      await checkAndGenerateLastWeekRecap();

      setLoading(false);
    };

    loadData();
  }, []); // Empty deps - only run on mount

  // Mark recap as viewed
  const markAsViewed = useCallback(async (recapId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/weekly-recaps/${recapId}/mark-viewed`, {
        method: 'PATCH'
      });

      if (!response.ok) throw new Error('Failed to mark recap as viewed');

      // Update local state
      setRecaps(prev =>
        prev.map(recap =>
          recap.id === recapId ? { ...recap, is_viewed: true } : recap
        )
      );

      if (latestRecap?.id === recapId) {
        setLatestRecap(prev => prev ? { ...prev, is_viewed: true } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [API_URL, latestRecap?.id]);

  // Refresh recaps
  const refreshRecaps = useCallback(async () => {
    setLoading(true);
    setError(null);

    await Promise.all([
      fetchRecaps(),
      fetchLatestRecap()
    ]);

    setLoading(false);
  }, [fetchRecaps, fetchLatestRecap]);

  return {
    recaps,
    latestRecap,
    loading,
    error,
    generateRecap,
    markAsViewed,
    refreshRecaps
  };
}
