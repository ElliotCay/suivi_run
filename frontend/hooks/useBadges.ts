import { useState, useEffect } from 'react';
import axios from 'axios';

export interface Badge {
  id: number;
  badge_type: string;
  badge_key: string;
  badge_name: string;
  badge_icon: string | null;
  badge_description: string | null;
  metric_value: number | null;
  unlocked_at: string;
  is_viewed: boolean;
}

export interface BadgeStats {
  total: number;
  by_type: {
    [key: string]: number;
  };
}

const API_BASE = 'http://127.0.0.1:8000/api';

export function useBadges(includeViewed: boolean = true) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/badges`, {
        params: { include_viewed: includeViewed }
      });
      setBadges(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching badges:', err);
      setError('Failed to load badges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, [includeViewed]);

  const markAsViewed = async (badgeIds?: number[]) => {
    try {
      await axios.patch(`${API_BASE}/badges/mark-viewed`, badgeIds);
      await fetchBadges();
    } catch (err) {
      console.error('Error marking badges as viewed:', err);
    }
  };

  const checkForNewBadges = async () => {
    try {
      const response = await axios.post(`${API_BASE}/badges/check`);
      if (response.data.new_badges_count > 0) {
        await fetchBadges();
      }
      return response.data;
    } catch (err) {
      console.error('Error checking for new badges:', err);
      return { new_badges_count: 0, new_badges: [] };
    }
  };

  return {
    badges,
    loading,
    error,
    reload: fetchBadges,
    markAsViewed,
    checkForNewBadges,
  };
}

export function useUnviewedBadges() {
  const [unviewedBadges, setUnviewedBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnviewed = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/badges/unviewed`);
      setUnviewedBadges(response.data);
    } catch (err) {
      console.error('Error fetching unviewed badges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnviewed();

    // Poll every 30 seconds for new badges
    const interval = setInterval(fetchUnviewed, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    unviewedBadges,
    loading,
    reload: fetchUnviewed,
  };
}

export function useBadgeStats() {
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE}/badges/stats`);
        setStats(response.data);
      } catch (err) {
        console.error('Error fetching badge stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading };
}
