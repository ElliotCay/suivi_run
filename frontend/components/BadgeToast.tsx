'use client';

import { useEffect } from 'react';
import { useUnviewedBadges } from '@/hooks/useBadges';
import { toast } from 'sonner';
import { Trophy } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api';

export function BadgeToast() {
  const { unviewedBadges, reload } = useUnviewedBadges();

  useEffect(() => {
    if (unviewedBadges.length > 0) {
      // Show toast for each unviewed badge
      unviewedBadges.forEach((badge) => {
        toast.success(`🎉 Nouveau badge débloqué !`, {
          description: badge.badge_name,
          duration: 5000,
          action: {
            label: 'Voir mes badges',
            onClick: () => {
              window.location.href = '/profile#badges';
            },
          },
        });
      });

      // Mark all as viewed after showing toasts
      const badgeIds = unviewedBadges.map(b => b.id);
      axios.patch(`${API_BASE}/badges/mark-viewed`, badgeIds)
        .then(() => reload())
        .catch(err => console.error('Error marking badges as viewed:', err));
    }
  }, [unviewedBadges]);

  return null; // This component doesn't render anything visible
}
